import { Request, Response, NextFunction, RequestHandler } from "express";
import * as yup from "yup";

// این type میگه که کاربر می‌تونه body, params یا query بده
type ValidationSchema = {
  body?: yup.AnyObjectSchema;
  params?: yup.AnyObjectSchema;
  query?: yup.AnyObjectSchema;
};

// یک type utility برای استخراج inferred type از هر schema
type InferValidation<T extends ValidationSchema> = {
  body: T["body"] extends yup.AnyObjectSchema
    ? yup.InferType<T["body"]>
    : unknown;
  params: T["params"] extends yup.AnyObjectSchema
    ? yup.InferType<T["params"]>
    : unknown;
  query: T["query"] extends yup.AnyObjectSchema
    ? yup.InferType<T["query"]>
    : unknown;
};

// این تابع validator generic هست
const validator = <T extends ValidationSchema>(schemas: T): RequestHandler => {
  const mw = async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (schemas.body) {
        req.body = (await schemas.body.validate(req.body, {
          stripUnknown: true,
        })) as InferValidation<T>["body"];
      }

      if (schemas.params) {
        req.params = (await schemas.params.validate(req.params, {
          stripUnknown: true,
        })) as any;
      }

      if (schemas.query) {
        req.query = (await schemas.query.validate(req.query, {
          stripUnknown: true,
        })) as any;
      }

      next();
    } catch (err) {
      return next({
        status: 405,
        json: { message: (err as Error).message },
        section: "validation",
      });
    }
  };

  Object.defineProperty(mw, "__validationSchema", { value: schemas });
  Object.defineProperty(mw, "name", { value: `validator` });

  return mw;
};
export default validator;
