import express from "express";

type InitConfig = {
  notFoundHandler?: boolean;
  errorHandler?: boolean;
  jsonParser?: boolean;
  urlEncodedParser?: boolean;
  cookieParser?: boolean;
  staticFiles?: boolean;
  [key: string]: any;
};

export type InitFunction = (config?: InitConfig) => express.Express;
const defaultConfig: InitConfig = {
  notFoundHandler: true,
  errorHandler: true,
  jsonParser: true,
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
          "cookie-parser module not found. Please install it to use cookieParser middleware."
        );
      }
    }
  }
  if (finalConfig.staticFiles) app.use("/static", express.static("public"));

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
