import React, { useState, useEffect } from 'react';
import { Routes, Route, useLocation, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ChatPage from './pages/ChatPage';
import SearchUserPage from './pages/SearchUserPage';
import FriendListPage from './pages/FriendListPage'; // ✅
import NavBar from './components/NavBar';

export default function App() {
  const location = useLocation();
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const hideNavBar = location.pathname === '/' || location.pathname === '/register';

  return (
    <>
      {!hideNavBar && <NavBar />}

      <Routes>
        <Route path="/friends" element={<FriendListPage />} />
        <Route path="/chat" element={<ChatPage />} />
        <Route path="/chat/:friendId" element={<ChatPage />} />
        <Route path="/search" element={<SearchUserPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/" element={<LoginPage />} />
        <Route path="*" element={<Navigate to="/friends" replace />} />
      </Routes>
    </>
  );
}
