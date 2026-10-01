import React from 'react';
import { Box, Typography } from '@mui/material';
import { tokens } from '../../theme/tokens';

export type StatusType = 
  | 'ONLINE' | 'ALERT' | 'CRITICAL' | 'OFFLINE'
  | 'OPEN' | 'IN_PROGRESS' | 'WAITING_CLIENT' | 'COMPLETED' | 'CANCELLED'
  | 'ACTIVE' | 'INACTIVE';

interface StatusBadgeProps {
  status: StatusType | string;
  label?: string;
  size?: 'small' | 'medium';
}

const statusMap: Record<string, { bg: string; text: string; border: string; dot: string; label: string }> = {
  ONLINE: {
    bg: tokens.colors.status.online.bg,
    text: tokens.colors.status.online.text,
    border: tokens.colors.status.online.border,
    dot: tokens.colors.status.online.dot,
    label: 'Online',
  },
  ACTIVE: {
    bg: tokens.colors.status.online.bg,
    text: tokens.colors.status.online.text,
    border: tokens.colors.status.online.border,
    dot: tokens.colors.status.online.dot,
    label: 'Ativo',
  },
  ALERT: {
    bg: tokens.colors.status.alert.bg,
    text: tokens.colors.status.alert.text,
    border: tokens.colors.status.alert.border,
    dot: tokens.colors.status.alert.dot,
    label: 'Alerta',
  },
  WARNING: {
    bg: tokens.colors.status.alert.bg,
    text: tokens.colors.status.alert.text,
    border: tokens.colors.status.alert.border,
    dot: tokens.colors.status.alert.dot,
    label: 'Atenção',
  },
  CRITICAL: {
    bg: tokens.colors.status.critical.bg,
    text: tokens.colors.status.critical.text,
    border: tokens.colors.status.critical.border,
    dot: tokens.colors.status.critical.dot,
    label: 'Crítico',
  },
  FAULT: {
    bg: tokens.colors.status.critical.bg,
    text: tokens.colors.status.critical.text,
    border: tokens.colors.status.critical.border,
    dot: tokens.colors.status.critical.dot,
    label: 'Falha',
  },
  OFFLINE: {
    bg: tokens.colors.status.offline.bg,
    text: tokens.colors.status.offline.text,
    border: tokens.colors.status.offline.border,
    dot: tokens.colors.status.offline.dot,
    label: 'Offline',
  },
  INACTIVE: {
    bg: tokens.colors.status.offline.bg,
    text: tokens.colors.status.offline.text,
    border: tokens.colors.status.offline.border,
    dot: tokens.colors.status.offline.dot,
    label: 'Inativo',
  },
  OPEN: {
    bg: 'rgba(59, 130, 246, 0.15)',
    text: '#93c5fd',
    border: 'rgba(59, 130, 246, 0.3)',
    dot: '#3b82f6',
    label: 'Aberto',
  },
  IN_PROGRESS: {
    bg: 'rgba(234, 179, 8, 0.15)',
    text: '#fde047',
    border: 'rgba(234, 179, 8, 0.3)',
    dot: '#eab308',
    label: 'Em Andamento',
  },
  COMPLETED: {
    bg: tokens.colors.status.online.bg,
    text: tokens.colors.status.online.text,
    border: tokens.colors.status.online.border,
    dot: tokens.colors.status.online.dot,
    label: 'Concluído',
  },
  CANCELLED: {
    bg: tokens.colors.status.offline.bg,
    text: tokens.colors.status.offline.text,
    border: tokens.colors.status.offline.border,
    dot: tokens.colors.status.offline.dot,
    label: 'Cancelado',
  },
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, label, size = 'small' }) => {
  const normKey = (status || '').toUpperCase();
  const cfg = statusMap[normKey] || {
    bg: tokens.colors.status.offline.bg,
    text: tokens.colors.status.offline.text,
    border: tokens.colors.status.offline.border,
    dot: tokens.colors.status.offline.dot,
    label: status || 'Desconhecido',
  };

  const isSmall = size === 'small';

  return (
    <Box
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        px: isSmall ? '8px' : '10px',
        py: isSmall ? '2px' : '4px',
        borderRadius: tokens.radius.full,
        bgcolor: cfg.bg,
        border: `1px solid ${cfg.border}`,
        width: 'fit-content',
      }}
    >
      <Box
        sx={{
          width: isSmall ? '6px' : '8px',
          height: isSmall ? '6px' : '8px',
          borderRadius: '50%',
          bgcolor: cfg.dot,
          boxShadow: `0 0 6px ${cfg.dot}`,
        }}
      />
      <Typography
        variant="caption"
        sx={{
          color: cfg.text,
          fontWeight: 600,
          fontSize: isSmall ? '0.72rem' : '0.8rem',
          lineHeight: 1,
        }}
      >
        {label || cfg.label}
      </Typography>
    </Box>
  );
};
