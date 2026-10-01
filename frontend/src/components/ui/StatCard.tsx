import React from 'react';
import { Paper, Box, Typography, Skeleton } from '@mui/material';
import { tokens } from '../../theme/tokens';

interface StatCardProps {
  title: string;
  value: string | number;
  unit?: string;
  icon?: React.ReactNode;
  variation?: {
    value: string | number;
    positive?: boolean;
    label?: string;
  };
  loading?: boolean;
  color?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  unit,
  icon,
  variation,
  loading = false,
  color = tokens.colors.brand.primary,
}) => {
  return (
    <Paper
      sx={{
        p: 2.5,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        position: 'relative',
        overflow: 'hidden',
        transition: 'transform 0.2s, box-shadow 0.2s',
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: tokens.shadows.cardHover,
        },
      }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
        <Typography variant="body2" sx={{ color: tokens.colors.text.secondary, fontWeight: 500 }}>
          {title}
        </Typography>
        {icon && (
          <Box
            sx={{
              p: 1,
              borderRadius: tokens.radius.md,
              bgcolor: 'rgba(255, 255, 255, 0.04)',
              color: color,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {icon}
          </Box>
        )}
      </Box>

      {loading ? (
        <Box sx={{ my: 0.5 }}>
          <Skeleton variant="text" width="60%" height={40} />
          <Skeleton variant="text" width="40%" height={20} />
        </Box>
      ) : (
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
            <Typography variant="h4" sx={{ fontWeight: 700, color: tokens.colors.text.primary, letterSpacing: '-0.02em' }}>
              {value}
            </Typography>
            {unit && (
              <Typography variant="subtitle1" sx={{ color: tokens.colors.text.muted, fontWeight: 600 }}>
                {unit}
              </Typography>
            )}
          </Box>

          {variation && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 1 }}>
              <Typography
                variant="caption"
                sx={{
                  color: variation.positive ? tokens.colors.status.online.text : tokens.colors.status.critical.text,
                  fontWeight: 700,
                }}
              >
                {variation.positive ? '+' : ''}{variation.value}%
              </Typography>
              {variation.label && (
                <Typography variant="caption" sx={{ color: tokens.colors.text.muted }}>
                  {variation.label}
                </Typography>
              )}
            </Box>
          )}
        </Box>
      )}
    </Paper>
  );
};
