export const tokens = {
  colors: {
    brand: {
      primary: '#ff6b00',
      primaryHover: '#e66000',
      primaryGlow: 'rgba(255, 107, 0, 0.25)',
      secondary: '#0284c7',
    },
    background: {
      app: '#0b0f17',
      surface: '#111827',
      surfaceRaised: '#182234',
      surfaceOverlay: '#1f293d',
      surfaceSubtle: 'rgba(255, 255, 255, 0.03)',
      border: '#1f2937',
      borderSubtle: 'rgba(255, 255, 255, 0.08)',
    },
    text: {
      primary: '#f9fafb',
      secondary: '#9ca3af',
      muted: '#6b7280',
      inverse: '#000000',
    },
    status: {
      online: {
        bg: '#052e16',
        text: '#4ade80',
        border: '#166534',
        dot: '#22c55e',
      },
      alert: {
        bg: '#451a03',
        text: '#fde047', // WCAG AA text
        border: '#854d0e',
        dot: '#eab308',
      },
      critical: {
        bg: '#450a0a',
        text: '#f87171',
        border: '#991b1b',
        dot: '#ef4444',
      },
      offline: {
        bg: '#1f2937',
        text: '#9ca3af',
        border: '#374151',
        dot: '#6b7280',
      },
    },
  },
  radius: {
    sm: '6px',
    md: '10px',
    lg: '14px',
    xl: '20px',
    full: '9999px',
  },
  shadows: {
    card: '0 4px 20px -2px rgba(0, 0, 0, 0.5)',
    cardHover: '0 10px 28px -4px rgba(0, 0, 0, 0.65)',
    glowOrange: '0 0 24px rgba(255, 107, 0, 0.25)',
  },
  typography: {
    fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
} as const;
