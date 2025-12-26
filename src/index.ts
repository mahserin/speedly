import speedly from "./config/init";

// Export express types and classes
export {
  Request,
  Response,
  NextFunction,
  Application,
  Router,
  RequestHandler,
  ErrorRequestHandler,
} from "express";
export type { InitConfig } from "./config/init";
export { speedly };
// Override the  default  express() with our speedly`s  functions
export default speedly;
