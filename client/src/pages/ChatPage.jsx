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
  const pendingMessages = useRef(new Set());

  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 50);
  }, []);

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

  useEffect(() => {
    if (!friendId || friends.length === 0) return;
    const friend = friends.find(f => f._id === friendId);
    friend ? setSelectedFriend(friend) : navigate('/friends');
  }, [friendId, friends, navigate]);

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

  useEffect(() => {
    if (!user?._id || !selectedFriend) return;

    const handleReceiveMessage = (msg) => {
      if (pendingMessages.current.has(msg._id)) return;

      setMessages(prev => {
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

  const handleInputChange = (e) => {
    setInput(e.target.value);
    if (selectedFriend) {
      socket.emit('typing', {
        senderId: user._id,
        receiverId: selectedFriend._id,
      });
    }
  };

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

    pendingMessages.current.add(messageId);
    setMessages(prev => [...prev, messageData]);
    setInput('');
    scrollToBottom();

    socket.emit('sendMessage', messageData, (ack) => {
      pendingMessages.current.delete(messageId);
      if (ack?.error) {
        setMessages(prev => prev.filter(msg => msg._id !== messageId));
        enqueueSnackbar('Failed to send message', { variant: 'error' });
      }
    });
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (isLoadingFriends) {
    return (
      <Box p={4} textAlign="center">
        <Typography>Loading friends...</Typography>
      </Box>
    );
  }

  if (!selectedFriend) {
    return (
      <Box p={4} textAlign="center">
        <Typography>Select a friend from the list</Typography>
        <Button onClick={() => navigate('/friends')} sx={{ mt: 2 }}>
          Go to Friends
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh', bgcolor: 'background.paper' }}>
      <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box display="flex" alignItems="center">
          <Avatar alt={selectedFriend.username} src={selectedFriend.avatarUrl} sx={{ mr: 2 }} />
          <Box>
            <Typography variant="h6" fontWeight="bold">{selectedFriend.username}</Typography>
            <Typography variant="body2" color="text.secondary">
              {isTyping ? <span style={{ color: 'primary.main' }}>typing...</span> : selectedFriend.email}
            </Typography>
          </Box>
        </Box>
        <IconButton>
          <MoreVertIcon />
        </IconButton>
      </Box>

      <Box sx={{ flexGrow: 1, p: 2, overflowY: 'auto', display: 'flex', flexDirection: 'column', backgroundImage: 'linear-gradient(rgba(255,255,255,0.05), rgba(255,255,255,0.05))' }}>
        {isLoadingMessages ? (
          <Box display="flex" justifyContent="center" alignItems="center" height="100%">
            <CircularProgress />
          </Box>
        ) : messages.length === 0 ? (
          <Box textAlign="center" mt={4}>
            <Typography>No messages yet. Start the conversation!</Typography>
          </Box>
        ) : (
          messages.map(msg => (
            <Box key={msg._id} sx={{ mb: 2, display: 'flex', flexDirection: msg.from === user._id ? 'row-reverse' : 'row', alignItems: 'center' }}>
              <Box sx={{
                maxWidth: '70%',
                p: 1.5,
                borderRadius: 2,
                bgcolor: msg.from === user._id ? 'primary.main' : 'grey.200',
                color: msg.from === user._id ? 'primary.contrastText' : 'text.primary',
                position: 'relative'
              }}>
                <Typography>{msg.content}</Typography>
                <Typography variant="caption" sx={{ opacity: 0.7 }}>
                  {formatDistanceToNow(new Date(msg.timestamp), { addSuffix: true })}
                </Typography>
              </Box>
            </Box>
          ))
        )}
        <div ref={messagesEndRef} />
      </Box>

      <Box sx={{ p: 2, borderTop: '1px solid', borderColor: 'divider', display: 'flex', alignItems: 'center' }}>
        <TextField
          fullWidth
          variant="outlined"
          placeholder="Type your message..."
          value={input}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          multiline
          maxRows={4}
          inputRef={inputRef}
          sx={{ mr: 1 }}
        />
        <Button variant="contained" color="primary" onClick={sendMessage} disabled={!input.trim()}>
          <SendIcon />
        </Button>
      </Box>
    </Box>
  );
}
