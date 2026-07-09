import { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  TextField,
  InputAdornment,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Alert,
  CircularProgress,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import AddIcon from '@mui/icons-material/Add';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningIcon from '@mui/icons-material/Warning';
import ErrorIcon from '@mui/icons-material/Error';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import RouterIcon from '@mui/icons-material/Router';
import WifiTetheringIcon from '@mui/icons-material/WifiTethering';
import { useApp, type Usina } from '../context/AppContext';

const API_URL = import.meta.env.VITE_API_URL !== undefined ? import.meta.env.VITE_API_URL : 'http://localhost:3001';
const getHeaders = () => ({
  'Content-Type': 'application/json',
  'x-user-role': localStorage.getItem('user_role') || 'SUPER_ADMIN',
  'x-user-email': localStorage.getItem('user_email') || '',
});

export default function Usinas() {
  const { usinas, clients, addUsina, updateUsina, deleteUsina } = useApp();
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [editingUsina, setEditingUsina] = useState<Usina | null>(null);

  const [usinaForm, setUsinaForm] = useState({
    name: '',
    clientId: '',
    capacityKwp: 10,
    inverterCapacity: 8,
    moduleCount: 20,
    manufacturer: 'Deye',
    model: '',
    utility: 'Enel SP',
    estimatedKwh: 1200,
    payback: 4.0,
    datalogger: '',
    address: '',
    city: '',
    state: '',
    minEnergyPeak: 0.5,
    maxEnergyPeak: 12.0,
    installationDate: new Date().toISOString().split('T')[0],
    approvalDate: new Date().toISOString().split('T')[0],
  });

  const [openDelete, setOpenDelete] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // ── Estado do modal de Configurar Monitoramento ────────────────────────────
  const [monitorModal, setMonitorModal] = useState(false);
  const [monitorUsina, setMonitorUsina] = useState<Usina | null>(null);
  const [monitorIp, setMonitorIp] = useState('');
  const [monitorSn, setMonitorSn] = useState('');
  const [testResult, setTestResult] = useState<{ success: boolean; message: string; data?: any } | null>(null);
  const [testLoading, setTestLoading] = useState(false);
  const [activateLoading, setActivateLoading] = useState(false);
  const [detectingIp, setDetectingIp] = useState(false);

  const detectPublicIp = async () => {
    setDetectingIp(true);
    try {
      const response = await fetch('https://api.ipify.org?format=json');
      const data = await response.json();
      if (data && data.ip) {
        setMonitorIp(data.ip);
      }
    } catch (err) {
      console.error('Erro ao detectar IP público:', err);
    } finally {
      setDetectingIp(false);
    }
  };

  const openMonitorModal = (usina: Usina) => {
    setMonitorUsina(usina);
    // Pre-fill from existing datalogger "IP:SN" if configured
    if (usina.datalogger && usina.datalogger.includes(':')) {
      const [ip, sn] = usina.datalogger.split(':');
      setMonitorIp(ip);
      setMonitorSn(sn);
    } else {
      setMonitorIp('');
      setMonitorSn(usina.datalogger || '');
    }
    setTestResult(null);
    setMonitorModal(true);
  };

  const handleTestConnection = async () => {
    setTestLoading(true);
    setTestResult(null);
    try {
      const r = await fetch(`${API_URL}/solarman/test`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ ip: monitorIp, sn: monitorSn }),
      });
      const result = await r.json();
      setTestResult(result);
    } catch {
      setTestResult({ success: false, message: 'Erro ao contactar o servidor. O backend está rodando?' });
    } finally {
      setTestLoading(false);
    }
  };

  const handleActivateMonitoring = async () => {
    if (!monitorUsina) return;
    setActivateLoading(true);
    try {
      const r = await fetch(`${API_URL}/solarman/activate/${monitorUsina.id}`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ ip: monitorIp, sn: monitorSn }),
      });
      const result = await r.json();
      setTestResult({ success: result.success, message: result.message });
      if (result.success) {
        // Refresh da lista de usinas
        setTimeout(() => setMonitorModal(false), 2000);
      }
    } catch {
      setTestResult({ success: false, message: 'Erro ao ativar monitoramento.' });
    } finally {
      setActivateLoading(false);
    }
  };

  const handleOpen = () => {
    setEditingUsina(null);
    const firstClient = clients[0];
    setUsinaForm({
      name: '',
      clientId: firstClient?.id || '',
      capacityKwp: 10,
      inverterCapacity: 8,
      moduleCount: 20,
      manufacturer: 'Deye',
      model: '',
      utility: 'Enel SP',
      estimatedKwh: 1200,
      payback: 4.0,
      datalogger: '',
      address: '',
      city: '',
      state: '',
      minEnergyPeak: 0.5,
      maxEnergyPeak: 12.0,
      installationDate: new Date().toISOString().split('T')[0],
      approvalDate: new Date().toISOString().split('T')[0],
    });
    setOpen(true);
  };

  const handleOpenEdit = (usina: Usina) => {
    setEditingUsina(usina);
    setUsinaForm({
      name: usina.name,
      clientId: usina.clientId,
      capacityKwp: usina.capacityKwp,
      inverterCapacity: usina.inverterCapacity,
      moduleCount: usina.moduleCount,
      manufacturer: usina.manufacturer,
      model: usina.model,
      utility: usina.utility,
      estimatedKwh: usina.estimatedKwh,
      payback: usina.payback,
      datalogger: usina.datalogger || '',
      address: usina.address || '',
      city: usina.city || '',
      state: usina.state || '',
      minEnergyPeak: usina.minEnergyPeak || 0,
      maxEnergyPeak: usina.maxEnergyPeak || 0,
      installationDate: usina.installationDate ? new Date(usina.installationDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      approvalDate: usina.approvalDate ? new Date(usina.approvalDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
    });
    setOpen(true);
  };

  const handleClose = () => setOpen(false);

  const handleSave = async () => {
    if (editingUsina) {
      await updateUsina(editingUsina.id, usinaForm);
    } else {
      await addUsina(usinaForm);
    }
    handleClose();
  };

  const handleOpenDelete = (id: string) => {
    setDeleteId(id);
    setOpenDelete(true);
  };

  const handleConfirmDelete = async () => {
    if (deleteId) {
      await deleteUsina(deleteId);
      setOpenDelete(false);
      setDeleteId(null);
    }
  };

  const getStatusChip = (status: 'ONLINE' | 'ALERT' | 'OFFLINE' | 'CRITICAL') => {
    switch (status) {
      case 'ONLINE':
        return <Chip icon={<CheckCircleIcon className="text-emerald-500" sx={{ fontSize: 16 }} />} label="Online" className="bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 font-bold" size="small" />;
      case 'ALERT':
        return <Chip icon={<WarningIcon className="text-amber-500" sx={{ fontSize: 16 }} />} label="Alerta" className="bg-amber-500/10 text-amber-500 border border-amber-500/20 font-bold" size="small" />;
      case 'OFFLINE':
        return <Chip icon={<ErrorIcon className="text-slate-400" sx={{ fontSize: 16 }} />} label="Offline" className="bg-slate-500/10 text-slate-400 border border-slate-500/20 font-bold" size="small" />;
      case 'CRITICAL':
        return <Chip icon={<ErrorIcon className="text-rose-500" sx={{ fontSize: 16 }} />} label="Falha Crítica" className="bg-rose-500/10 text-rose-500 border border-rose-500/20 font-bold" size="small" />;
    }
  };

  const filteredUsinas = usinas.filter(u =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    (u.client || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Box className="space-y-6">
      <Box className="flex justify-between items-center">
        <Typography variant="h5" className="font-bold text-slate-100">
          Gestão de Usinas
        </Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={handleOpen}
        >
          Nova Usina
        </Button>
      </Box>

      {/* Busca e filtros */}
      <Paper className="p-4 bg-slate-900 border border-slate-800 flex items-center justify-between">
        <TextField
          placeholder="Buscar por nome da usina ou cliente..."
          variant="outlined"
          size="small"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ width: 350 }}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon className="text-slate-400" />
                </InputAdornment>
              ),
            }
          }}
        />
      </Paper>

      {/* Tabela de Usinas */}
      <TableContainer component={Paper} className="bg-slate-900 border border-slate-800">
        <Table>
          <TableHead className="bg-slate-950">
            <TableRow>
              <TableCell className="text-slate-300 font-bold">Usina</TableCell>
              <TableCell className="text-slate-300 font-bold">Cliente</TableCell>
              <TableCell className="text-slate-300 font-bold">Potência (kWp)</TableCell>
              <TableCell className="text-slate-300 font-bold">Datalogger / Inversor</TableCell>
              <TableCell className="text-slate-300 font-bold">Endereço / Localização</TableCell>
              <TableCell className="text-slate-300 font-bold">Estimativa (kWh/mês)</TableCell>
              <TableCell className="text-slate-300 font-bold">Picos (Min/Max kW)</TableCell>
              <TableCell className="text-slate-300 font-bold">Status</TableCell>
              <TableCell className="text-slate-300 font-bold" align="center">Ações</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredUsinas.map((usina) => (
              <TableRow key={usina.id} className="hover:bg-slate-850/50">
                <TableCell className="text-slate-100 font-medium">
                  <Box className="flex flex-col">
                    <span>{usina.name}</span>
                    <span className="text-slate-400 text-xs">Instalação: {usina.installationDate ? new Date(usina.installationDate).toLocaleDateString('pt-BR') : 'N/A'}</span>
                  </Box>
                </TableCell>
                <TableCell className="text-slate-300">{usina.client || 'Cliente Desconhecido'}</TableCell>
                <TableCell className="text-slate-300">
                  <Box className="flex flex-col">
                    <span>{usina.capacityKwp} kWp</span>
                    <span className="text-slate-400 text-xs">{usina.moduleCount} painéis</span>
                  </Box>
                </TableCell>
                <TableCell className="text-slate-300">
                  <Box className="flex flex-col">
                    <span>Sn: {usina.datalogger || 'N/A'}</span>
                    <span className="text-slate-400 text-xs">{usina.manufacturer} {usina.model}</span>
                  </Box>
                </TableCell>
                <TableCell className="text-slate-300">
                  <Box className="flex flex-col">
                    <span className="text-sm">{usina.city ? `${usina.city} - ${usina.state}` : 'N/A'}</span>
                    <span className="text-slate-400 text-xs">Coords: {usina.gpsLatitude ? Number(usina.gpsLatitude).toFixed(4) : '0'}, {usina.gpsLongitude ? Number(usina.gpsLongitude).toFixed(4) : '0'}</span>
                  </Box>
                </TableCell>
                <TableCell className="text-slate-300">{usina.estimatedKwh} kWh</TableCell>
                <TableCell className="text-slate-300">
                  <span className="text-xs text-rose-400">{usina.minEnergyPeak || 0} kW</span> / <span className="text-xs text-emerald-400">{usina.maxEnergyPeak || 0} kW</span>
                </TableCell>
                <TableCell>{getStatusChip(usina.status)}</TableCell>
                <TableCell align="center">
                  <Box className="flex justify-center gap-1">
                    <IconButton
                      size="small"
                      title="Configurar Monitoramento"
                      onClick={() => openMonitorModal(usina)}
                      sx={{
                        color: usina.datalogger && usina.datalogger.includes(':') ? '#22c55e' : '#f59e0b',
                        border: `1px solid ${usina.datalogger && usina.datalogger.includes(':') ? '#22c55e40' : '#f59e0b40'}`,
                      }}
                    >
                      <WifiTetheringIcon fontSize="small" />
                    </IconButton>
                    <IconButton size="small" color="primary" onClick={() => handleOpenEdit(usina)}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton size="small" color="error" onClick={() => handleOpenDelete(usina.id)}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Box>
                </TableCell>
              </TableRow>
            ))}
            {filteredUsinas.length === 0 && (
              <TableRow>
                <TableCell colSpan={9} align="center" className="text-slate-400 py-6">
                  Nenhuma usina solar cadastrada ou encontrada.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Modal Nova/Editar Usina */}
      <Dialog open={open} onClose={handleClose} slotProps={{ paper: { sx: { bgcolor: '#1e293b', color: '#f8fafc', maxWidth: 650, width: '100%' } } }}>
        <DialogTitle className="font-bold border-b border-slate-800">
          {editingUsina ? 'Editar Usina Solar' : 'Cadastrar Nova Usina Solar'}
        </DialogTitle>
        <DialogContent className="pt-6 space-y-4">
          <Grid container spacing={2} className="mt-2">
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label="Nome da Usina"
                fullWidth
                value={usinaForm.name}
                onChange={(e) => setUsinaForm({ ...usinaForm, name: e.target.value })}
                slotProps={{ inputLabel: { shrink: true } }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl fullWidth>
                <InputLabel id="client-select-label" shrink>Cliente Proprietário</InputLabel>
                <Select
                  labelId="client-select-label"
                  value={usinaForm.clientId}
                  label="Cliente Proprietário"
                  notched
                  onChange={(e) => setUsinaForm({ ...usinaForm, clientId: e.target.value })}
                >
                  {clients.map(c => (
                    <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
                  ))}
                  {clients.length === 0 && (
                    <MenuItem value="" disabled>Nenhum cliente cadastrado</MenuItem>
                  )}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label="Número de Série do Datalogger (S/N)"
                fullWidth
                value={usinaForm.datalogger}
                onChange={(e) => setUsinaForm({ ...usinaForm, datalogger: e.target.value })}
                slotProps={{ inputLabel: { shrink: true } }}
                placeholder="Ex: 2375000001"
                helperText="Encontrado na etiqueta colada no WiFi Stick ou datalogger. Use o botão de antena na tabela para testar a conexão após salvar."
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label="Distribuidora de Energia"
                fullWidth
                value={usinaForm.utility}
                onChange={(e) => setUsinaForm({ ...usinaForm, utility: e.target.value })}
                slotProps={{ inputLabel: { shrink: true } }}
                placeholder="Ex: CPFL, Enel"
              />
            </Grid>

            {/* Endereço específico da Usina */}
            <Grid size={12}>
              <TextField
                label="Endereço da Instalação"
                fullWidth
                value={usinaForm.address}
                onChange={(e) => setUsinaForm({ ...usinaForm, address: e.target.value })}
                slotProps={{ inputLabel: { shrink: true } }}
                placeholder="Rua, número, bairro"
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 8 }}>
              <TextField
                label="Cidade"
                fullWidth
                value={usinaForm.city}
                onChange={(e) => setUsinaForm({ ...usinaForm, city: e.target.value })}
                slotProps={{ inputLabel: { shrink: true } }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField
                label="Estado (UF)"
                fullWidth
                value={usinaForm.state}
                onChange={(e) => setUsinaForm({ ...usinaForm, state: e.target.value })}
                slotProps={{ inputLabel: { shrink: true } }}
                placeholder="Ex: SP"
              />
            </Grid>

            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField
                label="kWp Instalado"
                type="number"
                fullWidth
                value={usinaForm.capacityKwp}
                onChange={(e) => setUsinaForm({ ...usinaForm, capacityKwp: Number(e.target.value) })}
                slotProps={{ inputLabel: { shrink: true } }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField
                label="Módulos (Qtd)"
                type="number"
                fullWidth
                value={usinaForm.moduleCount}
                onChange={(e) => setUsinaForm({ ...usinaForm, moduleCount: Number(e.target.value) })}
                slotProps={{ inputLabel: { shrink: true } }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField
                label="Potência do Inversor (kW)"
                type="number"
                fullWidth
                value={usinaForm.inverterCapacity}
                onChange={(e) => setUsinaForm({ ...usinaForm, inverterCapacity: Number(e.target.value) })}
                slotProps={{ inputLabel: { shrink: true } }}
              />
            </Grid>

            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField
                label="Fabricante Inversor"
                fullWidth
                value={usinaForm.manufacturer}
                onChange={(e) => setUsinaForm({ ...usinaForm, manufacturer: e.target.value })}
                slotProps={{ inputLabel: { shrink: true } }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField
                label="Modelo Inversor"
                fullWidth
                value={usinaForm.model}
                onChange={(e) => setUsinaForm({ ...usinaForm, model: e.target.value })}
                slotProps={{ inputLabel: { shrink: true } }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField
                label="Estimativa (kWh/mês)"
                type="number"
                fullWidth
                value={usinaForm.estimatedKwh}
                onChange={(e) => setUsinaForm({ ...usinaForm, estimatedKwh: Number(e.target.value) })}
                slotProps={{ inputLabel: { shrink: true } }}
              />
            </Grid>

            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label="Pico Mínimo Aceitável (kW)"
                type="number"
                fullWidth
                value={usinaForm.minEnergyPeak}
                onChange={(e) => setUsinaForm({ ...usinaForm, minEnergyPeak: Number(e.target.value) })}
                slotProps={{ inputLabel: { shrink: true } }}
                helperText="Alerta se geração cair abaixo desse valor"
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label="Pico Máximo Projetado (kW)"
                type="number"
                fullWidth
                value={usinaForm.maxEnergyPeak}
                onChange={(e) => setUsinaForm({ ...usinaForm, maxEnergyPeak: Number(e.target.value) })}
                slotProps={{ inputLabel: { shrink: true } }}
                helperText="Potência pico projetada da usina"
              />
            </Grid>

            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label="Data de Instalação"
                type="date"
                fullWidth
                value={usinaForm.installationDate}
                onChange={(e) => setUsinaForm({ ...usinaForm, installationDate: e.target.value })}
                slotProps={{ inputLabel: { shrink: true } }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label="Data de Homologação / Início Geração"
                type="date"
                fullWidth
                value={usinaForm.approvalDate}
                onChange={(e) => setUsinaForm({ ...usinaForm, approvalDate: e.target.value })}
                slotProps={{ inputLabel: { shrink: true } }}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions className="border-t border-slate-800 p-4">
          <Button onClick={handleClose} color="inherit">Cancelar</Button>
          <Button onClick={handleSave} variant="contained" color="primary">Salvar</Button>
        </DialogActions>
      </Dialog>

      {/* Modal Confirmação de Exclusão */}
      <Dialog open={openDelete} onClose={() => setOpenDelete(false)} slotProps={{ paper: { sx: { bgcolor: '#1e293b', color: '#f8fafc' } } }}>
        <DialogTitle className="font-bold">Confirmar Exclusão</DialogTitle>
        <DialogContent>
          <Typography className="text-slate-300">
            Tem certeza que deseja excluir esta usina solar?
          </Typography>
        </DialogContent>
        <DialogActions className="p-4">
          <Button onClick={() => setOpenDelete(false)} color="inherit">Cancelar</Button>
          <Button onClick={handleConfirmDelete} variant="contained" color="error">Excluir</Button>
        </DialogActions>
      </Dialog>

      {/* ── Modal de Configuração de Monitoramento ─────────────────────────── */}
      <Dialog
        open={monitorModal}
        onClose={() => setMonitorModal(false)}
        slotProps={{ paper: { sx: { bgcolor: '#0f172a', color: '#f8fafc', border: '1px solid #1e293b', maxWidth: 500, width: '100%' } } }}
      >
        <DialogTitle sx={{ borderBottom: '1px solid #1e293b', display: 'flex', alignItems: 'center', gap: 1 }}>
          <RouterIcon sx={{ color: '#f57c00' }} />
          Configurar Monitoramento
          {monitorUsina && (
            <Typography variant="caption" sx={{ color: '#64748b', ml: 1 }}>
              — {monitorUsina.name}
            </Typography>
          )}
        </DialogTitle>

        <DialogContent sx={{ pt: 3 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>

            <Alert severity="info" sx={{ bgcolor: '#1e3a5f', color: '#93c5fd', border: '1px solid #1d4ed8' }}>
              <strong>Como configurar o datalogger em 4 passos:</strong>
              <ol style={{ margin: '8px 0 0 16px', padding: 0, lineHeight: 1.8 }}>
                <li>Energize o datalogger e conecte ao inversor via cabo RS485 ou TCP/IP</li>
                <li>Configure o Wi-Fi do datalogger usando o app do fabricante</li>
                <li>No roteador do cliente, abra a <strong>porta 8899</strong> (port forwarding para o IP do datalogger)</li>
                <li>Informe o <strong>IP externo do roteador</strong> e o <strong>S/N do datalogger</strong> abaixo e clique em &ldquo;Testar&rdquo;</li>
              </ol>
            </Alert>

            <Box sx={{ display: 'flex', gap: 1, alignItems: 'stretch' }}>
              <TextField
                label="IP do Roteador (externo / público)"
                fullWidth
                value={monitorIp}
                onChange={e => setMonitorIp(e.target.value)}
                placeholder="Ex: 177.83.14.55"
                slotProps={{ inputLabel: { shrink: true } }}
                sx={{ '& .MuiOutlinedInput-root': { bgcolor: '#1e293b' } }}
              />
              <Button
                variant="outlined"
                onClick={detectPublicIp}
                disabled={detectingIp}
                title="Detectar IP Público Atual da sua rede"
                sx={{ whiteSpace: 'nowrap', borderColor: '#3b82f6', color: '#60a5fa', px: 2, fontWeight: 600 }}
              >
                {detectingIp ? <CircularProgress size={16} /> : '⚡ Meu IP'}
              </Button>
            </Box>

            <TextField
              label="SN do WiFi Stick (Número de Série)"
              fullWidth
              value={monitorSn}
              onChange={e => setMonitorSn(e.target.value)}
              placeholder="Ex: 2375000001"
              helperText="Apenas números. Encontrado na etiqueta do dispositivo."
              slotProps={{ inputLabel: { shrink: true } }}
              sx={{ '& .MuiOutlinedInput-root': { bgcolor: '#1e293b' } }}
            />

            {/* Resultado do Teste */}
            {testResult && (
              <Alert
                severity={testResult.success ? 'success' : 'error'}
                sx={{
                  bgcolor: testResult.success ? '#14532d' : '#450a0a',
                  color: testResult.success ? '#86efac' : '#fca5a5',
                  border: `1px solid ${testResult.success ? '#15803d' : '#b91c1c'}`,
                  whiteSpace: 'pre-line',
                }}
              >
                {testResult.message}
                {testResult.success && testResult.data && (
                  <Box sx={{ mt: 1, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                    {testResult.data.powerNow !== null && (
                      <Chip label={`⚡ ${testResult.data.powerNow?.toFixed(2)} kW agora`} size="small" sx={{ bgcolor: '#166534', color: '#86efac' }} />
                    )}
                    {testResult.data.generationToday !== null && (
                      <Chip label={`☀️ ${testResult.data.generationToday?.toFixed(1)} kWh hoje`} size="small" sx={{ bgcolor: '#166534', color: '#86efac' }} />
                    )}
                    {testResult.data.gridVoltage !== null && (
                      <Chip label={`🔌 ${testResult.data.gridVoltage?.toFixed(0)}V rede`} size="small" sx={{ bgcolor: '#166534', color: '#86efac' }} />
                    )}
                    {testResult.data.temperature !== null && (
                      <Chip label={`🌡️ ${testResult.data.temperature?.toFixed(1)}°C`} size="small" sx={{ bgcolor: '#166534', color: '#86efac' }} />
                    )}
                  </Box>
                )}
              </Alert>
            )}
          </Box>
        </DialogContent>

        <DialogActions sx={{ p: 2, borderTop: '1px solid #1e293b', gap: 1 }}>
          <Button onClick={() => setMonitorModal(false)} sx={{ color: '#64748b' }}>
            Cancelar
          </Button>
          <Button
            variant="outlined"
            onClick={handleTestConnection}
            disabled={!monitorIp || !monitorSn || testLoading}
            startIcon={testLoading ? <CircularProgress size={16} /> : <WifiTetheringIcon />}
            sx={{ borderColor: '#f59e0b', color: '#f59e0b', '&:hover': { borderColor: '#d97706', bgcolor: '#f59e0b10' } }}
          >
            Testar Conexão
          </Button>
          <Button
            variant="contained"
            onClick={handleActivateMonitoring}
            disabled={!monitorIp || !monitorSn || activateLoading}
            startIcon={activateLoading ? <CircularProgress size={16} color="inherit" /> : <RouterIcon />}
            sx={{ bgcolor: '#f57c00', '&:hover': { bgcolor: '#e64a19' }, fontWeight: 700 }}
          >
            Ativar Monitoramento
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
