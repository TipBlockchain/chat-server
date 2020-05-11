let receiveMessage = document.getElementById('msgReceived')// used as holder to add message to scree
let sendbtn = document.getElementById('send');
let privatebtn = document.getElementById('privateMsg');
var socket = io();

socket.on('newMessage', (msgObj) =>{
    console.log("newMsg event ", msgObj.message);
    receiveMessage.innerHTML = msgObj.message;

});
 
socket.on('privateMessage', (msgObj)=>{
	console.log("received msg on privateMessage ", msgObj);
	
});

privatebtn.onclick = () =>{
	let myMsg = document.getElementById('myText').value;
	console.log("clicked on privatebtn");
	socket.emit('privateMessage', {"msgObj":myMsg, "username":"test", "uuid":4444});	
}

sendbtn.onclick = () => {
    let myMsg = document.getElementById('myText').value;// message to send from input
    let msgObj = myMsg;
	console.log("Clicked on button sending ", myMsg);
	socket.emit("sendMessage",msgObj);
	//io.emit('checkId');
	//socket.emit("checkId");
}

