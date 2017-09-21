const http = require('http');
const fs = require('fs');
const socketio = require('socket.io');

const port = process.env.PORT || process.env.NODE_PORT || 3000;

// read the client html file into memory
// __dirname in node is the current directory
// (in this case the same folder as the server js file)
const index = fs.readFileSync(`${__dirname}/../client/client.html`);

const onRequest = (request, response) => {
	response.writeHead(200, { 'Content-Type': 'text/html' });
	response.write(index);
	response.end();
};

const app = http.createServer(onRequest).listen(port);

console.log(`Listening on 127.0.0.1: ${port}`);

// pass in the http server into socketio and grab the websocket server as io
const io = socketio(app);

// object to hold all of our connected users
const users = {};

const onJoined = (sock) => {
	const socket = sock;
	
	socket.on('join', (data) => {
	
		// message back to new user
		const joinMsg = {
			name: 'server',
			msg: `There are ${Object.keys(users).length} users online`,
		};
		
		socket.name = data.name;
		socket.emit('msg', joinMsg);
		
		socket.join('room1');
		
		// announcement to everyone in the room         ...where it happens!
		const response = {
			name: 'server',
			msg: `${data.name} has joined the room.`,
		};
		socket.broadcast.to('room1').emit('msg', response);
		
		
		console.log(`${data.name} joined`);
		// success message back to new user
		socket.emit('msg', { name: 'server', msg: 'you joined the room' });
	});
};

const onMsg = (sock) => {
	const socket = sock;
	
	socket.on('msgToServer', (data) => {
		if(data.msg[0] == '/') // Check for various commands
		{
			if(data.msg == '/date') // return the date to the user who asked for it
			{
				const now = new Date();
				socket.emit('msg', { name: 'server', msg: `Date: ${now.getMonth() + 1}\/${now.getDate()}\/${now.getFullYear()}` });
			}
			else if((data.msg[0] == '/') && (data.msg[1] == 'm') && (data.msg[2] == 'e') && (data.msg[3] == ' ')) // I know there are better ways to do this but I'm tired and cant think enough to regex
			{
				io.sockets.in('room1').emit('msg', { name: 'server', msg: `(${socket.name}) *${data.msg.substr(4)}*` });
			}
			else if((data.msg[0] == '/') && (data.msg[1] == 'r') && (data.msg[2] == 'o') && (data.msg[3] == 'l') && (data.msg[4] == 'l') && (data.msg[5] == ' '))
			{
				const numInput = parseInt(data.msg.substr(6));
				const rollOutcome = Math.floor((Math.random() * numInput + 1));
				io.sockets.in('room1').emit('msg', { name: 'server', msg: `${socket.name} rolled a ${rollOutcome} on a ${numInput} sided die` });
			}
			else
			{
				socket.emit('msg', { name: 'server', msg: 'Error: Unrecognized Command' });
			}
		}
		else
		{
			io.sockets.in('room1').emit('msg', { name: socket.name, msg: data.msg });
		}
	});
};


const onDisconnect = (sock) => {
	const socket = sock;
	
	socket.on('disconnect', (data) => {
		//console.log(socket.name + ' Left the chat room');
		io.sockets.in('room1').emit('msg', { name: 'server', msg: `${socket.name} has left the chat room` });
		delete users[socket.id];
		io.sockets.in('room1').emit('msg', { name: 'server', msg: `There are currently: ${Object.keys(users).length} users online`});
	});
};


io.sockets.on('connection', (socket) => {
	console.log('started');
	
	users[socket.id] = {socket: socket};

	onJoined(socket);
	onMsg(socket);
	onDisconnect(socket);
});

console.log('Websocket server started');


















