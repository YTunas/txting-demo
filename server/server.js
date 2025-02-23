import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  writeResponseToNodeResponse
} from '@angular/ssr/node';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const serverDistFolder = __dirname;
const browserDistFolder = resolve(serverDistFolder, './dist/browser');

const app = express();
const server = createServer(app);

// CORS configuration
const corsOptions = {
  origin: process.env.NODE_ENV === 'production' 
    ? 'https://txting-demo.onrender.com'
    : 'http://localhost:4200',
  credentials: true
};

app.use(cors(corsOptions));
app.use(express.json());

// Angular SSR setup
const angularApp = new AngularNodeAppEngine();

console.log('Serving static files from:', browserDistFolder);
app.use(express.static(browserDistFolder, {
  maxAge: '1y',
  index: false,
  redirect: false,
}));

// Socket.io setup
const io = new Server(server, {
  cors: corsOptions
});

// Store users in a more structured way
const users = new Map();
const rooms = new Map();
const MAX_ROOM_SIZE = 50;
const MESSAGE_RATE_LIMIT = 5;
const messageTimestamps = new Map();
const activeUsers = new Map(); // Store active socket connections with user info

// Password validation function
function isValidPassword(password) {
  return password.length >= 6 && 
         /[A-Z]/.test(password) && 
         /[0-9]/.test(password);
}

// Helper functions
function sanitizeMessage(message) {
  if (typeof message !== 'string') return '';
  return message.slice(0, 1000).trim(); // Limit message length for safety
}

function isRateLimited(userId) {
  const now = Date.now();
  const userTimestamps = messageTimestamps.get(userId) || [];
  // Remove timestamps older than 1 second
  const recentMessages = userTimestamps.filter(timestamp => now - timestamp < 1000);
  
  if (recentMessages.length >= MESSAGE_RATE_LIMIT) {
    return true;
  }
  
  messageTimestamps.set(userId, [...recentMessages, now]);
  return false;
}

// Registration endpoint with improved logging and validation
app.post('/api/register', (req, res) => {
  try {
    const { username, password } = req.body;
    console.log('Received registration request for username:', username);
    
    if (!username || !password) {
      console.log('Registration failed: Missing credentials');
      return res.status(400).json({ message: 'Username and password are required' });
    }

    if (username.trim().length < 3) {
      console.log('Registration failed: Username too short');
      return res.status(400).json({ message: 'Username must be at least 3 characters long' });
    }

    if (!isValidPassword(password)) {
      console.log('Registration failed: Invalid password format');
      return res.status(400).json({ 
        message: 'Password must be at least 6 characters long, contain one uppercase letter and one number' 
      });
    }

    // Check if username already exists
    if (users.has(username.trim())) {
      console.log('Registration failed: Username exists:', username);
      return res.status(409).json({ message: 'Username already exists' });
    }

    const userId = Math.random().toString(36).substr(2, 9);
    const user = { 
      userId, 
      username: username.trim(), 
      password,
      createdAt: new Date()
    };
    
    users.set(username.trim(), user);
    console.log('Registration successful:', { username: user.username, userId: user.userId });
    
    res.status(201).json({ 
      message: 'User registered successfully',
      userId: user.userId,
      username: user.username
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Internal server error during registration' });
  }
});

// Login endpoint with improved error handling and logging
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  console.log('Login attempt for username:', username);
  
  if (!username || !password) {
    console.log('Login failed: Missing credentials');
    return res.status(400).json({ message: 'Username and password are required' });
  }

  const user = users.get(username);
  console.log('Found user:', user ? 'yes' : 'no');
  
  if (!user || user.password !== password) {
    console.log('Login failed: Invalid credentials');
    return res.status(401).json({ message: 'Invalid username or password' });
  }

  const response = { 
    userId: user.userId,
    username: user.username,
    token: user.userId // In production, use proper JWT tokens
  };

  console.log('Login successful for user:', { username, userId: user.userId });
  res.json(response);
});

// Debug endpoint to check registered users
app.get('/api/debug/users', (req, res) => {
  const userList = Array.from(users.entries()).map(([username, user]) => ({
    username,
    userId: user.userId,
    createdAt: user.createdAt
  }));
  res.json(userList);
});

// Socket authentication middleware
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  let authenticated = false;
  
  users.forEach(user => {
    if (user.userId === token) {
      socket.user = user;
      authenticated = true;
    }
  });

  if (authenticated) {
    next();
  } else {
    next(new Error('Authentication failed'));
  }
});

