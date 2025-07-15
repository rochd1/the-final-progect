import React, { useEffect, useState } from 'react';
import { 
  Box, List, ListItem, ListItemText, Avatar, Badge, Typography, 
  Button, Skeleton, Tooltip, IconButton 
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import SearchIcon from '@mui/icons-material/Search';
import api from '../api';
import { useSnackbar } from 'notistack';

export default function FriendListPage() {
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();

  const user = JSON.parse(localStorage.getItem('user'));
  const token = localStorage.getItem('token');

  const [friends, setFriends] = useState([]);
  const [isLoadingFriends, setIsLoadingFriends] = useState(true);
  const [unreadCounts, setUnreadCounts] = useState({});

  useEffect(() => {
    if (!user || !user._id) {
      enqueueSnackbar('User not logged in', { variant: 'error' });
      setIsLoadingFriends(false);
      return;
    }
    if (!token) {
      enqueueSnackbar('Authorization token missing', { variant: 'error' });
      setIsLoadingFriends(false);
      return;
    }

    const fetchFriends = async () => {
      try {
        setIsLoadingFriends(true);
        const res = await api.get(`/friends/${user._id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setFriends(res.data);

        // Initialize unread counts to zero
        const counts = {};
        res.data.forEach(friend => {
          counts[friend._id] = 0;
        });
        setUnreadCounts(counts);
      } catch (error) {
        enqueueSnackbar('Failed to load friends', { variant: 'error' });
      } finally {
        setIsLoadingFriends(false);
      }
    };

    fetchFriends();
  }, [user?._id, token, enqueueSnackbar]);

  return (
    <Box sx={{ height: '100vh', overflowY: 'auto', bgcolor: 'background.paper' }}>
      <Box 
        display="flex" 
        justifyContent="space-between" 
        alignItems="center" 
        p={2} 
        borderBottom={1} 
        borderColor="divider"
      >
        <Typography variant="h6" fontWeight="bold">Friends</Typography>
        <Tooltip title="Search friends">
          <IconButton onClick={() => navigate('/search')}>
            <SearchIcon />
          </IconButton>
        </Tooltip>
      </Box>

      {isLoadingFriends ? (
        Array(5).fill(0).map((_, i) => (
          <Box key={i} sx={{ p: 2, display: 'flex', alignItems: 'center' }}>
            <Skeleton variant="circular" width={40} height={40} sx={{ mr: 2 }} />
            <Box sx={{ flexGrow: 1 }}>
              <Skeleton variant="text" width="60%" />
              <Skeleton variant="text" width="40%" />
            </Box>
          </Box>
        ))
      ) : friends.length > 0 ? (
        <List>
          {friends.map(friend => (
            <ListItem
              key={friend._id}
              button
              onClick={() => navigate(`/chat/${friend._id}`)}
              sx={{ cursor: 'pointer', borderRadius: 1, mb: 0.5, '&:hover': { bgcolor: 'action.hover' } }}
            >
              <Badge
                overlap="circular"
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                badgeContent={unreadCounts[friend._id] || null}
                color="primary"
                sx={{ mr: 2 }}
              >
                <Avatar alt={friend.username} src={friend.avatarUrl || ''} />
              </Badge>
              <ListItemText
                primary={friend.username || 'No username'}
                secondary={friend.email || ''}
                primaryTypographyProps={{ fontWeight: 'medium' }}
              />
            </ListItem>
          ))}
        </List>
      ) : (
        <Box p={3} textAlign="center">
          <Typography color="text.secondary">
            No friends yet. Search for friends to start chatting!
          </Typography>
          <Button variant="outlined" sx={{ mt: 2 }} onClick={() => navigate('/search')}>
            Search Friends
          </Button>
        </Box>
      )}
    </Box>
  );
}
