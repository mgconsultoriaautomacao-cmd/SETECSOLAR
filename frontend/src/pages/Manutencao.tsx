import { useState, useEffect } from 'react';
import {
  Box, Grid, Paper, Typography, Button, Chip,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, FormControl, InputLabel, Select, MenuItem,
  Tabs, Tab, LinearProgress, InputAdornment, Divider, IconButton
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import SearchIcon from '@mui/icons-material/Search';
import BuildIcon from '@mui/icons-material/Build';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PendingIcon from '@mui/icons-material/Pending';
import WarningIcon from '@mui/icons-material/Warning';
import EngineeringIcon from '@mui/icons-material/Engineering';
import CloseIcon from '@mui/icons-material/Close';
import PersonIcon from '@mui/icons-material/Person';
import MapIcon from '@mui/icons-material/Map';
import DescriptionIcon from '@mui/icons-material/Description';
import { useApp } from '../context/AppContext';

const API_URL = import.meta.env.VITE_API_URL !== undefined ? import.meta.env.VITE_API_URL : 'http://localhost:3001';

interface WorkOrderPart {
  id: string;
  description: string;
  quantity: number;
  unit: string;
  unitCost: number;
}

interface WorkOrder {
  id: string;
  number: number;
  clientId: string;
  usinaId: string;
  description: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status: 'OPEN' | 'IN_PROGRESS' | 'WAITING_CLIENT' | 'COMPLETED' | 'CANCELLED';
  serviceType: 'PREVENTIVA' | 'CORRETIVA' | 'EMERGENCIA' | 'LIMPEZA' | 'OUTROS';
  technicianId?: string;
  scheduledAt?: string;
  completedAt?: string;
  notes?: string;
  internalNotes?: string;
  laborCost?: number;
  createdAt: string;
  updatedAt: string;
  parts?: WorkOrderPart[];
  client?: { name: string; phone?: string; address?: string; city?: string; state?: string };
  usina?: { name: string; address?: string; gpsLatitude?: number; gpsLongitude?: number };
  technician?: { name: string; phone?: string };
}

const getHeaders = () => ({
  'Content-Type': 'application/json',
  'x-user-role': localStorage.getItem('user_role') || 'SUPER_ADMIN',
  'x-user-email': localStorage.getItem('user_email') || '',
});

const statusConfig = {
  OPEN:           { label: 'Aberta',          icon: <PendingIcon />,      color: '#64748b' },
  IN_PROGRESS:    { label: 'Em Andamento',    icon: <BuildIcon />,         color: '#3b82f6' },
  WAITING_CLIENT: { label: 'Aguard. Cliente', icon: <WarningIcon />,       color: '#f59e0b' },
  COMPLETED:      { label: 'Concluída',       icon: <CheckCircleIcon />,   color: '#22c55e' },
  CANCELLED:      { label: 'Cancelada',       icon: <DeleteIcon />,        color: '#ef4444' },
};

export default function Manutencao() {
  const { clients, usinas } = useApp();
  const [orders, setOrders] = useState<WorkOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [tabValue, setTabValue] = useState(0);
  const [open, setOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<WorkOrder | null>(null);
  const [panelTab, setPanelTab] = useState(0);

  // States for updating OS
  const [notes, setNotes] = useState('');
  const [laborCost, setLaborCost] = useState(0);
  const [newPart, setNewPart] = useState({ description: '', quantity: 1, unit: 'un', unitCost: 0 });

  const [form, setForm] = useState({
    clientId: '', usinaId: '', description: '',
    priority: 'MEDIUM' as WorkOrder['priority'],
    status: 'OPEN' as WorkOrder['status'],
    serviceType: 'CORRETIVA' as WorkOrder['serviceType'],
    technicianId: '',
  });

  const fetchOrders = async () => {
    try {
      const r = await fetch(`${API_URL}/work-orders`, { headers: getHeaders() });
      if (r.ok) {
        const data = await r.json();
        setOrders(data);
        if (selectedOrder) {
          const updated = data.find((o: WorkOrder) => o.id === selectedOrder.id);
          if (updated) setSelectedOrder(updated);
        }
      }
    } catch {
      // fallback to empty
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchOrders(); }, []);

  const handleSave = async () => {
    try {
      await fetch(`${API_URL}/work-orders`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(form),
      });
      await fetchOrders();
      setOpen(false);
      setForm({ clientId: '', usinaId: '', description: '', priority: 'MEDIUM', status: 'OPEN', serviceType: 'CORRETIVA', technicianId: '' });
    } catch (e) { console.error(e); }
  };

  const handleStatusChange = async (id: string, status: WorkOrder['status']) => {
    try {
      const payload: any = { status };
      if (status === 'COMPLETED') {
        payload.notes = notes;
        payload.laborCost = laborCost;
        payload.completedAt = new Date().toISOString();
      }
      await fetch(`${API_URL}/work-orders/${id}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(payload),
      });
      await fetchOrders();
    } catch (e) { console.error(e); }
  };

  const handleAddPart = async () => {
    if (!selectedOrder) return;
    try {
      await fetch(`${API_URL}/work-orders/${selectedOrder.id}/parts`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(newPart),
      });
      setNewPart({ description: '', quantity: 1, unit: 'un', unitCost: 0 });
      await fetchOrders();
    } catch (e) { console.error(e); }
  };

  const handleRemovePart = async (partId: string) => {
    if (!selectedOrder) return;
    try {
      await fetch(`${API_URL}/work-orders/${selectedOrder.id}/parts/${partId}`, {
        method: 'DELETE',
        headers: getHeaders(),
      });
      await fetchOrders();
    } catch (e) { console.error(e); }
  };

  const selectOrder = (o: WorkOrder) => {
    setSelectedOrder(o);
    setNotes(o.notes || '');
    setLaborCost(o.laborCost || 0);
    setPanelTab(0);
  };

  const tabStatuses = [
    ['OPEN', 'IN_PROGRESS', 'WAITING_CLIENT'],
    ['COMPLETED'],
    ['CANCELLED'],
  ];

  const filtered = orders.filter(o => {
    const matchSearch = o.description.toLowerCase().includes(search.toLowerCase()) ||
      (o.client?.name || '').toLowerCase().includes(search.toLowerCase()) ||
      (o.usina?.name || '').toLowerCase().includes(search.toLowerCase());
    const matchTab = tabStatuses[tabValue].includes(o.status);
    return matchSearch && matchTab;
  });

  const counts = {
    active: orders.filter(o => ['OPEN','IN_PROGRESS','WAITING_CLIENT'].includes(o.status)).length,
    done: orders.filter(o => o.status === 'COMPLETED').length,
    cancelled: orders.filter(o => o.status === 'CANCELLED').length,
  };

  const partsTotal = selectedOrder?.parts?.reduce((sum, p) => sum + (p.quantity * p.unitCost), 0) || 0;
  const grandTotal = partsTotal + Number(laborCost);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>

      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700, color: 'var(--color-text-main)', display: 'flex', alignItems: 'center', gap: 1 }}>
            <EngineeringIcon sx={{ color: 'var(--color-primary-orange)' }} /> Ordens de Serviço
          </Typography>
          <Typography variant="caption" sx={{ color: 'var(--color-text-muted)' }}>
            Gestão de manutenções preventivas e corretivas
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setOpen(true)}
          sx={{ bgcolor: 'var(--color-primary-orange)', '&:hover': { bgcolor: 'var(--color-primary-orange-hover)' }, fontWeight: 700 }}>
          Nova O.S
        </Button>
      </Box>

      {/* KPI Cards */}
      <Grid container spacing={2}>
        {[
          { label: 'Em Aberto / Andamento', value: counts.active, color: '#3b82f6', icon: <BuildIcon sx={{ fontSize: 28, color: '#3b82f6' }} /> },
          { label: 'Concluídas', value: counts.done, color: '#22c55e', icon: <CheckCircleIcon sx={{ fontSize: 28, color: '#22c55e' }} /> },
          { label: 'Total de O.S', value: orders.length, color: 'var(--color-primary-orange)', icon: <EngineeringIcon sx={{ fontSize: 28, color: 'var(--color-primary-orange)' }} /> },
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

      {/* Filtros */}
      <Paper sx={{ p: 2, bgcolor: 'var(--color-bg-panel)', border: '1px solid var(--color-border)', borderRadius: 2 }}>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
          <TextField
            size="small" placeholder="Buscar descrição, cliente ou usina..."
            value={search} onChange={e => setSearch(e.target.value)}
            sx={{ flex: 1, minWidth: 260 }}
            slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchIcon sx={{ color: 'var(--color-text-muted)' }} /></InputAdornment> } }}
          />
          <Tabs value={tabValue} onChange={(_, v) => { setTabValue(v); setSelectedOrder(null); }}
            sx={{ '& .MuiTabs-indicator': { backgroundColor: 'var(--color-primary-orange)' }, '& .MuiTab-root': { color: 'var(--color-text-muted)', fontSize: 12 }, '& .Mui-selected': { color: 'var(--color-primary-orange) !important' } }}>
            <Tab label={`Ativas (${counts.active})`} />
            <Tab label={`Concluídas (${counts.done})`} />
            <Tab label={`Canceladas (${counts.cancelled})`} />
          </Tabs>
        </Box>
      </Paper>

      {/* Tabela e Painel */}
      <Grid container spacing={3}>
        <Grid size={{ xs: 12, lg: selectedOrder ? 7 : 12 }} sx={{ transition: 'all 0.3s' }}>
          {loading ? <LinearProgress color="warning" /> : (
            <TableContainer component={Paper} sx={{ bgcolor: 'var(--color-bg-panel)', border: '1px solid var(--color-border)' }}>
              <Table>
                <TableHead sx={{ bgcolor: 'rgba(0,0,0,0.2)' }}>
                  <TableRow>
                    {['O.S #', 'Cliente / Usina', 'Descrição', 'Status', 'Ações'].map(h => (
                      <TableCell key={h} sx={{ color: 'var(--color-text-muted)', fontWeight: 700, fontSize: 11, textTransform: 'uppercase' }}>{h}</TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filtered.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} align="center" sx={{ color: 'var(--color-text-muted)', py: 6 }}>
                        Nenhuma ordem de serviço encontrada
                      </TableCell>
                    </TableRow>
                  ) : filtered.map(o => {
                    const sCfg = statusConfig[o.status];
                    const isSelected = selectedOrder?.id === o.id;
                    return (
                      <TableRow 
                        key={o.id} 
                        onClick={() => selectOrder(o)}
                        sx={{ 
                          cursor: 'pointer',
                          bgcolor: isSelected ? 'rgba(255, 107, 0, 0.05)' : 'inherit',
                          '&:hover': { bgcolor: 'rgba(255, 107, 0, 0.1)' } 
                        }}
                      >
                        <TableCell sx={{ color: 'var(--color-primary-orange)', fontWeight: 700 }}>#{o.number}</TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ color: 'var(--color-text-main)', fontWeight: 600 }}>{o.client?.name || '—'}</Typography>
                          <Typography variant="caption" sx={{ color: 'var(--color-text-muted)' }}>{o.usina?.name || '—'}</Typography>
                        </TableCell>
                        <TableCell sx={{ color: 'var(--color-text-main)', maxWidth: 200 }}>
                          <Typography variant="body2" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {o.description}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <Box sx={{ color: sCfg.color, display: 'flex', '& svg': { fontSize: 16 } }}>{sCfg.icon}</Box>
                            <Typography variant="caption" sx={{ color: sCfg.color, fontWeight: 600 }}>{sCfg.label}</Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', gap: 0.5 }}>
                            {o.status === 'OPEN' && (
                              <Chip label="Iniciar" size="small" onClick={(e) => { e.stopPropagation(); handleStatusChange(o.id, 'IN_PROGRESS'); }}
                                sx={{ bgcolor: '#3b82f618', color: '#3b82f6', cursor: 'pointer', fontSize: 10, fontWeight: 700 }} />
                            )}
                          </Box>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Grid>

        {/* Painel Lateral da O.S */}
        {selectedOrder && (
          <Grid size={{ xs: 12, lg: 5 }}>
            <Paper sx={{ bgcolor: 'var(--color-bg-panel)', border: '1px solid var(--color-border)', borderRadius: 2, height: '100%', display: 'flex', flexDirection: 'column' }}>
              <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--color-border)' }}>
                <Typography variant="h6" sx={{ color: 'var(--color-text-main)', fontWeight: 700 }}>
                  O.S #{selectedOrder.number}
                </Typography>
                <IconButton onClick={() => setSelectedOrder(null)} size="small" sx={{ color: 'var(--color-text-muted)' }}>
                  <CloseIcon />
                </IconButton>
              </Box>

              <Tabs value={panelTab} onChange={(_, v) => setPanelTab(v)} variant="fullWidth"
                sx={{ borderBottom: '1px solid var(--color-border)', minHeight: 40, '& .MuiTab-root': { minHeight: 40, py: 1, color: 'var(--color-text-muted)', fontSize: 12 }, '& .Mui-selected': { color: 'var(--color-primary-orange) !important' }, '& .MuiTabs-indicator': { backgroundColor: 'var(--color-primary-orange)' } }}>
                <Tab label="Geral" />
                <Tab label="Técnico" />
                <Tab label="Materiais" />
                <Tab label="Relatório" />
              </Tabs>

              <Box sx={{ p: 3, flex: 1, overflowY: 'auto' }}>
                {/* ABA 1: VISÃO GERAL */}
                {panelTab === 0 && (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <Box>
                      <Typography variant="caption" sx={{ color: 'var(--color-text-muted)', fontWeight: 600 }}>CLIENTE</Typography>
                      <Typography variant="body1" sx={{ color: 'var(--color-text-main)', fontWeight: 600 }}>{selectedOrder.client?.name}</Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" sx={{ color: 'var(--color-text-muted)', fontWeight: 600 }}>USINA</Typography>
                      <Typography variant="body1" sx={{ color: 'var(--color-text-main)' }}>{selectedOrder.usina?.name}</Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" sx={{ color: 'var(--color-text-muted)', fontWeight: 600 }}>TIPO DE SERVIÇO</Typography>
                      <Typography variant="body2" sx={{ color: 'var(--color-text-main)' }}>{selectedOrder.serviceType}</Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" sx={{ color: 'var(--color-text-muted)', fontWeight: 600 }}>DESCRIÇÃO</Typography>
                      <Typography variant="body2" sx={{ color: 'var(--color-text-main)', whiteSpace: 'pre-wrap' }}>{selectedOrder.description}</Typography>
                    </Box>
                  </Box>
                )}

                {/* ABA 2: TÉCNICO */}
                {panelTab === 1 && (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    <Box>
                      <Typography variant="caption" sx={{ color: 'var(--color-text-muted)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
                        <PersonIcon fontSize="small" /> TÉCNICO RESPONSÁVEL
                      </Typography>
                      <Typography variant="body1" sx={{ color: 'var(--color-text-main)', fontWeight: 600, mt: 1 }}>
                        {selectedOrder.technician?.name || 'Não atribuído'}
                      </Typography>
                    </Box>
                    <Divider sx={{ borderColor: 'var(--color-border)' }} />
                    <Box>
                      <Typography variant="caption" sx={{ color: 'var(--color-text-muted)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
                        <MapIcon fontSize="small" /> LOCALIZAÇÃO DA USINA
                      </Typography>
                      <Typography variant="body2" sx={{ color: 'var(--color-text-main)', mt: 1 }}>
                        {selectedOrder.usina?.address || 'Endereço não cadastrado'}
                      </Typography>
                      {selectedOrder.usina?.gpsLatitude && selectedOrder.usina?.gpsLongitude && (
                        <Button 
                          variant="outlined" 
                          size="small" 
                          sx={{ mt: 1 }}
                          onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${selectedOrder.usina?.gpsLatitude},${selectedOrder.usina?.gpsLongitude}`, '_blank')}
                        >
                          Abrir no Google Maps
                        </Button>
                      )}
                    </Box>
                  </Box>
                )}

                {/* ABA 3: MATERIAIS */}
                {panelTab === 2 && (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {selectedOrder.status !== 'COMPLETED' && selectedOrder.status !== 'CANCELLED' && (
                      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', bgcolor: 'rgba(0,0,0,0.1)', p: 1, borderRadius: 1 }}>
                        <TextField size="small" placeholder="Peça" value={newPart.description} onChange={e => setNewPart({ ...newPart, description: e.target.value })} sx={{ flex: 2 }} />
                        <TextField size="small" placeholder="Qtd" type="number" value={newPart.quantity} onChange={e => setNewPart({ ...newPart, quantity: Number(e.target.value) })} sx={{ width: 60 }} />
                        <TextField size="small" placeholder="R$" type="number" value={newPart.unitCost} onChange={e => setNewPart({ ...newPart, unitCost: Number(e.target.value) })} sx={{ width: 80 }} />
                        <Button variant="contained" size="small" onClick={handleAddPart} disabled={!newPart.description} sx={{ minWidth: 40, p: 1 }}><AddIcon /></Button>
                      </Box>
                    )}
                    
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell sx={{ color: 'var(--color-text-muted)' }}>Descrição</TableCell>
                          <TableCell sx={{ color: 'var(--color-text-muted)' }}>Qtd</TableCell>
                          <TableCell sx={{ color: 'var(--color-text-muted)' }}>Total</TableCell>
                          <TableCell></TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {selectedOrder.parts?.map(p => (
                          <TableRow key={p.id}>
                            <TableCell sx={{ color: 'var(--color-text-main)' }}>{p.description}</TableCell>
                            <TableCell sx={{ color: 'var(--color-text-main)' }}>{p.quantity} {p.unit}</TableCell>
                            <TableCell sx={{ color: 'var(--color-text-main)' }}>R$ {(p.quantity * p.unitCost).toFixed(2)}</TableCell>
                            <TableCell padding="none">
                              {selectedOrder.status !== 'COMPLETED' && (
                                <IconButton size="small" color="error" onClick={() => handleRemovePart(p.id)}><DeleteIcon fontSize="small" /></IconButton>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2, p: 2, bgcolor: 'rgba(255,107,0,0.1)', borderRadius: 1 }}>
                      <Typography variant="body2" sx={{ fontWeight: 600, color: 'var(--color-primary-orange)' }}>Total de Peças:</Typography>
                      <Typography variant="body1" sx={{ fontWeight: 700, color: 'var(--color-primary-orange)' }}>R$ {partsTotal.toFixed(2)}</Typography>
                    </Box>
                  </Box>
                )}

                {/* ABA 4: RELATÓRIO */}
                {panelTab === 3 && (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <Typography variant="caption" sx={{ color: 'var(--color-text-muted)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
                      <DescriptionIcon fontSize="small" /> RELATÓRIO DE CAMPO
                    </Typography>
                    <TextField
                      multiline rows={4} fullWidth
                      placeholder="Descreva o serviço executado..."
                      value={notes}
                      onChange={e => setNotes(e.target.value)}
                      disabled={selectedOrder.status === 'COMPLETED'}
                    />
                    <TextField
                      label="Custo de Mão de Obra (R$)"
                      type="number"
                      size="small"
                      value={laborCost}
                      onChange={e => setLaborCost(Number(e.target.value))}
                      disabled={selectedOrder.status === 'COMPLETED'}
                      sx={{ mt: 1 }}
                      slotProps={{ input: { startAdornment: <InputAdornment position="start">R$</InputAdornment> } }}
                    />
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', p: 2, bgcolor: 'var(--color-bg-dark)', borderRadius: 1, border: '1px solid var(--color-border)' }}>
                      <Typography variant="body1" sx={{ fontWeight: 600, color: 'var(--color-text-main)' }}>Custo Total O.S:</Typography>
                      <Typography variant="h6" sx={{ fontWeight: 700, color: '#10b981' }}>R$ {grandTotal.toFixed(2)}</Typography>
                    </Box>

                    {selectedOrder.status !== 'COMPLETED' && selectedOrder.status !== 'CANCELLED' && (
                      <Button 
                        variant="contained" 
                        color="success" 
                        size="large"
                        sx={{ mt: 2 }}
                        onClick={() => handleStatusChange(selectedOrder.id, 'COMPLETED')}
                        disabled={!notes}
                      >
                        Concluir Ordem de Serviço
                      </Button>
                    )}
                  </Box>
                )}
              </Box>
            </Paper>
          </Grid>
        )}
      </Grid>

      {/* Dialog Nova O.S */}
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth
        sx={{ '& .MuiDialog-paper': { bgcolor: 'var(--color-bg-panel)', border: '1px solid var(--color-border)', borderRadius: 3 } }}>
        <DialogTitle sx={{ color: 'var(--color-text-main)', fontWeight: 700, borderBottom: '1px solid var(--color-border)' }}>
          Nova Ordem de Serviço
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <FormControl fullWidth size="small">
              <InputLabel shrink>Cliente</InputLabel>
              <Select value={form.clientId} label="Cliente" notched onChange={e => setForm(p => ({ ...p, clientId: e.target.value as string, usinaId: '' }))}>
                {clients.map(c => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
              </Select>
            </FormControl>
            <FormControl fullWidth size="small">
              <InputLabel shrink>Usina</InputLabel>
              <Select value={form.usinaId} label="Usina" notched onChange={e => setForm(p => ({ ...p, usinaId: e.target.value as string }))}>
                {usinas.filter(u => !form.clientId || u.clientId === form.clientId).map(u => <MenuItem key={u.id} value={u.id}>{u.name}</MenuItem>)}
              </Select>
            </FormControl>
            <FormControl fullWidth size="small">
              <InputLabel shrink>Tipo de Serviço</InputLabel>
              <Select value={form.serviceType} label="Tipo de Serviço" notched onChange={e => setForm(p => ({ ...p, serviceType: e.target.value as WorkOrder['serviceType'] }))}>
                <MenuItem value="PREVENTIVA">Preventiva</MenuItem>
                <MenuItem value="CORRETIVA">Corretiva</MenuItem>
                <MenuItem value="EMERGENCIA">Emergência</MenuItem>
                <MenuItem value="LIMPEZA">Limpeza</MenuItem>
                <MenuItem value="OUTROS">Outros</MenuItem>
              </Select>
            </FormControl>
            <TextField label="Descrição do Serviço" multiline rows={3} fullWidth value={form.description}
              onChange={e => setForm(p => ({ ...p, description: e.target.value }))} slotProps={{ inputLabel: { shrink: true } }} />
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 3, borderTop: '1px solid var(--color-border)' }}>
          <Button onClick={() => setOpen(false)} sx={{ color: 'var(--color-text-muted)' }}>Cancelar</Button>
          <Button variant="contained" onClick={handleSave} disabled={!form.clientId || !form.usinaId || !form.description}
            sx={{ bgcolor: 'var(--color-primary-orange)', '&:hover': { bgcolor: 'var(--color-primary-orange-hover)' }, fontWeight: 700 }}>
            Criar O.S
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
