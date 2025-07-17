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

  // Scroll to bottom helper (now uses 'auto' for instant scroll)
  const scrollToBottom = useCallback(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'auto' });
    }
  }, []);

  // Load friends to find selected friend info
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
        console.error('Error fetching friends:', error.response || error.message || error);
      } finally {
        setIsLoadingFriends(false);
      }
    };

    fetchFriends();
  }, [user._id, token, enqueueSnackbar]);

  // Set selectedFriend by friendId param
  useEffect(() => {
    if (!friendId || friends.length === 0) return;

    const friend = friends.find(f => f._id === friendId);
    if (friend) {
      setSelectedFriend(friend);
    } else {
      navigate('/friends');
    }
  }, [friendId, friends, navigate]);

  // Load messages when selectedFriend changes
  useEffect(() => {
    if (!selectedFriend) return;

    const fetchMessages = async () => {
      try {
        setIsLoadingMessages(true);
        const res = await api.get(`/messages/${user._id}/${selectedFriend._id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setMessages(res.data);
        // Add slight delay to ensure DOM is ready
        setTimeout(scrollToBottom, 0);
      } catch (error) {
        enqueueSnackbar('Failed to load messages', { variant: 'error' });
        console.error('Error fetching messages:', error.response || error.message || error);
      } finally {
        setIsLoadingMessages(false);
      }
    };

    fetchMessages();
  }, [selectedFriend, user._id, token, scrollToBottom, enqueueSnackbar]);

  // Socket events (optimized to avoid unnecessary reconnects)
  useEffect(() => {
    if (!user?._id) return;

    const handleReceiveMessage = (msg) => {
      // Add message if it belongs to current chat
      if (selectedFriend && (msg.from === selectedFriend._id || msg.to === selectedFriend._id)) {
        setMessages(prev => [...prev, msg]);
        scrollToBottom();
      }
    };

    const handleTyping = (data) => {
      if (data.senderId === selectedFriend?._id) {
        setIsTyping(true);
        if (typingTimeoutRef) clearTimeout(typingTimeoutRef);
        const timeout = setTimeout(() => setIsTyping(false), 2000);
        setTypingTimeoutRef(timeout);
      }
    };

    socket.connect();
    socket.emit('join', user._id);
    socket.on('receiveMessage', handleReceiveMessage);
    socket.on('typing', handleTyping);

    return () => {
      socket.off('receiveMessage', handleReceiveMessage);
      socket.off('typing', handleTyping);
      // Don't disconnect unless component unmounts
    };
  }, [user._id, selectedFriend?._id]); // Only reconnect if user._id changes

  // Ensure scroll to bottom when chat opens
  useLayoutEffect(() => {
    if (selectedFriend) {
      setTimeout(scrollToBottom, 100);
    }
  }, [selectedFriend, scrollToBottom]);

  // Input change and typing emit
  const handleInputChange = (e) => {
    setInput(e.target.value);
    if (selectedFriend) {
      socket.emit('typing', {
        senderId: user._id,
        receiverId: selectedFriend._id,
      });
    }
  };

  // Send message (now with optimistic UI update)
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
    scrollToBottom();
    inputRef.current?.focus();

    // Emit to server
    socket.emit('sendMessage', messageData, (ack) => {
      if (ack?.error) {
        // Rollback if server fails
        setMessages(prev => prev.filter(msg => msg._id !== tempId));
        enqueueSnackbar('Failed to send message', { variant: 'error' });
      }
    });
  };

  // Enter key send
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
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        bgcolor: 'background.paper'
      }}
    >
      {/* Chat Header */}
      <Box
        sx={{
          p: 2,
          borderBottom: '1px solid',
          borderColor: 'divider',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}
      >
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

      {/* Messages area */}
      <Box
        sx={{
          flexGrow: 1,
          p: 2,
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: 1,
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.05), rgba(255,255,255,0.05))',
        }}
      >
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
            <Box
              key={msg._id}
              sx={{
                mb: 2,
                display: 'flex',
                flexDirection: msg.from === user._id ? 'row-reverse' : 'row',
                alignItems: 'center'
              }}
            >
              <Box
                sx={{
                  maxWidth: '70%',
                  p: 1.5,
                  borderRadius: 2,
                  bgcolor: msg.from === user._id ? 'primary.main' : 'grey.200',
                  color: msg.from === user._id ? 'primary.contrastText' : 'text.primary',
                  position: 'relative'
                }}
              >
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

      {/* Input */}
      <Box
        sx={{
          p: 2,
          borderTop: '1px solid',
          borderColor: 'divider',
          display: 'flex',
          alignItems: 'center'
        }}
      >
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
