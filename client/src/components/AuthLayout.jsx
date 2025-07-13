import React from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  useTheme,
  useMediaQuery
} from '@mui/material';
import { Logo } from './Logo'; // You'll need to create or replace this with your logo component

const AuthLayout = ({ children, title }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'background.default',
        p: 2
      }}
    >
      <Paper
        elevation={isMobile ? 0 : 3}
        sx={{
          width: '100%',
          maxWidth: 500,
          p: isMobile ? 2 : 4,
          borderRadius: 2,
          bgcolor: 'background.paper'
        }}
      >
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <Logo sx={{ height: 60, mb: 2 }} />
          <Typography 
            variant="h4" 
            component="h1" 
            gutterBottom
            sx={{ fontWeight: 'bold' }}
          >
            {title}
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Connect with friends and the world around you
          </Typography>
        </Box>
        
        {children}
      </Paper>
    </Box>
  );
};

export default AuthLayout;
