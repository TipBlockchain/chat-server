const express = require('express'),
http = require('http'),
app = express(),
server = http.createServer(app),
io = require('socket.io').listen(server);

app.get('/', (req, res) => {

res.send('Chat Server is running on port 3000')
});

io.on('connection', (socket) => {

  console.log('user connected')

  socket.on('add user', function(userName) {
        console.log("Login attmept detected");

        console.log(userName +" : has joined the chat "  );
        let message = {"numUsers":1}
        io.emit('login', message);
        //socket.broadcast.emit('userjoinedthechat',userNickname +" : has joined the chat ");
    });

    socket.on('new message', function(mess) {
          //console.log(socket);
          console.log(mess);
      });


    socket.on('disconnect', function() {
      console.log( ' user has left ')
      //socket.broadcast.emit("userdisconnect"," user has left ")
    });

    /*
    socket.on('messagedetection', (senderNickname,messageContent) => {

       //log the message in console

       console.log(senderNickname+" :" +messageContent)
        //create a message object
       let  message = {"message":messageContent, "senderNickname":senderNickname}
          // send the message to the client side
       io.emit('message', message );

      });
      */
});

server.listen(3000,()=>{

  console.log('Node app is running on port 3000');
});
