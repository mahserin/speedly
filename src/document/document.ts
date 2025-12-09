import fs from "fs";
import path from "path";
import swaggerUi from "swagger-ui-express";
import { Express, RequestHandler } from "express";
import { SwaggerTheme, SwaggerThemeNameEnum } from "swagger-themes";

const METHODS_WITH_BODY = ["post", "put", "patch"] as const;
type HttpMethod = (typeof METHODS_WITH_BODY)[number] | "get" | "delete";

interface ValidationSchema {
  body?: any;
  params?: any;
  query?: any;
  [key: string]: any;
}

interface RouteInfo {
  [path: string]: {
    [method in HttpMethod]?: any;
  };
}

/* ===================== HELPERS ======================= */

function extractPath(layer: any): string {
  if (layer.regexp && layer.regexp.source !== "^\\/?$") {
    return layer.regexp.source
      .replace("^\\/", "/")
      .replace("\\/?(?=\\/|$)", "")
      .replace(/\\\//g, "/");
  }
  return "";
}

function splitRouteByMethod(route: any) {
  const result: Record<string, { middlewares: any[]; handler: any }> = {};
  route.stack.forEach((layer: any, idx: number) => {
    if (layer.method) {
      const method = layer.method.toLowerCase();
      const middlewares: any[] = [];
      for (let i = 0; i < idx; i++) {
        if (route.stack[i].name !== "bound dispatch")
          middlewares.push(route.stack[i]);
      }
      result[method] = { middlewares, handler: layer };
    }
  });
  return result;
}

/* ================== YUP → OPENAPI ==================== */

function resolveYupSchema(schema: any): any {
  if (!schema) return null;
  if (schema?.type === "lazy" && typeof schema._resolve === "function") {
    return schema._resolve({});
  }
  return schema;
}

function translateField(field: any) {
  if (!field) return { type: "string" };
  return {
    type: field.type === "array" ? "array" : field.type || "string",
    nullable: field.nullable || false,
  };
}

function translateYupSchema(schema: any) {
  schema = resolveYupSchema(schema);
  if (!schema) return null;

  const described = schema.describe();
  const properties = Object.entries(described.fields ?? {}).reduce(
    (acc: any, [name, field]: any) => {
      acc[name] = translateField(field);
      return acc;
    },
    {}
  );

  return {
    type: "object",
    properties,
    required: Object.entries(described.fields ?? {})
      .filter(([_, f]: any) => !(f.optional || f.nullable))
      .map(([name]) => name),
  };
}

/* ==================== AUTH ==================== */

type AuthType = "none" | "any" | "required";

function getAuthStatus(middlewares: any[]): {
  type: AuthType;
  raw: string | null;
} {
  for (const mw of middlewares) {
    if (!mw.name) continue;
    if (mw.name.startsWith("auth")) {
      const parts = mw.name.split(":");
      if (parts[1] === "any") return { type: "any", raw: mw.name };
      return { type: "required", raw: mw.name };
    }
  }
  return { type: "none", raw: null };
}

/* ==================== ROUTER SCANNER ==================== */

function scanRouter(router: any, base = ""): any[] {
  const routes: any[] = [];
  router.stack.forEach((layer: any) => {
    if (layer.route) {
      routes.push({
        path: base + layer.route.path,
        methods: splitRouteByMethod(layer.route),
      });
    } else if (layer.name === "router" && layer.handle?.stack) {
      routes.push(...scanRouter(layer.handle, base + extractPath(layer)));
    }
  });
  return routes;
}

/* ================== MAIN ANALYZER ===================== */

function routeAnalyzer(route: any, routerName: string): RouteInfo {
  const routerDetails: RouteInfo = {};
  const scanned = scanRouter(route);
  const paramsRegex = /:[^/]+/g;

  scanned.forEach((route: any) => {
    const fullPath = `/${routerName}${route.path
      .replace(/^\/$/, "")
      .replaceAll(paramsRegex, (r: string) => `{${r.slice(1)}}`)}`;
    routerDetails[fullPath] = {};

    Object.entries(route.methods).forEach(([method, detail]: any) => {
      const doc: any = {
        tags: [routerName.replace("_", " ")],
        description: "Public route",
      };

      const validation: ValidationSchema | undefined = detail.middlewares.find(
        (mw: any) => mw.handle?.__validationSchema
      )?.handle.__validationSchema;

      // If body exists
      if (METHODS_WITH_BODY.includes(method)) {
        if (validation?.body) {
          doc.requestBody = {
            required: true,
            content: {
              "application/json": {
                schema: translateYupSchema(validation.body),
              },
            },
          };
        }
      }

      // Response
      doc.responses = {
        "200": {
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  message: { type: "string", example: "find successfully" },
                  content: {
                    oneOf: [
                      {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            id: { type: "string" },
                            name: { type: "string" },
                          },
                        },
                      },
                      {
                        type: "object",
                        properties: {
                          id: { type: "string" },
                          name: { type: "string" },
                        },
                      },
                    ],
                  },
                },
              },
            },
          },
        },
        "400": {
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  message: { type: "string", example: "module not found" },
                },
              },
            },
          },
        },
      };

      // Auth
      const auth = getAuthStatus(detail.middlewares);
      if (auth.type === "required") {
        doc.security = [{ bearerAuth: [] }];
        doc.description = `Requires authentication (${auth.raw})`;
      } else if (auth.type === "any") {
        doc.description = "Optional login route";
      }

      routerDetails[fullPath][method as HttpMethod] = doc;
    });
  });

  return routerDetails;
}

/* =================== LOAD MODULES ==================== */

function RouterFetcher(baseDir: string) {
  const modules = fs.readdirSync(baseDir);
  let paths: RouteInfo = {};
  const tags: any[] = [];

  modules.forEach((mf) => {
    const routerPath = path.join(baseDir, mf, `${mf}.routes.js`);
    try {
      const router = require(routerPath);
      paths = { ...paths, ...routeAnalyzer(router, mf) };
      tags.push({
        name: mf.replace("_", " "),
        description: `${mf} operations`,
      });
    } catch (err: any) {
      console.error("Swagger loading error:", err.message);
    }
  });

  return {
    openapi: "3.0.3",
    info: {
      title: `${require(path.join(process.cwd(), "package.json")).name} APIs`,
      version: "1.0.0",
    },
    servers: [{ url: "/api/v1" }],
    paths,
    tags,
    components: {
      securitySchemes: {
        bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
      },
    },
  };
}

/* ==================== EXPORT HOOK ==================== */

export default function swaggerLoader(
  app: Express,
  baseDir = path.join(process.cwd(), "src/module")
) {
  const doc = RouterFetcher(baseDir);
  const theme = new SwaggerTheme();

  app.use(
    "/docs",
    swaggerUi.serve,
    swaggerUi.setup(doc, {
      customCss: theme.getBuffer(SwaggerThemeNameEnum.DARK),
    }) as RequestHandler
  );
}
