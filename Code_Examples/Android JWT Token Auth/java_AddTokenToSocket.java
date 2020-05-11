// Add token to socket in java

// Create opts object with token as apart of it.
 IO.Options opts = new IO.Options();
 opts.forceNew = true;
 opts.query = "xAccessToken=" + "put token here";

// Set socket to a new socket with opts object passed in.
 try {
     mSocket = IO.socket(Constants.CHAT_SERVER_URL, opts);
 } catch (URISyntaxException e) {
     throw new RuntimeException(e);
 }

// Token needs to be attached to socket before connection.
mSocket.connect();
