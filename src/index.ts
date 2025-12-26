import speedly, { InitFunction } from "./config/init";

// Export express types and classes
import * as express from "express";
import { Express } from "express";
let exportObject = express as any as Express & InitFunction;
Object.assign(exportObject, speedly);

// Override the  default  express() with our speedly`s  functions

export default exportObject;
