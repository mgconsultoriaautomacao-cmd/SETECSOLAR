import { useState } from 'react';
import {
  TextField,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Tooltip,
} from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';
import TuneIcon from '@mui/icons-material/Tune';
import NotificationsIcon from '@mui/icons-material/Notifications';
import SecurityIcon from '@mui/icons-material/Security';
import SolarPowerIcon from '@mui/icons-material/SolarPower';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import AddIcon from '@mui/icons-material/Add';
import CheckBoxIcon from '@mui/icons-material/CheckBox';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import './Configuracoes.css';

const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril',
  'Maio', 'Junho', 'Julho', 'Agosto',
  'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

interface Predef {
  id: number;
  name: string;
  rendimento: number;
  isDefault: boolean;
  months: number[];
}

const defaultMonths = () => [8.33, 8.33, 8.33, 8.33, 8.33, 8.33, 8.33, 8.33, 8.33, 8.33, 8.33, 8.37];

const NAV_SECTIONS = [
  { id: 'perfil',      label: 'Perfil de usuário',       icon: <PersonIcon fontSize="small" /> },
  { id: 'seguranca',   label: 'Acesso e segurança',       icon: <SecurityIcon fontSize="small" /> },
  { id: 'predef',      label: 'Predefinições de usinas',  icon: <SolarPowerIcon fontSize="small" /> },
  { id: 'preferencias',label: 'Preferências',             icon: <TuneIcon fontSize="small" /> },
  { id: 'notificacoes',label: 'Notificações',             icon: <NotificationsIcon fontSize="small" /> },
];

