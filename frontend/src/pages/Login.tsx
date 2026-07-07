import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import logoSetec from '../assets/logosetec.jpg';

type Role = 'SUPER_ADMIN' | 'GESTOR' | 'OPERADOR' | 'TECNICO' | 'CLIENTE';

const perfis: { value: Role; label: string; email: string }[] = [
  { value: 'SUPER_ADMIN', label: 'Super Admin — Controle total', email: 'admin@setecsolar.com' },
  { value: 'GESTOR',      label: 'Gestor — Clientes e financeiro', email: 'gestor@setecsolar.com' },
  { value: 'OPERADOR',    label: 'Operador — Monitoramento / NOC', email: 'operador@setecsolar.com' },
  { value: 'TECNICO',     label: 'Técnico — Chamados e manutenção', email: 'tecnico@setecsolar.com' },
  { value: 'CLIENTE',     label: 'Cliente — Somente minha usina', email: 'cliente@usinasolar.com' },
];

export default function Login() {
  const [email, setEmail] = useState('admin@setecsolar.com');
  const [senha, setSenha] = useState('');
  const [role, setRole] = useState<Role>('SUPER_ADMIN');
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleRoleChange = (val: Role) => {
    setRole(val);
    const perfil = perfis.find(p => p.value === val);
    if (perfil) setEmail(perfil.email);
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('user_role', role);
    localStorage.setItem('user_email', email);
    navigate(role === 'CLIENTE' ? '/app-cliente' : '/dashboard');
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
            Acesse o painel de monitoramento ou selecione um perfil para testar o sistema.
          </p>
        </div>

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
              placeholder="seu@email.com"
              required
            />
          </div>

          {/* Senha */}
          <div style={styles.fieldGroup}>
            <label htmlFor="login-senha" style={styles.label}>Senha</label>
            <input
              id="login-senha"
              type="password"
              value={senha}
              onChange={e => setSenha(e.target.value)}
              onFocus={() => setFocusedField('senha')}
              onBlur={() => setFocusedField(null)}
              style={{
                ...styles.input,
                ...(focusedField === 'senha' ? styles.inputFocused : {}),
              }}
              placeholder="••••••••"
            />
          </div>

          {/* Perfil de acesso */}
          <div style={styles.fieldGroup}>
            <label htmlFor="login-perfil" style={styles.label}>
              Perfil de acesso
              <span style={styles.labelTag}>simulação</span>
            </label>
            <select
              id="login-perfil"
              value={role}
              onChange={e => handleRoleChange(e.target.value as Role)}
              onFocus={() => setFocusedField('perfil')}
              onBlur={() => setFocusedField(null)}
              style={{
                ...styles.input,
                ...styles.select,
                ...(focusedField === 'perfil' ? styles.inputFocused : {}),
              }}
            >
              {perfis.map(p => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
          </div>

          <button type="submit" style={styles.btn} id="btn-entrar">
            Entrar no sistema
          </button>
        </form>

        <p style={styles.footer}>
          SETEC Solar © {new Date().getFullYear()} — Monitoramento Fotovoltaico
        </p>
      </div>
    </div>
  );
}

// Estilos em objeto para manter o CSS junto ao componente e facilitar manutenção
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
    marginBottom: '32px',
  },
  logo: {
    height: 'clamp(64px, 15vw, 120px)',
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
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
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
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  labelTag: {
    fontSize: '10px',
    fontWeight: 600,
    color: '#ff6b00',
    backgroundColor: 'rgba(255, 107, 0, 0.12)',
    border: '1px solid rgba(255, 107, 0, 0.25)',
    borderRadius: '4px',
    padding: '1px 6px',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
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
  select: {
    cursor: 'pointer',
    appearance: 'none',
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%238b929c' d='M6 8L1 3h10z'/%3E%3C/svg%3E")`,
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'right 14px center',
    paddingRight: '36px',
  },
  btn: {
    marginTop: '4px',
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
  footer: {
    marginTop: '28px',
    fontSize: '11px',
    color: '#4a5568',
    textAlign: 'center',
  },
};
