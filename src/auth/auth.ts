import * as Types from "./types";

import getConfig from "../util/getConfig";
import e, { Request, Response, NextFunction } from "express";
const gConfig = {
  admin: { role: "ADMIN", model: "../models/admin" },
  jwtSecretEnv: "JWT_KEY",
  customValidator: (req: Request, key: string) => {
    return true;
  },
  ...getConfig("auth"),
};
const executer: Types.Executer = (authType) => async (req, res, next) => {
 const accessResult = await gConfig?.customValidator?.(req, authType);
 if(accessResult == null) return next({status : 401,json : {message : 'Unauthorized'}});
 if(!accessResult) return next({status : 403,json : {message : 'Forbidden'}})
    return next();
};

const auth: Types.Auth = {
  user: () => {
    return executer("user");
  },
  admin: (config) => {
    return executer(`admin${config?.permission ? `:${config.permission}` : ''}`);
  },
  any: () => {
    return executer("any");
  },
};

export default auth;