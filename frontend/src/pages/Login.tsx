import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import logoSetec from '../assets/logosetec.jpg';
import { useAuth } from '../context/AuthContext';
import { CircularProgress } from '@mui/material';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';

export default function Login() {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const navigate = useNavigate();
  const { login } = useAuth();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!email || !senha) {
      setErrorMsg('Por favor, informe seu e-mail e sua senha de acesso.');
      return;
    }

    try {
      setIsSubmitting(true);
      const user = await login(email, senha);
      if (user.role === 'CLIENTE') {
        navigate('/app-cliente');
      } else {
        navigate('/dashboard');
      }
    } catch (err: any) {
      console.error('Erro no login:', err);
      setErrorMsg(err.message || 'E-mail ou senha incorretos.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={styles.page}>
      {/* Glow de fundo decorativo */}
      <div style={{ ...styles.glow, top: '-15%', left: '-10%', background: 'rgba(59, 130, 246, 0.08)' }} />
      <div style={{ ...styles.glow, bottom: '-15%', right: '-10%', background: 'rgba(255, 107, 0, 0.07)' }} />

      <div style={styles.card}>
        {/* Cabeçalho */}
        <div style={styles.header}>
          <img src={logoSetec} alt="SETEC Solar" style={styles.logo} />
          <p style={styles.subtitle}>
            Acesse o painel de monitoramento fotovoltaico da SETEC Solar.
          </p>
        </div>

        {errorMsg && (
          <div style={styles.alertError}>
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleLogin} style={styles.form} noValidate>
          {/* E-mail */}
          <div style={styles.fieldGroup}>
            <label htmlFor="login-email" style={styles.label}>E-mail</label>
            <input
              id="login-email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              onFocus={() => setFocusedField('email')}
              onBlur={() => setFocusedField(null)}
              style={{
                ...styles.input,
                ...(focusedField === 'email' ? styles.inputFocused : {}),
              }}
              placeholder="seu.email@setecsolar.com"
              required
            />
          </div>

          {/* Senha */}
          <div style={styles.fieldGroup}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label htmlFor="login-senha" style={styles.label}>Senha</label>
              <button
                type="button"
                disabled
                style={{ fontSize: '11px', color: '#6e7681', cursor: 'not-allowed' }}
                title="Entre em contato com o suporte para redefinir sua senha"
              >
                Esqueci minha senha
              </button>
            </div>
            <div style={{ position: 'relative' }}>
              <input
                id="login-senha"
                type={showPassword ? 'text' : 'password'}
                value={senha}
                onChange={e => setSenha(e.target.value)}
                onFocus={() => setFocusedField('senha')}
                onBlur={() => setFocusedField(null)}
                style={{
                  ...styles.input,
                  paddingRight: '40px',
                  ...(focusedField === 'senha' ? styles.inputFocused : {}),
                }}
                placeholder="••••••••"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={styles.eyeBtn}
                aria-label="Mostrar ou ocultar senha"
              >
                {showPassword ? <VisibilityOff style={{ fontSize: 18, color: '#8b929c' }} /> : <Visibility style={{ fontSize: 18, color: '#8b929c' }} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            style={{
              ...styles.btn,
              ...(isSubmitting ? styles.btnDisabled : {}),
            }}
            id="btn-entrar"
          >
            {isSubmitting ? (
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                <CircularProgress size={16} color="inherit" /> Autenticando...
              </span>
            ) : (
              'Entrar no sistema'
            )}
          </button>
        </form>

        <p style={styles.footer}>
          SETEC Solar © {new Date().getFullYear()} — Monitoramento Fotovoltaico
        </p>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100svh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '16px',
    backgroundColor: '#0d1117',
    position: 'relative',
    overflow: 'hidden',
    fontFamily: 'Inter, system-ui, sans-serif',
  },
  glow: {
    position: 'absolute',
    width: 'clamp(200px, 40vw, 600px)',
    height: 'clamp(200px, 40vw, 600px)',
    borderRadius: '50%',
    filter: 'blur(100px)',
    pointerEvents: 'none',
  },
  card: {
    width: 'min(440px, 100%)',
    backgroundColor: 'rgba(22, 27, 34, 0.92)',
    border: '1px solid rgba(48, 54, 61, 0.8)',
    borderRadius: '16px',
    padding: 'clamp(24px, 5vw, 40px)',
    backdropFilter: 'blur(20px)',
    boxShadow: '0 24px 64px rgba(0, 0, 0, 0.5)',
    position: 'relative',
    zIndex: 1,
  },
  header: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '16px',
    marginBottom: '24px',
  },
  logo: {
    height: 'clamp(64px, 15vw, 110px)',
    width: 'auto',
    objectFit: 'contain',
    mixBlendMode: 'screen',
  },
  subtitle: {
    fontSize: '13px',
    color: '#8b929c',
    textAlign: 'center',
    lineHeight: 1.6,
    maxWidth: '320px',
    margin: 0,
  },
  alertError: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    border: '1px solid rgba(239, 68, 68, 0.3)',
    color: '#f87171',
    padding: '10px 14px',
    borderRadius: '8px',
    fontSize: '13px',
    marginBottom: '20px',
    lineHeight: 1.5,
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '18px',
  },
  fieldGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  label: {
    fontSize: '13px',
    fontWeight: 500,
    color: '#c9d1d9',
  },
  input: {
    width: '100%',
    padding: '11px 14px',
    backgroundColor: 'rgba(13, 17, 23, 0.6)',
    border: '1px solid rgba(48, 54, 61, 0.9)',
    borderRadius: '8px',
    color: '#f0f0f0',
    fontSize: '14px',
    outline: 'none',
    transition: 'border-color 0.2s, box-shadow 0.2s',
    boxSizing: 'border-box',
    fontFamily: 'inherit',
  },
  inputFocused: {
    borderColor: '#ff6b00',
    boxShadow: '0 0 0 3px rgba(255, 107, 0, 0.15)',
  },
  eyeBtn: {
    position: 'absolute',
    right: '10px',
    top: '50%',
    transform: 'translateY(-50%)',
    background: 'none',
    border: 'none',
    padding: '4px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  btn: {
    marginTop: '6px',
    padding: '13px 24px',
    background: 'linear-gradient(135deg, #e66000 0%, #ff6b00 50%, #ff8c00 100%)',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '15px',
    fontWeight: 600,
    cursor: 'pointer',
    letterSpacing: '0.3px',
    transition: 'opacity 0.2s, transform 0.1s',
    fontFamily: 'inherit',
  },
  btnDisabled: {
    opacity: 0.7,
    cursor: 'not-allowed',
  },
  footer: {
    marginTop: '28px',
    fontSize: '11px',
    color: '#4a5568',
    textAlign: 'center',
  },
};
