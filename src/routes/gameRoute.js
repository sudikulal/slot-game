const express = require("express");
const auth = require("../middleware/auth");
const db = require("../db/mysql");
const router = new express.Router();
const jwt = require("jsonwebtoken");
const config = require("../../config/config.json");
const constant = require("../global/constant");
const { TOTAL_SEQUENCE } = require("../global/constant");

router.get("/user/sequenceMode", auth, (req, res) => {
  if(req.users.user.block === 1){
    return res.json({msg:'access  denied'})
  } 
  res.render("sequenceMode", {
    coins: req.users.user.coins,
  });
});

router.get("/user/jackpotMode", auth, (req, res) => {
  if(req.users.user.block === 1){
    return res.json({msg:'access  denied'})
  } 
  res.render("jackpotMode", {
    coins: req.users.user.coins,
  });
});

router.post("/user/sequenceMode", auth, async (req, res) => {

  if(req.users.user.block === 1){
    return res.json({msg:'access  denied'})
  } 
  let point = req.users.user.coins;

  if (point < constant.MINIMUM_COIN_SEQUENCE) {
    return res.send("you have no coins");
  }

  point = req.users.user.coins - constant.SEQUENCEMODE_SPIN_COST;
  

  function getRandomNumber() {
    return Math.floor(Math.random() * constant.SEQUENCEMODE_NUMBER_RANGE);
  }

  const numOne = getRandomNumber();
  const numTwo = getRandomNumber();
  const numThree = getRandomNumber();

  let sql = "update users set coins=?,game_won=?,game_loss=?,total_game=? where user_id=?";
  let sqlTwo = "select * from users where user_id=?";
  let sqlThree = "select * from sequence";

  db.query(sqlThree, (err, result) => {
    if (err) return res.json({ err });

    let match = false;

    for (var i = 0; i < constant.TOTAL_SEQUENCE; i++) {
      if (
        result[i].first_num === numOne &&
        result[i].second_num === numTwo &&
        result[i].third_num === numThree
      ) {
        match = true;
      }
    }
    let sequence=result
 let won=req.users.user.game_won
 let loss=req.users.user.game_loss
 var message='you loss'
    if (match === true) {
      point = req.users.user.coins + constant.SEQUENCEMODE_EARNED_COIN;
       won=won + 1
      message='you won'
    }else{
      loss=loss+1
    }
    let total=won+loss

    db.query(sql, [point,won,loss,total,req.users.user.user_id], async (err, result) => {
      if (err) return res.send(err);

      db.query(sqlTwo, [req.users.user.user_id], async (err, result) => {
        if (err) return res.send(err);
        const user = result[0];
        const token = jwt.sign({ user }, config.JWT_SECRETE_KEY);
        res.cookie("auth_token", token);

          res.render("sequenceMode", {
          coins: point,
          numOne,
          numTwo,
          numThree,
          sequence,
          msg:message
        })
      }
      );
    });
  });
});

router.post("/user/jackpotMode", auth, (req, res) => {
  if(req.users.user.block === 1){
    return res.json({msg:'access  denied'})
  } 
  var message="you loss"
  if(req.body.bet === ''){

  var point = req.users.user.coins;
  if (point <constant.MINIMUM_COIN_JACKPOT) {
    return res.send("no coins");
  }

  point = req.users.user.coins - constant.JACKPOTMODE_SPIN_COST;

  var mat = [];
  for (var i = 0; i < 10; i++) {
    mat[i] = [];
    for (var j = 0; j < 3; j++) {
      mat[i][j] = Math.floor(Math.random() * constant.JACKPOTMODE_NUMBER_RANGE);
    }
  }

  const numOne = req.body.num[0];
  const numTwo = req.body.num[1];
  const numThree = req.body.num[2];

  var match = false;

  for (var i = 0; i < 10; i++) {
    if (numOne == mat[i][0] && numTwo == mat[i][1] && numThree == mat[i][2]) {
      match = true;
    }
  }
  var jackpot=req.users.user.jackpot_won
  if (match == true) {
    point = req.users.user.coins + constant.JACKPOTMODE_EARNED_COIN;
    jackpot=jackpot+1
    message="you won jackpot"
  }
  }
  else
  {
    var point = req.users.user.coins;
  if (/*point <constant.MINIMUM_COIN_JACKPOT &&*/ req.body.bet>point) {
    return res.send("no coins");
  }

  if(req.body.bet<1){
    return res.send('invalid bet')
  }

  point = req.users.user.coins - req.body.bet;

  var mat = [];
  for (var i = 0; i < 10; i++) {
    mat[i] = [];
    for (var j = 0; j < 3; j++) {
      mat[i][j] = Math.floor(Math.random() * 3);
    }
  }

  const numOne = req.body.num[0];
  const numTwo = req.body.num[1];
  const numThree = req.body.num[2];

  var match = false;

  for (var i = 0; i < 10; i++) {
    if (numOne == mat[i][0] && numTwo == mat[i][1] && numThree == mat[i][2]) {
      match = true;
    }
  }
  var jackpot=req.users.user.jackpot_won
  if (match == true) {
    point = req.users.user.coins + (req.body.bet * 2);
    jackpot=jackpot+1
    message="you won the bet"
  }
  }

  let sql = "update users set coins=?,jackpot_won=? where user_id=?";
  let sqlTwo = "select * from users where user_id=?";

  db.query(sql, [point,jackpot, req.users.user.user_id], async (err, result) => {
    if (err) return res.send(err);

    db.query(sqlTwo, [req.users.user.user_id], async (err, result) => {
      if (err) return res.send(err);
      const user = result[0];
      const token = await jwt.sign({ user }, config.JWT_SECRETE_KEY);
      res.cookie("auth_token", token);

     
        res.render("jackpotMode", {
        coins: point,
        num:req.body.num,
        msg:message,
        n1: `${mat[0][0]}${mat[0][1]}${mat[0][2]}`,
        n2: `${mat[1][0]}${mat[1][1]}${mat[1][2]}`,
        n3: `${mat[2][0]}${mat[2][1]}${mat[2][2]}`,
        n4: `${mat[3][0]}${mat[3][1]}${mat[3][2]}`,
        n5: `${mat[4][0]}${mat[4][1]}${mat[4][2]}`,
        n6: `${mat[5][0]}${mat[5][1]}${mat[5][2]}`,
        n7: `${mat[6][0]}${mat[6][1]}${mat[6][2]}`,
        n8: `${mat[7][0]}${mat[7][1]}${mat[7][2]}`,
        n9: `${mat[8][0]}${mat[8][1]}${mat[8][2]}`,
        n10: `${mat[9][0]}${mat[9][1]}${mat[9][2]}`,
      });  
    });
  });
});


router.get("/leadBoard", auth, (req, res) => {
  let sql = "select name,coins,user_id from users where block=0 ORDER BY coins DESC LIMIT 10 ";

  db.query(sql, (err, result) => {
    if (err) return res.send(err);
    
    res.render('leaderBoard',{
      result
    });
  });
});


router.get("/leaderboard/view/:id",auth,(req,res)=>{
  let sql=`select name,coins,total_game,game_won,game_loss,jackpot_won from users where user_id=${db.escape(req.params.id)}`
    db.query(sql,(err,result)=>{
      if(err){return res.send(err)}
     res.render('viewProfile',{
       result:result[0]})
    })
})

module.exports = router;

