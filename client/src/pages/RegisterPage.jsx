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
  Alert
} from '@mui/material';
import { 
  Visibility, 
  VisibilityOff 
} from '@mui/icons-material';
import api from '../api';
import { useSnackbar } from 'notistack';
import AuthLayout from '../components/AuthLayout';
import PasswordStrengthBar from '../components/PasswordStrengthBar';

export default function RegisterPage() {
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const [formData, setFormData] = useState({
    email: '',
    username: '',
    password: '',
    confirmPassword: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error when user types
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: null
      }));
    }
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.email) newErrors.email = 'Email is required';
    else if (!/^\S+@\S+\.\S+$/.test(formData.email)) newErrors.email = 'Invalid email format';
    
    if (!formData.username) newErrors.username = 'Username is required';
    else if (formData.username.length < 3) newErrors.username = 'Username must be at least 3 characters';
    
    if (!formData.password) newErrors.password = 'Password is required';
    else if (formData.password.length < 6) newErrors.password = 'Password must be at least 6 characters';
    
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    try {
      setIsLoading(true);
      await api.post('/auth/register', {
        email: formData.email,
        username: formData.username,
        password: formData.password
      });
      enqueueSnackbar('Registration successful! Please login', { variant: 'success' });
      navigate('/');
    } catch (err) {
      const errorMsg = err.response?.data?.error || 'Registration failed';
      enqueueSnackbar(errorMsg, { variant: 'error' });
      
      // Handle specific backend errors
      if (err.response?.data?.field) {
        setErrors(prev => ({
          ...prev,
          [err.response.data.field]: errorMsg
        }));
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout title="Create your VibeChat account">
      <Box component="form" onSubmit={handleSubmit} sx={{ mt: 3 }}>
        <TextField
          fullWidth
          label="Email"
          name="email"
          type="email"
          margin="normal"
          value={formData.email}
          onChange={handleChange}
          error={!!errors.email}
          helperText={errors.email}
          autoComplete="email"
          autoFocus
        />
        
        <TextField
          fullWidth
          label="Username"
          name="username"
          margin="normal"
          value={formData.username}
          onChange={handleChange}
          error={!!errors.username}
          helperText={errors.username}
          autoComplete="username"
        />
        
        <TextField
          fullWidth
          label="Password"
          name="password"
          margin="normal"
          type={showPassword ? 'text' : 'password'}
          value={formData.password}
          onChange={handleChange}
          error={!!errors.password}
          helperText={errors.password}
          autoComplete="new-password"
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
        
        <PasswordStrengthBar password={formData.password} />
        
        <TextField
          fullWidth
          label="Confirm Password"
          name="confirmPassword"
          margin="normal"
          type={showPassword ? 'text' : 'password'}
          value={formData.confirmPassword}
          onChange={handleChange}
          error={!!errors.confirmPassword}
          helperText={errors.confirmPassword}
          autoComplete="new-password"
        />

        <Button
          type="submit"
          fullWidth
          variant="contained"
          sx={{ mt: 3, mb: 2 }}
          disabled={isLoading}
        >
          {isLoading ? <CircularProgress size={24} /> : 'Register'}
        </Button>

        <Typography variant="body2" align="center">
          Already have an account?{' '}
          <Typography 
            component={Link} 
            to="/" 
            color="primary"
            fontWeight="bold"
          >
            Login here
          </Typography>
        </Typography>
      </Box>
    </AuthLayout>
  );
}
