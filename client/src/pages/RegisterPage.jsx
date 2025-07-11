import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Box, TextField, Button, Typography } from '@mui/material';
import api from '../api';

export default function RegisterPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleRegister = async () => {
    try {
      await api.post('/auth/register', { email, username, password });
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed');
    }
  };

  return (
    <Box sx={{ maxWidth: 400, mx: 'auto', mt: 10, p: 3, boxShadow: 3, borderRadius: 2 }}>
      <Typography variant="h4" mb={3} textAlign="center">VibeChat Register</Typography>
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
        label="Username"
        margin="normal"
        value={username}
        onChange={e => setUsername(e.target.value)}
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
      <Button variant="contained" fullWidth sx={{ mt: 3 }} onClick={handleRegister}>
        Register
      </Button>
      <Typography mt={2} textAlign="center">
        Already have an account? <Link to="/">Login here</Link>
      </Typography>
    </Box>
  );
}
