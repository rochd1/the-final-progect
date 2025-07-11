import React from 'react';
import { Routes, Route } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ChatPage from './pages/ChatPage';
import SearchUserPage from './pages/SearchUserPage';
import { io } from 'socket.io-client';
const socket = io();

const App = () => {
  return (
    <Routes>
      <Route path="/search" element={<SearchUserPage />} />
      <Route path="/" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/chat" element={<ChatPage />} />
    </Routes>
  );
};

export default App;
