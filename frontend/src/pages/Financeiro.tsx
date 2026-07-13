import { useState, useEffect } from 'react';
import {
  Box, Grid, Paper, Typography, Chip, Button,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField,
  InputAdornment, Tabs, Tab, MenuItem, Select,
  FormControl, InputLabel, CircularProgress, IconButton, Alert, Tooltip as MuiTooltip
} from '@mui/material';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip, ResponsiveContainer,
} from 'recharts';
import AddIcon from '@mui/icons-material/Add';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import SearchIcon from '@mui/icons-material/Search';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import EmailIcon from '@mui/icons-material/Email';
import RefreshIcon from '@mui/icons-material/Refresh';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';

import { useApp } from '../context/AppContext';

interface FinancialRecord {
  id: string;
  type: 'PAGAR' | 'RECEBER';
  description: string;
  amount: number;
  dueDate: string;
  entryDate: string;
  status: 'PAGO' | 'PENDENTE' | 'VENCIDO' | 'ATRASADO';
  paymentDate?: string;
  supplierOrClient: string;
  ticketInfo?: string;
  observations?: string;
  clientId?: string;
  client?: {
    id: string;
    name: string;
    email: string;
    phone: string;
  };
}

interface GmailAccount {
  id: string;
  email: string;
  name?: string;
}

interface GmailEmail {
  id: string;
  from: string;
  subject: string;
  snippet: string;
  date: string;
}

