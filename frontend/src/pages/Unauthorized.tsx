import { useNavigate } from 'react-router-dom';
import { Box, Paper, Typography, Button } from '@mui/material';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';

export default function Unauthorized() {
  const navigate = useNavigate();

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: '#0d1117',
        p: 2,
      }}
    >
      <Paper
        elevation={6}
        sx={{
          p: 4,
          maxWidth: 440,
          width: '100%',
          textAlign: 'center',
          bgcolor: 'rgba(22, 27, 34, 0.95)',
          border: '1px solid rgba(48, 54, 61, 0.8)',
          borderRadius: 4,
        }}
      >
        <Box
          sx={{
            width: 64,
            height: 64,
            borderRadius: '50%',
            bgcolor: 'rgba(239, 68, 68, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            mx: 'auto',
            mb: 2,
          }}
        >
          <LockOutlinedIcon sx={{ fontSize: 36, color: '#ef4444' }} />
        </Box>

        <Typography variant="h5" sx={{ fontWeight: 'bold', color: '#f0f0f0', mb: 1 }}>
          Acesso Negado (403)
        </Typography>

        <Typography variant="body2" sx={{ color: '#8b929c', mb: 3, lineHeight: 1.6 }}>
          Você não possui permissão para acessar esta página ou recurso com o seu perfil de usuário atual.
        </Typography>

        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
          <Button
            variant="outlined"
            onClick={() => navigate(-1)}
            sx={{ color: '#c9d1d9', borderColor: '#30363d' }}
          >
            Voltar
          </Button>
          <Button
            variant="contained"
            onClick={() => navigate('/login')}
            sx={{ bgcolor: '#ff6b00', '&:hover': { bgcolor: '#e66000' } }}
          >
            Ir para Login
          </Button>
        </Box>
      </Paper>
    </Box>
  );
}
