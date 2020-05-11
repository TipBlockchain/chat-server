require('dotenv').config()
const express = require('express'),
http = require('http'),
app = express(),
server = http.createServer(app),
io = require('socket.io').listen(server);

const jwt = require('jsonwebtoken');
const secret = process.env.JWTSECRET;

// Prints out token for testing
//console.log(createToken({email: "joe231@gmail.com"}));

// Block other event listeners until JWT has been verifed.
io.use(function(socket, next){
  console.log("io.use() being called");

  // For testing
  //socket.handshake.query.xAccessToken = createToken({email: "joe231@gmail.com"});

  console.log(socket.handshake);

  if (socket.handshake && (socket.handshake.query.xAccessToken || socket.handshake.query.authorization)){

    let token = socket.handshake.query.xAccessToken || socket.handshake.query.authorization;

    if (token.startsWith('Bearer ')) {
        // Slice out 'Bearer '
        token = token.slice(7, token.length);
    }

    jwt.verify(token, secret, function(err, decoded) {
      if(err) return next(new Error('Authentication error'));
      socket.decoded = decoded;
      next();
    });
  } else {
      next(new Error('Authentication error'));
  }

})

// Wont be called until io.use() has verifed JWT
// Not apart if authentication process
io.on('connection', function(socket) {
    console.log("Authentication successful!");
});

//Creates JWT 
function createToken(userinfo) {
    return jwt.sign({username: userinfo.email},
        secret,
        {
            expiresIn: '24h' // expires in 24 hours
        }
    );
}

server.listen(3000,()=>{

  console.log('Node app is running on port 3000');
});