io.on('connection', (socket) => {
  try {
    const user = users.get(socket.user.username);
    if (user) {
      activeUsers.set(socket.id, {
        userId: user.userId,
        username: user.username
      });
      console.log('User connected:', user.username);
    }

    socket.on('join-room', (roomId) => {
      try {
        if (typeof roomId !== 'string' || !roomId.trim()) {
          throw new Error('Invalid room ID');
        }
        
        if (!rooms.has(roomId)) {
          rooms.set(roomId, new Set());
        }
        
        const room = rooms.get(roomId);
        if (room.size >= MAX_ROOM_SIZE) {
          socket.emit('error', { message: 'Room is full' });
          return;
        }
        
        socket.join(roomId);
        room.add(socket.id);
        
        const userInfo = activeUsers.get(socket.id);
        console.log(`User ${userInfo.username} joined room ${roomId}`);
        
        io.to(roomId).emit('user-joined', {
          userId: socket.id,
          username: userInfo.username
        });
      } catch (error) {
        console.error(`Error joining room: ${error.message}`);
        socket.emit('error', { message: 'Failed to join room' });
      }
    });

    socket.on('send-message', (messageData) => {
      try {
        if (!messageData || !messageData.roomId || !messageData.content) {
          throw new Error('Invalid message data');
        }

        const userInfo = activeUsers.get(socket.id);
        if (!userInfo) {
          throw new Error('User not found');
        }

        if (isRateLimited(userInfo.userId)) {
          socket.emit('error', { message: 'Rate limit exceeded' });
          return;
        }

        const room = rooms.get(messageData.roomId);
        if (!room || !room.has(socket.id)) {
          socket.emit('error', { message: 'Not in room' });
          return;
        }

        const sanitizedMessage = {
          content: sanitizeMessage(messageData.content),
          timestamp: new Date(),
          sender: socket.id,
          username: userInfo.username
        };

        io.to(messageData.roomId).emit('message', sanitizedMessage);
      } catch (error) {
        console.error(`Error sending message: ${error.message}`);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    socket.on('wave', (data) => {
      try {
        if (!data.to) {
          throw new Error('Invalid wave data');
        }

        const fromUser = activeUsers.get(socket.id);
        const toUser = activeUsers.get(data.to);

        if (!fromUser || !toUser) {
          throw new Error('User not found');
        }

        socket.to(data.to).emit('wave', {
          from: socket.id,
          fromUsername: fromUser.username,
          to: data.to,
          timestamp: new Date()
        });

        console.log(`Wave from ${fromUser.username} to ${toUser.username}`);
      } catch (error) {
        console.error(`Error sending wave: ${error.message}`);
        socket.emit('error', { message: 'Failed to send wave' });
      }
    });

    socket.on('disconnect', () => {
      try {
        const userInfo = activeUsers.get(socket.id);
        if (userInfo) {
          console.log('User disconnected:', userInfo.username);
          activeUsers.delete(socket.id);
          messageTimestamps.delete(userInfo.userId);
        }

        rooms.forEach((users, roomId) => {
          if (users.has(socket.id)) {
            users.delete(socket.id);
            if (users.size === 0) {
              rooms.delete(roomId);
            } else {
              io.to(roomId).emit('user-left', {
                userId: socket.id,
                username: userInfo?.username
              });
            }
          }
        });
      } catch (error) {
        console.error(`Error handling disconnect: ${error.message}`);
      }
    });
  } catch (error) {
    console.error('Error in socket connection:', error);
  }
});

// Add catch-all route here for Angular SSR
app.get('*', async (req, res, next) => {
  console.log('SSR request for:', req.url);
  try {
    const response = await angularApp.handle(req);
    if (response) {
      writeResponseToNodeResponse(response, res);
    } else {
      const indexHtml = resolve(browserDistFolder, 'index.html');
      console.log('Serving index.html from:', indexHtml);
      res.sendFile(indexHtml);
    }
  } catch (error) {
    console.error('SSR Error:', error);
    next(error);
  }
});

const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0';

server.listen(PORT, HOST, () => {
  console.log(`Server running on http://${HOST}:${PORT}`);
  console.log('Environment:', process.env.NODE_ENV);
  console.log('Browser folder:', browserDistFolder);
});

// Error handling
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});