//Import, initialize modules and variables
const express = require('express'),
    http = require('http'),
    app = express(),
    path = require('path');
cookieParser = require('cookie-parser');
logger = require('morgan');
server = http.createServer(app);
    io = require('socket.io')(server);
port = 9000;
router = express.Router();

User = require("./utils/database");
jwt = require('jsonwebtoken');
secret = process.env.JWTSECRET || 'testing secret string is super secret, please change.';


//let indexRouter = require('./routes/index'); Will be deleting
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
//app.use('/', indexRouter); Will be deleting
app.use('/users', usersRouter);
app.use('/login', loginRouter);

app.use(express.static('public'));//Route to html application

let Connected = []// users connected: stores as 
//{socketid: socket.id, uuid:socket.uuid, username:socket.username}

// Prints out token for testing
//console.log(createToken({email: "joe231@gmail.com"}));

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
}).on('connection', (socket) =>//The initial connection
  {

		let addedUser = false;
		let room;

		
		socket.on('login', (username, uuid) => {
			if (addedUser) return;

			socket.username = username;
			socket.uuid = uuid;
			addedUser = true;
			User.setSocketID({username, uuid}, socket.id);
			Connected.push({socketid: socket.id, uuid:socket.uuid, username:socket.username});

			console.log(`User token: ${socket.handshake.query.xAccessToken}`);
			console.log('\\********************************/');
			console.log(`Username#uuid: ${socket.username}#${socket.uuid}`);
			console.log('The current userid is: ' + socket.id);
			console.log('Headers are:');
			console.dir(socket.handshake.headers);
			console.log('/********************************\\');
		});

        socket.on("sendMessage", ({msgObj, roomNo}) =>//Send messages to room
        {
			console.log("Will send to a room");
            //messageOutRoom(msgObj, roomNo);
        });

        socket.on('privateMessage', ({msgObj, username, uuid}) =>//Send messages privately (no room, just one-time messages)
        {
			console.log(msgObj, username, uuid);
            messageOutPrivate(msgObj, username, uuid, socket);
        });

        socket.on('closeRooms', function(socket)//Close all rooms socket is associated with
        {
            closeOutAllRooms(socket);
        });

        socket.on('closeThisRoom',({socket, room}) => //WORK TO BE DONE, ROOM MUST BE PASSED AS ARGUMENT FROM CLIENT
        {
            closeOutRoom(socket, room);
        });

        socket.on('leaveRooms', function(socket)//Socket leaves all rooms it is associated with
        {
            leaveAllRooms(socket);
        });

        socket.on('leaveThisRoom',({socket, room}) =>//WORK TO BE DONE, ROOM MUST BE PASSED AS ARGUMENT FROM CLIENT
        {
            leaveRoom(socket, room);
        });

        socket.on('disconnectWithRooms', function (socket)//Disconnect socket, close all associated rooms
        {
            closeOutAllRooms(socket);
            socket.close();
        });

        socket.on('disconnect', function ()
        {
		
        });

        socket.on("inviteMe", ({socket, username, uuid}) =>//Send an invitation to the user/socket.id whose username/uuid is passed via the client, forces join
        {
            inviteUser(socket, username, uuid);
        });

        socket.on('isTyping', function ()
        {
            setTimeout(function(socket)
            {
                let room = Object.keys(io.sockets.adapter.sids[socket.id]);
                userIsTyping(socket, room);
            }, 3000);
        });

	io.on('disconnect' ,(socket)=>{
		console.log("disconnected socket ", socket.id);
			for(var x in Connected){
				if(socket.id === Connected[x].socketid)
					Connected = Connected.splice(x,1);
			}	
	});
        //socket.join(randomRoom());
        //console.log('rooms', io.sockets.adapter.rooms);//Get info for diagnostic purposes(remove in production) *print all rooms on the server
        //console.log(Object.keys(io.sockets.adapter.sids[socket.id]));//Get info for diagnostic purposes(remove in production) *print all rooms with this socket.id
        //console.log('The current user is: ' + socket.id);//Get info for diagnostic purposes(remove in production)*print the socket id created by a connection
});

server.listen(port, () =>
{

    console.log('Node app is running on port ' + port);

});

function randomRoom()//Create a random room string
{
    return 'Room '+ Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);//Creates one of 22^36 random rooms for temporary usage
}

function messageOutRoom(msgObj, roomNo)//Send a message to a room
{
    console.log("listened for public message: " + msgObj.message + " from ", socket.id);
    socket.to(Object.keys(io.sockets.adapter.sids[socket.id])[roomNo]).broadcast.emit("newMessage", msgObj);// send a message to every user in the specified room
}

function messageOutPrivate(msgObj, username, uuid, socket)//Send a message privately, direct to socket.id
{
    let destSocketID = findSocketId(uuid);// find socket corres to uuid
    console.log("listened for private message: " + msgObj + " to ", destSocketID);
    //io.to(destSocketID).emit('privateMessage', {message:msgObj, from:fuuid});
	io.to(destSocketID).emit('privateMessage', msgObj, socket.username);

}

function findSocketId(uuid){
	
	for(var x in Connected){
		if(uuid === Connected[x].uuid)
			return Connected[x].socketid;
	}
	
}

function inviteUser(socket, username, uuid)//Invite a user to the newly-created room, force joins both inviter and invitee
{
    let recipient = User.setSocketID(username, uuid);//call method from database.js to provide socket.id
    let talkchannel = randomRoom();//initialize talkchannel so both clients can join the same room, only have to call randomRoom() once
    recipient.join(talkchannel);
    socket.join(talkchannel);
}

function userIsTyping(socket, room)//send message that user is typing
{
    io.to(room).emit('notify', User.userInfo() + 'is typing');//Take a look at this, make sure username is getting fetched properly (my execution is probably wrong here)
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