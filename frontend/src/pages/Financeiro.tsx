import { useState } from 'react';
import {
  Box, Grid, Paper, Typography, Chip, Button,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField,
  InputAdornment, LinearProgress, Tabs, Tab,
} from '@mui/material';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts';
import AddIcon from '@mui/icons-material/Add';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';

import SearchIcon from '@mui/icons-material/Search';


interface ContractPayment {
  id: string;
  clientName: string;
  monthRef: string;
  amount: number;
  status: 'PAID' | 'PENDING' | 'OVERDUE';
  paidAt?: string;
}

// Dados mock de fluxo de caixa para o gráfico
const cashFlowData = [
  { mes: 'Jan', receita: 8400, custo: 2100 },
  { mes: 'Fev', receita: 7600, custo: 1900 },
  { mes: 'Mar', receita: 9100, custo: 2300 },
  { mes: 'Abr', receita: 8800, custo: 2200 },
  { mes: 'Mai', receita: 9500, custo: 2400 },
  { mes: 'Jun', receita: 4200, custo: 2100 },
];

export default function Financeiro() {
  const [loading] = useState(false);
  const [search, setSearch] = useState('');
  const [tabValue, setTabValue] = useState(0);
  const [openModal, setOpenModal] = useState(false);
  const [newPayment, setNewPayment] = useState({ clientName: '', monthRef: '', amount: '', status: 'PENDING' });

  // Pagamentos fictícios mas realistas enquanto não há endpoint
  const [payments, setPayments] = useState<ContractPayment[]>([
    { id: '1', clientName: 'Mercado Central', monthRef: 'Mai/2026', amount: 450.00, status: 'PAID', paidAt: '2026-05-05' },
    { id: '2', clientName: 'Manoel Coreagro', monthRef: 'Mai/2026', amount: 189.90, status: 'PAID', paidAt: '2026-05-10' },
    { id: '3', clientName: 'Posto São João', monthRef: 'Jun/2026', amount: 620.00, status: 'PENDING' },
    { id: '4', clientName: 'Clínica Saúde+', monthRef: 'Jun/2026', amount: 380.00, status: 'OVERDUE' },
    { id: '5', clientName: 'Mercado Central', monthRef: 'Jun/2026', amount: 450.00, status: 'PENDING' },
  ]);

  const handleAddPayment = () => {
    if (!newPayment.clientName || !newPayment.monthRef || !newPayment.amount) return;
    const p: ContractPayment = {
      id: Date.now().toString(),
      clientName: newPayment.clientName,
      monthRef: newPayment.monthRef,
      amount: parseFloat(newPayment.amount),
      status: newPayment.status as ContractPayment['status'],
    };
    setPayments(prev => [p, ...prev]);
    setOpenModal(false);
    setNewPayment({ clientName: '', monthRef: '', amount: '', status: 'PENDING' });
  };

  const tabStatuses = [
    ['PAID'],
    ['PENDING', 'OVERDUE'],
  ];

  const filtered = payments.filter(p => {
    const matchSearch = p.clientName.toLowerCase().includes(search.toLowerCase()) ||
      p.monthRef.toLowerCase().includes(search.toLowerCase());
    return matchSearch && tabStatuses[tabValue].includes(p.status);
  });

  const totalRecebido = payments.filter(p => p.status === 'PAID').reduce((s, p) => s + p.amount, 0);
  const totalPendente = payments.filter(p => p.status !== 'PAID').reduce((s, p) => s + p.amount, 0);
  const mrr = cashFlowData[cashFlowData.length - 1].receita;

  const statusConfig = {
    PAID:    { label: 'Recebido', color: '#22c55e', bg: '#22c55e18' },
    PENDING: { label: 'Pendente', color: '#f59e0b', bg: '#f59e0b18' },
    OVERDUE: { label: 'Vencida',  color: '#ef4444', bg: '#ef444418' },
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>

      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: 1 }}>
            <AttachMoneyIcon sx={{ color: '#f57c00' }} /> Gestão Financeira
          </Typography>
          <Typography variant="caption" sx={{ color: '#64748b' }}>
            Controle de mensalidades, MRR e fluxo de caixa
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setOpenModal(true)}
          sx={{ bgcolor: '#f57c00', '&:hover': { bgcolor: '#e64a19' }, fontWeight: 700 }}>
          Lançar Pagamento
        </Button>
      </Box>

      {/* KPI */}
      <Grid container spacing={2}>
        {[
          { label: 'MRR (Receita Mensal)', value: `R$ ${mrr.toLocaleString('pt-BR')}`, color: '#f57c00' },
          { label: 'Recebido no Mês', value: `R$ ${totalRecebido.toFixed(2).replace('.', ',')}`, color: '#22c55e' },
          { label: 'Pendente / Em Aberto', value: `R$ ${totalPendente.toFixed(2).replace('.', ',')}`, color: '#f59e0b' },
          { label: 'Lucro Estimado (Mês)', value: `R$ ${(mrr - cashFlowData[cashFlowData.length - 1].custo).toLocaleString('pt-BR')}`, color: '#34d399' },
        ].map(({ label, value, color }) => (
          <Grid key={label} size={{ xs: 12, sm: 6, md: 3 }}>
            <Paper sx={{ p: 2.5, bgcolor: '#0f172a', border: '1px solid #1e293b', borderRadius: 2 }}>
              <Typography variant="caption" sx={{ color: '#475569', display: 'block' }}>{label}</Typography>
              <Typography variant="h5" sx={{ color, fontWeight: 800, mt: 0.5 }}>{value}</Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>

      {/* Gráfico Fluxo de Caixa */}
      <Paper sx={{ p: 3, bgcolor: '#0f172a', border: '1px solid #1e293b', borderRadius: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 700, color: '#f8fafc', mb: 0.5 }}>
          Fluxo de Caixa — Receita vs Custo Operacional (R$)
        </Typography>
        <Typography variant="caption" sx={{ color: '#475569', display: 'block', mb: 2 }}>
          Últimos 6 meses
        </Typography>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={cashFlowData}>
            <defs>
              <linearGradient id="gradReceita" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gradCusto" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis dataKey="mes" stroke="#475569" tick={{ fontSize: 11 }} />
            <YAxis stroke="#475569" tick={{ fontSize: 11 }} tickFormatter={v => `R$${(v / 1000).toFixed(0)}k`} />
            <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#f8fafc', borderRadius: 8 }}
              formatter={(v: unknown) => [`R$ ${Number(v).toLocaleString('pt-BR')}`, '']} />
            <Area type="monotone" dataKey="receita" name="Receita" stroke="#22c55e" strokeWidth={2} fill="url(#gradReceita)" />
            <Area type="monotone" dataKey="custo" name="Custo" stroke="#ef4444" strokeWidth={2} fill="url(#gradCusto)" />
          </AreaChart>
        </ResponsiveContainer>
      </Paper>

      {/* Tabela Pagamentos */}
      <Paper sx={{ p: 2, bgcolor: '#0f172a', border: '1px solid #1e293b', borderRadius: 2 }}>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 2, flexWrap: 'wrap' }}>
          <TextField size="small" placeholder="Buscar cliente ou competência..."
            value={search} onChange={e => setSearch(e.target.value)} sx={{ flex: 1, minWidth: 240 }}
            slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchIcon sx={{ color: '#475569' }} /></InputAdornment> } }} />
          <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)}
            sx={{ '& .MuiTabs-indicator': { backgroundColor: '#f57c00' }, '& .MuiTab-root': { color: '#64748b', fontSize: 12 }, '& .Mui-selected': { color: '#f57c00 !important' } }}>
            <Tab label="Recebidos" />
            <Tab label="Pendentes / Atrasados" />
          </Tabs>
        </Box>

        {loading ? <LinearProgress color="warning" /> : (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  {['Cliente', 'Competência', 'Valor', 'Status', 'Recebido em'].map(h => (
                    <TableCell key={h} sx={{ color: '#64748b', fontWeight: 700, fontSize: 11, textTransform: 'uppercase', borderBottom: '1px solid #1e293b' }}>{h}</TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} align="center" sx={{ color: '#475569', py: 5 }}>Nenhum registro</TableCell>
                  </TableRow>
                ) : filtered.map(p => {
                  const cfg = statusConfig[p.status];
                  return (
                    <TableRow key={p.id} sx={{ '&:hover': { bgcolor: '#ffffff05' } }}>
                      <TableCell sx={{ color: '#f1f5f9', fontWeight: 600, borderBottom: '1px solid #0a0f1a' }}>{p.clientName}</TableCell>
                      <TableCell sx={{ color: '#64748b', borderBottom: '1px solid #0a0f1a' }}>{p.monthRef}</TableCell>
                      <TableCell sx={{ color: '#f57c00', fontWeight: 700, borderBottom: '1px solid #0a0f1a' }}>R$ {p.amount.toFixed(2).replace('.', ',')}</TableCell>
                      <TableCell sx={{ borderBottom: '1px solid #0a0f1a' }}>
                        <Chip label={cfg.label} size="small" sx={{ bgcolor: cfg.bg, color: cfg.color, fontWeight: 700, fontSize: 10, border: `1px solid ${cfg.color}30` }} />
                      </TableCell>
                      <TableCell sx={{ color: '#475569', fontSize: 12, borderBottom: '1px solid #0a0f1a' }}>
                        {p.paidAt ? new Date(p.paidAt).toLocaleDateString('pt-BR') : '—'}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      {/* Dialog Lançar Pagamento */}
      <Dialog open={openModal} onClose={() => setOpenModal(false)} maxWidth="xs" fullWidth
        slotProps={{ paper: { sx: { bgcolor: '#0f172a', border: '1px solid #1e293b', borderRadius: 3 } } }}>
        <DialogTitle sx={{ color: '#f8fafc', fontWeight: 700, borderBottom: '1px solid #1e293b' }}>
          Lançar Pagamento
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField label="Cliente" fullWidth value={newPayment.clientName}
              onChange={e => setNewPayment(p => ({ ...p, clientName: e.target.value }))}
              slotProps={{ inputLabel: { shrink: true } }} placeholder="Nome do cliente" />
            <TextField label="Competência" fullWidth value={newPayment.monthRef}
              onChange={e => setNewPayment(p => ({ ...p, monthRef: e.target.value }))}
              slotProps={{ inputLabel: { shrink: true } }} placeholder="Ex: Jun/2026" />
            <TextField label="Valor (R$)" type="number" fullWidth value={newPayment.amount}
              onChange={e => setNewPayment(p => ({ ...p, amount: e.target.value }))}
              slotProps={{ inputLabel: { shrink: true } }} />
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 3, borderTop: '1px solid #1e293b' }}>
          <Button onClick={() => setOpenModal(false)} sx={{ color: '#64748b' }}>Cancelar</Button>
          <Button variant="contained" onClick={handleAddPayment}
            disabled={!newPayment.clientName || !newPayment.amount}
            sx={{ bgcolor: '#f57c00', '&:hover': { bgcolor: '#e64a19' }, fontWeight: 700 }}>
            Confirmar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
