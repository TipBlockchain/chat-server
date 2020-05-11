require('dotenv').config()
const express = require('express'),
http = require('http'),
app = express(),
server = http.createServer(app),
io = require('socket.io').listen(server);
const jwt = require('jsonwebtoken');

app.get('/', (req, res) => {

  res.send('Chat Server is running on port 3000')
});

function RefreshClientTokens(socket, payload){
  payload = {name:payload.name};
  //console.log("Payload:", payload);
  const accessToken = jwt.sign(payload, process.env.ACCESS_TOKEN_SECRET, {expiresIn: '15s'});
  const refreshToken = jwt.sign(payload, process.env.REFRESH_TOKEN_SECRET, {expiresIn: '1m'});
  socket.handshake.query.token = accessToken;
  socket.handshake.query.refreshToken = refreshToken;
}

function RefreshTokenVaild(socket){
  console.log("Attempting to check refresh token");
  //console.log(socket.handshake.query.refreshToken);
  let payload = null;

  if (socket.handshake.query && socket.handshake.query.refreshToken){

        jwt.verify(socket.handshake.query.refreshToken, process.env.REFRESH_TOKEN_SECRET, function(err, decoded){

          if(err){
            console.log("Failed to verify refresh token");
            payload = null;
            return;
          }

          console.log("Is vaild refresh token");
          payload = decoded;
          return;
        })
  }

    return payload;
}

io.on('connection', (socket) => {

  console.log('user connected')

  // Called when user tries to log in
  // Creates jwt for user and stores it in their socket
  socket.on('add user', function(userName) {
        console.log("Login attmept detected");

        // Authentication process here

        console.log(userName +" : has joined the chat "  );

        let payload = {name: userName}

        RefreshClientTokens(socket, payload);

        console.log(socket.handshake.query);

        let message = {"numUsers":1}
        io.emit('login', message);
    });

    // Checks if user the correct jwt token and then allows them to send
    // messages.
    socket.on('new message', function(mess) {
      if (socket.handshake.query && socket.handshake.query.token){

            jwt.verify(socket.handshake.query.token, process.env.ACCESS_TOKEN_SECRET, function(err, decoded){

              if(err){
                let payload = RefreshTokenVaild(socket);
                if(payload === null){
                  console.log("Failed to verify token");
                  return;
                }
                else{
                  console.log("Refreshing client tokens");
                  RefreshClientTokens(socket, payload);
                }
              }

              console.log("Token verification successful");
              console.log(mess);
            })
        }
      });


    socket.on('disconnect', function() {
      console.log( ' user has left ')
    });
});

server.listen(3000,()=>{

  console.log('Node app is running on port 3000');
});
