import React, { useEffect, useState, useRef, useCallback } from 'react';
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

  // Scroll to bottom helper
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
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
      navigate('/friends'); // friend not found, go back to friend list
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
        scrollToBottom();
      } catch (error) {
        enqueueSnackbar('Failed to load messages', { variant: 'error' });
        console.error('Error fetching messages:', error.response || error.message || error);
      } finally {
        setIsLoadingMessages(false);
      }
    };

    fetchMessages();
  }, [selectedFriend, user._id, token, scrollToBottom, enqueueSnackbar]);

  // Socket events
  useEffect(() => {
    if (!user?._id) return;

    const handleConnect = () => {
      socket.emit('join', user._id);
    };

    const handleReceiveMessage = (msg) => {
      if (selectedFriend && msg.from === selectedFriend._id) {
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

    socket.on('connect', handleConnect);
    socket.on('receiveMessage', handleReceiveMessage);
    socket.on('typing', handleTyping);

    socket.connect();

    return () => {
      socket.off('connect', handleConnect);
      socket.off('receiveMessage', handleReceiveMessage);
      socket.off('typing', handleTyping);
      socket.disconnect();
      if (typingTimeoutRef) clearTimeout(typingTimeoutRef);
    };
  }, [user._id, selectedFriend, scrollToBottom, typingTimeoutRef]);

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

  // Send message
  const sendMessage = () => {
    if (!input.trim() || !selectedFriend) return;

    const messageData = {
      from: user._id,
      to: selectedFriend._id,
      content: input.trim(),
    };

    socket.emit('sendMessage', messageData);
    setInput('');
    inputRef.current?.focus();
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
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.05), rgba(255,255,255,0.05))',
          backgroundSize: 'cover'
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
