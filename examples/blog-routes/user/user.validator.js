const makeOptional = require("../../util/makeOptional");
const { string, object, array, lazy } = require("../../yup.config");

const paramId = object({
  id: string().required("id is required").oid("id is invalid"),
});

const schema = object({});

//? exports

exports.register = {
  body: object({
    phone: string()
      .required("phone is required")
      .matches(
        /^09\d{9}$/,
        "phone is invalid enter 11 digit in format 09*********",
      ),
    otpCode: string().when("type", ([type]) => {
      if (type === "register" || type === "login")
        return string().required(
          "otpCode is required for register and login type",
        );
    }),
    password: string().when("type", ([type]) => {
      if (type === "login-password")
        return string()
          .required("password is required for login-password type")
    }),
  }),
};

exports.checkPhone = {
  body: object({
    phone: string()
      .required("phone is required")
      .matches(
        /^09\d{9}$/,
        "phone is invalid enter 11 digit in format 09*********",
      ),
  }),
};
exports.post = {
  body: lazy((value) => (Array.isArray(value) ? array().of(schema) : schema)),
};
exports.put = {
  params: paramId,
  body: makeOptional(schema),
};
exports.delete = {
  params: paramId,
};
