import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Box, Typography, TextField, Button, CircularProgress, Avatar, IconButton } from '@mui/material';
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

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const pendingMessages = useRef(new Set()); // Track pending message IDs

  // Scroll to bottom helper
  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 50);
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
  }, [user._id, token, enqueueSnackbar]);

  // Set selected friend
  useEffect(() => {
    if (!friendId || friends.length === 0) return;
    const friend = friends.find(f => f._id === friendId);
    friend ? setSelectedFriend(friend) : navigate('/friends');
  }, [friendId, friends, navigate]);

  // Load messages with scroll
  useEffect(() => {
    if (!selectedFriend) return;

    const fetchMessages = async () => {
      try {
        setIsLoadingMessages(true);
        const res = await api.get(`/messages/${user._id}/${selectedFriend._id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setMessages(res.data);
        scrollToBottom();
      } catch (error) {
        enqueueSnackbar('Failed to load messages', { variant: 'error' });
      } finally {
        setIsLoadingMessages(false);
      }
    };

    fetchMessages();
  }, [selectedFriend, user._id, token, scrollToBottom, enqueueSnackbar]);

  // Socket.IO with strict duplicate prevention
  useEffect(() => {
    if (!user?._id || !selectedFriend) return;

    const handleReceiveMessage = (msg) => {
      // Skip if this message is already pending
      if (pendingMessages.current.has(msg._id)) return;

      setMessages(prev => {
        // Strict duplicate check
        const isDuplicate = prev.some(m => 
          m._id === msg._id || 
          (m.content === msg.content && 
           m.from === msg.from && 
           Math.abs(new Date(m.timestamp) - new Date(msg.timestamp)) < 1000)
        );
        
        if (!isDuplicate) {
          pendingMessages.current.add(msg._id);
          setTimeout(() => pendingMessages.current.delete(msg._id), 5000);
          return [...prev, msg];
        }
        return prev;
      });
      
      scrollToBottom();
    };

    const handleTyping = (data) => {
      if (data.senderId === selectedFriend._id) {
        setIsTyping(true);
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => setIsTyping(false), 2000);
      }
    };

    socket.connect();
    socket.emit('join', user._id);
    socket.on('receiveMessage', handleReceiveMessage);
    socket.on('typing', handleTyping);

    return () => {
      socket.off('receiveMessage', handleReceiveMessage);
      socket.off('typing', handleTyping);
      clearTimeout(typingTimeoutRef.current);
      socket.disconnect();
    };
  }, [user._id, selectedFriend, scrollToBottom]);

  // Send message with strict duplicate prevention
  const sendMessage = () => {
    if (!input.trim() || !selectedFriend) return;

    const messageId = `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const messageData = {
      _id: messageId,
      from: user._id,
      to: selectedFriend._id,
      content: input.trim(),
      timestamp: new Date().toISOString(),
      isClientSide: true
    };

    // Mark as pending immediately
    pendingMessages.current.add(messageId);

    // Optimistic update
    setMessages(prev => [...prev, messageData]);
    setInput('');
    scrollToBottom();

    // Send to server
    socket.emit('sendMessage', messageData, (ack) => {
      pendingMessages.current.delete(messageId);
      if (ack?.error) {
        setMessages(prev => prev.filter(msg => msg._id !== messageId));
        enqueueSnackbar('Failed to send message', { variant: 'error' });
      }
    });
  };

  // Rest of your component remains the same...
  // [Keep all your existing JSX return code exactly as is]

  return (
    // ... [Your existing JSX return code]
  );
}
