const express = require("express");
const auth = require("../middleware/auth");
const db = require("../db/mysql");
const router = new express.Router();



router.get("/admin/setSequence", auth, (req, res) => {
  if (req.users.user.admin === 0) return res.json({ msg: "your not an admin" });
  res.render("admin_setSequence");
});


router.get("/admin/detail", auth, async (req, res) => {
  if (req.users.user.admin === 0) return res.json({ msg: "your not an admin" });
  res.render("admin_userData");
});


router.get("/admin/updateUserDetail",auth ,async (req, res) => {
    if (req.users.user.admin === 0) return res.json({ msg: "your not an admin" });
  res.render("admin_updateUser");
});


router.get("/admin/usersDetail", auth, async (req, res) => {
if (req.users.user.admin === 0) return res.json({ msg: "your not an admin" });
  let sql = "select * from users";
  db.query(sql, (err, result) => {
    if (err) return res.json({ err });
    res.render('userDetail',{
      result
    });
  });
});



router.post("/admin/updateUserDetail", auth, async (req, res) => {
  let userObject = {};

  if (req.body.name !== "") {
    userObject.name = req.body.name;
  }
  if (req.body.phone !== "") {
    userObject.phone = req.body.phone;
  }
  if (req.body.gender !== "") {
    userObject.gender = req.body.gender;
  }
  if (req.body.coins !== "") {
    userObject.coins = req.body.coins;
  }
  if (req.body.block !== "") {
    userObject.block = req.body.block;
  }
   if (req.body.admin !== "") {
    userObject.admin = req.body.admin;
  }

  let sql = `update users set ${db.escape(userObject)} where user_id=${db.escape(req.body.user_id)}`;

  db.query(sql, (err, result) => {
    if (err) return res.send(err);
    res.redirect('/admin/usersDetail');
  });

});


router.get("/admin/updateUserDetail/:id", auth, async (req, res) => {
  

  let sql=`select * from users where user_id=${db.escape(req.params.id)}`
  // db.query(sql, (err, result) => {
  //   if (err) return res.send(err);
    db.query(sql,(err,result)=>{
      if(err)return res.send(err)
      res.render('admin_updateUser',{
        user_id:result[0].user_id,
        name:result[0].name,
        phone:result[0].phone,
        gender:result[0].gender,
        coins:result[0].coins,
        block:result[0].block,
        admin:result[0].admin
      })
    })
    //})
  });

  router.post("/admin/blockUnblock/:id", auth, async (req, res) => {
  

  let sql=`select * from users where user_id=${db.escape(req.params.id)}`
  let sqlTwo=`update users set block=? where user_id=${db.escape(req.params.id)}`
  // db.query(sql, (err, result) => {
  //   if (err) return res.send(err);
    db.query(sql,(err,result)=>{
      if(err)return res.send(err)
      if(result[0].block == 1){
        db.query(sqlTwo,0)
      }
      else{
        db.query(sqlTwo,1)
      }
      res.redirect('/admin/usersDetail')
      })
    })
    //})


router.get("/admin/numberSequence", auth, (req, res) => {
  let sql = "select * from sequence";

  db.query(sql, (err, sequence) => {
    if (err) return res.send(err);
    res.render('sequenceDetail',{
      sequence
    });
  });
});


router.post("/admin/createSequence", auth, (req, res) => {
  let sql =
    "insert into sequence(first_num,second_num,third_num)values(?,?,?)";
  const first = req.body.sequence[0];
  const second = req.body.sequence[1];
  const third = req.body.sequence[2];

  db.query(sql, [first, second, third], (err, result) => {
    if (err) return res.send(err);
    res.redirect('/admin/numberSequence');
  });
});


router.post("/admin/setSequence", auth, (req, res) => {
  let sql =
    "update sequence set first_num=?,second_num=?,third_num=? where sequence_id=?";
  const first = req.body.sequence[0];
  const second = req.body.sequence[1];
  const third = req.body.sequence[2];
  const sequence_id = req.body.sequence_id;

  db.query(sql, [first, second, third, sequence_id], (err, result) => {
    if (err) return res.send(err);
    res.redirect('/admin/numberSequence');
  });
});

router.post('/admin/removeSequence/:id',auth,(req,res)=>{
  let sql=`DELETE FROM sequence WHERE sequence_id=${db.escape(req.params.id)}`
  db.query(sql,(err,result)=>{
    if(err) return res.json({err})
      res.redirect('/admin/numberSequence')
    })
  })




router.get('/admin/setSequence/:id',auth,(req,res)=>{
let sql=`select * from sequence where sequence_id=${db.escape(req.params.id)}`
    db.query(sql,(err,result)=>{
      if(err){return res.send(err)}
      res.render('admin_setSequence',{
        sequence_id:result[0].sequence_id,
        first_num:result[0].first_num,
        second_num:result[0].second_num,
        third_num:result[0].third_num
      })
    })
})


module.exports = router;
