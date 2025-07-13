import React from 'react';
import { Typography } from '@mui/material';

export const Logo = ({ sx }) => {
  return (
    <Typography
      variant="h4"
      component="div"
      sx={{
        fontWeight: 'bold',
        color: 'primary.main',
        ...sx
      }}
    >
      VibeChat
    </Typography>
  );
};
