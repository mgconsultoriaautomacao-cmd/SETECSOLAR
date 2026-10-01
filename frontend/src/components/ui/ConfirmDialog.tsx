import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  Button,
  Box,
} from '@mui/material';
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded';
import { tokens } from '../../theme/tokens';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDestructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  open,
  title,
  message,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  isDestructive = false,
  onConfirm,
  onCancel,
  loading = false,
}) => {
  return (
    <Dialog
      open={open}
      onClose={onCancel}
      slotProps={{
        paper: {
          sx: {
            bgcolor: tokens.colors.background.surface,
            border: `1px solid ${tokens.colors.background.border}`,
            borderRadius: tokens.radius.lg,
            p: 1,
            maxWidth: 440,
            width: '100%',
          },
        },
      }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1.5, pb: 1 }}>
        {isDestructive && (
          <Box
            sx={{
              p: 1,
              borderRadius: '50%',
              bgcolor: 'rgba(239, 68, 68, 0.1)',
              color: tokens.colors.status.critical.text,
              display: 'flex',
            }}
          >
            <WarningAmberRoundedIcon />
          </Box>
        )}
        <Typography variant="h6" sx={{ fontWeight: 700, color: tokens.colors.text.primary }}>
          {title}
        </Typography>
      </DialogTitle>

      <DialogContent>
        <Typography variant="body2" sx={{ color: tokens.colors.text.secondary, lineHeight: 1.6 }}>
          {message}
        </Typography>
      </DialogContent>

      <DialogActions sx={{ p: 2, pt: 1, gap: 1 }}>
        <Button
          variant="outlined"
          onClick={onCancel}
          disabled={loading}
          sx={{ borderColor: tokens.colors.background.border, color: tokens.colors.text.secondary }}
        >
          {cancelLabel}
        </Button>
        <Button
          variant="contained"
          onClick={onConfirm}
          disabled={loading}
          sx={{
            bgcolor: isDestructive ? '#dc2626' : tokens.colors.brand.primary,
            '&:hover': {
              bgcolor: isDestructive ? '#b91c1c' : tokens.colors.brand.primaryHover,
            },
          }}
        >
          {loading ? 'Processando...' : confirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
