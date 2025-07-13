import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  Box, 
  TextField, 
  Button, 
  Typography, 
  InputAdornment,
  IconButton,
  CircularProgress,
  Divider
} from '@mui/material';
import { 
  Visibility, 
  VisibilityOff,
  Google,
  GitHub
} from '@mui/icons-material';
import api from '../api';
import { useSnackbar } from 'notistack';
import AuthLayout from "../components/AuthLayout";

export default function LoginPage() {
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSocialLoading, setIsSocialLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      enqueueSnackbar('Please fill all fields', { variant: 'warning' });
      return;
    }

    try {
      setIsLoading(true);
      const res = await api.post('/auth/login', { email, password });
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data.user));
      enqueueSnackbar('Login successful!', { variant: 'success' });
      navigate('/chat');
    } catch (err) {
      enqueueSnackbar(err.response?.data?.error || 'Login failed', { variant: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSocialLogin = (provider) => {
    setIsSocialLoading(true);
    window.open(`${api.defaults.baseURL}/auth/${provider}`, '_self');
  };

  return (
    <AuthLayout title="Welcome back to VibeChat">
      <Box component="form" onSubmit={handleLogin} sx={{ mt: 3 }}>
        <TextField
          fullWidth
          label="Email"
          type="email"
          margin="normal"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          autoFocus
          required
        />
        
        <TextField
          fullWidth
          label="Password"
          margin="normal"
          type={showPassword ? 'text' : 'password'}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          required
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <IconButton
                  onClick={() => setShowPassword(!showPassword)}
                  edge="end"
                >
                  {showPassword ? <VisibilityOff /> : <Visibility />}
                </IconButton>
              </InputAdornment>
            ),
          }}
        />

        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1 }}>
          <Typography 
            component={Link} 
            to="/forgot-password"
            color="primary"
            variant="body2"
          >
            Forgot password?
          </Typography>
        </Box>

        <Button
          type="submit"
          fullWidth
          variant="contained"
          sx={{ mt: 3, mb: 2 }}
          disabled={isLoading}
        >
          {isLoading ? <CircularProgress size={24} /> : 'Login'}
        </Button>

        <Divider sx={{ my: 2 }}>OR</Divider>

        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            fullWidth
            variant="outlined"
            startIcon={<Google />}
            onClick={() => handleSocialLogin('google')}
            disabled={isSocialLoading}
          >
            Google
          </Button>
          <Button
            fullWidth
            variant="outlined"
            startIcon={<GitHub />}
            onClick={() => handleSocialLogin('github')}
            disabled={isSocialLoading}
          >
            GitHub
          </Button>
        </Box>

        <Typography variant="body2" align="center" sx={{ mt: 3 }}>
          Don't have an account?{' '}
          <Typography 
            component={Link} 
            to="/register" 
            color="primary"
            fontWeight="bold"
          >
            Register here
          </Typography>
        </Typography>
      </Box>
    </AuthLayout>
  );
}
