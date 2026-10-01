import { createTheme } from '@mui/material/styles';
import { tokens } from './tokens';

const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: tokens.colors.brand.primary,
      dark: tokens.colors.brand.primaryHover,
      contrastText: '#ffffff',
    },
    secondary: {
      main: tokens.colors.brand.secondary,
    },
    background: {
      default: tokens.colors.background.app,
      paper: tokens.colors.background.surface,
    },
    text: {
      primary: tokens.colors.text.primary,
      secondary: tokens.colors.text.secondary,
    },
    divider: tokens.colors.background.border,
  },
  typography: {
    fontFamily: tokens.typography.fontFamily,
    h1: { fontWeight: 700 },
    h2: { fontWeight: 700 },
    h3: { fontWeight: 600 },
    h4: { fontWeight: 600 },
    h5: { fontWeight: 600 },
    h6: { fontWeight: 600 },
    button: { textTransform: 'none', fontWeight: 600 },
  },
  shape: {
    borderRadius: 10,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: tokens.radius.md,
          padding: '8px 16px',
          fontWeight: 600,
          minHeight: '40px', // Acessibilidade: alvo de toque >= 40px
          transition: 'all 0.2s ease-in-out',
        },
        contained: {
          background: `linear-gradient(135deg, ${tokens.colors.brand.primaryHover} 0%, ${tokens.colors.brand.primary} 100%)`,
          boxShadow: `0 2px 10px ${tokens.colors.brand.primaryGlow}`,
          '&:hover': {
            background: tokens.colors.brand.primaryHover,
            boxShadow: `0 4px 16px ${tokens.colors.brand.primaryGlow}`,
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          backgroundColor: tokens.colors.background.surface,
          border: `1px solid ${tokens.colors.background.border}`,
          borderRadius: tokens.radius.lg,
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          borderColor: tokens.colors.background.border,
          color: tokens.colors.text.primary,
        },
        head: {
          backgroundColor: tokens.colors.background.surfaceRaised,
          color: tokens.colors.text.secondary,
          fontWeight: 600,
          fontSize: '0.75rem',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 600,
          minHeight: '44px',
          fontSize: '0.875rem',
          color: tokens.colors.text.secondary,
          '&.Mui-selected': {
            color: tokens.colors.brand.primary,
          },
        },
      },
    },
  },
});

export default theme;
