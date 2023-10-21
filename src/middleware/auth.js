const jwt = require("jsonwebtoken");
const config = require("../../config/config.json");

const auth = async (req, res, next) => {
  const token = req.cookies["auth_token"];

  if (token == null) {
    return res.sendStatus(403);
  }

  jwt.verify(token, config.JWT_SECRETE_KEY, (err, user) => {
    if (err) return res.status(401).json({ msg: "please authenticate" });
    req.users = user;
    next();
  });
};

module.exports = auth;
