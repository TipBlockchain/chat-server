//Import, initialize modules and variables
const express = require('express'),
    http = require('http'),
    app = express(),
    path = require('path');
cookieParser = require('cookie-parser');
logger = require('morgan');
server = http.createServer(app);
    io = require('socket.io')(server);
router = express.Router();
User = require("./utils/database");
jwt = require('jsonwebtoken');
secret = process.env.JWTSECRET || 'testing secret string is super secret, please change.';

let usersRouter = require('./routes/users');
let loginRouter = require('./routes/login');

// add middleware to express server
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({
    extended: false
}));

app.use(function (req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
});

app.use(cookieParser());
app.use('/users', usersRouter);
app.use('/login', loginRouter);

app.use(express.static('public'));//Route to html application
// Block other event listeners until JWT has been verifed.
io.use(function(socket, next){
  console.log("io.use() being called");
  console.log(socket.handshake);

  if (socket.handshake && (socket.handshake.query.xAccessToken || socket.handshake.query.authorization)){

    let token = socket.handshake.query.xAccessToken || socket.handshake.query.authorization;

    if (token.startsWith('Bearer ')) {
        // Slice out 'Bearer '
        token = token.slice(7, token.length);
    }
    jwt.verify(token, secret, function(err, decoded) {
      if(err)
		  return next(new Error('Authentication error'));
      socket.decoded = decoded;
	  next();
    });
  } else {
      next(new Error('Authentication error'));
  }
    /**
     * Connect a prospective socket to the server
     * Param: socket
     */
}).on('connection', (socket) =>{
    let addedUser = false;
    socket.emit('doLogin');
    socket.on('login', (username, uuid) => {

        if (addedUser) return;

        socket.username = username;
        socket.uuid = uuid;
        addedUser = true;
        User.setSocketID({username, uuid}, socket.id);

        console.log('\\********************************/');
        console.log(`Username#uuid: ${socket.username}#${socket.uuid}`);
            console.log('The current userid is: ' + socket.id);
            console.log('Headers are:');
            console.dir(socket.handshake.headers);
            console.log('/********************************\\');
        });
    /**
     * Send messages to room
     * Param: msgObj, roomNo
     */
    socket.on("sendMessage", ({msgObj, roomNo}) =>
        {
            messageOutRoom(msgObj, roomNo);
        });
    /**
     * Send messages privately (no room, just one-time messages)
     * Param: msgObj, username, uuid
     */
        socket.on('privateMessage', ({msgObj, username, uuid}) =>
        {
            messageOutPrivate(msgObj, username, uuid, socket);
        });
    /**
     * Close all rooms socket is associated with
     * Param: socket
     */
        socket.on('closeRooms', function(socket)
        {
            closeOutAllRooms(socket);
        });
    /**
     * Close the room specified
     * Param: socket, room
     */
        socket.on('closeThisRoom',({socket, room}) =>
        {
            closeOutRoom(socket, room);
        });
    /**
     * Socket leaves all rooms it is associated with
     * Param: socket
     */
        socket.on('leaveRooms', function(socket)//
        {
            leaveAllRooms(socket);
        });
    /**
     * Send messages privately (no room, just one-time messages)
     * Param: socket, room
     */
        socket.on('leaveThisRoom',({socket, room}) =>//WORK TO BE DONE, ROOM MUST BE PASSED AS ARGUMENT FROM CLIENT
        {
            leaveRoom(socket, room);
        });
    /**
     * Joins socket to room when client decides to
     * Param: socket, room
     */
		socket.on('joinHere', ({socket, room})=>{
			socket.join(room);
		});
    /**
     * Disconnect socket, close all associated rooms
     * Param: socket
     */
        socket.on('disconnectWithRooms', function (socket)
        {
            closeOutAllRooms(socket);
            socket.close();
        });
    /**
     * Disconnect the socket from all connections and the server
     * Param: socket
     */
        socket.on('disconnect', function (socket)
        {
            socket.disconnect(true);
            console.log("remaining sockets");
        });
    /**
     * Send an invitation to the user/socket.id whose username/uuid is passed via the client, forces join
     * Param: socket, username, uuid, roomVal
     */
        socket.on("inviteMe", ({socket, username, uuid, roomVal}) =>//Send an invitation to the user/socket.id whose username/uuid is passed via the client, forces join
        {
			console.log(socket, username, uuid, roomVal);
			inviteUser(socket, username, uuid, roomVal);
        });
    /**
     * Checks if user is typing and broadcasts message to all users in room with that socket
     * Param: socket
     */
        socket.on('isTyping', function ()
        {
            setTimeout(function(socket)
            {
                let room = Object.keys(io.sockets.adapter.sids[socket.id]);
                userIsTyping(socket, room);
            }, 3000);
        });
    });

function randomRoom(socket)//Create a random room string
{
	console.log('Room '+ socket.id + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15));
    return ('Room '+ socket.id + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15));//Creates one of 36^22 random rooms for temporary usage
}

function messageOutRoom(msgObj, roomNo)//Send a message to a room
{
    console.log("listened for public message: " + msgObj);
	io.sockets.in(roomNo).emit("newMessage", msgObj); // 
	// was getting error here
    //socket.to(Object.keys(io.sockets.adapter.sids[socket.id])[roomNo]).broadcast.emit("newMessage", msgObj);// send a message to every user in the specified room
}

function messageOutPrivate(msgObj, username, uuid, socket)//Send a message privately, direct to socket.id
{
    User.userInfo(username, uuid).then((user) => {
        console.log("listened for private message: " + msgObj + " from ", socket.id + " to " + user[0].socketid);
        io.to(user[0].socketid).emit('privateMessage', msgObj, socket.username);
    }).catch(err => {
        console.error(err);
    })
}

function inviteUser(socket, username, uuid, roomVal){
	
	User.userInfo(username,uuid).then((user)=>{
		let talkChannel;
		if(roomVal != null)// checks if there is a room setup
			talkChannel = roomVal;// talkChannel
		else
			talkChannel = randomRoom(socket.id);
		io.to(socket.id).emit('join', talkChannel);// emit join event to client with talkChannel(room)
		io.to(user[0].socketid).emit('join', talkChannel);// emit join event to desired user and destination room
		
	}).catch(err => {
		console.log(err);
	})
}


function userIsTyping(socket, room)//send message that user is typing
{
    io.to(room).emit('notify', socket.username + 'is typing');//Take a look at this, make sure username is getting fetched properly (my execution is probably wrong here)
}

function closeOutAllRooms(socket)//Close all rooms socket is connected to
{
    let i = 0;
    while ((Object.keys(io.sockets.adapter.sids[socket.id])[i]) !== 'undefined')
    {
         io.to(Object.keys(io.sockets.adapter.sids[socket.id])[i]).clear();
         i++;
    }
}

function closeOutRoom(socket, room)//Close out a specific room the socket is connected to
{
    socket.close(room);
}

function leaveAllRooms(socket)//Leave, but dont close all rooms
{
    let i = 0;
    while ((Object.keys(io.sockets.adapter.sids[socket.id])[i]) !== 'undefined')
    {
        io.to(Object.keys(io.sockets.adapter.sids[socket.id])[i]).leave();
        i++;
    }
}

function leaveRoom(socket, room)//Leave, but dont close a specific room
{
    socket.leave(room);
}
module.exports = {app, server};
