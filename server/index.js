import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import http from 'http';
import { Server } from 'socket.io';
import authRoutes from './routes/auth.js';
import friendRoutes from './routes/friend.js';
import messageRoutes from './routes/message.js';
import Message from './models/Message.js';

dotenv.config();
const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

app.use(cors());
app.use(express.json());


mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('connected to database'))
  .catch(err => console.error(err));


app.use('/api/auth', authRoutes);
app.use('/api/friends', friendRoutes);
app.use('/api/messages', messageRoutes);

app.get('/', (req , res)=>{
  res.send('hello world')
})


// === 🔌 SOCKET.IO CONNECTION ===
io.on('connection', (socket) => {
  console.log('🟢 User connected:', socket.id);

  // Join room by user ID
  socket.on('join', (userId) => {
    socket.join(userId);
    console.log(`🛏️ ${userId} joined their room`);
  });

  // Handle sending messages
  socket.on('sendMessage', async ({ from, to, content }) => {
    const msg = await Message.create({ from, to, content });
    io.to(to).emit('receiveMessage', msg);
    io.to(from).emit('receiveMessage', msg); // echo back to sender
  });

  socket.on('disconnect', () => {
    console.log('🔴 User disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});





