import express from "express";
import path from "path";
import fs from "fs";
import document from "../document";
type InitConfig = {
  notFoundHandler?: boolean;
  homeHandler?: boolean;
  errorHandler?: boolean;
  jsonParser?: boolean;
  documentation?:
    | boolean
    | { servers: { url: string; description?: string }[] };
  urlEncodedParser?: boolean;
  cookieParser?: boolean;
  staticFiles?: boolean;
  [key: string]: any;
};

export type InitFunction = (config?: InitConfig) => express.Express;
const defaultConfig: InitConfig = {
  notFoundHandler: true,
  errorHandler: true,
  homeHandler: true,
  jsonParser: true,
  documentation: true,
  urlEncodedParser: true,
  cookieParser: true,
  staticFiles: true,
};
export type { InitConfig };
export default function speedly(config: InitConfig = {}) {
  const finalConfig = { ...defaultConfig, ...config };
  const app = express();

  if (finalConfig.jsonParser) app.use(express.json());
  if (finalConfig.urlEncodedParser)
    app.use(express.urlencoded({ extended: true }));
  if (finalConfig.cookieParser) {
    try {
      const cookieParser = require("cookie-parser");
      app.use(cookieParser());
    } catch (error: any) {
      if (error.code === "MODULE_NOT_FOUND") {
        console.warn(
          "cookie-parser module not founds. Please reinstall it to use cookieParser middleware.",
        );
      }
    }
  }
  console.log(
    "init",
    48,
    fs.existsSync(path.join(process.cwd(), "src/module")),
  );
  if (
    finalConfig.documentation &&
    fs.existsSync(path.join(process.cwd(), "src/module"))
  )
    document(
      app,
      path.join(process.cwd(), "src/module"),
      finalConfig.documentation === true
        ? undefined
        : finalConfig.documentation.servers,
    );
  if (finalConfig.staticFiles) app.use("/static", express.static("public"));
  if (finalConfig.homeHandler) {
    app.get("/", (req, res) => {
      res.send(`<h1>Welcome to ${
        require(path.join(process.cwd(), "package.json")).name
      } App</h1>
      <p>Your app is running successfully.</p>
     ${
       finalConfig.documentation
         ? '<p>Visit <a href="/docs">/docs</a> for API documentation.</p>'
         : ""
     }`);
    });
  }
  // user can call this manually if needed
  const registerFallbacks = () => {
    if (finalConfig.notFoundHandler) {
      app.use((req, res) => res.status(404).json({ message: "Not Found" }));
    }

    if (finalConfig.errorHandler) {
      app.use((error: any, req: any, res: any, next: any) => {
        console.error("Speedly Error:", error);
        res.status(500).json({ message: "Internal Server Error" });
      });
    }
  };

  // ⛔ we intercept listen, add fallback before server starts
  const originalListen = app.listen.bind(app);
  app.listen = (...args: any[]) => {
    registerFallbacks();
    return originalListen(...(args as any));
  };

  // 🔓 expose config + extend points for override
  (app as any).speedlyConfig = finalConfig;
  (app as any).registerFallbacks = registerFallbacks;

  return app as express.Express & {
    speedlyConfig: InitConfig;
    registerFallbacks: () => void;
  };
}
