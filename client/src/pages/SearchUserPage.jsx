import React, { useState, useEffect } from 'react';
import { Box, Typography, TextField, Button, Paper, List, ListItem, ListItemText } from '@mui/material';
import api from '../api';

export default function SearchUserPage() {
  const currentUser = JSON.parse(localStorage.getItem('user'));
  const [vibeCode, setVibeCode] = useState('');
  const [foundUser, setFoundUser] = useState(null);
  const [message, setMessage] = useState('');
  const [requests, setRequests] = useState([]);

  const searchUser = async () => {
    try {
      const res = await api.get(`/auth/search/${vibeCode}`);
      setFoundUser(res.data);
      setMessage('');
    } catch (err) {
      setFoundUser(null);
      setMessage('User not found');
    }
  };

  const sendRequest = async () => {
    try {
      const res = await api.post('/friends/request', {
        fromId: currentUser._id,
        vibeCode,
      });
      setMessage(res.data?.message || 'Friend request sent!');
    } catch (err) {
      setMessage(err.response?.data?.error || 'Request failed');
    }
  };

  const fetchRequests = async () => {
    try {
      const res = await api.get(`/friends/pending/${currentUser._id}`);
      setRequests(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const respondToRequest = async (requestId, action) => {
    try {
      await api.post('/friends/respond', { requestId, action });
      fetchRequests();
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  return (
    <Box sx={{ maxWidth: 600, mx: 'auto', mt: 5 }}>
      <Typography variant="h5" mb={2}>Add a Friend by VibeCode</Typography>
      <TextField
        label="Enter VibeCode (e.g. john!1234)"
        fullWidth
        value={vibeCode}
        onChange={e => setVibeCode(e.target.value)}
      />
      <Button variant="contained" fullWidth sx={{ mt: 2 }} onClick={searchUser}>Search</Button>
      {foundUser && (
        <Paper sx={{ mt: 3, p: 2 }}>
          <Typography variant="h6">{foundUser.username}</Typography>
          <Typography variant="body2">{foundUser.email}</Typography>
          <Button variant="outlined" sx={{ mt: 1 }} onClick={sendRequest}>Send Friend Request</Button>
        </Paper>
      )}
      {message && <Typography mt={2} color="primary">{message}</Typography>}

      <Typography variant="h6" mt={5}>Pending Friend Requests</Typography>
      <List>
        {requests.map(req => (
          <ListItem key={req._id} divider>
            <ListItemText
              primary={`From: ${req.from.username}`}
              secondary={req.from.email}
            />
            <Button onClick={() => respondToRequest(req._id, 'accepted')} color="success">Accept</Button>
            <Button onClick={() => respondToRequest(req._id, 'rejected')} color="error">Reject</Button>
          </ListItem>
        ))}
      </List>
    </Box>
  );
}