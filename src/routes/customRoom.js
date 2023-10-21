const express = require("express");
const auth = require("../middleware/auth");
const db = require("../db/mysql");
const router = new express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const config = require("../../config/config.json");
const {
  getRows
} = require("../helper/validator");
const async = require("hbs/lib/async");
const { Router } = require("express");


router.get("/customRoom",auth, (req, res) => {
 // let price = prompt('enter the winning price', 100);
  res.render('createRoom');
});

router.get('/customRoom/room',auth,(req,res)=>{
  let sql='select * from room where host_id=?'
  let sqlTwo="select u.user_id,u.name,u.email_id,r.invite from users u,request_list r where u.user_id=r.user_id and r.accept_status=1 and r.request_id=?";
  db.query(sql,[req.users.user.user_id],(err,result1)=>{
    if (err) return res.json({ err });
    if(result1.length == 0){
      return res.send('room not exist')
    }
    db.query(sqlTwo, [req.users.user.user_id],async (err, result) => {
    if (err) return res.json({ err });
    for (var i = 0; i < result.length; i++) {
      let status=await getRows('select * from room_players where  player_id='+result[i].user_id+' and room_id='+result1[0].room_id)

      if (status.length == 0) {
        result[i].status = 0;
      } else {
        result[i].status = 1;
      }
    }
    res.render("customRoom", {
      result,
      room:result1[0].room_id
    });
  });
  })
})


router.post('/customRoom/room',auth,(req,res)=>{
  if(req.users.user.coins<2000){
    return res.send('not enough coins')
  }
let sql='insert into room(room_code,join_amount,winning_price,total_player,host_name,host_id)values(?,?,?,?,?,?)'

if(req.body.winAmount>req.users.user.coins){
  return res.send('not enough coins to set win amount')
}
let roomCode=Math.random().toString(36).substr(2, 5)

let data=[roomCode,req.body.joinAmount,req.body.winAmount,req.body.totalPlayer,req.users.user.name,req.users.user.user_id]

db.query(sql,data,async(err,result)=>{
  if (err) {
    if (err.code === "ER_DUP_ENTRY") {
      return res.json({ msg: "room code is not available" });
    }
    return res.send(err);
  }
  let coin=req.users.user.coins - 2000
  getRows('update users set coins='+coin+' where user_id='+req.users.user.user_id)


const detail =await getRows('select * from users where user_id='+req.users.user.user_id);
const user = detail[0];
    const token = jwt.sign({ user }, config.JWT_SECRETE_KEY);
    res.cookie("auth_token", token);
  res.redirect('/customRoom/room') 
})
})

 
router.post('/invite/:id',auth,(req,res)=>{
let sql='update request_list set invite=1 where user_id=? and request_id=?'
db.query(sql,[req.params.id,req.users.user.user_id],(err,result)=>{
  if (err) return res.json({ err });
  res.redirect('/customRoom/room')
})
}) 

router.post('/cancel/:id',auth,(req,res)=>{
  let sql='update request_list set invite=0 where user_id=? and request_id=?'
  db.query(sql,[req.params.id,req.users.user.user_id],(err,result)=>{
    if (err) return res.json({ err });
    res.redirect('/customRoom/room')
  })
  })

router.get('/customRoom/invitation',auth,(req,res)=>{
  let sql ="select u.user_id,u.name,u.email_id,c.room_id,c.room_code,c.join_amount from users u,request_list r,room c where u.user_id=r.request_id and invite=1 and r.user_id=?";
  db.query(sql, [req.users.user.user_id], (err, result) => {
    if (err) return res.json({ err });
    res.render("roomInvite", {
      result: result,
    });
  });
}) 



router.post('/customRoom/accept/:id',auth,async(req,res)=>{
  let sql='insert into room_players(room_id,room_code,player_id,accept_status)values(?,?,?,?)'
  let sqlTwo='select * from room where room_id=?'
  let check=await getRows('select * from room_players where room_id='+req.params.id)
  db.query(sqlTwo,[req.params.id],async(err,result)=>{
    if(err)return res.json({err})
    if(check.length >= result[0].total_player){
      return res.send('room is full')
    }
    getRows('update request_list set invite=0 where user_id='+req.users.user.user_id+' and request_id='+result[0].host_id)
    let coin=req.users.user.coins - result[0].join_amount
    getRows('update users set coins='+coin+' where user_id='+req.users.user.user_id)

    let host=await getRows('select coins from users where user_id='+result[0].host_id)
    let host_coins=host[0].coins + (result[0].join_amount*1)
    getRows('update users set coins='+host_coins+' where user_id='+result[0].host_id)

   let data=[result[0].room_id,result[0].room_code,req.users.user.user_id,1]
    db.query(sql,data,(err,result)=>{
      if(err)return res.send(err)
      res.redirect('/customRoom/game/'+req.params.id)
    })
  }) 
})

