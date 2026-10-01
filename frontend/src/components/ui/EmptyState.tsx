import React from 'react';
import { Box, Typography } from '@mui/material';
import InboxOutlinedIcon from '@mui/icons-material/InboxOutlined';
import { tokens } from '../../theme/tokens';

interface EmptyStateProps {
  title?: string;
  description?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title = 'Nenhum registro encontrado',
  description = 'Não há dados disponíveis para exibição no momento.',
  icon,
  action,
}) => {
  return (
    <Box
      sx={{
        py: 8,
        px: 3,
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Box
        sx={{
          color: tokens.colors.text.muted,
          mb: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 48,
        }}
      >
        {icon || <InboxOutlinedIcon sx={{ fontSize: 52, color: tokens.colors.text.muted }} />}
      </Box>

      <Typography variant="h6" sx={{ color: tokens.colors.text.primary, fontWeight: 600, mb: 1 }}>
        {title}
      </Typography>

      <Typography
        variant="body2"
        sx={{
          color: tokens.colors.text.secondary,
          maxWidth: 420,
          mb: action ? 3 : 0,
          lineHeight: 1.5,
        }}
      >
        {description}
      </Typography>

      {action && <Box sx={{ mt: 2 }}>{action}</Box>}
    </Box>
  );
};
