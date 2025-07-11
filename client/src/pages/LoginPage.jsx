import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Box, TextField, Button, Typography } from '@mui/material';
import api from '../api';

export default function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = async () => {
    try {
      const res = await api.post('/auth/login', { email, password });
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data.user));
      navigate('/chat');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
    }
  };

  return (
    <Box sx={{ maxWidth: 400, mx: 'auto', mt: 10, p: 3, boxShadow: 3, borderRadius: 2 }}>
      <Typography variant="h4" mb={3} textAlign="center">VibeChat Login</Typography>
      <TextField
        fullWidth
        label="Email"
        type="email"
        margin="normal"
        value={email}
        onChange={e => setEmail(e.target.value)}
      />
      <TextField
        fullWidth
        label="Password"
        type="password"
        margin="normal"
        value={password}
        onChange={e => setPassword(e.target.value)}
      />
      {error && <Typography color="error" mt={1}>{error}</Typography>}
      <Button variant="contained" fullWidth sx={{ mt: 3 }} onClick={handleLogin}>
        Login
      </Button>
      <Typography mt={2} textAlign="center">
        Don't have an account? <Link to="/register">Register here</Link>
      </Typography>
    </Box>
  );
}
