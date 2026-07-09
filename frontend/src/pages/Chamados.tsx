import { useState, useEffect } from 'react';
import {
  Box, Grid, Paper, Typography, Button, Chip,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, FormControl, InputLabel, Select, MenuItem,
  InputAdornment, LinearProgress, Tabs, Tab,
  Divider, IconButton,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import SupportAgentIcon from '@mui/icons-material/SupportAgent';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PendingIcon from '@mui/icons-material/Pending';
import CloseIcon from '@mui/icons-material/Close';
import PhoneIcon from '@mui/icons-material/Phone';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import AssignmentTurnedInIcon from '@mui/icons-material/AssignmentTurnedIn';
import { useApp } from '../context/AppContext';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

interface Ticket {
  id: string;
  clientId: string;
  category: 'MONITORING' | 'INVERTER' | 'PANELS' | 'CLEANING' | 'INVOICE' | 'OTHERS';
  title: string;
  description: string;
  status: 'OPEN' | 'ANALYSING' | 'IN_PROGRESS' | 'COMPLETED';
  resolution?: string;
  workOrderId?: string;
  createdAt: string;
  client?: { 
    name: string;
    phone?: string;
    address?: string;
    city?: string;
    state?: string;
  };
}

const getHeaders = () => ({
  'Content-Type': 'application/json',
  'x-user-role': localStorage.getItem('user_role') || 'SUPER_ADMIN',
  'x-user-email': localStorage.getItem('user_email') || '',
});

const categoryConfig = {
  MONITORING: { label: 'Monitoramento', color: '#60a5fa' },
  INVERTER:   { label: 'Inversor',      color: '#f59e0b' },
  PANELS:     { label: 'Painéis',       color: '#22c55e' },
  CLEANING:   { label: 'Limpeza',       color: '#34d399' },
  INVOICE:    { label: 'Fatura',        color: '#a78bfa' },
  OTHERS:     { label: 'Outros',        color: '#94a3b8' },
};

const statusConfig = {
  OPEN:        { label: 'Aberto',       color: '#64748b' },
  ANALYSING:   { label: 'Em Análise',   color: '#3b82f6' },
  IN_PROGRESS: { label: 'Em Atend.',    color: '#f59e0b' },
  COMPLETED:   { label: 'Resolvido',    color: '#22c55e' },
};

export default function Chamados() {
  const { clients, usinas } = useApp();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [tabValue, setTabValue] = useState(0);
  const [open, setOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [resolutionText, setResolutionText] = useState('');

  const [form, setForm] = useState({
    clientId: '',
    category: 'MONITORING' as Ticket['category'],
    title: '',
    description: '',
  });

  const fetchTickets = async () => {
    try {
      const r = await fetch(`${API_URL}/tickets`, { headers: getHeaders() });
      if (r.ok) {
        const data = await r.json();
        setTickets(data);
        if (selectedTicket) {
          const updated = data.find((t: Ticket) => t.id === selectedTicket.id);
          if (updated) setSelectedTicket(updated);
        }
      }
    } catch {
      // silent fail
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTickets(); }, []);

  const handleSave = async () => {
    try {
      await fetch(`${API_URL}/tickets`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(form),
      });
      await fetchTickets();
      setOpen(false);
      setForm({ clientId: '', category: 'MONITORING', title: '', description: '' });
    } catch (e) { console.error(e); }
  };

  const handleStatusChange = async (id: string, status: Ticket['status'], resolution?: string) => {
    try {
      await fetch(`${API_URL}/tickets/${id}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify({ status, resolution }),
      });
      await fetchTickets();
      if (status === 'COMPLETED') {
        setResolutionText('');
      }
    } catch (e) { console.error(e); }
  };

  const handleGenerateOS = async () => {
    if (!selectedTicket) return;
    try {
      // Primeiro cria a O.S
      const r = await fetch(`${API_URL}/work-orders`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          clientId: selectedTicket.clientId,
          usinaId: usinas.find(u => u.clientId === selectedTicket.clientId)?.id || '',
          description: `Gerado a partir do chamado: ${selectedTicket.title}\n\n${selectedTicket.description}`,
          priority: 'MEDIUM',
          status: 'OPEN',
          serviceType: 'CORRETIVA'
        }),
      });
      if (r.ok) {
        const os = await r.json();
        // Atualiza o chamado com o ID da OS gerada
        await fetch(`${API_URL}/tickets/${selectedTicket.id}`, {
          method: 'PUT',
          headers: getHeaders(),
          body: JSON.stringify({ workOrderId: os.id }),
        });
        await fetchTickets();
        alert('Ordem de Serviço gerada com sucesso!');
      }
    } catch (e) {
      console.error(e);
      alert('Erro ao gerar O.S');
    }
  };

  const tabStatuses = [
    ['OPEN', 'ANALYSING', 'IN_PROGRESS'],
    ['COMPLETED'],
  ];

  const filtered = tickets.filter(t => {
    const matchSearch = t.title.toLowerCase().includes(search.toLowerCase()) ||
      (t.client?.name || '').toLowerCase().includes(search.toLowerCase());
    return matchSearch && tabStatuses[tabValue].includes(t.status);
  });

  const activeCount = tickets.filter(t => t.status !== 'COMPLETED').length;
  const completedCount = tickets.filter(t => t.status === 'COMPLETED').length;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>

      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700, color: 'var(--color-text-main)', display: 'flex', alignItems: 'center', gap: 1 }}>
            <SupportAgentIcon sx={{ color: 'var(--color-primary-orange)' }} /> Central de Chamados
          </Typography>
          <Typography variant="caption" sx={{ color: 'var(--color-text-muted)' }}>
            Atendimento e suporte ao cliente
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setOpen(true)}
          sx={{ bgcolor: 'var(--color-primary-orange)', '&:hover': { bgcolor: 'var(--color-primary-orange-hover)' }, fontWeight: 700 }}>
          Novo Chamado
        </Button>
      </Box>

      {/* KPI */}
      <Grid container spacing={2}>
        {[
          { label: 'Chamados Ativos', value: activeCount, color: '#f59e0b', icon: <PendingIcon sx={{ fontSize: 28, color: '#f59e0b' }} /> },
          { label: 'Resolvidos', value: completedCount, color: '#22c55e', icon: <CheckCircleIcon sx={{ fontSize: 28, color: '#22c55e' }} /> },
          { label: 'Total', value: tickets.length, color: 'var(--color-primary-orange)', icon: <SupportAgentIcon sx={{ fontSize: 28, color: 'var(--color-primary-orange)' }} /> },
        ].map(({ label, value, color, icon }) => (
          <Grid key={label} size={{ xs: 12, sm: 4 }}>
            <Paper sx={{ p: 2.5, bgcolor: 'var(--color-bg-panel)', border: '1px solid var(--color-border)', borderRadius: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
              {icon}
              <Box>
                <Typography variant="caption" sx={{ color: 'var(--color-text-muted)' }}>{label}</Typography>
                <Typography variant="h4" sx={{ color, fontWeight: 800, lineHeight: 1 }}>{value}</Typography>
              </Box>
            </Paper>
          </Grid>
        ))}
      </Grid>

      {/* Filtros e Tabs */}
      <Paper sx={{ p: 2, bgcolor: 'var(--color-bg-panel)', border: '1px solid var(--color-border)', borderRadius: 2 }}>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
          <TextField size="small" placeholder="Buscar por título ou cliente..."
            value={search} onChange={e => setSearch(e.target.value)} sx={{ flex: 1, minWidth: 260 }}
            slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchIcon sx={{ color: 'var(--color-text-muted)' }} /></InputAdornment> } }} />
          <Tabs value={tabValue} onChange={(_, v) => { setTabValue(v); setSelectedTicket(null); }}
            sx={{ '& .MuiTabs-indicator': { backgroundColor: 'var(--color-primary-orange)' }, '& .MuiTab-root': { color: 'var(--color-text-muted)', fontSize: 12 }, '& .Mui-selected': { color: 'var(--color-primary-orange) !important' } }}>
            <Tab label={`Em Aberto (${activeCount})`} />
            <Tab label={`Resolvidos (${completedCount})`} />
          </Tabs>
        </Box>
      </Paper>

      {/* Tabela e Painel Lateral */}
      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: selectedTicket ? 7 : 12 }} sx={{ transition: 'all 0.3s' }}>
          {loading ? <LinearProgress color="warning" /> : (
            <TableContainer component={Paper} sx={{ bgcolor: 'var(--color-bg-panel)', border: '1px solid var(--color-border)' }}>
              <Table>
                <TableHead sx={{ bgcolor: 'rgba(0,0,0,0.2)' }}>
                  <TableRow>
                    {['Cliente', 'Título', 'Categoria', 'Status', 'Aberto em'].map(h => (
                      <TableCell key={h} sx={{ color: 'var(--color-text-muted)', fontWeight: 700, fontSize: 11, textTransform: 'uppercase' }}>{h}</TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filtered.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} align="center" sx={{ color: 'var(--color-text-muted)', py: 6 }}>Nenhum chamado encontrado</TableCell>
                    </TableRow>
                  ) : filtered.map(t => {
                    const cat = categoryConfig[t.category];
                    const st = statusConfig[t.status];
                    const isSelected = selectedTicket?.id === t.id;
                    return (
                      <TableRow 
                        key={t.id} 
                        onClick={() => setSelectedTicket(t)}
                        sx={{ 
                          cursor: 'pointer',
                          bgcolor: isSelected ? 'rgba(255, 107, 0, 0.05)' : 'inherit',
                          '&:hover': { bgcolor: 'rgba(255, 107, 0, 0.1)' } 
                        }}
                      >
                        <TableCell sx={{ color: 'var(--color-text-main)', fontWeight: 600 }}>{t.client?.name || '—'}</TableCell>
                        <TableCell sx={{ color: 'var(--color-text-main)', maxWidth: 200 }}>
                          <Typography variant="body2" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.title}</Typography>
                        </TableCell>
                        <TableCell>
                          <Chip label={cat.label} size="small"
                            sx={{ bgcolor: `${cat.color}18`, color: cat.color, fontWeight: 700, fontSize: 10, border: `1px solid ${cat.color}30` }} />
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption" sx={{ color: st.color, fontWeight: 700 }}>{st.label}</Typography>
                        </TableCell>
                        <TableCell sx={{ color: 'var(--color-text-muted)', fontSize: 12 }}>
                          {new Date(t.createdAt).toLocaleDateString('pt-BR')}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Grid>

        {/* Painel Lateral */}
        {selectedTicket && (
          <Grid size={{ xs: 12, md: 5 }}>
            <Paper sx={{ p: 3, bgcolor: 'var(--color-bg-panel)', border: '1px solid var(--color-border)', borderRadius: 2, height: '100%', display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Typography variant="h6" sx={{ color: 'var(--color-text-main)', fontWeight: 700 }}>
                  Detalhes do Chamado
                </Typography>
                <IconButton onClick={() => setSelectedTicket(null)} size="small" sx={{ color: 'var(--color-text-muted)' }}>
                  <CloseIcon />
                </IconButton>
              </Box>

              <Divider sx={{ borderColor: 'var(--color-border)' }} />

              <Box>
                <Typography variant="caption" sx={{ color: 'var(--color-text-muted)', fontWeight: 600 }}>CLIENTE</Typography>
                <Typography variant="body1" sx={{ color: 'var(--color-text-main)', fontWeight: 600 }}>{selectedTicket.client?.name}</Typography>
                
                <Box sx={{ display: 'flex', gap: 1, mt: 1, alignItems: 'center' }}>
                  <PhoneIcon sx={{ fontSize: 16, color: 'var(--color-text-muted)' }} />
                  <Typography variant="body2" sx={{ color: 'var(--color-text-muted)' }}>
                    {selectedTicket.client?.phone || 'Telefone não cadastrado'}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 1, mt: 1, alignItems: 'flex-start' }}>
                  <LocationOnIcon sx={{ fontSize: 16, color: 'var(--color-text-muted)', mt: 0.5 }} />
                  <Typography variant="body2" sx={{ color: 'var(--color-text-muted)' }}>
                    {selectedTicket.client?.address ? `${selectedTicket.client.address}, ${selectedTicket.client.city} - ${selectedTicket.client.state}` : 'Endereço não cadastrado'}
                  </Typography>
                </Box>
              </Box>

              <Divider sx={{ borderColor: 'var(--color-border)' }} />

              <Box>
                <Typography variant="caption" sx={{ color: 'var(--color-text-muted)', fontWeight: 600 }}>DESCRIÇÃO DA FALHA</Typography>
                <Typography variant="body2" sx={{ color: 'var(--color-text-main)', mt: 1, whiteSpace: 'pre-wrap' }}>
                  {selectedTicket.description}
                </Typography>
              </Box>

              <Box sx={{ mt: 'auto', display: 'flex', flexDirection: 'column', gap: 2 }}>
                {selectedTicket.status !== 'COMPLETED' ? (
                  <>
                    <TextField
                      label="Resolução / Observação"
                      multiline
                      rows={3}
                      fullWidth
                      value={resolutionText}
                      onChange={e => setResolutionText(e.target.value)}
                      sx={{ mt: 2 }}
                    />
                    
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      {selectedTicket.status === 'OPEN' && (
                        <Button fullWidth variant="outlined" onClick={() => handleStatusChange(selectedTicket.id, 'ANALYSING')}>
                          Iniciar Análise
                        </Button>
                      )}
                      {selectedTicket.status === 'ANALYSING' && (
                        <Button fullWidth variant="outlined" color="warning" onClick={() => handleStatusChange(selectedTicket.id, 'IN_PROGRESS')}>
                          Iniciar Atendimento
                        </Button>
                      )}
                      
                      <Button fullWidth variant="contained" color="success" onClick={() => handleStatusChange(selectedTicket.id, 'COMPLETED', resolutionText)}>
                        Resolver Chamado
                      </Button>
                    </Box>

                    {!selectedTicket.workOrderId && (
                      <Button 
                        fullWidth 
                        variant="contained" 
                        startIcon={<AssignmentTurnedInIcon />}
                        onClick={handleGenerateOS}
                        sx={{ bgcolor: 'var(--color-primary-orange)', '&:hover': { bgcolor: 'var(--color-primary-orange-hover)' } }}
                      >
                        Gerar Ordem de Serviço
                      </Button>
                    )}
                  </>
                ) : (
                  <Box sx={{ bgcolor: 'rgba(34, 197, 94, 0.1)', p: 2, borderRadius: 2, border: '1px solid rgba(34, 197, 94, 0.3)' }}>
                    <Typography variant="caption" sx={{ color: '#22c55e', fontWeight: 700 }}>RESOLUÇÃO:</Typography>
                    <Typography variant="body2" sx={{ color: 'var(--color-text-main)', mt: 0.5 }}>
                      {selectedTicket.resolution || 'Resolvido sem detalhes adicionais.'}
                    </Typography>
                  </Box>
                )}

                {selectedTicket.workOrderId && (
                   <Chip 
                    icon={<AssignmentTurnedInIcon />} 
                    label="Ordem de Serviço Vinculada" 
                    color="primary" 
                    variant="outlined"
                    sx={{ width: '100%', py: 1 }}
                  />
                )}
              </Box>

            </Paper>
          </Grid>
        )}
      </Grid>

      {/* Dialog Novo Chamado */}
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth
        sx={{ '& .MuiDialog-paper': { bgcolor: 'var(--color-bg-panel)', border: '1px solid var(--color-border)', borderRadius: 3, color: 'var(--color-text-main)' } }}>
        <DialogTitle sx={{ fontWeight: 700, borderBottom: '1px solid var(--color-border)' }}>
          Abrir Novo Chamado
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <FormControl fullWidth size="small">
              <InputLabel shrink>Cliente</InputLabel>
              <Select value={form.clientId} label="Cliente" notched onChange={e => setForm(p => ({ ...p, clientId: e.target.value as string }))}>
                {clients.map(c => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
              </Select>
            </FormControl>
            <FormControl fullWidth size="small">
              <InputLabel shrink>Categoria</InputLabel>
              <Select value={form.category} label="Categoria" notched onChange={e => setForm(p => ({ ...p, category: e.target.value as Ticket['category'] }))}>
                {Object.entries(categoryConfig).map(([k, v]) => <MenuItem key={k} value={k}>{v.label}</MenuItem>)}
              </Select>
            </FormControl>
            <TextField label="Título do Chamado" fullWidth value={form.title}
              onChange={e => setForm(p => ({ ...p, title: e.target.value }))} slotProps={{ inputLabel: { shrink: true } }} />
            <TextField label="Descrição detalhada" multiline rows={4} fullWidth value={form.description}
              onChange={e => setForm(p => ({ ...p, description: e.target.value }))} slotProps={{ inputLabel: { shrink: true } }} />
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 3, borderTop: '1px solid var(--color-border)' }}>
          <Button onClick={() => setOpen(false)} sx={{ color: 'var(--color-text-muted)' }}>Cancelar</Button>
          <Button variant="contained" onClick={handleSave}
            disabled={!form.clientId || !form.title || !form.description}
            sx={{ bgcolor: 'var(--color-primary-orange)', '&:hover': { bgcolor: 'var(--color-primary-orange-hover)' }, fontWeight: 700 }}>
            Abrir Chamado
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
