// 📁 server.js
import express from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import cors from 'cors';
import http from 'http';
import { Server } from 'socket.io';

import authRoutes from './routes/auth.js';
import friendRoutes from './routes/friends.js';
import messageRoutes from './routes/messages.js';

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: 'http://localhost:5173', credentials: true }
});

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/auth', authRoutes);
app.use('/friends', friendRoutes);
app.use('/messages', messageRoutes);

// Socket.io
io.on('connection', (socket) => {
  console.log('🟢 User connected:', socket.id);

  // When a user joins their personal room
  socket.on('join', (userId) => {
    socket.join(userId);
    console.log(`👤 User ${userId} joined their room`);
  });

  // Real-time messaging
  socket.on('sendMessage', async ({ from, to, content }) => {
    try {
      const message = await Message.create({ from, to, content }); // 👈 'read' will default to false
      io.to(to).emit('receiveMessage', message);  // Send to recipient
      io.to(from).emit('receiveMessage', message); // Echo to sender (optional)
    } catch (err) {
      console.error('❌ Error saving message:', err);
    }
  });

  socket.on('disconnect', () => {
    console.log('🔴 User disconnected:', socket.id);
  });
});
// MongoDB
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => {
  console.log('✅ MongoDB connected');
  server.listen(5000, () => {
    console.log('🚀 Server running on http://localhost:5000');
});
}).catch(err => console.error('❌ DB Connection Error:', err));
