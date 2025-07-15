import { io } from 'socket.io-client';

const socket = io('https://the-lab-phase-back.onrender.com', {
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
});

export default socket;
