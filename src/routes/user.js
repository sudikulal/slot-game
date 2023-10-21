const express = require("express");
const auth = require("../middleware/auth");
const db = require("../db/mysql");
const router = new express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const config = require("../../config/config.json");
const {
  emailValidator,
  passwordValidator,
  phoneValidator,
} = require("../helper/validator");
const async = require("hbs/lib/async");
const { Router } = require("express");
const nodemailer = require('nodemailer');

router.get("/", (req, res) => {
  res.render("index");
});

router.get("/register", (req, res) => {
  res.render("register");
});

router.get("/updatePassword", (req, res) => {
  res.render("updatePassword");
});

router.get("/user/Mainpage", auth, (req, res) => {
  let sql = "select * from users where user_id=?";
  db.query(sql, [req.users.user.user_id], (err, result) => {
    if (err) throw err;
    const user = result[0];
    const token = jwt.sign({ user }, config.JWT_SECRETE_KEY);
    res.cookie("auth_token", token);
    if (result[0].block === 1) {
      return res.json({ msg: "access  denied" });
    }
    res.render("mainPage", {
      admin: result[0].admin,
      coins: result[0].coins,
      total_game: result[0].total_game,
      game_won: result[0].game_won,
      game_loss: result[0].game_loss,
      name: result[0].name,
      jackpot: result[0].jackpot_won,
      time: result[0].time,
    });
  });
});

router.post("/user/register", async (req, res) => {
  let sql =
    "INSERT INTO users(name, email_id,password,phone,gender,coins,time) VALUES(?,?,?,?,?,?,?)";

  const email = emailValidator(req.body.email_id);
  if (email) {
    return res.json(email);
  }

  const password = passwordValidator(req.body.password);
  if (password) {
    return res.json(password);
  }

  const phone = phoneValidator(req.body.phone);
  if (phone) {
    return res.json(phone);
  }

  const hashPass = await bcrypt.hash(req.body.password, 8);
  const time = Date.now();
  db.query(
    sql,
    [
      req.body.name,
      req.body.email_id,
      hashPass,
      req.body.phone,
      req.body.gender,
      2000,
      time,
    ],
    (err, result, fields) => {
      if (err) {
        if (err.code === "ER_DUP_ENTRY") {
          return res.json({ msg: "email_id already taken" });
        }
        return res.send(err);
      }
      res.redirect("/");
    }
  );
});

router.post("/user/login", async (req, res) => {
  let sql = "select * from users where email_id=?";
  db.query(sql, [req.body.email_id], async (err, result, fields) => {
    if (result.length === 0) {
      return res.json({ msg: "credential is invalid" });
    }

    if (err) return res.send(err);

    const isMatch = await bcrypt.compare(req.body.password, result[0].password);

    if (!isMatch) {
      return res.json({ msg: "Unable to Login" });
    }

    if (result[0].block === 1) {
      return res.send({ msg: "access denied" });
    }

    const user = result[0];
    const token = jwt.sign({ user }, config.JWT_SECRETE_KEY);
    res.cookie("auth_token", token);
    res.redirect("/user/mainPage");
  });
});

router.get("/user/profile", auth, (req, res) => {
  if (req.users.user.block === 1) {
    return res.json({ msg: "access  denied" });
  }
  res.render("profile", {
    name: req.users.user.name,
    email_id: req.users.user.email_id,
    phone: req.users.user.phone,
    gender: req.users.user.gender,
    coins: req.users.user.coins,
  });
});

router.get("/user/logout", auth, async (req, res) => {
  const token = null;
  res.cookie("auth_token", token);
  res.redirect("/");
});

router.post("/user/update", auth, async (req, res) => {
  let password = passwordValidator(req.body.password);
  if (password) {
    return res.json(password);
  }

  const name = req.body.name === "" ? req.users.user.name : req.body.name;
  const phone = req.body.phone === "" ? req.users.user.phone : req.body.phone;
  const gender =
    req.body.gender === "" ? req.users.user.gender : req.body.gender;
  password =
    req.body.password === ""
      ? req.users.user.password
      : await bcrypt.hash(req.body.password, 8);

  let check = phoneValidator(req.body.phone);
  if (check) {
    return res.json(check);
  }

  let sql =
    "update users set name=?,password=?,phone=?,gender=? where user_id=?";
  let sqlTwo = "select * from users where user_id=?";

  db.query(
    sql,
    [name, password, phone, gender, req.users.user.user_id],
    (err, result, fields) => {
      if (err) return res.send(err);

      db.query(sqlTwo, [req.users.user.user_id], async (err, result) => {
        if (err) return res.send(err);
        const user = result[0];
        const token = jwt.sign({ user }, config.JWT_SECRETE_KEY);
        res.cookie("auth_token", token);
        res.redirect("/user/mainPage");
      });
    }
  );
});

router.post("/user/updatePassword",(req, res) => {
  let sql = "select * from users where email_id=?";
  let sqlTwo = "update users set otp=? where email_id=?";
  db.query(sql, [req.body.email_id], async (err, result, fields) => {
    if (result.length === 0) {
      return res.json({ msg: "credential is invalid" });
    }

    const otp = Math.floor(Math.random() * (999999 - 100000 + 1)) + 100000;
    router.email = req.body.email_id;
    db.query(sqlTwo, [otp, req.body.email_id]);
    
let mailTransporter = nodemailer.createTransport({
  service: 'gmail',
    auth: {
        user: 'iambroke274@gmail.com',
        pass: '1234@abcd'
    }
});
  
let mailDetails = {
    from:'"no reply" iambroke274@gmail.com',
    to: req.body.email_id,
    subject: 'one time password',
    text: 'your otp is '+otp
};
    
mailTransporter.sendMail(mailDetails, function(err, data) {
    if(err) {
        console.log(err);
    } else {
        console.log('Email sent successfully');
    }
}); 
  });
});
  
