import React from 'react';
import { TextField, type TextFieldProps } from '@mui/material';
import { tokens } from '../../theme/tokens';

export type FormFieldProps = TextFieldProps;

export const FormField: React.FC<FormFieldProps> = (props) => {
  return (
    <TextField
      fullWidth
      slotProps={{
        inputLabel: { shrink: true },
        ...props.slotProps,
      }}
      sx={{
        '& .MuiOutlinedInput-root': {
          bgcolor: tokens.colors.background.surfaceRaised,
          borderRadius: tokens.radius.md,
          '& fieldset': {
            borderColor: tokens.colors.background.border,
          },
          '&:hover fieldset': {
            borderColor: 'rgba(255, 255, 255, 0.2)',
          },
          '&.Mui-focused fieldset': {
            borderColor: tokens.colors.brand.primary,
          },
        },
        '& .MuiInputLabel-root': {
          color: tokens.colors.text.secondary,
          '&.Mui-focused': {
            color: tokens.colors.brand.primary,
          },
        },
        '& .MuiFormHelperText-root': {
          fontSize: '0.75rem',
        },
        ...props.sx,
      }}
      {...props}
    />
  );
};
