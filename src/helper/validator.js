const validator = require("validator");
const db = require("../db/mysql");

const emailValidator = (email) => {
  if (!validator.isEmail(email)) {
    return { msg: "email_id is invalid" };
  }
};

const passwordValidator = (password) => {
  if (password == "") {
    return null;
  }
  if (
    !validator.isStrongPassword(password, {
      minLength: 8,
      minLowercase: 1,
      minUppercase: 0,
      minNumbers: 1,
      minSymbols: 1,
    })
  ) {
    return { msg: "password must have 8 character " };
  }
};

const phoneValidator = (phone) => {
  if (!validator.isMobilePhone(phone)) {
    return { msg: "invalid phone number" };
  }
};

async function getRows(query) {
  return new Promise((resolve, reject) => {
    db.query(query, (err, rows, fields) => {
      if (err) {
        return reject(err);
      }
      resolve(rows);
    });
  });
}

module.exports = {
  emailValidator,
  passwordValidator,
  phoneValidator,getRows
};
