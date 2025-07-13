import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  TextField, 
  Button, 
  Paper, 
  List, 
  ListItem, 
  ListItemText,
  ListItemAvatar,
  Avatar,
  CircularProgress,
  Divider,
  Alert,
  Chip,
  InputAdornment,
  IconButton
} from '@mui/material';
import { 
  Search as SearchIcon,
  PersonAdd as PersonAddIcon,
  Check as CheckIcon,
  Close as CloseIcon,
  Error as ErrorIcon,
  Info as InfoIcon
} from '@mui/icons-material';
import api from '../api';
import { useSnackbar } from 'notistack';

export default function SearchUserPage() {
  // State with better initialization
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('user')) || {};
    } catch (error) {
      console.error('Failed to parse user data:', error);
      return {};
    }
  });
  const [searchInput, setSearchInput] = useState('');
  const [foundUser, setFoundUser] = useState(null);
  const [message, setMessage] = useState({ text: '', severity: 'info' });
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState({
    search: false,
    request: false,
    requests: false,
    respond: false
  });
  const { enqueueSnackbar } = useSnackbar();

  // Enhanced search with debounce and multiple search types
  const searchUser = async () => {
    if (!searchInput.trim()) {
      setMessage({ text: 'Please enter a VibeCode or email', severity: 'warning' });
      return;
    }

    try {
      setLoading(prev => ({ ...prev, search: true }));
      setFoundUser(null);
      
      // Try both VibeCode and email endpoints
      const endpoints = [
        `/auth/search/vibecode/${searchInput.trim()}`,
        `/auth/search/email/${searchInput.trim()}`
      ];
      
      let userFound = false;
      
      for (const endpoint of endpoints) {
        try {
          const res = await api.get(endpoint);
          if (res.data) {
            setFoundUser(res.data);
            setMessage({ text: '', severity: 'success' });
            userFound = true;
            break;
          }
        } catch (err) {
          console.debug(`No result from ${endpoint}`);
        }
      }
      
      if (!userFound) {
        setMessage({ text: 'User not found', severity: 'error' });
      }
    } catch (err) {
      console.error('Search error:', err);
      setMessage({ 
        text: err.response?.data?.error || 'Search failed', 
        severity: 'error' 
      });
      enqueueSnackbar('Search failed', { variant: 'error' });
    } finally {
      setLoading(prev => ({ ...prev, search: false }));
    }
  };

  // Robust friend request with validation
  const sendRequest = async () => {
    if (!foundUser || !currentUser?._id) {
      setMessage({ text: 'Invalid user data', severity: 'error' });
      return;
    }

    try {
      setLoading(prev => ({ ...prev, request: true }));
      
      const res = await api.post('/friends/request', {
        fromId: currentUser._id,
        toId: foundUser._id,  // More reliable than vibeCode
      });
      
      setMessage({ 
        text: res.data?.message || 'Friend request sent!', 
        severity: 'success' 
      });
      enqueueSnackbar('Friend request sent!', { variant: 'success' });
      fetchRequests();
    } catch (err) {
      console.error('Request error:', err);
      setMessage({ 
        text: err.response?.data?.error || 'Request failed', 
        severity: 'error' 
      });
      enqueueSnackbar('Request failed', { variant: 'error' });
    } finally {
      setLoading(prev => ({ ...prev, request: false }));
    }
  };

  // Enhanced request fetching with error states
  const fetchRequests = async () => {
    if (!currentUser?._id) return;

    try {
      setLoading(prev => ({ ...prev, requests: true }));
      setRequests([]);
      
      const res = await api.get(`/friends/pending/${currentUser._id}`);
      setRequests(res.data || []);
    } catch (err) {
      console.error('Failed to load requests:', err);
      setMessage({ 
        text: 'Failed to load friend requests', 
        severity: 'error' 
      });
      enqueueSnackbar('Failed to load requests', { variant: 'error' });
    } finally {
      setLoading(prev => ({ ...prev, requests: false }));
    }
  };

  // Better request response handling
  const respondToRequest = async (requestId, action) => {
    try {
      setLoading(prev => ({ ...prev, respond: true }));
      
      await api.post('/friends/respond', { 
        requestId, 
        action,
        responderId: currentUser._id 
      });
      
      enqueueSnackbar(
        action === 'accepted' ? 'Friend added!' : 'Request declined',
        { variant: action === 'accepted' ? 'success' : 'info' }
      );
      fetchRequests();
    } catch (err) {
      console.error('Response error:', err);
      enqueueSnackbar(
        err.response?.data?.error || 'Failed to process request',
        { variant: 'error' }
      );
    } finally {
      setLoading(prev => ({ ...prev, respond: false }));
    }
  };

  // Debugging effect
  useEffect(() => {
    console.log('Current component state:', {
      currentUser,
      searchInput,
      foundUser,
      message,
      requests,
      loading
    });
  }, [currentUser, searchInput, foundUser, message, requests, loading]);

  // Initial data load
  useEffect(() => {
    if (!currentUser?._id) {
      setMessage({ 
        text: 'Please login to use this feature', 
        severity: 'warning' 
      });
      return;
    }
    
    fetchRequests();
  }, [currentUser?._id]);

  return (
    <Box sx={{ 
      maxWidth: 800, 
      mx: 'auto', 
      p: { xs: 2, md: 4 },
      bgcolor: 'background.paper',
      borderRadius: 2,
      boxShadow: 1
    }}>
      <Typography variant="h4" gutterBottom sx={{ 
        fontWeight: 'bold',
        color: 'primary.main',
        mb: 3
      }}>
        Connect with Friends
      </Typography>

      {/* User Info Section */}
      <Paper sx={{ p: 3, mb: 4, bgcolor: 'action.hover' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Avatar 
            src={currentUser?.avatar}
            sx={{ width: 60, height: 60 }}
          >
            {currentUser?.username?.charAt(0)?.toUpperCase()}
          </Avatar>
          <Box>
            <Typography variant="h6">{currentUser?.username || 'Guest'}</Typography>
            <Chip 
              label={`Your VibeCode: ${currentUser?.vibeCode || 'Not available'}`}
              color="primary"
              size="small"
              sx={{ mt: 1 }}
            />
          </Box>
        </Box>
      </Paper>

      {/* Search Section */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h6" gutterBottom>
          Find Friends
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <TextField
            fullWidth
            label="Search by VibeCode or Email"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon color="action" />
                </InputAdornment>
              ),
            }}
            onKeyDown={(e) => e.key === 'Enter' && searchUser()}
            disabled={!currentUser?._id}
          />
          <Button
            variant="contained"
            onClick={searchUser}
            disabled={loading.search || !currentUser?._id}
            sx={{ minWidth: 120, height: 56 }}
          >
            {loading.search ? (
              <CircularProgress size={24} color="inherit" />
            ) : (
              'Search'
            )}
          </Button>
        </Box>
      </Box>

      {/* Search Results */}
      {message.text && (
        <Alert 
          severity={message.severity} 
          sx={{ mb: 3 }}
          iconMapping={{
            error: <ErrorIcon />,
            warning: <InfoIcon />,
            info: <InfoIcon />,
            success: <CheckIcon />
          }}
        >
          {message.text}
        </Alert>
      )}

      {foundUser && (
        <Paper sx={{ p: 3, mb: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, mb: 2 }}>
            <Avatar 
              src={foundUser.avatar}
              sx={{ width: 64, height: 64 }}
            >
              {foundUser.username?.charAt(0)?.toUpperCase()}
            </Avatar>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                {foundUser.username}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {foundUser.email}
              </Typography>
              <Chip 
                label={`VibeCode: ${foundUser.vibeCode}`}
                size="small"
                sx={{ mt: 1 }}
              />
            </Box>
          </Box>
          <Button
            fullWidth
            variant="contained"
            startIcon={<PersonAddIcon />}
            onClick={sendRequest}
            disabled={loading.request}
            sx={{ py: 1.5 }}
          >
            {loading.request ? (
              <CircularProgress size={24} color="inherit" />
            ) : (
              'Send Friend Request'
            )}
          </Button>
        </Paper>
      )}

      {/* Pending Requests */}
      <Box sx={{ mt: 5 }}>
        <Typography variant="h6" gutterBottom>
          Pending Friend Requests
        </Typography>
        <Divider sx={{ mb: 3 }} />
        
        {loading.requests ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        ) : requests.length > 0 ? (
          <List sx={{ bgcolor: 'background.paper', borderRadius: 2 }}>
            {requests.map(req => (
              <ListItem 
                key={req._id} 
                divider
                secondaryAction={
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button
                      variant="outlined"
                      color="success"
                      startIcon={<CheckIcon />}
                      onClick={() => respondToRequest(req._id, 'accepted')}
                      disabled={loading.respond}
                      size="small"
                    >
                      Accept
                    </Button>
                    <Button
                      variant="outlined"
                      color="error"
                      startIcon={<CloseIcon />}
                      onClick={() => respondToRequest(req._id, 'rejected')}
                      disabled={loading.respond}
                      size="small"
                    >
                      Decline
                    </Button>
                  </Box>
                }
              >
                <ListItemAvatar>
                  <Avatar src={req.from?.avatar}>
                    {req.from?.username?.charAt(0)?.toUpperCase()}
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={req.from?.username || 'Unknown user'}
                  secondary={
                    <>
                      <Typography component="span" variant="body2" color="text.primary">
                        {req.from?.email}
                      </Typography>
                      <br />
                      {new Date(req.createdAt).toLocaleString()}
                    </>
                  }
                />
              </ListItem>
            ))}
          </List>
        ) : (
          <Alert severity="info" icon={<InfoIcon />}>
            No pending friend requests
          </Alert>
        )}
      </Box>
    </Box>
  );
}