router.post("/user/verifyotp", async (req, res) => {
  let sql = "select * from users where email_id=?";
  db.query(sql, [req.body.email_id], (err, result) => {
    if (err) return res.send(err);
    if (result[0].otp == req.body.otp) {
      res.render("setPassword");
    } else {
      res.send("error");
    }
  });
});

router.post("/user/setPassword", async (req, res) => {
  if (req.body.password !== req.body.confirmPassword) {
    return res.send("password doesnt match");
  }
  const password = passwordValidator(req.body.password);
  if (password) {
    return res.json(password);
  }

  const hashPass = await bcrypt.hash(req.body.password, 8);

  sql = "update users set password=? where email_id=?";

  db.query(sql, [hashPass, router.email], (err, result) => {
    if (err) return res.send(err);
    res.render("index");
  });
});

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

router.get("/user/search", auth, (req, res) => {
  let sql =
    `SELECT user_id,name,email_id,coins,total_game,game_won,game_loss,jackpot_won from users where name like '%` +
    req.query.name +
    `%'`;
  // let sql=`SELECT user_id,name,email_id,coins,total_game,game_won,game_loss,jackpot_won from users where name =?`

  Router.searchName = req.query.name;
  db.query(sql, [req.query.name], async (err, result) => {
    if (err) return res.json(err);
    if (result.length == 0) {
      return res.send("user not found");
    }
    for (var i = 0; i < result.length; i++) {
      var dataEle = await getRows(
        `select * from  request_list where user_id=` +
          result[i].user_id +
          ` and request_id=` +
          req.users.user.user_id
      );
      if (dataEle.length == 0) {
        result[i].details = 0;
      } else {
        result[i].details = 1;
        result[i].accept_status = dataEle[0].accept_status;
      }
    }
    res.render("searchedData", {
      result: result,
    });
  });
});

router.get("/user/friends", auth, (req, res) => {
  let sql =
    "select u.user_id,u.name,u.email_id from users u,request_list r where u.user_id=r.request_id and r.accept_status=1 and r.user_id=?";
  db.query(sql, [req.users.user.user_id], (err, result) => {
    if (err) return res.json({ err });
    res.render("friendList", {
      result,
    });
  });
});

router.post("/user/addfriend/:id", auth, (req, res) => {
  // let sql=`select user_id,name from users where user_id=${db.escape(req.params.id)}`
  let sqlTwo = "insert into request_list(user_id,request_id) VALUES(?,?)";
  // db.query(sql,(err,result)=>{
  //  if(err) return res.json({err})
  db.query(sqlTwo, [req.params.id, req.users.user.user_id], (err, result) => {
    if (err) return res.json({ err });
    // res.render('searchedData')
    res.redirect("/user/search/?name=" + Router.searchName);
  });
  // })
});

router.get("/user/friendRequest", auth, (req, res) => {
  let sql =
    "select u.user_id,u.name,u.email_id from users u,request_list r where u.user_id=r.request_id and accept_status=0 and r.user_id=?";
  db.query(sql, [req.users.user.user_id], (err, result) => {
    if (err) return res.json({ err });
    res.render("friendrequests", {
      result: result,
    });
  });
});

router.post("/user/accept/:id", auth, (req, res) => {
  let sql = "update request_list set accept_status=1 where request_id=?";
  db.query(sql, [req.params.id], (err, result) => {
    if (err) return res.json(err);
    let sqlTwo =
      "insert into request_list(user_id,request_id,accept_status) VALUES(?,?,?)";
    db.query(
      sqlTwo,
      [req.params.id, req.users.user.user_id, 1],
      (err, result) => {
        if (err) return res.json({ err });
        res.redirect("/user/friendRequest");
      }
    );
  });
});

router.post("/user/reject/:id", auth, (req, res) => {
  let sql = "delete from request_list where user_id=? and request_id=?  ";
  db.query(sql, [req.users.user.user_id, req.params.id], (err, result) => {
    if (err) return res.json(err);
    res.redirect("/user/friendRequest");
  });
});

router.post("/user/removefriend/:id", auth, (req, res) => {
  let sql = "DELETE FROM request_list WHERE user_id=? and request_id=?";
  db.query(sql, [req.users.user.user_id, req.params.id], (err, result1) => {
    if (err) return res.json({ err });
    let sqlTwo = "delete from request_list WHERE user_id=? and request_id=?";
    db.query(
      sqlTwo,
      [req.params.id, req.users.user.user_id],
      (err, result2) => {
        if (err) return res.json({ err });
        if (result1.affectedRows == 0) {
          res.redirect("/user/search/?name=" + Router.searchName);
        } else {
          res.redirect("/user/friends");
        }
      }
    );
  });
});

router.post("/user/reward", auth, (req, res) => {
  let currentTime = Date.now();
  let sql = "update users set time=?,coins=? where user_id=?";
  const coin = req.users.user.coins + 1000;
  db.query(sql, [currentTime, coin, req.users.user.user_id], (err, result) => {
    if (err) return res.json({ err });
    res.redirect("/user/mainPage");
  });
});

module.exports = router;