export default function Financeiro() {
  const { clients } = useApp();

  const [activeTab, setActiveTab] = useState(0);
  const [isDemo, setIsDemo] = useState(false);
  const [loading, setLoading] = useState(false);
  const [records, setRecords] = useState<FinancialRecord[]>([]);
  const [summary, setSummary] = useState({
    mrr: 0,
    totalRecebido: 0,
    totalPendente: 0,
    totalAtrasado: 0,
    totalPagar: 0,
    lucroEstimado: 0
  });

  const [gmailAccounts, setGmailAccounts] = useState<GmailAccount[]>([]);
  const [selectedGmail, setSelectedGmail] = useState<string>('');
  const [emails, setEmails] = useState<GmailEmail[]>([]);
  const [loadingEmails, setLoadingEmails] = useState(false);
  const [selectedEmailDetail, setSelectedEmailDetail] = useState<GmailEmail | null>(null);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Modal form states
  const [openModal, setOpenModal] = useState(false);
  const [editingRecord, setEditingRecord] = useState<FinancialRecord | null>(null);
  const [modalForm, setModalForm] = useState({
    type: 'RECEBER',
    description: '',
    amount: '',
    dueDate: '',
    entryDate: '',
    status: 'PENDENTE',
    supplierOrClient: '',
    ticketInfo: '',
    observations: '',
    clientId: '',
  });

  // Connect mock account modal
  const [openMockModal, setOpenMockModal] = useState(false);
  const [mockEmail, setMockEmail] = useState('');
  const [mockName, setMockName] = useState('');

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

  const getHeaders = () => {
    return {
      'Content-Type': 'application/json',
      'x-user-role': localStorage.getItem('user_role') || '',
      'x-user-email': localStorage.getItem('user_email') || '',
    };
  };

  const fetchRecords = async () => {
    try {
      const response = await fetch(`${API_URL}/financial`, {
        headers: getHeaders()
      });
      if (response.ok) {
        const data = await response.json();
        setRecords(data);
      }
    } catch (err) {
      console.error('Erro ao buscar registros financeiros:', err);
    }
  };

  const fetchSummary = async () => {
    try {
      const response = await fetch(`${API_URL}/financial/summary`, {
        headers: getHeaders()
      });
      if (response.ok) {
        const data = await response.json();
        setSummary(data);
      }
    } catch (err) {
      console.error('Erro ao buscar resumo financeiro:', err);
    }
  };

  const fetchGmailAccounts = async () => {
    try {
      const response = await fetch(`${API_URL}/gmail/accounts`, {
        headers: getHeaders()
      });
      if (response.ok) {
        const data = await response.json();
        setGmailAccounts(data);
        if (data.length > 0 && !selectedGmail) {
          setSelectedGmail(data[0].email);
        }
      }
    } catch (err) {
      console.error('Erro ao buscar contas Gmail:', err);
    }
  };

  const checkDemoMode = async () => {
    try {
      const response = await fetch(`${API_URL}/gmail/auth-url`, {
        headers: getHeaders()
      });
      if (response.ok) {
        const data = await response.json();
        setIsDemo(data.demo);
      }
    } catch (err) {
      console.error('Erro ao verificar modo demo:', err);
    }
  };

  const fetchEmails = async (email: string) => {
    if (!email) return;
    setLoadingEmails(true);
    try {
      const response = await fetch(`${API_URL}/gmail/emails/${encodeURIComponent(email)}`, {
        headers: getHeaders()
      });
      if (response.ok) {
        const data = await response.json();
        setEmails(data);
      }
    } catch (err) {
      console.error('Erro ao buscar e-mails:', err);
    } finally {
      setLoadingEmails(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchRecords(), fetchSummary(), fetchGmailAccounts(), checkDemoMode()]).finally(() => {
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (selectedGmail) {
      fetchEmails(selectedGmail);
    } else {
      setEmails([]);
    }
  }, [selectedGmail]);

  // Capture callback OAuth redirect
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const authStatus = params.get('auth');
    if (authStatus === 'success') {
      window.history.replaceState({}, document.title, window.location.pathname);
      fetchGmailAccounts();
    } else if (authStatus === 'error') {
      const message = params.get('message') || 'Erro desconhecido.';
      window.history.replaceState({}, document.title, window.location.pathname);
      alert(`Erro na autorização do Gmail: ${message}`);
    } else if (authStatus === 'demo') {
      window.history.replaceState({}, document.title, window.location.pathname);
      handleCreateMockAccount('demo.setec@gmail.com', 'SETEC Solar Demo');
    }
  }, []);

  const handleSaveRecord = async () => {
    if (!modalForm.description || !modalForm.amount || !modalForm.dueDate) {
      alert('Descrição, valor e data de vencimento são obrigatórios.');
      return;
    }

    const url = editingRecord 
      ? `${API_URL}/financial/${editingRecord.id}` 
      : `${API_URL}/financial`;
    const method = editingRecord ? 'PUT' : 'POST';

    try {
      const response = await fetch(url, {
        method,
        headers: getHeaders(),
        body: JSON.stringify({
          ...modalForm,
          amount: parseFloat(modalForm.amount),
        }),
      });

      if (response.ok) {
        setOpenModal(false);
        setEditingRecord(null);
        setModalForm({
          type: 'RECEBER',
          description: '',
          amount: '',
          dueDate: '',
          entryDate: '',
          status: 'PENDENTE',
          supplierOrClient: '',
          ticketInfo: '',
          observations: '',
          clientId: '',
        });
        fetchRecords();
        fetchSummary();
      } else {
        alert('Erro ao salvar registro.');
      }
    } catch (err) {
      console.error('Erro ao salvar registro:', err);
    }
  };

  const handleDeleteRecord = async (id: string) => {
    if (!confirm('Deseja realmente excluir este registro?')) return;
    try {
      const response = await fetch(`${API_URL}/financial/${id}`, {
        method: 'DELETE',
        headers: getHeaders(),
      });
      if (response.ok) {
        fetchRecords();
        fetchSummary();
      } else {
        alert('Erro ao deletar registro.');
      }
    } catch (err) {
      console.error('Erro ao deletar:', err);
    }
  };

  const handleMarkAsPaid = async (record: FinancialRecord) => {
    try {
      const response = await fetch(`${API_URL}/financial/${record.id}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify({
          status: 'PAGO',
          paymentDate: new Date().toISOString().split('T')[0],
        }),
      });
      if (response.ok) {
        fetchRecords();
        fetchSummary();
      } else {
        alert('Erro ao atualizar status.');
      }
    } catch (err) {
      console.error('Erro ao marcar como pago:', err);
    }
  };

  const handleConnectGmail = async () => {
    try {
      const response = await fetch(`${API_URL}/gmail/auth-url`, {
        headers: getHeaders()
      });
      if (response.ok) {
        const { url } = await response.json();
        window.location.href = url;
      }
    } catch (err) {
      console.error('Erro ao conectar Gmail:', err);
    }
  };

  const handleCreateMockAccount = async (email: string, name?: string) => {
    try {
      const response = await fetch(`${API_URL}/gmail/mock-account`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ email, name }),
      });
      if (response.ok) {
        const account = await response.json();
        fetchGmailAccounts();
        setSelectedGmail(account.email);
        setOpenMockModal(false);
        setMockEmail('');
        setMockName('');
      }
    } catch (err) {
      console.error('Erro ao criar conta mock:', err);
    }
  };

  const handleDisconnectGmail = async (id: string) => {
    if (!confirm('Deseja realmente desconectar esta conta de e-mail?')) return;
    try {
      const response = await fetch(`${API_URL}/gmail/accounts/${id}`, {
        method: 'DELETE',
        headers: getHeaders(),
      });
      if (response.ok) {
        fetchGmailAccounts();
        if (gmailAccounts.length <= 1) {
          setSelectedGmail('');
          setEmails([]);
        }
      }
    } catch (err) {
      console.error('Erro ao desconectar conta:', err);
    }
  };

  const handleLaunchFromEmail = (email: GmailEmail) => {
    let supplierOrClient = email.from;
    if (email.from.includes('<')) {
      supplierOrClient = email.from.split('<')[0].trim();
    }

    const isReceivable = email.subject.toLowerCase().includes('manutenção') || 
                        email.subject.toLowerCase().includes('recebimento') ||
                        email.subject.toLowerCase().includes('mensalidade') ||
                        email.subject.toLowerCase().includes('fatura de serviços');
    
    let amount = '';
    const r$Index = email.snippet.indexOf('R$');
    if (r$Index !== -1) {
      const sub = email.snippet.slice(r$Index + 2).trim();
      const match = sub.match(/^([0-9.,]+)/);
      if (match) {
        amount = match[1].replace(/\./g, '').replace(',', '.');
      }
    }

    setModalForm({
      type: isReceivable ? 'RECEBER' : 'PAGAR',
      description: email.subject,
      amount,
      dueDate: new Date(Date.now() + 3600000 * 24 * 7).toISOString().split('T')[0],
      entryDate: new Date(email.date).toISOString().split('T')[0],
      status: 'PENDENTE',
      supplierOrClient,
      ticketInfo: '',
      observations: `Lançado a partir do e-mail recebido em ${new Date(email.date).toLocaleDateString('pt-BR')}.\nResumo: ${email.snippet}`,
      clientId: '',
    });

    setEditingRecord(null);
    setSelectedEmailDetail(null);
    setOpenModal(true);
  };

  const handleOpenCreateModal = (type: 'PAGAR' | 'RECEBER') => {
    setEditingRecord(null);
    setModalForm({
      type,
      description: '',
      amount: '',
      dueDate: new Date().toISOString().split('T')[0],
      entryDate: new Date().toISOString().split('T')[0],
      status: 'PENDENTE',
      supplierOrClient: '',
      ticketInfo: '',
      observations: '',
      clientId: '',
    });
    setOpenModal(true);
  };

  const handleOpenEditModal = (record: FinancialRecord) => {
    setEditingRecord(record);
    setModalForm({
      type: record.type,
      description: record.description,
      amount: record.amount.toString(),
      dueDate: record.dueDate.split('T')[0],
      entryDate: record.entryDate.split('T')[0],
      status: record.status,
      supplierOrClient: record.supplierOrClient,
      ticketInfo: record.ticketInfo || '',
      observations: record.observations || '',
      clientId: record.clientId || '',
    });
    setOpenModal(true);
  };

  // Cash flow aggregates
  const getCashFlowData = (items: FinancialRecord[]) => {
    const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const dataMap: Record<string, { receita: number; custo: number; order: number }> = {};

    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const label = `${months[d.getMonth()]}/${d.getFullYear().toString().slice(2)}`;
      dataMap[label] = { receita: 0, custo: 0, order: d.getTime() };
    }

    items.forEach((record) => {
      const d = new Date(record.dueDate);
      const label = `${months[d.getMonth()]}/${d.getFullYear().toString().slice(2)}`;
      if (dataMap[label]) {
        if (record.type === 'RECEBER' && record.status === 'PAGO') {
          dataMap[label].receita += record.amount;
        } else if (record.type === 'PAGAR' && record.status === 'PAGO') {
          dataMap[label].custo += record.amount;
        }
      }
    });

    return Object.entries(dataMap)
      .sort((a, b) => a[1].order - b[1].order)
      .map(([mes, vals]) => ({
        mes,
        receita: vals.receita,
        custo: vals.custo,
      }));
  };

  const cashFlow = getCashFlowData(records);
  const hasFlowData = cashFlow.some(c => c.receita > 0 || c.custo > 0);
  const cashFlowData = hasFlowData ? cashFlow : [
    { mes: 'Jan', receita: 8400, custo: 2100 },
    { mes: 'Fev', receita: 7600, custo: 1900 },
    { mes: 'Mar', receita: 9100, custo: 2300 },
    { mes: 'Abr', receita: 8800, custo: 2200 },
    { mes: 'Mai', receita: 9500, custo: 2400 },
    { mes: 'Jun', receita: 4200, custo: 2100 },
  ];

  // Filtering list
  const currentTypeFilter = activeTab === 1 ? 'RECEBER' : activeTab === 2 ? 'PAGAR' : undefined;
  const filteredRecords = records.filter(r => {
    if (currentTypeFilter && r.type !== currentTypeFilter) return false;
    
    const matchesSearch = r.description.toLowerCase().includes(search.toLowerCase()) ||
      r.supplierOrClient.toLowerCase().includes(search.toLowerCase()) ||
      (r.ticketInfo && r.ticketInfo.toLowerCase().includes(search.toLowerCase()));

    const matchesStatus = statusFilter === 'ALL' || r.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <Box className="flex flex-col gap-6 w-full text-slate-100">
      
      {/* Header */}
      <Box className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <Box>
          <Typography variant="h5" className="font-extrabold tracking-tight flex items-center gap-2" sx={{ color: 'var(--color-text-main)' }}>
            <AttachMoneyIcon className="text-orange-500" /> Painel Financeiro
          </Typography>
          <Typography variant="caption" className="text-slate-400">
            Controle de mensalidades, contas a pagar, recebimentos e caixa integrado
          </Typography>
        </Box>
        <Box className="flex gap-2">
          <Button
            variant="outlined"
            color="warning"
            onClick={() => handleOpenCreateModal('PAGAR')}
            startIcon={<AddIcon />}
            sx={{ borderColor: 'var(--color-border)', color: 'var(--color-text-main)', '&:hover': { borderColor: '#ef4444' } }}
          >
            Lançar Despesa
          </Button>
          <Button
            variant="contained"
            color="success"
            onClick={() => handleOpenCreateModal('RECEBER')}
            startIcon={<AddIcon />}
            sx={{ bgcolor: 'var(--color-primary-orange)', '&:hover': { bgcolor: 'var(--color-primary-orange-hover)' }, fontWeight: 750 }}
          >
            Lançar Receita
          </Button>
        </Box>
      </Box>

      {/* Tabs */}
      <Tabs
        value={activeTab}
        onChange={(_, val) => setActiveTab(val)}
        sx={{
          borderBottom: '1px solid var(--color-border)',
          '& .MuiTabs-indicator': { backgroundColor: 'var(--color-primary-orange)' },
          '& .MuiTab-root': { color: 'var(--color-text-muted)', fontSize: 13, textTransform: 'none', fontWeight: 600 },
          '& .Mui-selected': { color: 'var(--color-primary-orange) !important' }
        }}
      >
        <Tab label="Dashboard Financeiro" />
        <Tab label="Contas a Receber" />
        <Tab label="Contas a Pagar" />
        <Tab label="Leitor de Faturas (Gmail)" icon={<EmailIcon />} iconPosition="start" />
      </Tabs>

      {loading ? (
        <Box className="flex justify-center items-center py-20">
          <CircularProgress color="warning" />
        </Box>
      ) : (
        <>
          {/* TAB 0: DASHBOARD */}
          {activeTab === 0 && (
            <Box className="flex flex-col gap-6 animate-fadeIn">
              {/* KPIs */}
              <Grid container spacing={3}>
                {[
                  { label: 'MRR (Previsão do Mês)', value: `R$ ${summary.mrr.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, color: 'var(--color-primary-orange)', icon: <AccountBalanceWalletIcon /> },
                  { label: 'Recebido no Mês', value: `R$ ${summary.totalRecebido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, color: 'var(--color-success)', icon: <CheckCircleIcon /> },
                  { label: 'Contas a Pagar (Mês)', value: `R$ ${summary.totalPagar.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, color: 'var(--color-danger)', icon: <WarningAmberIcon /> },
                  { label: 'Lucro Estimado (Mês)', value: `R$ ${summary.lucroEstimado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, color: '#34d399', icon: <AttachMoneyIcon /> },
                ].map(({ label, value, color, icon }) => (
                  <Grid key={label} size={{ xs: 12, sm: 6, md: 3 }}>
                    <Paper
                      className="p-5 flex flex-col gap-2 rounded-2xl transition-all"
                      sx={{ bgcolor: 'var(--color-bg-panel)', border: '1px solid var(--color-border)' }}
                    >
                      <Box className="flex justify-between items-center text-slate-400">
                        <Typography variant="caption" className="font-semibold uppercase tracking-wider text-[10px]">{label}</Typography>
                        <Box sx={{ color }}>{icon}</Box>
                      </Box>
                      <Typography variant="h5" className="font-black" sx={{ color }}>{value}</Typography>
                    </Paper>
                  </Grid>
                ))}
              </Grid>

              {/* Chart */}
              <Paper
                className="p-5 rounded-2xl flex flex-col gap-4"
                sx={{ bgcolor: 'var(--color-bg-panel)', border: '1px solid var(--color-border)' }}
              >
                <Box>
                  <Typography variant="subtitle1" className="font-extrabold" sx={{ color: 'var(--color-text-main)' }}>
                    Fluxo de Caixa — Receitas vs Despesas (R$)
                  </Typography>
                  <Typography variant="caption" className="text-slate-400">
                    Soma de contas liquidadas (Pagas / Recebidas) nos últimos 6 meses
                  </Typography>
                </Box>
                <ResponsiveContainer width="100%" height={260}>
                  <AreaChart data={cashFlowData}>
                    <defs>
                      <linearGradient id="gradReceita" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--color-success)" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="var(--color-success)" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="gradCusto" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--color-danger)" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="var(--color-danger)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                    <XAxis dataKey="mes" stroke="var(--color-text-muted)" tick={{ fontSize: 11 }} />
                    <YAxis stroke="var(--color-text-muted)" tick={{ fontSize: 11 }} tickFormatter={v => `R$${v}`} />
                    <RechartsTooltip
                      contentStyle={{ backgroundColor: 'var(--color-bg-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text-main)', borderRadius: 12 }}
                      formatter={(v) => [`R$ ${Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, '']}
                    />
                    <Area type="monotone" dataKey="receita" name="Receitas" stroke="var(--color-success)" strokeWidth={2} fill="url(#gradReceita)" />
                    <Area type="monotone" dataKey="custo" name="Despesas" stroke="var(--color-danger)" strokeWidth={2} fill="url(#gradCusto)" />
                  </AreaChart>
                </ResponsiveContainer>
              </Paper>
            </Box>
          )}

          {/* TAB 1 & 2: RECEBER / PAGAR */}
          {(activeTab === 1 || activeTab === 2) && (
            <Box className="flex flex-col gap-4 animate-fadeIn">
              {/* Search & Filters */}
              <Box className="flex flex-col md:flex-row gap-3 items-center justify-between">
                <TextField
                  size="small"
                  placeholder="Buscar descrição, cliente/fornecedor ou boleto..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full md:max-w-md"
                  slotProps={{
                    input: {
                      startAdornment: <InputAdornment position="start"><SearchIcon className="text-slate-400" /></InputAdornment>
                    }
                  }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      backgroundColor: 'var(--color-bg-panel)',
                      borderColor: 'var(--color-border)',
                      color: 'var(--color-text-main)',
                      '& fieldset': { borderColor: 'var(--color-border)' },
                      '&:hover fieldset': { borderColor: 'var(--color-text-muted)' }
                    }
                  }}
                />

                <Box className="flex gap-2">
                  {['ALL', 'PENDENTE', 'PAGO', 'VENCIDO'].map(f => (
                    <Chip
                      key={f}
                      label={f === 'ALL' ? 'Todos' : f}
                      onClick={() => setStatusFilter(f)}
                      variant={statusFilter === f ? 'filled' : 'outlined'}
                      sx={{
                        bgcolor: statusFilter === f ? 'var(--color-primary-orange)' : 'transparent',
                        borderColor: 'var(--color-border)',
                        color: 'var(--color-text-main)',
                        '&:hover': { bgcolor: statusFilter === f ? 'var(--color-primary-orange-hover)' : 'rgba(255,255,255,0.05)' },
                        fontWeight: 600,
                        fontSize: 11
                      }}
                    />
                  ))}
                </Box>
              </Box>

              {/* Records Table */}
              <TableContainer component={Paper} className="rounded-2xl" sx={{ bgcolor: 'var(--color-bg-panel)', border: '1px solid var(--color-border)' }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ color: 'var(--color-text-muted)', fontWeight: 700, borderBottom: '1px solid var(--color-border)' }}>Descrição</TableCell>
                      <TableCell sx={{ color: 'var(--color-text-muted)', fontWeight: 700, borderBottom: '1px solid var(--color-border)' }}>{activeTab === 1 ? 'Cliente' : 'Fornecedor'}</TableCell>
                      <TableCell sx={{ color: 'var(--color-text-muted)', fontWeight: 700, borderBottom: '1px solid var(--color-border)' }}>Valor</TableCell>
                      <TableCell sx={{ color: 'var(--color-text-muted)', fontWeight: 700, borderBottom: '1px solid var(--color-border)' }}>Vencimento</TableCell>
                      <TableCell sx={{ color: 'var(--color-text-muted)', fontWeight: 700, borderBottom: '1px solid var(--color-border)' }}>Status</TableCell>
                      <TableCell sx={{ color: 'var(--color-text-muted)', fontWeight: 700, borderBottom: '1px solid var(--color-border)' }} align="right">Ações</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredRecords.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} align="center" className="text-slate-400 py-10">
                          Nenhum lançamento financeiro cadastrado
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredRecords.map(r => {
                        const isOverdue = new Date(r.dueDate) < new Date() && r.status !== 'PAGO';
                        const displayStatus = isOverdue ? 'VENCIDO' : r.status;
                        const statusColor = displayStatus === 'PAGO' 
                          ? { bg: 'rgba(16, 185, 129, 0.1)', txt: 'var(--color-success)' }
                          : displayStatus === 'VENCIDO'
                          ? { bg: 'rgba(239, 68, 68, 0.1)', txt: 'var(--color-danger)' }
                          : { bg: 'rgba(245, 158, 11, 0.1)', txt: 'var(--color-warning)' };

                        return (
                          <TableRow key={r.id} sx={{ '&:hover': { bgcolor: 'rgba(255,255,255,0.02)' } }}>
                            <TableCell className="font-medium" sx={{ color: 'var(--color-text-main)', borderBottom: '1px solid var(--color-border)' }}>
                              {r.description}
                              {r.ticketInfo && (
                                <Typography variant="caption" className="block text-slate-500 font-normal">
                                  Boleto: {r.ticketInfo}
                                </Typography>
                              )}
                            </TableCell>
                            <TableCell sx={{ color: 'var(--color-text-main)', borderBottom: '1px solid var(--color-border)' }}>
                              {r.supplierOrClient}
                            </TableCell>
                            <TableCell className="font-extrabold" sx={{ color: activeTab === 1 ? 'var(--color-success)' : 'var(--color-danger)', borderBottom: '1px solid var(--color-border)' }}>
                              R$ {r.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </TableCell>
                            <TableCell sx={{ color: 'var(--color-text-main)', borderBottom: '1px solid var(--color-border)' }}>
                              {new Date(r.dueDate).toLocaleDateString('pt-BR')}
                            </TableCell>
                            <TableCell sx={{ borderBottom: '1px solid var(--color-border)' }}>
                              <Chip
                                label={displayStatus}
                                size="small"
                                sx={{ bgcolor: statusColor.bg, color: statusColor.txt, fontWeight: 700, fontSize: 10 }}
                              />
                            </TableCell>
                            <TableCell align="right" sx={{ borderBottom: '1px solid var(--color-border)' }}>
                              <Box className="flex justify-end gap-1">
                                {r.status !== 'PAGO' && (
                                  <MuiTooltip title={activeTab === 1 ? "Confirmar Recebimento" : "Dar Baixa (Pago)"}>
                                    <IconButton size="small" className="text-emerald-500 hover:bg-emerald-500/10" onClick={() => handleMarkAsPaid(r)}>
                                      <CheckCircleIcon fontSize="small" />
                                    </IconButton>
                                  </MuiTooltip>
                                )}
                                <IconButton size="small" className="text-blue-400 hover:bg-blue-400/10" onClick={() => handleOpenEditModal(r)}>
                                  <EditIcon fontSize="small" />
                                </IconButton>
                                <IconButton size="small" className="text-rose-500 hover:bg-rose-500/10" onClick={() => handleDeleteRecord(r.id)}>
                                  <DeleteIcon fontSize="small" />
                                </IconButton>
                              </Box>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}

          {/* TAB 3: GMAIL INVOICE READER */}
          {activeTab === 3 && (
            <Box className="flex flex-col gap-6 animate-fadeIn">
              {/* Info banner */}
              {isDemo && (
                <Alert severity="warning" className="rounded-2xl" sx={{ bgcolor: 'rgba(245, 158, 11, 0.1)', color: 'var(--color-warning)', border: '1px solid rgba(245, 158, 11, 0.2)' }}>
                  As credenciais da API do Gmail não estão configuradas no arquivo .env. O sistema está rodando em <strong>Modo de Simulação</strong>. Você pode adicionar contas simuladas para testar a interface.
                </Alert>
              )}

              {/* Toolbar */}
              <Paper className="p-4 rounded-2xl flex flex-col md:flex-row gap-4 items-center justify-between" sx={{ bgcolor: 'var(--color-bg-panel)', border: '1px solid var(--color-border)' }}>
                <Box className="flex items-center gap-3 w-full md:w-auto">
                  <FormControl size="small" className="min-w-[240px]">
                    <InputLabel id="gmail-select-label" sx={{ color: 'var(--color-text-muted)' }}>Selecionar Conta Gmail</InputLabel>
                    <Select
                      labelId="gmail-select-label"
                      value={selectedGmail}
                      label="Selecionar Conta Gmail"
                      onChange={e => setSelectedGmail(e.target.value)}
                      sx={{
                        color: 'var(--color-text-main)',
                        '& .MuiOutlinedInput-notchedOutline': { borderColor: 'var(--color-border)' },
                        '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'var(--color-text-muted)' },
                      }}
                    >
                      {gmailAccounts.length === 0 ? (
                        <MenuItem value="">Nenhuma conta vinculada</MenuItem>
                      ) : (
                        gmailAccounts.map(acc => (
                          <MenuItem key={acc.id} value={acc.email}>
                            {acc.name ? `${acc.name} (${acc.email})` : acc.email}
                          </MenuItem>
                        ))
                      )}
                    </Select>
                  </FormControl>
                  
                  {selectedGmail && (
                    <IconButton
                      color="warning"
                      onClick={() => fetchEmails(selectedGmail)}
                      disabled={loadingEmails}
                    >
                      <RefreshIcon className={loadingEmails ? "animate-spin" : ""} />
                    </IconButton>
                  )}
                </Box>

                <Box className="flex gap-2 w-full md:w-auto justify-end">
                  {gmailAccounts.some(acc => acc.email === selectedGmail) && (
                    <Button
                      variant="outlined"
                      color="error"
                      onClick={() => {
                        const id = gmailAccounts.find(a => a.email === selectedGmail)?.id;
                        if (id) handleDisconnectGmail(id);
                      }}
                    >
                      Desconectar Conta
                    </Button>
                  )}
                  {isDemo ? (
                    <Button
                      variant="contained"
                      onClick={() => setOpenMockModal(true)}
                      sx={{ bgcolor: 'var(--color-primary-orange)', '&:hover': { bgcolor: 'var(--color-primary-orange-hover)' }, fontWeight: 700 }}
                    >
                      Adicionar Conta Simulação
                    </Button>
                  ) : (
                    <Button
                      variant="contained"
                      onClick={handleConnectGmail}
                      sx={{ bgcolor: 'var(--color-primary-orange)', '&:hover': { bgcolor: 'var(--color-primary-orange-hover)' }, fontWeight: 700 }}
                    >
                      Conectar Conta Real
                    </Button>
                  )}
                </Box>
              </Paper>

              {/* Email List View */}
              {!selectedGmail ? (
                <Paper className="p-12 text-center rounded-2xl flex flex-col items-center gap-4" sx={{ bgcolor: 'var(--color-bg-panel)', border: '1px solid var(--color-border)' }}>
                  <EmailIcon sx={{ fontSize: 64 }} className="text-slate-600" />
                  <Typography className="text-slate-400 font-medium">
                    Nenhuma conta de e-mail selecionada ou conectada.
                  </Typography>
                  <Typography variant="body2" className="text-slate-500 max-w-sm">
                    Para visualizar e-mails de faturas de energia, conecte uma conta Google acima ou crie uma conta de simulação para testar.
                  </Typography>
                </Paper>
              ) : loadingEmails ? (
                <Box className="flex justify-center items-center py-20">
                  <CircularProgress color="warning" />
                </Box>
              ) : emails.length === 0 ? (
                <Paper className="p-12 text-center rounded-2xl" sx={{ bgcolor: 'var(--color-bg-panel)', border: '1px solid var(--color-border)' }}>
                  <Typography className="text-slate-400">Nenhum e-mail de fatura de energia localizado nesta caixa postal.</Typography>
                </Paper>
              ) : (
                <Box className="flex flex-col gap-3">
                  <Typography variant="subtitle2" className="font-extrabold text-slate-400 uppercase tracking-wider text-[10px] pl-1">
                    Inbox — Faturas e Monitoramento Solar
                  </Typography>
                  {emails.map(email => (
                    <Paper
                      key={email.id}
                      onClick={() => setSelectedEmailDetail(email)}
                      className="p-4 rounded-2xl flex flex-col gap-2 cursor-pointer transition-all hover:scale-[1.005] hover:border-slate-500"
                      sx={{
                        bgcolor: 'var(--color-bg-panel)',
                        border: '1px solid var(--color-border)',
                      }}
                    >
                      <Box className="flex justify-between items-start gap-2">
                        <Box className="flex items-center gap-2">
                          <Chip
                            label={email.from.split('<')[0].trim()}
                            size="small"
                            sx={{ bgcolor: 'rgba(255, 107, 0, 0.1)', color: 'var(--color-primary-orange)', fontWeight: 700, fontSize: 10 }}
                          />
                          <Typography variant="body2" className="font-bold text-xs" sx={{ color: 'var(--color-text-main)' }}>
                            {email.subject}
                          </Typography>
                        </Box>
                        <Typography variant="caption" className="text-slate-500 whitespace-nowrap">
                          {new Date(email.date).toLocaleDateString('pt-BR')} {new Date(email.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </Typography>
                      </Box>
                      <Typography variant="body2" className="text-slate-400 text-xs line-clamp-1">
                        {email.snippet}
                      </Typography>
                    </Paper>
                  ))}
                </Box>
              )}
            </Box>
          )}
        </>
      )}

      {/* DIALOG: LAUNCH OR EDIT RECORD */}
      <Dialog
        open={openModal}
        onClose={() => setOpenModal(false)}
        maxWidth="sm"
        fullWidth
        slotProps={{
          paper: {
            sx: { bgcolor: 'var(--color-bg-panel)', border: '1px solid var(--color-border)', borderRadius: 4 }
          }
        }}
      >
        <DialogTitle className="font-black flex items-center gap-2" sx={{ color: 'var(--color-text-main)', borderBottom: '1px solid var(--color-border)' }}>
          <AttachMoneyIcon className="text-orange-500" />
          {editingRecord ? 'Editar Lançamento' : modalForm.type === 'RECEBER' ? 'Lançar Receita (Contas a Receber)' : 'Lançar Despesa (Contas a Pagar)'}
        </DialogTitle>
        <DialogContent className="pt-6">
          <Box className="flex flex-col gap-4 mt-2">
            <TextField
              label="Descrição / Detalhe"
              fullWidth
              size="small"
              value={modalForm.description}
              onChange={e => setModalForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Ex: Contrato de Manutenção Usina X"
              slotProps={{ inputLabel: { shrink: true } }}
            />

            <Box className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <TextField
                label="Valor (R$)"
                type="number"
                fullWidth
                size="small"
                value={modalForm.amount}
                onChange={e => setModalForm(f => ({ ...f, amount: e.target.value }))}
                placeholder="0.00"
                slotProps={{ inputLabel: { shrink: true } }}
              />

              <FormControl size="small" fullWidth>
                <InputLabel id="status-select-label">Status</InputLabel>
                <Select
                  labelId="status-select-label"
                  value={modalForm.status}
                  label="Status"
                  onChange={e => setModalForm(f => ({ ...f, status: e.target.value }))}
                >
                  <MenuItem value="PENDENTE">Pendente</MenuItem>
                  <MenuItem value="PAGO">{modalForm.type === 'RECEBER' ? 'Recebido' : 'Pago'}</MenuItem>
                </Select>
              </FormControl>
            </Box>

            <Box className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <TextField
                label="Data de Vencimento"
                type="date"
                fullWidth
                size="small"
                value={modalForm.dueDate}
                onChange={e => setModalForm(f => ({ ...f, dueDate: e.target.value }))}
                slotProps={{ inputLabel: { shrink: true } }}
              />

              <TextField
                label="Data de Entrada / Emissão"
                type="date"
                fullWidth
                size="small"
                value={modalForm.entryDate}
                onChange={e => setModalForm(f => ({ ...f, entryDate: e.target.value }))}
                slotProps={{ inputLabel: { shrink: true } }}
              />
            </Box>

            {modalForm.type === 'RECEBER' ? (
              <Box className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormControl size="small" fullWidth>
                  <InputLabel id="client-select-label">Cliente do Sistema (Opcional)</InputLabel>
                  <Select
                    labelId="client-select-label"
                    value={modalForm.clientId}
                    label="Cliente do Sistema (Opcional)"
                    onChange={e => {
                      const cId = e.target.value;
                      const clientName = clients.find(c => c.id === cId)?.name || '';
                      setModalForm(f => ({ ...f, clientId: cId, supplierOrClient: clientName }));
                    }}
                  >
                    <MenuItem value="">Nenhum (Digitar Nome)</MenuItem>
                    {clients.map(c => (
                      <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <TextField
                  label="Nome do Cliente"
                  fullWidth
                  size="small"
                  value={modalForm.supplierOrClient}
                  onChange={e => setModalForm(f => ({ ...f, supplierOrClient: e.target.value }))}
                  placeholder="Nome do cliente para faturamento"
                  slotProps={{ inputLabel: { shrink: true } }}
                />
              </Box>
            ) : (
              <TextField
                label="Fornecedor"
                fullWidth
                size="small"
                value={modalForm.supplierOrClient}
                onChange={e => setModalForm(f => ({ ...f, supplierOrClient: e.target.value }))}
                placeholder="Ex: Enel Distribuição"
                slotProps={{ inputLabel: { shrink: true } }}
              />
            )}

            <TextField
              label="Informação do Boleto / Código de Barras"
              fullWidth
              size="small"
              value={modalForm.ticketInfo}
              onChange={e => setModalForm(f => ({ ...f, ticketInfo: e.target.value }))}
              placeholder="Linha digitável do boleto ou link da fatura"
              slotProps={{ inputLabel: { shrink: true } }}
            />

            <TextField
              label="Observações"
              multiline
              rows={3}
              fullWidth
              size="small"
              value={modalForm.observations}
              onChange={e => setModalForm(f => ({ ...f, observations: e.target.value }))}
              placeholder="Notas financeiras adicionais..."
              slotProps={{ inputLabel: { shrink: true } }}
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 3, borderTop: '1px solid var(--color-border)' }}>
          <Button onClick={() => setOpenModal(false)} sx={{ color: 'var(--color-text-muted)' }}>Cancelar</Button>
          <Button variant="contained" onClick={handleSaveRecord} sx={{ bgcolor: 'var(--color-primary-orange)', '&:hover': { bgcolor: 'var(--color-primary-orange-hover)' }, fontWeight: 700 }}>
            Confirmar Lançamento
          </Button>
        </DialogActions>
      </Dialog>

      {/* DIALOG: CONNECT MOCK GMAIL */}
      <Dialog
        open={openMockModal}
        onClose={() => setOpenMockModal(false)}
        maxWidth="xs"
        fullWidth
        slotProps={{
          paper: {
            sx: { bgcolor: 'var(--color-bg-panel)', border: '1px solid var(--color-border)', borderRadius: 4 }
          }
        }}
      >
        <DialogTitle className="font-bold" sx={{ color: 'var(--color-text-main)', borderBottom: '1px solid var(--color-border)' }}>
          Adicionar Gmail Simulação
        </DialogTitle>
        <DialogContent className="pt-6">
          <Box className="flex flex-col gap-4 mt-2">
            <Typography variant="body2" className="text-slate-400">
              Para testar o fluxo de leitura de e-mails, digite um endereço de e-mail fictício.
            </Typography>
            <TextField
              label="Endereço de E-mail"
              fullWidth
              size="small"
              value={mockEmail}
              onChange={e => setMockEmail(e.target.value)}
              placeholder="Ex: manoel.coreagro@gmail.com"
              slotProps={{ inputLabel: { shrink: true } }}
            />
            <TextField
              label="Nome do Usuário (Opcional)"
              fullWidth
              size="small"
              value={mockName}
              onChange={e => setMockName(e.target.value)}
              placeholder="Ex: Manoel Gonçalo"
              slotProps={{ inputLabel: { shrink: true } }}
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 3, borderTop: '1px solid var(--color-border)' }}>
          <Button onClick={() => setOpenMockModal(false)} sx={{ color: 'var(--color-text-muted)' }}>Cancelar</Button>
          <Button
            variant="contained"
            onClick={() => handleCreateMockAccount(mockEmail, mockName)}
            disabled={!mockEmail}
            sx={{ bgcolor: 'var(--color-primary-orange)', '&:hover': { bgcolor: 'var(--color-primary-orange-hover)' }, fontWeight: 700 }}
          >
            Vincular Conta Simulação
          </Button>
        </DialogActions>
      </Dialog>

      {/* DIALOG: EMAIL DETAILS */}
      <Dialog
        open={Boolean(selectedEmailDetail)}
        onClose={() => setSelectedEmailDetail(null)}
        maxWidth="sm"
        fullWidth
        slotProps={{
          paper: {
            sx: { bgcolor: 'var(--color-bg-panel)', border: '1px solid var(--color-border)', borderRadius: 4 }
          }
        }}
      >
        {selectedEmailDetail && (
          <>
            <DialogTitle className="font-extrabold flex items-center justify-between gap-4" sx={{ color: 'var(--color-text-main)', borderBottom: '1px solid var(--color-border)' }}>
              <Box className="flex flex-col">
                <Typography variant="caption" className="text-slate-400">Remetente: {selectedEmailDetail.from}</Typography>
                <Typography variant="subtitle1" className="font-black mt-0.5">{selectedEmailDetail.subject}</Typography>
              </Box>
              <Typography variant="caption" className="text-slate-500">
                {new Date(selectedEmailDetail.date).toLocaleDateString('pt-BR')}
              </Typography>
            </DialogTitle>
            <DialogContent className="pt-6">
              <Box className="p-4 rounded-xl border flex flex-col gap-3" sx={{ bgcolor: 'var(--color-bg-dark)', borderColor: 'var(--color-border)' }}>
                <Typography className="text-slate-300 text-xs font-semibold uppercase tracking-wider text-[9px]">Conteúdo do e-mail</Typography>
                <Typography className="text-slate-200 text-xs leading-relaxed whitespace-pre-wrap">
                  {selectedEmailDetail.snippet}
                </Typography>
              </Box>
            </DialogContent>
            <DialogActions sx={{ p: 3, borderTop: '1px solid var(--color-border)' }}>
              <Button onClick={() => setSelectedEmailDetail(null)} sx={{ color: 'var(--color-text-muted)' }}>Fechar</Button>
              <Button
                variant="contained"
                onClick={() => handleLaunchFromEmail(selectedEmailDetail)}
                startIcon={<OpenInNewIcon />}
                sx={{ bgcolor: 'var(--color-primary-orange)', '&:hover': { bgcolor: 'var(--color-primary-orange-hover)' }, fontWeight: 700 }}
              >
                Lançar a partir deste E-mail
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Box>
  );
}