router.post('/customRoom/joinRoom',auth,async(req,res)=>{
  let sql='insert into room_players(room_id,room_code,player_id,accept_status)values(?,?,?,?)'
  let sqlTwo='select * from room where room_code=?'
  let check=await getRows('select * from room_players where room_code=\''+req.body.joinRoom+'\'')
  db.query(sqlTwo,[req.body.joinRoom],async(err,result)=>{
    if(err)return res.json({err})
    if(result.length == 0){
      return res.send('invalid room')
    }
    for(var i=0;i<check.length;i++){
      if(check[i].player_id == req.users.user.user_id){
        return res.redirect('/customRoom/game/'+result[0].room_id)
      }
    }
    if(check.length >= result[0].total_player){
      return res.send('room is full')
    }
    let coin=req.users.user.coins - result[0].join_amount
    getRows('update users set coins='+coin+' where user_id='+req.users.user.user_id)
    
    let host=await getRows('select coins from users where user_id='+result[0].host_id)
    let host_coins=host[0].coins + (result[0].join_amount*1)
    getRows('update users set coins='+host_coins+' where user_id='+result[0].host_id)

   let data=[result[0].room_id,result[0].room_code,req.users.user.user_id,1]
    db.query(sql,data,(err,result1)=>{
      if(err)return res.send(err)
      res.redirect('/customRoom/game/'+result[0].room_id)
    })
  }) 
}) 
   
router.post('/customRoom/reject/:id',auth,async(req,res)=>{
  let sql='update request_list set invite=0 where user_id=? and request_id=?'
  db.query(sql,[req.users.user.user_id,req.params.id],(err,result)=>{
    if(err) return res.send(err)
    res.redirect('/customRoom/invitation')
  })
})
 
router.post('/customRoom/start',auth,async(req,res)=>{
  let result=await getRows('select * from room_players where room_id='+req.body.room_id)
  res.render('customGame',{
    result,
    host:1,
    roomid:req.body.room_id
  }) 
})


router.post('/exitRoom',auth,async(req,res)=>{
  let sql='delete from room_players where player_id=?'
  db.query(sql,[req.users.user.user_id],(err,result)=>{
    if(err) return res.send(err)
    res.redirect('/user/Mainpage')
  })
})

var num=[]
router.post('/customRoom/starGame',auth,async(req,res)=>{
  let room=await getRows('select room_id from room where host_id='+req.users.user.user_id)
   let sql='select player_id,number from room_players where room_id=?'
   let won=await getRows('update room_players set won=0')
  db.query(sql,[room[0].room_id],(err,result)=>{
    if(err) return res.send(err)
    // let index=Math.floor(Math.random() * result.length)
    // getRows('update room_players set won=1 where number='+result[index].number)
    // res.redirect('/customRoom/game/'+room[0].room_id)
    
    

     for(var i=0;i<10;i++){
      num[i]=Math.floor( Math.random()*300 ) + 100
    }
    for(var i=0;i<result.length;i++){
    for(var j=0;j<10;j++){
      if(result[i].number==num[j]){
        getRows('update room_players set won=1 where player_id='+result[i].player_id)
      }
    }  
  }
  res.redirect('/customRoom/game/'+room[0].room_id)
  })
})

 
router.post('/customRoom/closeRoom/:id',auth,async(req,res)=>{
  let room_detail=await getRows('select * from room where room_id='+req.params.id)
  let room_player=await getRows('select * from room_players where room_id='+req.params.id)
  let host_coins=await getRows('select coins from users where user_id='+req.users.user.user_id)
  let won_player=await getRows('select user_id,coins from users u,room_players r where u.user_id=r.player_id and r.won=1 and r.room_id='+req.params.id)
  
  if(room_player.length !== 0 && won_player.length !==0)
  {
  let h_coin=host_coins[0].coins - room_detail[0].winning_price
  let w_coins=won_player[0].coins + (room_detail[0].winning_price * 1)

  getRows('update users set coins='+h_coin+' where user_id='+req.users.user.user_id)
  getRows('update users set coins='+w_coins+' where user_id='+won_player[0].user_id)
  }
  let sql='delete from room where host_id=?'
  db.query(sql,[req.users.user.user_id],(err,result)=>{
    if(err) return res.send(err)
    res.redirect('/customRoom')
  })
}) 
 

router.get('/customRoom/game/:id',auth,(req,res)=>{
  let sql='select * from room_players r,users u  where r.player_id=u.user_id and r.room_id=?'
  db.query(sql,[req.params.id],async(err,result)=>{
    if(err)return res.send(err)
    for(var i=0;i<result.length;i++){
    if(result[i].player_id == req.users.user.user_id){
      result[i].valid=1
    }else{
      result[i].valid=0
    }  
    }
    let host=await getRows('select host_id from room where room_id='+req.params.id)

    if(host[0].host_id === req.users.user.user_id){
      res.render('customGame',{
        result,
        host:1,
        roomid:req.params.id,
        num
      })
    }else{
     res.render('customGame',{
      result,
      num
    }) 
    }
  }) 
})

     
router.post('/customRoom/number/:id',auth,(req,res)=>{
  let sql='update room_players set number=? where player_id=?'
  db.query(sql,[req.body.number,req.params.id],(err,result)=>{
    if(err)return res.send(err)
    res.redirect('/customRoom/game/'+req.body.room)
  })
})
 

module.exports = router;