export default function Configuracoes() {
  const [section, setSection] = useState('predef');

  // ── Predefinições de Usinas ────────────────────────────────────────────────
  const [predefs, setPredefs] = useState<Predef[]>([
    { id: 1, name: 'Predefinição Padrão', rendimento: 1657, isDefault: true, months: defaultMonths() }
  ]);
  const [expanded, setExpanded] = useState<number[]>([1]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPredef, setEditingPredef] = useState<Predef | null>(null);
  const [formName, setFormName] = useState('');
  const [formRendimento, setFormRendimento] = useState(1657);
  const [formMonths, setFormMonths] = useState<number[]>(defaultMonths());

  const toggleExpand = (id: number) => {
    setExpanded(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const openNew = () => {
    setEditingPredef(null);
    setFormName('Nova Predefinição');
    setFormRendimento(1500);
    setFormMonths(defaultMonths());
    setModalOpen(true);
  };

  const openEdit = (p: Predef) => {
    setEditingPredef(p);
    setFormName(p.name);
    setFormRendimento(p.rendimento);
    setFormMonths([...p.months]);
    setModalOpen(true);
  };

  const handleSavePredef = () => {
    if (editingPredef) {
      setPredefs(prev => prev.map(p => p.id === editingPredef.id
        ? { ...p, name: formName, rendimento: formRendimento, months: formMonths }
        : p
      ));
    } else {
      const id = Date.now();
      setPredefs(prev => [...prev, { id, name: formName, rendimento: formRendimento, isDefault: false, months: formMonths }]);
      setExpanded(prev => [...prev, id]);
    }
    setModalOpen(false);
  };

  const handleDelete = (id: number) => {
    setPredefs(prev => prev.filter(p => p.id !== id));
  };

  const handleSetDefault = (id: number) => {
    setPredefs(prev => prev.map(p => ({ ...p, isDefault: p.id === id })));
  };

  const updateMonth = (index: number, val: string) => {
    const nums = [...formMonths];
    nums[index] = parseFloat(val) || 0;
    setFormMonths(nums);
  };

  // ── Preferências ──────────────────────────────────────────────────────────
  const [prefs, setPrefs] = useState({
  
    emailAlertas: true,
    emailRelatorios: false,
    autoRefresh: true,
    modoCompacto: false,
  });
  const togglePref = (key: keyof typeof prefs) => setPrefs(p => ({ ...p, [key]: !p[key] }));

  // ── Perfil ────────────────────────────────────────────────────────────────
  const [perfil, setPerfil] = useState({
    nome: 'Setec Solar e Segurança Eletrônica',
    email: 'empresasetecsolar@gmail.com',
    telefone: '',
    cargo: 'Administrador',
  });

  const userEmail = localStorage.getItem('user_email') || 'empresasetecsolar@gmail.com';
  const userName = (localStorage.getItem('user_name') || 'SETEC SOLAR').substring(0, 2).toUpperCase();

  return (
    <div className="config-root">
      {/* ── Sidebar ─────────────────────────────────────────────────────── */}
      <aside className="config-sidebar">
        <div className="config-user-info">
          <span className="config-user-name">{localStorage.getItem('user_name') || 'Setec Solar e Segurança'}</span>
          <span className="config-user-email">{userEmail}</span>
        </div>
        <ul className="config-nav">
          {NAV_SECTIONS.map(s => (
            <li key={s.id} className="config-nav-item">
              <button
                className={`config-nav-btn ${section === s.id ? 'active' : ''}`}
                onClick={() => setSection(s.id)}
              >
                <span className="config-nav-icon">{s.icon}</span>
                {s.label}
              </button>
            </li>
          ))}
        </ul>
      </aside>

      {/* ── Conteúdo ────────────────────────────────────────────────────── */}
      <div className="config-content">

        {/* ──────────── PREDEFINIÇÕES DE USINAS ──────────── */}
        {section === 'predef' && (
          <>
            <div className="config-header">
              <div>
                <h1 className="config-title">Predefinições de Performance das Usinas</h1>
                <p className="config-subtitle">Crie aqui predefinições das performances por mês para as usinas</p>
              </div>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={openNew}
                sx={{ bgcolor: '#f57c00', '&:hover': { bgcolor: '#e64a19' }, fontWeight: 700, flexShrink: 0 }}
              >
                Adicionar Predefinição
              </Button>
            </div>

            {predefs.map(p => (
              <div key={p.id} className="predef-card">
                <div className="predef-card-header" onClick={() => toggleExpand(p.id)}>
                  <div className="predef-card-title">
                    <ExpandMoreIcon
                      sx={{
                        transform: expanded.includes(p.id) ? 'rotate(0deg)' : 'rotate(-90deg)',
                        transition: 'transform 0.2s',
                        color: 'var(--color-primary-orange)',
                        fontSize: 20,
                      }}
                    />
                    {p.name}
                  </div>
                  <div className="predef-card-actions" onClick={e => e.stopPropagation()}>
                    <Tooltip title="Editar">
                      <IconButton size="small" onClick={() => openEdit(p)} sx={{ color: 'var(--color-text-muted)' }}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Excluir">
                      <IconButton size="small" onClick={() => handleDelete(p.id)} sx={{ color: 'var(--color-danger)' }}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <IconButton size="small" sx={{ color: 'var(--color-text-muted)' }}>
                      <MoreVertIcon fontSize="small" />
                    </IconButton>
                  </div>
                </div>

                {expanded.includes(p.id) && (
                  <div className="predef-card-body">
                    <div className="predef-meta">
                      <span className="predef-meta-item">
                        Rendimento anual específico: {p.rendimento} kWh/kWp
                      </span>
                      <label
                        className="predef-default-badge"
                        style={{ cursor: 'pointer' }}
                        onClick={() => handleSetDefault(p.id)}
                      >
                        <CheckBoxIcon sx={{ color: p.isDefault ? 'var(--color-primary-orange)' : 'var(--color-border)', fontSize: 18 }} />
                        Predefinição Padrão
                      </label>
                    </div>

                    <p className="predef-months-title">Porcentagem por mês</p>
                    <div className="predef-months-grid">
                      {MONTHS.map((m, i) => (
                        <div key={m} className="predef-month-row">
                          <span className="predef-month-label">{m}:</span>
                          <span className="predef-month-value">{p.months[i].toFixed(2)}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}

            {predefs.length === 0 && (
              <div style={{ textAlign: 'center', padding: '64px', color: 'var(--color-text-muted)' }}>
                <SolarPowerIcon sx={{ fontSize: 64, opacity: 0.15, display: 'block', margin: '0 auto 16px' }} />
                <p>Nenhuma predefinição criada. Clique em "Adicionar Predefinição".</p>
              </div>
            )}
          </>
        )}

        {/* ──────────── PERFIL ──────────── */}
        {section === 'perfil' && (
          <>
            <div className="config-header">
              <div>
                <h1 className="config-title">Perfil de Usuário</h1>
                <p className="config-subtitle">Gerencie as informações da sua conta</p>
              </div>
            </div>

            <div className="profile-section">
              <div className="profile-card">
                <h2 className="profile-card-title">Dados Pessoais</h2>
                <div className="profile-avatar-row">
                  <div className="profile-avatar">{userName}</div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text-main)', marginBottom: 4 }}>
                      Foto de perfil
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
                      JPG, GIF ou PNG. Tamanho máximo 800KB
                    </div>
                  </div>
                </div>
                <div className="profile-form-grid">
                  <TextField label="Nome completo" value={perfil.nome} onChange={e => setPerfil(p => ({...p, nome: e.target.value}))} slotProps={{ inputLabel: { shrink: true } }} fullWidth sx={{ '& .MuiOutlinedInput-root': { bgcolor: 'var(--color-bg-dark)' } }} />
                  <TextField label="E-mail" value={perfil.email} onChange={e => setPerfil(p => ({...p, email: e.target.value}))} slotProps={{ inputLabel: { shrink: true } }} fullWidth sx={{ '& .MuiOutlinedInput-root': { bgcolor: 'var(--color-bg-dark)' } }} />
                  <TextField label="Telefone" value={perfil.telefone} onChange={e => setPerfil(p => ({...p, telefone: e.target.value}))} placeholder="(11) 99999-9999" slotProps={{ inputLabel: { shrink: true } }} fullWidth sx={{ '& .MuiOutlinedInput-root': { bgcolor: 'var(--color-bg-dark)' } }} />
                  <TextField label="Cargo" value={perfil.cargo} onChange={e => setPerfil(p => ({...p, cargo: e.target.value}))} slotProps={{ inputLabel: { shrink: true } }} fullWidth sx={{ '& .MuiOutlinedInput-root': { bgcolor: 'var(--color-bg-dark)' } }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20 }}>
                  <Button variant="contained" sx={{ bgcolor: '#f57c00', '&:hover': { bgcolor: '#e64a19' }, fontWeight: 700 }}>
                    Salvar Alterações
                  </Button>
                </div>
              </div>
            </div>
          </>
        )}

        {/* ──────────── SEGURANÇA ──────────── */}
        {section === 'seguranca' && (
          <>
            <div className="config-header">
              <div>
                <h1 className="config-title">Acesso e Segurança</h1>
                <p className="config-subtitle">Gerencie sua senha e configurações de segurança</p>
              </div>
            </div>
            <div className="profile-section">
              <div className="profile-card">
                <h2 className="profile-card-title">Alterar Senha</h2>
                <div className="profile-form-grid">
                  <TextField label="Senha Atual" type="password" fullWidth slotProps={{ inputLabel: { shrink: true } }} sx={{ '& .MuiOutlinedInput-root': { bgcolor: 'var(--color-bg-dark)' } }} />
                  <div />
                  <TextField label="Nova Senha" type="password" fullWidth slotProps={{ inputLabel: { shrink: true } }} sx={{ '& .MuiOutlinedInput-root': { bgcolor: 'var(--color-bg-dark)' } }} />
                  <TextField label="Confirmar Nova Senha" type="password" fullWidth slotProps={{ inputLabel: { shrink: true } }} sx={{ '& .MuiOutlinedInput-root': { bgcolor: 'var(--color-bg-dark)' } }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20 }}>
                  <Button variant="contained" sx={{ bgcolor: '#f57c00', '&:hover': { bgcolor: '#e64a19' }, fontWeight: 700 }}>
                    Atualizar Senha
                  </Button>
                </div>
              </div>
            </div>
          </>
        )}

        {/* ──────────── PREFERÊNCIAS ──────────── */}
        {section === 'preferencias' && (
          <>
            <div className="config-header">
              <div>
                <h1 className="config-title">Preferências</h1>
                <p className="config-subtitle">Personalize a experiência do sistema</p>
              </div>
            </div>
            <div className="profile-card">
              {[
                { key: 'emailAlertas', label: 'Alertas por e-mail', desc: 'Receba notificações de falhas e alertas de usinas no e-mail cadastrado' },
                { key: 'emailRelatorios', label: 'Relatórios periódicos', desc: 'Receba relatórios mensais de performance automaticamente' },
                { key: 'autoRefresh', label: 'Atualização automática (NOC)', desc: 'Atualiza as leituras do NOC Solar a cada 30 segundos automaticamente' },
                { key: 'modoCompacto', label: 'Modo compacto', desc: 'Exibe tabelas e listas em modo compacto com menos espaçamento' },
              ].map(({ key, label, desc }) => (
                <div key={key} className="pref-row">
                  <div className="pref-info">
                    <h4>{label}</h4>
                    <p>{desc}</p>
                  </div>
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={prefs[key as keyof typeof prefs]}
                      onChange={() => togglePref(key as keyof typeof prefs)}
                    />
                    <span className="toggle-slider" />
                  </label>
                </div>
              ))}
            </div>
          </>
        )}

        {/* ──────────── NOTIFICAÇÕES ──────────── */}
        {section === 'notificacoes' && (
          <>
            <div className="config-header">
              <div>
                <h1 className="config-title">Notificações</h1>
                <p className="config-subtitle">Configure quais eventos geram alertas</p>
              </div>
            </div>
            <div className="profile-card">
              {[
                { key: 'n1', label: 'Usina offline', desc: 'Notificar quando um datalogger ficar sem resposta por mais de 15 minutos' },
                { key: 'n2', label: 'Falha crítica no inversor', desc: 'Notificar ao detectar fault codes no inversor' },
                { key: 'n3', label: 'Geração abaixo do mínimo', desc: 'Alertar quando a geração em horário solar estiver abaixo do mínimo configurado' },
                { key: 'n4', label: 'Nova O.S. criada', desc: 'Notificar técnicos ao criar uma nova ordem de serviço' },
                { key: 'n5', label: 'Chamado atualizado', desc: 'Notificar quando um chamado de cliente tiver atualização de status' },
              ].map(({ key, label, desc }) => (
                <div key={key} className="pref-row">
                  <div className="pref-info">
                    <h4>{label}</h4>
                    <p>{desc}</p>
                  </div>
                  <label className="toggle-switch">
                    <input type="checkbox" defaultChecked={key === 'n1' || key === 'n2'} />
                    <span className="toggle-slider" />
                  </label>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* ── Modal Predefinição ────────────────────────────────────────── */}
      <Dialog
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        slotProps={{ paper: { sx: { bgcolor: '#0f172a', color: '#f8fafc', border: '1px solid #1e293b', maxWidth: 600, width: '100%' } } }}
      >
        <DialogTitle sx={{ borderBottom: '1px solid #1e293b', fontWeight: 700 }}>
          {editingPredef ? 'Editar Predefinição' : 'Nova Predefinição de Performance'}
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div style={{ display: 'flex', gap: 16 }}>
              <TextField
                label="Nome"
                fullWidth
                value={formName}
                onChange={e => setFormName(e.target.value)}
                slotProps={{ inputLabel: { shrink: true } }}
                sx={{ '& .MuiOutlinedInput-root': { bgcolor: '#1e293b' } }}
              />
              <TextField
                label="Rendimento anual (kWh/kWp)"
                type="number"
                value={formRendimento}
                onChange={e => setFormRendimento(Number(e.target.value))}
                slotProps={{ inputLabel: { shrink: true } }}
                sx={{ minWidth: 220, '& .MuiOutlinedInput-root': { bgcolor: '#1e293b' } }}
              />
            </div>

            <div>
              <p style={{ margin: '0 0 12px', fontWeight: 600, fontSize: 13, color: 'var(--color-text-main)' }}>
                Porcentagem por mês (total deve somar ~100%)
              </p>
              <div className="predef-modal-months">
                {MONTHS.map((m, i) => (
                  <TextField
                    key={m}
                    label={m}
                    type="number"
                    size="small"
                    value={formMonths[i]}
                    onChange={e => updateMonth(i, e.target.value)}
                    slotProps={{ inputLabel: { shrink: true }, input: { endAdornment: <span style={{ color: 'var(--color-text-muted)', fontSize: 12 }}>%</span> } }}
                    sx={{ '& .MuiOutlinedInput-root': { bgcolor: '#1e293b' } }}
                  />
                ))}
              </div>
              <div style={{ marginTop: 8, fontSize: 12, color: 'var(--color-text-muted)', textAlign: 'right' }}>
                Total: <span style={{ color: Math.abs(formMonths.reduce((a, b) => a + b, 0) - 100) < 0.1 ? '#22c55e' : '#f59e0b', fontWeight: 700 }}>
                  {formMonths.reduce((a, b) => a + b, 0).toFixed(2)}%
                </span>
              </div>
            </div>
          </div>
        </DialogContent>
        <DialogActions sx={{ p: 2, borderTop: '1px solid #1e293b' }}>
          <Button onClick={() => setModalOpen(false)} sx={{ color: '#64748b' }}>Cancelar</Button>
          <Button
            variant="contained"
            onClick={handleSavePredef}
            disabled={!formName.trim()}
            sx={{ bgcolor: '#f57c00', '&:hover': { bgcolor: '#e64a19' }, fontWeight: 700 }}
          >
            Salvar Predefinição
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}
