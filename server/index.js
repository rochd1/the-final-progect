import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import http from 'http';
import { Server } from 'socket.io';

import authRoutes from './routes/auth.js';
import friendRoutes from './routes/friend.js';
import messageRoutes from './routes/message.js';

dotenv.config();

const app = express();
const server = http.createServer(app);

// Setup CORS for your frontend domain(s)
app.use(cors({
  origin: ['http://localhost:5173', 'https://the-final-progect-front.onrender.com'],
  credentials: true
}));

app.use(express.json());

// Socket.io with CORS
const io = new Server(server, {
  cors: {
    origin: ['http://localhost:5173', 'https://the-final-progect-front.onrender.com'],
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Connect MongoDB
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('✅ Connected to MongoDB'))
.catch(err => console.error('❌ MongoDB connection error:', err));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/friends', friendRoutes);
app.use('/api/messages', messageRoutes);

// Socket.io events
io.on('connection', (socket) => {
  console.log('🟢 User connected:', socket.id);

  socket.on('join', (userId) => {
    socket.join(userId);
    console.log(`➡️ User ${userId} joined their personal room`);
  });

  socket.on('sendMessage', async ({ from, to, content }) => {
    try {
      const Message = (await import('./models/Message.js')).default;
      const msg = await Message.create({ from, to, content });
      io.to(to).emit('receiveMessage', msg);
      io.to(from).emit('receiveMessage', msg); // echo back to sender
    } catch (err) {
      console.error('❌ Error sending message:', err);
    }
  });

  socket.on('typing', (data) => {
    io.to(data.receiverId).emit('typing', data);
  });

  socket.on('disconnect', () => {
    console.log('🔴 User disconnected:', socket.id);
  });
});

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
