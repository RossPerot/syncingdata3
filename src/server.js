const http = require('http');
const fs = require('fs');
const socketio = require('socket.io');
const xxh = require('xxhashjs');

const port = process.env.PORT || process.env.NODE_PORT || 3000;

const index = fs.readFileSync(`${__dirname}/../client/index.html`);

const onRequest = (request, response) => {
  response.writeHead(200, { 'Content-Type': 'text/html' });
  response.write(index);
  response.end();
};

const app = http.createServer(onRequest).listen(port);

console.log(`Listening on 127.0.0.1: ${port}`);

const io = socketio(app);

const squares = {};

const calcGravity = () => {
  const keys = Object.keys(squares);
  for (let i = 0; i < keys.length; i++) {
    squares[keys[i]].accelY += 10;
  }
  io.sockets.in('room1').emit('gravity', squares);
};

io.on('connection', (sock) => {
  const socket = sock;
  socket.join('room1');

  const startX = Math.floor(Math.random() * 700);
  const startY = 0;

  socket.square = {
    hash: xxh.h32(`${socket.id}${new Date().getTime()}`, 0xCAFEBABE).toString(16),
    lastUpdate: new Date().getTime(),
    x: startX,
    y: startY,
    prevX: startX,
    prevY: startY,
    destX: startX,
    destY: startY,
    accelY: 0,
    alpha: 0,
    height: 50,
    width: 50,
    seeker: false,
  };

  squares[socket.square.hash] = socket.square;
  if (Object.keys(squares).length === 1) {
    squares[socket.square.hash].seeker = true;
    socket.square.seeker = true;
  }
  socket.emit('joined', socket.square);

  socket.on('moveUpdate', (data) => {
    socket.square = data;
    socket.square.lastUpdate = new Date().getTime();
    squares[data.hash] = socket.square;
    // checkCollisions(socket);
    io.sockets.in('room1').emit('updatedMovement', socket.square);
    // socket.broadcast.to('room1').emit('updatedMovement', socket.square);
  });

  socket.on('disconnect', () => {
    io.sockets.in('room1').emit('left', socket.square.hash);
    delete squares[socket.square.hash];
    socket.leave('room1');
  });

  setInterval(() => {
    calcGravity(socket);
  }, 50);
});
