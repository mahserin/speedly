import express from "express";
import auth from "../../kit/auth/auth";
import model from "../../kit/db/db";
import validator from "../../kit/validator/validator";
const v = require("./translation.validator");

const router = express.Router();

router
  .route("/")
  .get((model("translation", { type: "internal" }) as any).find())
  .post((req, res, next) => {
    if (!req.body.auth || req.body.auth !== "OKPJWSJD_Sdki") {
      return res.status(403).json({ message: "Access Denied" });
    }
    next();
  }, (model("translation", { type: "internal" }) as any).create());
router
  .route("/:id")
  .put(
    auth.admin(),
    validator(v.put),
    (model("translation", { type: "internal" }) as any).findByIdAndUpdate()
  );

export default router;
