const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');

let io = null;

/**
 * Initialize Socket.io on the HTTP server. Authenticates with JWT and joins each user to room "user:userId".
 * So when a message is sent to receiverId, we emit to room "user:receiverId" and they get it in real time.
 */
function initSocket(httpServer) {
  const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:3001',
    'http://adwebtest.online',
    'https://adwebtest.online',
    'http://www.adwebtest.online',
    'https://www.adwebtest.online',
    process.env.FRONTEND_URL
  ].filter(Boolean);

  io = new Server(httpServer, {
    cors: {
      origin: allowedOrigins.length ? allowedOrigins : true,
      credentials: true
    },
    pingTimeout: 60000,
    pingInterval: 25000
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.query?.token;
    if (!token) {
      return next(new Error('Authentication required'));
    }
    const raw = token.startsWith('Bearer ') ? token.slice(7) : token;
    try {
      const decoded = jwt.verify(raw, process.env.JWT_SECRET);
      socket.userId = decoded.id;
      next();
    } catch (err) {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    const room = `user:${socket.userId}`;
    socket.join(room);
    socket.emit('connected', { userId: socket.userId });
    socket.on('disconnect', () => {});
  });

  return io;
}

function getIO() {
  return io;
}

module.exports = { initSocket, getIO };
