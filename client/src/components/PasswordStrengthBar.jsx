import React from 'react';
import { Box, LinearProgress, Typography } from '@mui/material';

const PasswordStrengthBar = ({ password }) => {
  const calculateStrength = (password) => {
    if (!password) return 0;
    
    let strength = 0;
    // Length contributes up to 40%
    strength += Math.min(password.length / 12 * 40, 40);
    
    // Character variety contributes up to 60%
    const hasLower = /[a-z]/.test(password);
    const hasUpper = /[A-Z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecial = /[^a-zA-Z0-9]/.test(password);
    
    const varietyCount = [hasLower, hasUpper, hasNumber, hasSpecial].filter(Boolean).length;
    strength += varietyCount * 15; // 15% per variety type
    
    return Math.min(Math.round(strength), 100);
  };

  const strength = calculateStrength(password);
  const getColor = () => {
    if (strength < 30) return 'error';
    if (strength < 70) return 'warning';
    return 'success';
  };

  const getLabel = () => {
    if (!password) return '';
    if (strength < 30) return 'Weak';
    if (strength < 70) return 'Moderate';
    return 'Strong';
  };

  return (
    <Box sx={{ width: '100%', mt: 1, mb: 1 }}>
      <LinearProgress
        variant="determinate"
        value={strength}
        color={getColor()}
        sx={{
          height: 6,
          borderRadius: 3,
          mb: 1
        }}
      />
      <Typography variant="caption" color="text.secondary">
        Password strength: <Typography component="span" color={getColor()}>{getLabel()}</Typography>
      </Typography>
    </Box>
  );
};

export default PasswordStrengthBar;
