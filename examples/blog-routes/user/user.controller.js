const userModel = require("../../model/user");
const otpModel = require("../../model/otp");
const roleModel = require("../../model/role");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { randomNumber } = require("../../util/generator");
const sms = require("../../util/sms");
const otpSender = async (phone) => {
  let otpDoc = await otpModel.findOne({ phone });
  try {
    if (!otpDoc)
      otpDoc = await otpModel.create({ phone, code: randomNumber(5) });
    console.log("user.controller", 10, otpDoc);
    await sms.otp(phone, "809162", otpDoc.code);
  } catch (err) {
    console.error("OTP sending failed:", err.cause?.response?.data?.meta?.errors || err);
    //! DEVELOPE MODE
    err.otpDoc = otpDoc
    //! END DEVELOPE
    throw err;
  }
  return otpDoc;
};

exports.checkPhone = async (req, res) => {
  const { phone } = req.body;

  const userDoc = await userModel.findOne({ phone });

  const resBody = {
    type: userDoc ? "login-otp" : "register",
  };
  try {
    if (req.body.type == 'login-otp' || !userDoc || !userDoc.password) {
      //! DEVELOPE MODE
      resBody.IMPORTANT = '⚠ OTP is included in the response in development mode only. Must be removed before production release.'
      //! END DEVELOPE

      const otpRes = await otpSender(phone);

      resBody.expireAt = otpRes.expireAt;

      console.log('user.controller', 37,);

      if (userDoc && !userDoc.password) {
        resBody.type = "login-otp";
      }
    } else {
      resBody.type = "login-password";
    }

    return res.json({ ...resBody, message: "OTP sent successfully" });
  } catch (err) {
    //! DEVELOPE MODE
    if (err.otpDoc) resBody.code = err.otpDoc.code
    //! END DEVELOPE

    return res.status(err.statusCode || 500).json({ ...resBody, message: "OTP sending failed: " + err.message, });

  }
};
exports.register = async (req, res) => {
  const { phone, otpCode } = req.body;
  let userDoc = await userModel.findOne({ phone });
  let type = req.body.type || userDoc ? userDoc.password ? 'login-password' : "login-otp" : "register";
  if (type === "register" || type === "login-otp") {
    const otpDoc = await otpModel.findOne({ phone, code: otpCode });
    if (!otpDoc) return res.status(400).json({ message: "Invalid OTP code" });
    if (type === "register") {
      let userObj = { phone };
      if ((await userModel.countDocuments()) == 0) {
        const ownerRole =
          (await roleModel.findOne({ access: "OWNER" })) ||
          (await roleModel.create({ title: "Owner", access: "OWNER" }));
        userObj.role_id = ownerRole._id;
      }
      userDoc = await userModel.create(userObj);
    }
  }
  else if (type === "login-password") {
    const { password } = req.body;
    userDoc = await userModel.findOne({ phone });
    if (!userDoc) return res.status(400).json({ message: "User not found" });
    if (!userDoc.password) return res.status(400).json({ message: "Password not set for this user" });
    if (bcrypt.compareSync(password, userDoc.password)) {
      return res.status(400).json({ message: "Incorrect password" })
    }
  } else {
    return res.status(400).json({ message: "Invalid type" });
  }
  const token = jwt.sign({ id: userDoc._id, }, process.env.JWT_SECRET);
  res.setCookie("accessToken", token)
  res.json({
    message: "Authentication successful",
    token,
  });
}
