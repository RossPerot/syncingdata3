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

const checkCollisions = (socket) => {
    const keys = Object.keys(squares);
    for (let i = 0; i < keys.length; i++){
        for (let j = 0; j < keys.length; j++){
            if (i !== j){
                let square1 = squares[keys[i]];
                let square2 = squares[keys[j]];
                if(square1.x < square2.x + square2.width && square1.x + square1.width > square2.x &&
                    square1.y < square2.y + square2.height && square1.height + square1.y > square2.y)
                    {
                        if (square1.seeker === true){
                            square2.x = Math.floor(Math.random()*(700-10)+10);
                            square2.y = Math.floor(Math.random()*(700-10)+10);
                            square1.seeker = false;
                            let key = keys[(Math.floor(Math.random() * keys.length))]
                            squares[key].seeker = true;
                        }
                        else if(square2.seeker === true){
                            square1.x = Math.floor(Math.random()*(700-10)+10);
                            square1.y = Math.floor(Math.random()*(700-10)+10);
                            square2.seeker = false;
                            let key = keys[(Math.floor(Math.random() * keys.length))]
                            squares[key].seeker = true;
                        }
                        socket.emit('collision', squares);
                    }
            }
        }
    }
}

io.on('connection', (sock) => {
    const socket = sock;
    socket.join('room1');
    
    socket.square = {
        hash: xxh.h32(`${socket.id}${new Date().getTime()}`, 0xCAFEBABE).toString(16),
        lastUpdate: new Date().getTime(),
        x: Math.floor(Math.random()*(700-10)+10),
        y: Math.floor(Math.random()*(700-10)+10),
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
      checkCollisions(socket);
      io.sockets.in('room1').emit('updatedMovement', socket.square);
      //socket.broadcast.to('room1').emit('updatedMovement', socket.square);
  });

  socket.on('disconnect', () => {
    io.sockets.in('room1').emit('left', socket.square.hash);  
    delete squares[socket.square.hash];
    socket.leave('room1');
  });
});
