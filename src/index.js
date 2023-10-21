const express = require("express");
const socketio = require('socket.io')
const userRouter = require("./routes/user");
const gameRouter = require("./routes/gameRoute");
const auth = require("./middleware/auth");
const AdminRouter=require('./routes/admin')
const customRoom=require('./routes/customRoom')
const http = require('http')
const  bodyParser = require('body-parser')
const cookieParser = require("cookie-parser");
const path=require('path')
const { generateMessage, } = require('./utils/messages')
const { addUser, removeUser, getUsers,getUser,getUsersInRoom} = require('./utils/users');
const db = require("./db/mysql");
const Filter = require('bad-words')
const async = require("hbs/lib/async");
const hbs=require('hbs')


const app = express();
const port = process.env.PORT || 3001; 

const Server = http.createServer(app)
const io = socketio(Server)

app.set("view engine", "hbs");
app.use(express.static(path.join(__dirname, "../public")));

app.use(express.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());

app.use(userRouter);
app.use(gameRouter);
app.use(AdminRouter);
app.use(customRoom)

hbs.handlebars.registerHelper("ifCond", function(v1,v2,options) {
    console.log(v1,v2)
    if (v1 == v2) {
      return options.fn(this);
    } else {
      return options.inverse(this);
    }
  });

app.get('/chat',auth,function(req,res){
  
 res.sendFile(path.join(__dirname+'../../public/chat.html'));
userRouter.username=req.users.user.name
userRouter.room='global'
 // res.render('chat')
});

app.post('/chatwithFriend',auth,function(req,res){
res.sendFile(path.join(__dirname+'../../public/chat.html'));
userRouter.username=req.users.user.name
//userRouter.room=req.users.user.user_id*req.body.user_id
userRouter.room=req.users.user.user_id>req.body.user_id?req.users.user.user_id+req.body.user_id:req.body.user_id+req.users.user.user_id
})

io.on('connection', async(socket) => {
    console.log('New WebSocket connection')
  const name=userRouter.username
  const room=userRouter.room
  socket.on('join', async(options, callback) => {
      const { error, user } = await addUser(socket.id,name,room)

      if (error) {
          return callback(error)
      }

      socket.join(user.room)
      console.log(user)
     // if(room === 'global'){
       socket.emit('message', generateMessage('Admin', 'Welcome!'))
       socket.broadcast.to(user.room).emit('message', generateMessage('admin', `${user.username} has joined!`))  
      //}
      
      io.to(user.room).emit('roomData', {
          room: user.room,
          users: getUsersInRoom(user.room)
      })

      callback()
  })

  socket.on('sendMessage', (message, callback) => {
      const user = getUser(socket.id)
      const filter = new Filter()

      if (filter.isProfane(message)) {
          return callback('Profanity is not allowed!')
      }

      io.to(user.room).emit('message', generateMessage(user.username, message))
      callback()
  })

  socket.on('disconnect', () => {
      const user = removeUser(socket.id)

      if (user) {
          io.to(user.room).emit('message', generateMessage('Admin', `${user.username} has left!`))
          io.to(user.room).emit('roomData', {
              room: user.room,
              users: getUsersInRoom(user.room)
          })
      }
  })
    
})




//var ioChat = io.of('/chatwithFriend')

//ioChat.on('connection', (socket) => {
//   console.log('New WebSocket connection')
//   const name=userRouter.username
//   const room=userRouter.room
//   socket.on('join', (options, callback) => {
//       const { error, user } = addUser({ id: socket.id,name,room })

//       if (error) {
//           return callback(error)
//       }

//       socket.join(user.room)

//       socket.emit('message', generateMessage('Admin', 'Welcome!'))
//       socket.broadcast.to(user.room).emit('message', generateMessage('Admin', `${user.username} has joined!`))
//       ioChat.to(user.room).emit('roomData', {
//           room: user.room,
//           users: getUsersInRoom(user.room)
//       })

//       callback()
//   })

//   socket.on('sendMessage', (message, callback) => {
//       const user = getUser(socket.id)
//       const filter = new Filter()

//       if (filter.isProfane(message)) {
//           return callback('Profanity is not allowed!')
//       }

//       ioChat.to(user.room).emit('message', generateMessage(user.username, message))
//       callback()
//   })

//   socket.on('disconnect', () => {
//       const user = removeUser(socket.id)

//       if (user) {
//           ioChat.to(user.room).emit('message', generateMessage('Admin', `${user.username} has left!`))
//           ioChat.to(user.room).emit('roomData', {
//               room: user.room,
//               users: getUsersInRoom(user.room)
//           })
//       }
//   })
//})



Server.listen(port, () => {
  console.log("Server is up on port " + port);
});
