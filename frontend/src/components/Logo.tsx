import React from 'react';
import { Box, Typography } from '@mui/material';
import WbSunnyRoundedIcon from '@mui/icons-material/WbSunnyRounded';
import BoltRoundedIcon from '@mui/icons-material/BoltRounded';
import { tokens } from '../theme/tokens';

interface LogoProps {
  src?: string;
  height?: number | string;
  collapsed?: boolean;
}

export const Logo: React.FC<LogoProps> = ({ src, height = 36, collapsed = false }) => {
  if (src) {
    return (
      <img
        src={src}
        alt="SETEC Solar"
        style={{
          height: typeof height === 'number' ? `${height}px` : height,
          width: 'auto',
          objectFit: 'contain',
        }}
      />
    );
  }

  // Fallback: Componente vetorial transparente de alta resolução
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2, textDecoration: 'none' }}>
      <Box
        sx={{
          position: 'relative',
          width: typeof height === 'number' ? height : 36,
          height: typeof height === 'number' ? height : 36,
          borderRadius: '10px',
          background: `linear-gradient(135deg, ${tokens.colors.brand.primary} 0%, #e65100 100%)`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: `0 2px 10px ${tokens.colors.brand.primaryGlow}`,
          flexShrink: 0,
        }}
      >
        <WbSunnyRoundedIcon sx={{ color: '#ffffff', fontSize: 22 }} />
        <BoltRoundedIcon
          sx={{
            color: '#fff3e0',
            fontSize: 14,
            position: 'absolute',
            bottom: 2,
            right: 2,
            filter: 'drop-shadow(0 0 2px rgba(0,0,0,0.5))',
          }}
        />
      </Box>

      {!collapsed && (
        <Box sx={{ display: 'flex', flexDirection: 'column', lineHeight: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Typography
              variant="h6"
              sx={{
                fontWeight: 900,
                letterSpacing: '-0.02em',
                color: '#ffffff',
                fontSize: '1.15rem',
                lineHeight: 1,
              }}
            >
              SETEC
            </Typography>
            <Typography
              variant="h6"
              sx={{
                fontWeight: 900,
                letterSpacing: '-0.02em',
                color: tokens.colors.brand.primary,
                fontSize: '1.15rem',
                lineHeight: 1,
              }}
            >
              SOLAR
            </Typography>
          </Box>
          <Typography
            variant="caption"
            sx={{
              color: tokens.colors.text.muted,
              fontSize: '0.65rem',
              fontWeight: 700,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              mt: '2px',
            }}
          >
            Monitoramento
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default Logo;
