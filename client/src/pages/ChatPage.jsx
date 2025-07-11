import React, { useEffect, useState, useRef } from 'react';
import { Box, Typography, List, ListItem, ListItemText, TextField, Button, Divider } from '@mui/material';
import io from 'socket.io-client';
import api from '../api';
import { useNavigate } from 'react-router-dom';

const socket = io('http://localhost:5000'); // Adjust if backend is hosted elsewhere

export default function ChatPage() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const token = localStorage.getItem('token');

  const [friends, setFriends] = useState([]);
  const [selectedFriend, setSelectedFriend] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef(null);

  // Join socket and set up listener
  useEffect(() => {
    if (!user?._id) return;

    socket.connect();
    socket.emit('join', user._id);
    console.log(`🔌 joined room: ${user._id}`);

    socket.on('receiveMessage', (msg) => {
      // Only show messages relevant to selected friend
      if (
        selectedFriend &&
        (msg.from === selectedFriend._id || msg.to === selectedFriend._id)
      ) {
        setMessages(prev => [...prev, msg]);
        scrollToBottom();
      }
    });

    return () => {
      socket.off('receiveMessage');
      socket.disconnect();
    };
  }, [user._id, selectedFriend]);

  // Load friend list
  useEffect(() => {
    if (!user?._id) return;
    api.get(`/friends/${user._id}`, {
      headers: { Authorization: `Bearer ${token}` }
    }).then(res => {
      setFriends(res.data);
    }).catch(console.error);
  }, [user?._id, token]);

  // Load message history
  useEffect(() => {
    if (!selectedFriend) return;

    api.get(`/messages/${user._id}/${selectedFriend._id}`, {
      headers: { Authorization: `Bearer ${token}` }
    }).then(res => {
      setMessages(res.data);
      scrollToBottom();
    }).catch(console.error);
  }, [selectedFriend, user._id, token]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const sendMessage = () => {
    if (!input.trim() || !selectedFriend) return;

    const messageData = {
      from: user._id,
      to: selectedFriend._id,
      content: input
    };

    console.log("message data : " , messageData)

    socket.emit('sendMessage', messageData); // Real-time emit
    setInput('');
  };

  return (
    <Box sx={{ display: 'flex', height: '100vh' }}>
      {/* Friends List */}
      <Box sx={{ width: 300, borderRight: '1px solid #ccc', overflowY: 'auto' }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" p={2}>
          <Typography variant="h6">Friends</Typography>
          <Button size="small" onClick={() => navigate('/search')}>Search</Button>
        </Box>
        <Divider />
        <List>
          {friends.map(fr => (
            <ListItem
              key={fr._id}
              button
              selected={selectedFriend?._id === fr._id}
              onClick={() => setSelectedFriend(fr)}
              sx={{ cursor: 'pointer' }}
            >
              <ListItemText primary={fr.username} secondary={fr.email} />
            </ListItem>
          ))}
        </List>
      </Box>

      {/* Chat Window */}
      <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
        <Box sx={{ p: 2, borderBottom: '1px solid #ccc' }}>
          <Typography variant="h6">
            {selectedFriend ? selectedFriend.username : 'Select a friend'}
          </Typography>
        </Box>

        <Box sx={{ flexGrow: 1, p: 2, overflowY: 'auto' }}>
          {messages.map((msg, i) => (
            <Box
              key={i}
              sx={{
                mb: 1,
                textAlign: msg.from === user._id ? 'right' : 'left',
                backgroundColor: msg.from === user._id ? '#cfe9ff' : '#eee',
                borderRadius: 1,
                p: 1,
                maxWidth: '60%',
                marginLeft: msg.from === user._id ? 'auto' : 0
              }}
            >
              <Typography variant="body1">{msg.content}</Typography>
              <Typography variant="caption" color="text.secondary">
                {new Date(msg.timestamp).toLocaleTimeString()}
              </Typography>
            </Box>
          ))}
          <div ref={messagesEndRef} />
        </Box>

        <Box sx={{ p: 2, borderTop: '1px solid #ccc', display: 'flex' }}>
          <TextField
            fullWidth
            variant="outlined"
            placeholder="Type your message..."
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') sendMessage(); }}
          />
          <Button variant="contained" onClick={sendMessage} sx={{ ml: 1 }}>
            Send
          </Button>
        </Box>
      </Box>
    </Box>
  );
}
