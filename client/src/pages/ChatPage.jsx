import React, { useEffect, useState, useRef, useCallback } from 'react';
import { 
  Box, 
  Typography, 
  List, 
  ListItem, 
  ListItemText, 
  TextField, 
  Button, 
  Divider,
  CircularProgress,
  Avatar,
  Badge,
  IconButton,
  Tooltip,
  Skeleton
} from '@mui/material';
import { 
  Send as SendIcon, 
  Search as SearchIcon,
  MoreVert as MoreVertIcon
} from '@mui/icons-material';
import io from 'socket.io-client';
import api from '../api';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { useSnackbar } from 'notistack';

const socket = io('https://the-lab-phase-back.onrender.com', {
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
});

export default function ChatPage() {
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const user = JSON.parse(localStorage.getItem('user') || {});
  const token = localStorage.getItem('token');
  
  const [friends, setFriends] = useState([]);
  const [selectedFriend, setSelectedFriend] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoadingFriends, setIsLoadingFriends] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [typingFriend, setTypingFriend] = useState(null);
  const [unreadCounts, setUnreadCounts] = useState({});
  
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const inputRef = useRef(null);

  // Scroll to bottom of messages
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  // Handle socket events
  useEffect(() => {
    if (!user?._id) return;

    const handleConnect = () => {
      socket.emit('join', user._id);
      console.log(`🔌 Connected to socket`);
    };

    const handleDisconnect = () => {
      console.log('🔌 Disconnected from socket');
    };

    const handleReceiveMessage = (msg) => {
      // If message is from currently selected friend
      if (selectedFriend && msg.from === selectedFriend._id) {
        setMessages(prev => [...prev, msg]);
        scrollToBottom();
        
        // Mark as read
        socket.emit('markAsRead', {
          messageId: msg._id,
          readerId: user._id
        });
      } else {
        // Update unread count for other friends
        setUnreadCounts(prev => ({
          ...prev,
          [msg.from]: (prev[msg.from] || 0) + 1
        }));
      }
    };

    const handleTyping = (data) => {
      if (data.senderId === selectedFriend?._id) {
        setIsTyping(true);
        setTypingFriend(friends.find(f => f._id === data.senderId));
        
        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current);
        }
        
        typingTimeoutRef.current = setTimeout(() => {
          setIsTyping(false);
          setTypingFriend(null);
        }, 2000);
      }
    };

    const handleMessageRead = (data) => {
      if (data.readerId === selectedFriend?._id) {
        setMessages(prev => 
          prev.map(msg => 
            msg._id === data.messageId ? { ...msg, read: true } : msg
          )
        );
      }
    };

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('receiveMessage', handleReceiveMessage);
    socket.on('typing', handleTyping);
    socket.on('messageRead', handleMessageRead);

    socket.connect();

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('receiveMessage', handleReceiveMessage);
      socket.off('typing', handleTyping);
      socket.off('messageRead', handleMessageRead);
      socket.disconnect();
      
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [user._id, selectedFriend, friends, scrollToBottom]);

  // Load friend list
  useEffect(() => {
    if (!user?._id) return;

    const fetchFriends = async () => {
      try {
        setIsLoadingFriends(true);
        const res = await api.get(`/friends/${user._id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setFriends(res.data);
        
        // Initialize unread counts
        const counts = {};
        res.data.forEach(friend => {
          counts[friend._id] = 0;
        });
        setUnreadCounts(counts);
      } catch (error) {
        enqueueSnackbar('Failed to load friends', { variant: 'error' });
        console.error(error);
      } finally {
        setIsLoadingFriends(false);
      }
    };

    fetchFriends();
  }, [user?._id, token, enqueueSnackbar]);

  // Load message history when friend is selected
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
        
        // Reset unread count when selecting a friend
        setUnreadCounts(prev => ({
          ...prev,
          [selectedFriend._id]: 0
        }));
      } catch (error) {
        enqueueSnackbar('Failed to load messages', { variant: 'error' });
        console.error(error);
      } finally {
        setIsLoadingMessages(false);
      }
    };

    fetchMessages();
  }, [selectedFriend, user._id, token, scrollToBottom, enqueueSnackbar]);

  // Handle typing indicator
  const handleInputChange = (e) => {
    setInput(e.target.value);
    
    if (selectedFriend) {
      socket.emit('typing', {
        senderId: user._id,
        receiverId: selectedFriend._id
      });
    }
  };

  // Send message
  const sendMessage = useCallback(() => {
    if (!input.trim() || !selectedFriend) return;

    const messageData = {
      from: user._id,
      to: selectedFriend._id,
      content: input
    };

    socket.emit('sendMessage', messageData);
    setInput('');
    inputRef.current.focus();
  }, [input, selectedFriend, user._id]);

  // Handle enter key press
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Friend list item component
  const FriendListItem = ({ friend }) => (
    <ListItem
      button
      selected={selectedFriend?._id === friend._id}
      onClick={() => setSelectedFriend(friend)}
      sx={{
        cursor: 'pointer',
        '&:hover': { backgroundColor: 'action.hover' },
        borderRadius: 1,
        mb: 0.5
      }}
    >
      <Badge
        overlap="circular"
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        badgeContent={unreadCounts[friend._id] || null}
        color="primary"
        sx={{ mr: 2 }}
      >
        <Avatar alt={friend.username} src={friend.avatar} />
      </Badge>
      <ListItemText
        primary={friend.username}
        secondary={friend.email}
        primaryTypographyProps={{ fontWeight: 'medium' }}
      />
    </ListItem>
  );

  return (
    <Box
      sx={{
        display: 'flex',
        height: '100vh',
        overflow: 'hidden',
        bgcolor: 'background.default'
      }}
    >
      {/* Friends List */}
      <Box
        sx={{
          width: 300,
          borderRight: '1px solid',
          borderColor: 'divider',
          display: 'flex',
          flexDirection: 'column',
          bgcolor: 'background.paper'
        }}
      >
        <Box
          display="flex"
          justifyContent="space-between"
          alignItems="center"
          p={2}
          sx={{ borderBottom: '1px solid', borderColor: 'divider' }}
        >
          <Typography variant="h6" fontWeight="bold">
            Friends
          </Typography>
          <Tooltip title="Search friends">
            <IconButton onClick={() => navigate('/search')}>
              <SearchIcon />
            </IconButton>
          </Tooltip>
        </Box>
        
        <Box sx={{ overflowY: 'auto', flexGrow: 1 }}>
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
                <FriendListItem key={friend._id} friend={friend} />
              ))}
            </List>
          ) : (
            <Box sx={{ p: 3, textAlign: 'center' }}>
              <Typography color="text.secondary">
                No friends yet. Search for friends to start chatting!
              </Typography>
              <Button 
                variant="outlined" 
                sx={{ mt: 2 }}
                onClick={() => navigate('/search')}
              >
                Search Friends
              </Button>
            </Box>
          )}
        </Box>
      </Box>

      {/* Chat Window */}
      <Box
        sx={{
          flexGrow: 1,
          display: 'flex',
          flexDirection: 'column',
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
          {selectedFriend ? (
            <>
              <Box display="flex" alignItems="center">
                <Avatar 
                  alt={selectedFriend.username} 
                  src={selectedFriend.avatar} 
                  sx={{ mr: 2 }}
                />
                <Box>
                  <Typography variant="h6" fontWeight="bold">
                    {selectedFriend.username}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {isTyping ? (
                      <span style={{ color: 'primary.main' }}>typing...</span>
                    ) : (
                      selectedFriend.email
                    )}
                  </Typography>
                </Box>
              </Box>
              <IconButton>
                <MoreVertIcon />
              </IconButton>
            </>
          ) : (
            <Typography variant="h6" color="text.secondary">
              Select a friend to start chatting
            </Typography>
          )}
        </Box>

        {/* Messages Area */}
        <Box
          sx={{
            flexGrow: 1,
            p: 2,
            overflowY: 'auto',
            backgroundImage: 'linear-gradient(rgba(255, 255, 255, 0.05), rgba(255, 255, 255, 0.05))',
            backgroundSize: 'cover'
          }}
        >
          {isLoadingMessages ? (
            <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" height="100%">
              <CircularProgress />
            </Box>
          ) : selectedFriend ? (
            <>
              {messages.length === 0 ? (
                <Box
                  display="flex"
                  flexDirection="column"
                  alignItems="center"
                  justifyContent="center"
                  height="100%"
                  textAlign="center"
                >
                  <Typography variant="h6" color="text.secondary" gutterBottom>
                    No messages yet
                  </Typography>
                  <Typography color="text.secondary">
                    Send a message to start the conversation
                  </Typography>
                </Box>
              ) : (
                messages.map((msg) => (
                  <Box
                    key={msg._id}
                    sx={{
                      mb: 2,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: msg.from === user._id ? 'flex-end' : 'flex-start'
                    }}
                  >
                    <Box
                      sx={{
                        p: 1.5,
                        borderRadius: 2,
                        maxWidth: '70%',
                        bgcolor: msg.from === user._id ? 'primary.main' : 'grey.200',
                        color: msg.from === user._id ? 'primary.contrastText' : 'text.primary',
                        position: 'relative'
                      }}
                    >
                      <Typography variant="body1">{msg.content}</Typography>
                      <Box
                        sx={{
                          display: 'flex',
                          justifyContent: 'flex-end',
                          alignItems: 'center',
                          mt: 0.5
                        }}
                      >
                        <Typography
                          variant="caption"
                          sx={{
                            opacity: 0.8,
                            color: msg.from === user._id ? 'primary.contrastText' : 'text.secondary',
                            mr: 1
                          }}
                        >
                          {formatDistanceToNow(new Date(msg.timestamp), { addSuffix: true })}
                        </Typography>
                        {msg.from === user._id && (
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            {msg.read ? (
                              <Typography variant="caption" sx={{ opacity: 0.8 }}>
                                ✓✓
                              </Typography>
                            ) : (
                              <Typography variant="caption" sx={{ opacity: 0.8 }}>
                                ✓
                              </Typography>
                            )}
                          </Box>
                        )}
                      </Box>
                    </Box>
                  </Box>
                ))
              )}
              <div ref={messagesEndRef} />
            </>
          ) : (
            <Box
              display="flex"
              flexDirection="column"
              alignItems="center"
              justifyContent="center"
              height="100%"
              textAlign="center"
            >
              <Typography variant="h6" color="text.secondary" gutterBottom>
                Welcome to VibeChat
              </Typography>
              <Typography color="text.secondary" sx={{ mb: 2 }}>
                Select a friend from the list to start chatting
              </Typography>
              <Button
                variant="contained"
                startIcon={<SearchIcon />}
                onClick={() => navigate('/search')}
              >
                Find Friends
              </Button>
            </Box>
          )}
        </Box>

        {/* Message Input */}
        {selectedFriend && (
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
              inputRef={inputRef}
              multiline
              maxRows={4}
              sx={{ mr: 1 }}
            />
            <Button
              variant="contained"
              color="primary"
              onClick={sendMessage}
              disabled={!input.trim()}
              sx={{ height: '56px' }}
            >
              <SendIcon />
            </Button>
          </Box>
        )}
      </Box>
    </Box>
  );
}
