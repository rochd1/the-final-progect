import React, { useEffect, useState, useRef, useCallback, useLayoutEffect } from 'react';
import { 
  Box, 
  Typography, 
  TextField, 
  Button, 
  CircularProgress,
  Avatar,
  IconButton
} from '@mui/material';
import { Send as SendIcon, MoreVert as MoreVertIcon } from '@mui/icons-material';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api';
import { formatDistanceToNow } from 'date-fns';
import { useSnackbar } from 'notistack';
import socket from '../socket';

export default function ChatPage() {
  const { friendId } = useParams();
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const token = localStorage.getItem('token');

  const [friends, setFriends] = useState([]);
  const [selectedFriend, setSelectedFriend] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoadingFriends, setIsLoadingFriends] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [typingTimeoutRef, setTypingTimeoutRef] = useState(null);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const isMountedRef = useRef(true);

  // Improved scroll with instant behavior
  const scrollToBottom = useCallback(() => {
    if (messagesEndRef.current && isMountedRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'auto' });
    }
  }, []);

  // Load friends
  useEffect(() => {
    if (!user?._id) return;

    const fetchFriends = async () => {
      try {
        setIsLoadingFriends(true);
        const res = await api.get(`/friends/${user._id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setFriends(res.data);
      } catch (error) {
        enqueueSnackbar('Failed to load friends', { variant: 'error' });
      } finally {
        setIsLoadingFriends(false);
      }
    };

    fetchFriends();
    return () => { isMountedRef.current = false };
  }, [user._id, token, enqueueSnackbar]);

  // Set selected friend
  useEffect(() => {
    if (!friendId || friends.length === 0) return;
    const friend = friends.find(f => f._id === friendId);
    friend ? setSelectedFriend(friend) : navigate('/friends');
  }, [friendId, friends, navigate]);

  // Load messages with reliable scroll
  useEffect(() => {
    if (!selectedFriend) return;

    const fetchMessages = async () => {
      try {
        setIsLoadingMessages(true);
        const res = await api.get(`/messages/${user._id}/${selectedFriend._id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setMessages(res.data);
        // Double ensure scroll after messages load
        requestAnimationFrame(() => scrollToBottom());
      } catch (error) {
        enqueueSnackbar('Failed to load messages', { variant: 'error' });
      } finally {
        setIsLoadingMessages(false);
      }
    };

    fetchMessages();
  }, [selectedFriend, user._id, token, scrollToBottom, enqueueSnackbar]);

  // Socket.IO with duplicate prevention
  useEffect(() => {
    if (!user?._id || !selectedFriend) return;

    const handleReceiveMessage = (msg) => {
      setMessages(prev => {
        // Prevent duplicates by checking message ID and content
        const exists = prev.some(m => 
          m._id === msg._id || 
          (m.content === msg.content && m.timestamp === msg.timestamp)
        );
        return exists ? prev : [...prev, msg];
      });
      scrollToBottom();
    };

    const handleTyping = (data) => {
      if (data.senderId === selectedFriend._id) {
        setIsTyping(true);
        clearTimeout(typingTimeoutRef);
        setTypingTimeoutRef(setTimeout(() => setIsTyping(false), 2000));
      }
    };

    socket.connect();
    socket.emit('join', user._id);
    socket.on('receiveMessage', handleReceiveMessage);
    socket.on('typing', handleTyping);

    return () => {
      socket.off('receiveMessage', handleReceiveMessage);
      socket.off('typing', handleTyping);
      clearTimeout(typingTimeoutRef);
    };
  }, [user._id, selectedFriend, scrollToBottom]);

  // Send message without duplicates
  const sendMessage = () => {
    if (!input.trim() || !selectedFriend) return;

    const tempId = `temp-${Date.now()}`;
    const messageData = {
      _id: tempId,
      from: user._id,
      to: selectedFriend._id,
      content: input.trim(),
      timestamp: new Date().toISOString(),
    };

    // Optimistic update
    setMessages(prev => [...prev, messageData]);
    setInput('');
    inputRef.current?.focus();
    
    // Immediate scroll
    requestAnimationFrame(() => scrollToBottom());

    // Socket emit with acknowledgement
    socket.emit('sendMessage', messageData, (ack) => {
      if (ack?.error) {
        setMessages(prev => prev.filter(msg => msg._id !== tempId));
        enqueueSnackbar('Failed to send message', { variant: 'error' });
      }
    });
  };

  // Rest of your component code remains the same...
  // [Keep all your existing JSX return code exactly as is]
  // Only the above logic has been modified

  return (
    // ... [Your existing JSX return code]
  );
}
