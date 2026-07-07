import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import logoSetec from './assets/logosetec.jpg';
import heroImage from './assets/hero.png';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Clientes from './pages/Clientes';
import Usinas from './pages/Usinas';
import Noc from './pages/Noc';
import Faturas from './pages/Faturas';
import Financeiro from './pages/Financeiro';
import Manutencao from './pages/Manutencao';
import Chamados from './pages/Chamados';
import Relatorios from './pages/Relatorios';
import Tickets from './pages/Tickets';
import Configuracoes from './pages/Configuracoes';
import { Box, Typography, Button, Paper, IconButton, Chip } from '@mui/material';
import { useApp } from './context/AppContext';

// Import Material UI Icons
import {
  Search as SearchIcon,
  FilterList as FilterListIcon,
  Add as AddIcon,
  Build as BuildIcon,
  QrCodeScanner as QrCodeScannerIcon,
  Phone as PhoneIcon,
  Email as EmailIcon,
  Language as LanguageIcon,
  Security as SecurityIcon,
  Notifications as NotificationsIcon,
  Cloud as CloudIcon,
  WbSunny as WbSunnyIcon,
  ArrowForwardIos as ArrowForwardIosIcon,
  Info as InfoIcon,
  Assignment as AssignmentIcon,
  GroupWork as GroupWorkIcon,
  MenuBook as MenuBookIcon,
  ContactPhone as ContactPhoneIcon,
  DeleteSweep as DeleteSweepIcon,
  Close as CloseIcon,
  Feedback as FeedbackIcon,
  LightMode as LightModeIcon,
  DarkMode as DarkModeIcon,
  Check as CheckIcon,
  Person as PersonIcon,
  AddCircle as AddCircleIcon,
  SupportAgent as SupportAgentIcon,
  AccountCircle as AccountCircleIcon,
  SignalCellular4Bar as SignalCellularIcon,
  Wifi as WifiIcon,
  BatteryCharging80 as BatteryIcon,
  WhatsApp as WhatsAppIcon,
  SolarPower as SolarPowerIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  ExitToApp as ExitToAppIcon,
  Business as BusinessIcon,
  Storage as StorageIcon,
  Download as DownloadIcon,
  CheckCircle as CheckCircleIcon,
  CameraAlt as CameraAltIcon

} from '@mui/icons-material';


// Weather mapper based on location
const getWeatherForLocation = (city: string) => {
  if (!city) return { temp: '30°C', icon: 'sunny' };
  const lower = city.toLowerCase();
  if (lower.includes('fortaleza')) return { temp: '30°C', icon: 'sunny' };
  if (lower.includes('são paulo') || lower.includes('sao paulo')) return { temp: '21°C', icon: 'cloudy' };
  if (lower.includes('rio de janeiro')) return { temp: '26°C', icon: 'sunny' };
  if (lower.includes('curitiba')) return { temp: '16°C', icon: 'rainy' };
  if (lower.includes('salvador')) return { temp: '28°C', icon: 'sunny' };
  return { temp: '27°C', icon: 'cloudy' };
};


// Default mock plants to show visual representation matching the screenshot if db is empty or for simulation
const mockUsinasDefault = [
  {
    id: 'mock-1',
    name: 'Cesar Casa',
    capacityKwp: 3.72,
    estimatedKwh: 450,
    moduleCount: 10,
    manufacturer: 'Growatt',
    model: 'MIN 3000TL-X',
    status: 'ONLINE' as const,
    city: 'Fortaleza',
    state: 'CE',
    datalogger: 'GRW98711',
    installationDate: '2025-01-10',
    eHoje: '16.10',
    eTotal: '43.50 kWh',
    powerVal: 749,
    powerUnit: 'W',
    pct: 20
  },
  {
    id: 'mock-2',
    name: 'Tiago',
    capacityKwp: 22.00,
    estimatedKwh: 2600,
    moduleCount: 54,
    manufacturer: 'Solis',
    model: 'S5-GR3P20K',
    status: 'ONLINE' as const,
    city: 'Fortaleza',
    state: 'CE',
    datalogger: 'SLS88471',
    installationDate: '2024-11-15',
    eHoje: '110.10',
    eTotal: '4.07 MWh',
    powerVal: 11.28,
    powerUnit: 'kW',
    pct: 51
  },
  {
    id: 'mock-3',
    name: 'supermercado líder 2',
    capacityKwp: 17.76,
    estimatedKwh: 2100,
    moduleCount: 44,
    manufacturer: 'Fronius',
    model: 'Symo 15.0-3-M',
    status: 'ONLINE' as const,
    city: 'Maracanaú',
    state: 'CE',
    datalogger: 'FRN33211',
    installationDate: '2025-02-20',
    eHoje: '27.70',
    eTotal: '2.38 MWh',
    powerVal: 2.12,
    powerUnit: 'kW',
    pct: 11
  },
  {
    id: 'mock-4',
    name: 'Josivan Casa',
    capacityKwp: 14.60,
    estimatedKwh: 1750,
    moduleCount: 36,
    manufacturer: 'Deye',
    model: 'SUN-10K-SG04LP3',
    status: 'ONLINE' as const,
    city: 'Caucaia',
    state: 'CE',
    datalogger: 'DEY55431',
    installationDate: '2024-08-05',
    eHoje: '60.00',
    eTotal: '5.10 MWh',
    powerVal: 4.00,
    powerUnit: 'kW',
    pct: 27
  }
];

function AppCliente() {
  const navigate = useNavigate();
  const { clients, usinas, addUsina, addTicket } = useApp();
  
  const clientEmail = localStorage.getItem('user_email') || 'cliente@usinasolar.com';
  const isCliente = localStorage.getItem('user_role') === 'CLIENTE';
  
  // Find current client
  const clientObj = clients.find(c => c.email.toLowerCase() === clientEmail.toLowerCase()) || clients[0];
  
  // Filter usinas for this client
  const clientUsinas = usinas.filter(u => u.clientId === clientObj?.id);

  // States
  const [activeTab, setActiveTab] = useState<'plantas' | 'falha' | 'servico' | 'eu'>('plantas');
  const [simulatorTheme, setSimulatorTheme] = useState<'light' | 'dark'>('light');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'ONLINE' | 'ALERT' | 'OFFLINE'>('ALL');
  
  // Time and Battery Simulation
  const [currentTime, setCurrentTime] = useState('15:23');
  const [batteryLevel] = useState(88);

  // Modal / Bottom Sheet States
  const [plusMenuOpen, setPlusMenuOpen] = useState(false);
  const [activeModal, setActiveModal] = useState<null | 'add_plant' | 'scan_qr' | 'product_details' | 'quick_install' | 'warranty' | 'unit_groups' | 'user_manual' | 'contact_us' | 'org_mgmt' | 'account_sec' | 'notifications' | 'app_feedback' | 'data_mig' | 'about_us' | 'languages' | 'privacy'>(null);
  
  // Toast state
  const [toast, setToast] = useState<{ open: boolean; message: string; severity: 'success' | 'info' | 'error' } | null>(null);

  // Cache Simulation
  const [cacheSize, setCacheSize] = useState('199 KB');
  const [clearingCache, setClearingCache] = useState(false);

  // Faults Sub-tab
  const [faultSubTab, setFaultSubTab] = useState<'current' | 'history'>('current');

  // Form states
  // Add Plant
  const [newPlantName, setNewPlantName] = useState('');
  const [newPlantCapacity, setNewPlantCapacity] = useState('4.5');
  const [newPlantPanels, setNewPlantPanels] = useState('12');
  const [newPlantManufacturer, setNewPlantManufacturer] = useState('Solis');
  const [newPlantModel, setNewPlantModel] = useState('S5-GR1P4.6K');
  const [newPlantCity, setNewPlantCity] = useState('');
  const [newPlantState, setNewPlantState] = useState('');
  const [newPlantDatalogger, setNewPlantDatalogger] = useState('');

  // Warranty claim
  const [warrantyPlant, setWarrantyPlant] = useState('');
  const [warrantySerial, setWarrantySerial] = useState('');
  const [warrantyDesc, setWarrantyDesc] = useState('');
  const [submittingWarranty, setSubmittingWarranty] = useState(false);

  // Feedback form
  const [feedbackText, setFeedbackText] = useState('');
  const [feedbackScore, setFeedbackScore] = useState(5);
  const [submittingFeedback, setSubmittingFeedback] = useState(false);

  // Profile switches
  const [notifEmail, setNotifEmail] = useState(true);
  const [notifWhatsapp, setNotifWhatsapp] = useState(true);
  const [notifApp, setNotifApp] = useState(false);

  // Password reset simulation
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');

  // QR scanner simulation
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<string | null>(null);

  // Update clock
  useEffect(() => {
    const update = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }));
    };
    update();
    const interval = setInterval(update, 30000);
    return () => clearInterval(interval);
  }, []);

  const triggerToast = (message: string, severity: 'success' | 'info' | 'error' = 'success') => {
    setToast({ open: true, message, severity });
    setTimeout(() => setToast(null), 3000);
  };

  // Math for solar intensity based on local time
  const getSunIntensity = () => {
    const nowTime = new Date();
    const hour = nowTime.getHours() + nowTime.getMinutes() / 60;
    // Sunrise at 05:37 (5.62h), Sunset at 17:31 (17.52h)
    if (hour < 5.62 || hour > 17.52) return 0;
    // Sinusoidal curve peaks around 11:34 (noon point of day length)
    const dayLength = 17.52 - 5.62;
    return Math.sin(((hour - 5.62) / dayLength) * Math.PI);
  };

  const getUsinaRenderData = (u: any) => {
    if (u.id.startsWith('mock-')) return u;

    const sun = getSunIntensity();
    let status = u.status || 'ONLINE';
    let powerVal = 0;
    let powerUnit = 'W';
    let pct = 0;

    const cap = u.capacityKwp || 5;
    if (status === 'ONLINE') {
      const genKw = cap * sun * 0.85; // 85% typical efficiency
      if (genKw < 1) {
        powerVal = Math.round(genKw * 1000);
        powerUnit = 'W';
      } else {
        powerVal = Number(genKw.toFixed(2));
        powerUnit = 'kW';
      }
      pct = Math.max(0, Math.round((genKw / cap) * 100));
    } else if (status === 'ALERT') {
      const genKw = cap * sun * 0.15; // Degraded 15% efficiency
      if (genKw < 1) {
        powerVal = Math.round(genKw * 1000);
        powerUnit = 'W';
      } else {
        powerVal = Number(genKw.toFixed(2));
        powerUnit = 'kW';
      }
      pct = Math.max(0, Math.round((genKw / cap) * 100));
    }

    // Today's generation E-Hoje
    const eHojeVal = (cap * sun * 4.3).toFixed(2);
    // Total generation
    const eTotalVal = (cap * 11.2) + (u.estimatedKwh || 600) * 0.45;
    const eTotalStr = eTotalVal > 1000 ? `${(eTotalVal / 1000).toFixed(2)} MWh` : `${eTotalVal.toFixed(2)} kWh`;

    return {
      id: u.id,
      name: u.name,
      capacityKwp: cap,
      estimatedKwh: u.estimatedKwh || 600,
      moduleCount: u.moduleCount || 12,
      manufacturer: u.manufacturer || 'SETEC Inverter',
      model: u.model || 'Standard',
      status: status,
      city: u.city || 'Fortaleza',
      state: u.state || 'CE',
      datalogger: u.datalogger || 'SE-DB100',
      installationDate: u.installationDate ? u.installationDate.split('T')[0] : '2026-01-01',
      eHoje: eHojeVal,
      eTotal: eTotalStr,
      powerVal: powerVal,
      powerUnit: powerUnit,
      pct: pct
    };
  };

  // Exibe dados reais do banco quando o cliente já tem usinas cadastradas.
  // Os mocks servem apenas como demonstração enquanto o cadastro está vazio.
  const temUsinasReais = clientUsinas.length > 0;
  const allUsinas = temUsinasReais
    ? clientUsinas
    : mockUsinasDefault.map(u => ({ ...u, clientId: clientObj?.id }));

  // Filter usinas
  const filteredUsinas = allUsinas.map(getUsinaRenderData).filter(u => {
    const matchesSearch = u.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          u.city.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = activeFilter === 'ALL' || u.status === activeFilter;
    return matchesSearch && matchesStatus;
  });

  // Calculate sun position on SVG path (sunrise 05:37 to sunset 17:31)
  const getSunCoordinates = () => {
    const nowTime = new Date();
    const hour = nowTime.getHours() + nowTime.getMinutes() / 60;
    const sunrise = 5.62; // 05:37
    const sunset = 17.52; // 17:31
    const progress = Math.max(0, Math.min(1, (hour - sunrise) / (sunset - sunrise)));

    const R = 60; // radius
    const X_c = 90; // center x
    const Y_c = 80; // center y
    
    // Angle goes from PI (180deg - left/sunrise) to 0 (0deg - right/sunset)
    const angle = Math.PI - progress * Math.PI;
    const x = X_c + R * Math.cos(angle);
    const y = Y_c - R * Math.sin(angle);

    return { x, y, visible: hour >= sunrise && hour <= sunset };
  };

  const sunPos = getSunCoordinates();

  // Handle forms
  const handleAddPlantSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlantName || !newPlantCity || !newPlantState) {
      triggerToast('Nome, Cidade e Estado são obrigatórios!', 'error');
      return;
    }

    try {
      await addUsina({
        name: newPlantName,
        clientId: clientObj?.id || '',
        capacityKwp: parseFloat(newPlantCapacity) || 4.5,
        inverterCapacity: parseFloat(newPlantCapacity) || 4.5,
        moduleCount: parseInt(newPlantPanels) || 12,
        manufacturer: newPlantManufacturer,
        model: newPlantModel,
        utility: 'Enel Ceará',
        estimatedKwh: Math.round(parseFloat(newPlantCapacity) * 140) || 600,
        payback: 4.5,
        gpsLatitude: -3.7319,
        gpsLongitude: -38.5267,
        datalogger: newPlantDatalogger || 'SE-' + Math.floor(Math.random() * 1000000),
        address: 'Rua Principal, 100',
        city: newPlantCity,
        state: newPlantState,
        minEnergyPeak: 0,
        maxEnergyPeak: 10,
        installationDate: new Date().toISOString().split('T')[0],
        approvalDate: new Date().toISOString().split('T')[0],
      });

      // Clear state
      setNewPlantName('');
      setNewPlantCapacity('4.5');
      setNewPlantPanels('12');
      setNewPlantCity('');
      setNewPlantState('');
      setNewPlantDatalogger('');
      
      setActiveModal(null);
      triggerToast('Usina cadastrada com sucesso!', 'success');
    } catch (err) {
      console.error(err);
      triggerToast('Erro ao cadastrar usina.', 'error');
    }
  };

  const handleWarrantySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!warrantyPlant || !warrantyDesc) {
      triggerToast('Preencha os campos obrigatórios!', 'error');
      return;
    }
    setSubmittingWarranty(true);
    try {
      const ticket = await addTicket({
        clientId: clientObj?.id || '',
        category: 'INVERTER',
        title: `Assistência: ${warrantyPlant}`,
        description: `Serial: ${warrantySerial || 'Não informado'}. Defeito: ${warrantyDesc}`,
      });
      setWarrantyPlant('');
      setWarrantySerial('');
      setWarrantyDesc('');
      setActiveModal(null);
      triggerToast(`Garantia solicitada! Ticket: #${ticket.id.slice(0, 6).toUpperCase()}`, 'success');
    } catch (err) {
      triggerToast('Erro de conexão ao enviar chamado.', 'error');
    } finally {
      setSubmittingWarranty(false);
    }
  };

  const handleFeedbackSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedbackText) {
      triggerToast('Escreva seu comentário!', 'error');
      return;
    }
    setSubmittingFeedback(true);
    setTimeout(() => {
      setSubmittingFeedback(false);
      setFeedbackText('');
      setActiveModal(null);
      triggerToast('Obrigado pelo seu comentário!', 'success');
    }, 1000);
  };

  const handlePasswordReset = (e: React.FormEvent) => {
    e.preventDefault();
    if (!oldPassword || !newPassword) {
      triggerToast('Preencha as senhas!', 'error');
      return;
    }
    triggerToast('Senha atualizada com sucesso!', 'success');
    setOldPassword('');
    setNewPassword('');
    setActiveModal(null);
  };

  const handleClearCache = () => {
    setClearingCache(true);
    setTimeout(() => {
      setCacheSize('0 KB');
      setClearingCache(false);
      triggerToast('Cache do aplicativo limpo!', 'success');
    }, 1200);
  };

  const startScanning = () => {
    setScanning(true);
    setScanResult(null);
    setTimeout(() => {
      setScanning(false);
      setScanResult('Inversor SOLIS SL-884-2026');
    }, 3000);
  };

  const handleRegisterScanned = () => {
    setNewPlantName('Nova Usina Solis');
    setNewPlantCapacity('6.0');
    setNewPlantPanels('16');
    setNewPlantManufacturer('Solis');
    setNewPlantModel('S5-GR1P6K');
    setNewPlantDatalogger('SLS8842026');
    setScanResult(null);
    setActiveModal('add_plant');
  };

  // Generate SVG weather icon
  const renderWeatherIcon = () => {
    return (
      <div className="relative w-8 h-8 flex items-center justify-center text-amber-500">
        <WbSunnyIcon className="absolute text-2xl animate-spin" style={{ animationDuration: '20s' }} />
        <CloudIcon className="absolute text-slate-300/80 text-xl translate-x-1.5 translate-y-1.5" />
      </div>
    );
  };

  return (
    <Box className="min-h-screen bg-slate-950 flex items-center justify-center p-0 md:p-6 text-slate-100 font-sans">
      
      {/* Global SVG gradients definition */}
      <svg style={{ position: 'absolute', width: 0, height: 0 }} aria-hidden="true">
        <defs>
          <linearGradient id="radialGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#4f46e5" />
            <stop offset="50%" stopColor="#8b5cf6" />
            <stop offset="100%" stopColor="#ec4899" />
          </linearGradient>
          <linearGradient id="weatherArcGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#8b5cf6" />
            <stop offset="50%" stopColor="#f59e0b" />
            <stop offset="100%" stopColor="#ef4444" />
          </linearGradient>
        </defs>
      </svg>

      {/* Embedded CSS Animations */}
      <style>{`
        @keyframes scanEffect {
          0% { top: 0%; }
          50% { top: 100%; }
          100% { top: 0%; }
        }
        @keyframes pulseGlow {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 0.8; }
        }
        .scanner-line {
          animation: scanEffect 3s infinite linear;
        }
        .pulse-glow {
          animation: pulseGlow 2s infinite ease-in-out;
        }
      `}</style>

      {/* Phone Viewport Simulator Container */}
      <Paper className={`w-full max-w-md min-h-screen md:min-h-[860px] md:max-h-[890px] ${
        simulatorTheme === 'light' 
          ? 'bg-gradient-to-tr from-violet-100/40 via-white to-pink-100/30 text-slate-800' 
          : 'bg-slate-950 text-slate-100'
      } border-0 md:border-[8px] md:border-slate-900 shadow-2xl overflow-hidden flex flex-col justify-between md:rounded-[40px] relative transition-all duration-300`}>
        
        {/* Mobile top Notch / Dynamic Island */}
        <div className="absolute top-2 left-1/2 -translate-x-1/2 w-32 h-6 bg-slate-950 rounded-full z-50 flex items-center justify-between px-3 hidden md:flex">
          <div className="w-2.5 h-2.5 bg-slate-900 rounded-full border border-slate-850"></div>
          <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div>
        </div>

        {/* Dynamic Mobile Status Bar */}
        <div className={`px-5 pt-3 pb-2 flex justify-between items-center text-xs font-semibold select-none ${
          simulatorTheme === 'light' ? 'bg-white/40 backdrop-blur-md' : 'bg-slate-950/40 backdrop-blur-md'
        } z-30`}>
          <div>{currentTime}</div>
          <div className="flex items-center gap-1.5">
            <SignalCellularIcon style={{ fontSize: 13 }} />
            <WifiIcon style={{ fontSize: 13 }} />
            <div className="flex items-center gap-0.5">
              <span>{batteryLevel}%</span>
              <BatteryIcon style={{ fontSize: 15 }} className="text-emerald-500" />
            </div>
          </div>
        </div>

        {/* Simulator App Header */}
        <div className={`px-4 py-3 flex justify-between items-center border-b ${
          simulatorTheme === 'light' ? 'bg-white/90 border-slate-100/80' : 'bg-slate-900/90 border-slate-800/80'
        } sticky top-0 z-20 backdrop-blur-md transition-colors`}>
          <div className="flex items-center gap-2">
            <img src={logoSetec} alt="SETEC" className="h-7 w-auto mix-blend-screen" />
            <span className="font-extrabold text-orange-500 tracking-wider text-sm">SETEC CLIENTE</span>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Theme Toggle inside Phone Simulator */}
            <IconButton 
              onClick={() => setSimulatorTheme(prev => prev === 'light' ? 'dark' : 'light')} 
              size="small" 
              className={`p-1 ${simulatorTheme === 'light' ? 'bg-slate-100 hover:bg-slate-200 text-slate-800' : 'bg-slate-800 hover:bg-slate-700 text-slate-200'}`}
            >
              {simulatorTheme === 'light' ? <DarkModeIcon fontSize="small" /> : <LightModeIcon fontSize="small" />}
            </IconButton>

            {/* Logout shortcut */}
            <IconButton 
              onClick={() => navigate('/login')} 
              size="small" 
              className="p-1 bg-rose-500/10 text-rose-500 border border-rose-500/20 hover:bg-rose-500/20"
            >
              <ExitToAppIcon fontSize="small" />
            </IconButton>
          </div>
        </div>

        {/* Dynamic Simulator Screen Content */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 pb-20 relative">
          
          {/* TAB 1: PLANTAS */}
          {activeTab === 'plantas' && (
            <div className="space-y-4">
              
              {/* Weather and Solar Arc Header */}
              <div className={`p-4 rounded-3xl border flex flex-col relative overflow-hidden transition-all ${
                simulatorTheme === 'light' 
                  ? 'bg-white/80 border-slate-100 shadow-sm shadow-slate-100/50' 
                  : 'bg-slate-900/60 border-slate-800/80 shadow-md'
              }`}>
                {/* Weather main line */}
                <div className="flex justify-between items-start mb-2 relative z-10">
                  <div className="flex items-center gap-2">
                    {renderWeatherIcon()}
                    <div>
                      <div className="flex items-center gap-1">
                        <span className={`text-2xl font-black ${simulatorTheme === 'light' ? 'text-slate-800' : 'text-slate-100'}`}>
                          {clientObj?.city ? getWeatherForLocation(clientObj.city).temp : '30°C'}
                        </span>
                        <ArrowForwardIosIcon style={{ fontSize: 10 }} className="text-slate-400" />
                      </div>
                      <div className="flex items-center gap-0.5 text-slate-400 text-xs">
                        <span className="text-[10px]">📍</span>
                        <span className="font-medium text-[11px] truncate max-w-[120px]">
                          {clientObj?.city ? `${clientObj.city}, ${clientObj.state}` : 'Fortaleza, Brazil'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Sunset/Sunrise labels */}
                  <div className="text-right text-[10px] text-slate-400 flex flex-col gap-0.5">
                    <div className="flex items-center gap-1 justify-end">
                      <span className="text-amber-500">🌅</span>
                      <span>Nascer: 05:37</span>
                    </div>
                    <div className="flex items-center gap-1 justify-end">
                      <span className="text-red-400">🌇</span>
                      <span>Ocaso: 17:31</span>
                    </div>
                  </div>
                </div>

                {/* Sun Path Semicircular Arc */}
                <div className="relative w-full h-[95px] flex items-end justify-center overflow-hidden">
                  <svg className="w-[180px] h-[90px]" viewBox="0 0 180 90">
                    {/* Elliptical dashed path representing sun path */}
                    <path 
                      d="M 20,80 A 70,70 0 0,1 160,80" 
                      fill="none" 
                      stroke="url(#weatherArcGradient)" 
                      strokeWidth="2.5" 
                      strokeDasharray="4 3" 
                      opacity="0.8" 
                    />
                    
                    {/* Horizon line */}
                    <line x1="10" y1="80" x2="170" y2="80" stroke={simulatorTheme === 'light' ? '#e2e8f0' : '#334155'} strokeWidth="1" />

                    {/* Sun Position */}
                    {sunPos.visible ? (
                      <g>
                        <circle cx={sunPos.x} cy={sunPos.y} r="7" fill="#fbbf24" className="animate-pulse" />
                        <circle cx={sunPos.x} cy={sunPos.y} r="11" fill="#fbbf24" opacity="0.3" className="animate-ping" style={{ animationDuration: '3s' }} />
                      </g>
                    ) : (
                      // Show Moon if night
                      <circle cx="90" cy="40" r="6" fill="#94a3b8" />
                    )}
                  </svg>
                  
                  {/* Arc values and center label */}
                  <div className="absolute bottom-1 w-full text-center">
                    <span className="text-[9px] uppercase font-bold tracking-wider text-slate-400">
                      Trajetória Solar
                    </span>
                  </div>
                </div>
              </div>

              {/* Interactive Search Bar & Filter */}
              <div className="flex gap-2">
                <div className={`flex-1 flex items-center px-3 py-2 rounded-2xl border transition-all ${
                  simulatorTheme === 'light' 
                    ? 'bg-white/80 border-slate-100 text-slate-800' 
                    : 'bg-slate-900/60 border-slate-800/80 text-slate-200'
                }`}>
                  <SearchIcon className="text-slate-400 mr-2" style={{ fontSize: 18 }} />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Pesquisar usina ou cidade..."
                    className="bg-transparent border-none outline-none text-xs w-full text-inherit placeholder-slate-400"
                  />
                  {searchQuery && (
                    <CloseIcon 
                      className="text-slate-400 cursor-pointer ml-1" 
                      style={{ fontSize: 16 }} 
                      onClick={() => setSearchQuery('')}
                    />
                  )}
                </div>

                {/* Filter Trigger Button */}
                <IconButton
                  onClick={() => {
                    const filters: ('ALL' | 'ONLINE' | 'ALERT' | 'OFFLINE')[] = ['ALL', 'ONLINE', 'ALERT', 'OFFLINE'];
                    const currentIdx = filters.indexOf(activeFilter);
                    const nextFilter = filters[(currentIdx + 1) % filters.length];
                    setActiveFilter(nextFilter);
                    triggerToast(`Filtro: ${nextFilter === 'ALL' ? 'Mostrar tudo' : `Status ${nextFilter}`}`, 'info');
                  }}
                  className={`p-2.5 rounded-2xl border ${
                    simulatorTheme === 'light'
                      ? 'bg-white/80 border-slate-100 text-slate-700'
                      : 'bg-slate-900/60 border-slate-800/80 text-slate-200'
                  }`}
                >
                  <FilterListIcon style={{ fontSize: 18 }} />
                </IconButton>
              </div>

              {/* Plants List */}
              <div className="space-y-3">
                {filteredUsinas.length > 0 ? (
                  filteredUsinas.map((usina) => {
                    // Check status representation
                    const isOnline = usina.status === 'ONLINE';
                    const isAlert = usina.status === 'ALERT';

                    return (
                      <div
                        key={usina.id}
                        className={`p-3 rounded-3xl border flex items-center justify-between transition-all hover:scale-[1.01] ${
                          simulatorTheme === 'light'
                            ? 'bg-white/95 border-slate-100/80 shadow-sm'
                            : 'bg-slate-900/70 border-slate-850/80 shadow-md'
                        }`}
                      >
                        {/* Left section: Status Indicator and Solar panel thumbnail */}
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          {/* Checkmark indicator */}
                          <div>
                            {isOnline ? (
                              <CheckCircleIcon className="text-emerald-500 text-base" />
                            ) : isAlert ? (
                              <WarningIcon className="text-amber-500 text-base animate-pulse" />
                            ) : (
                              <ErrorIcon className="text-rose-500 text-base" />
                            )}
                          </div>

                          {/* SVG Solar Panel Thumbnail */}
                          <div className="w-14 h-14 rounded-2xl overflow-hidden flex-shrink-0 bg-gradient-to-tr from-blue-600 via-sky-500 to-indigo-700 flex items-center justify-center p-1 relative shadow-inner">
                            {/* Simple solar panel draw */}
                            <svg className="w-full h-full opacity-80" viewBox="0 0 40 40">
                              <rect x="5" y="5" width="30" height="30" rx="3" fill="none" stroke="#ffffff" strokeWidth="1.5" />
                              <line x1="5" y1="15" x2="35" y2="15" stroke="#ffffff" strokeWidth="1" />
                              <line x1="5" y1="25" x2="35" y2="25" stroke="#ffffff" strokeWidth="1" />
                              <line x1="15" y1="5" x2="15" y2="35" stroke="#ffffff" strokeWidth="1" />
                              <line x1="25" y1="5" x2="25" y2="35" stroke="#ffffff" strokeWidth="1" />
                            </svg>
                            <div className="absolute bottom-1 right-1 w-2 h-2 rounded-full bg-emerald-400"></div>
                          </div>

                          {/* Middle section: Plant Name and Generation values */}
                          <div className="flex-1 min-w-0 px-1">
                            <span className={`block font-black text-xs truncate ${simulatorTheme === 'light' ? 'text-slate-800' : 'text-slate-100'}`}>
                              {usina.name}
                            </span>
                            
                            <div className="text-[10px] text-slate-400 space-y-0.5 mt-0.5 font-medium">
                              <span className="block">E-hoje {usina.eHoje} kWh</span>
                              <span className="block">E-total {usina.eTotal}</span>
                              <span className="block truncate">Capacidade fotovoltaica {usina.capacityKwp} kWp</span>
                            </div>
                          </div>
                        </div>

                        {/* Right section: Current Power output and percentage circle */}
                        <div className="flex flex-col items-end justify-between self-stretch pl-2 flex-shrink-0">
                          {/* Current Output Power */}
                          <span className={`text-xs font-black text-right ${simulatorTheme === 'light' ? 'text-slate-700' : 'text-slate-200'}`}>
                            {usina.powerVal} {usina.powerUnit}
                          </span>

                          {/* SVG Circular Percentage Gauge */}
                          <div className="mt-1">
                            <svg className="w-11 h-11" viewBox="0 0 44 44">
                              {/* Background track circle */}
                              <circle 
                                cx="22" 
                                cy="22" 
                                r="18" 
                                fill="none" 
                                stroke={simulatorTheme === 'light' ? '#f1f5f9' : '#1e293b'} 
                                strokeWidth="3.5" 
                              />
                              
                              {/* Foreground progress circle */}
                              <circle 
                                cx="22" 
                                cy="22" 
                                r="18" 
                                fill="none" 
                                stroke="url(#radialGradient)" 
                                strokeWidth="3.5" 
                                strokeDasharray={113.1} 
                                strokeDashoffset={113.1 - (Math.max(0, Math.min(100, usina.pct)) / 100) * 113.1} 
                                strokeLinecap="round" 
                                transform="rotate(-90 22 22)" 
                                className="transition-all duration-700 ease-out"
                              />
                              
                              <text 
                                x="22" 
                                y="25" 
                                textAnchor="middle" 
                                fontSize="9" 
                                fontWeight="bold" 
                                fill={simulatorTheme === 'light' ? '#334155' : '#e2e8f0'}
                              >
                                {usina.pct}%
                              </text>
                            </svg>
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-12">
                    <Typography className="text-slate-400 text-xs font-semibold">Nenhuma usina encontrada com os filtros selecionados.</Typography>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: FALHA (FAULTS) */}
          {activeTab === 'falha' && (
            <div className="space-y-4">
              
              {/* Fault Toggle Subtabs */}
              <div className={`flex p-1 rounded-2xl border ${
                simulatorTheme === 'light' ? 'bg-slate-100/80 border-slate-200' : 'bg-slate-900 border-slate-800'
              }`}>
                <button
                  onClick={() => setFaultSubTab('current')}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
                    faultSubTab === 'current' 
                      ? 'bg-blue-600 text-white shadow-sm' 
                      : `${simulatorTheme === 'light' ? 'text-slate-600 hover:text-slate-800' : 'text-slate-400 hover:text-slate-200'}`
                  }`}
                >
                  Corrente
                </button>
                <button
                  onClick={() => setFaultSubTab('history')}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
                    faultSubTab === 'history' 
                      ? 'bg-blue-600 text-white shadow-sm' 
                      : `${simulatorTheme === 'light' ? 'text-slate-600 hover:text-slate-800' : 'text-slate-400 hover:text-slate-200'}`
                  }`}
                >
                  Histórico
                </button>
              </div>

              {/* Subtab Contents */}
              {faultSubTab === 'current' ? (
                // Current alarms
                allUsinas.filter(u => u.status === 'ALERT' || u.status === 'CRITICAL' || u.status === 'OFFLINE').length > 0 ? (
                  <div className="space-y-3">
                    {allUsinas.filter(u => u.status === 'ALERT' || u.status === 'CRITICAL' || u.status === 'OFFLINE').map(u => (
                      <div 
                        key={u.id} 
                        className={`p-4 rounded-3xl border border-rose-500/30 flex items-start gap-3 bg-rose-500/5`}
                      >
                        <ErrorIcon className="text-rose-500 text-xl flex-shrink-0 mt-0.5 animate-bounce" />
                        <div>
                          <span className="block font-black text-xs text-rose-500">{u.name}</span>
                          <span className="block text-[11px] font-bold mt-1 text-slate-200">Alarme: Falha de comunicação</span>
                          <span className="block text-[10px] text-slate-400 mt-0.5">Datalogger serial {u.datalogger || 'N/A'} desconectou do servidor em nuvem.</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  // Default Empty State matching screenshot
                  <div className="flex flex-col items-center justify-center py-20 space-y-4">
                    {/* SVG Graphic with gradient outline */}
                    <div className="w-24 h-24 flex items-center justify-center relative">
                      <svg className="w-full h-full" viewBox="0 0 100 100">
                        <defs>
                          <linearGradient id="panelGradient" x1="0" y1="0" x2="1" y2="1">
                            <stop offset="0%" stopColor="#8b5cf6" />
                            <stop offset="100%" stopColor="#ec4899" />
                          </linearGradient>
                        </defs>
                        {/* Sun */}
                        <circle cx="65" cy="35" r="10" fill="none" stroke="url(#panelGradient)" strokeWidth="2" strokeDasharray="3 2" />
                        {/* Solar Panel */}
                        <rect x="25" y="45" width="45" height="30" rx="3" fill="none" stroke="url(#panelGradient)" strokeWidth="2.5" />
                        <line x1="25" y1="55" x2="70" y2="55" stroke="url(#panelGradient)" strokeWidth="1.5" />
                        <line x1="25" y1="65" x2="70" y2="65" stroke="url(#panelGradient)" strokeWidth="1.5" />
                        <line x1="40" y1="45" x2="40" y2="75" stroke="url(#panelGradient)" strokeWidth="1.5" />
                        <line x1="55" y1="45" x2="55" y2="75" stroke="url(#panelGradient)" strokeWidth="1.5" />
                      </svg>
                      <div className="absolute bottom-4 right-4 bg-emerald-500 rounded-full w-5 h-5 flex items-center justify-center border-2 border-slate-950">
                        <CheckIcon style={{ fontSize: 12 }} className="text-white font-bold" />
                      </div>
                    </div>

                    <div className="text-center space-y-1">
                      <span className={`block font-black text-sm ${simulatorTheme === 'light' ? 'text-slate-800' : 'text-slate-100'}`}>
                        Sem erros de planta
                      </span>
                      <span className="block text-[11px] text-slate-400 font-medium">
                        Parece estar tudo bem!
                      </span>
                    </div>
                  </div>
                )
              ) : (
                // Histórico de alarmes — mostra apenas se o cliente tiver usinas reais com ocorrências
                temUsinasReais && allUsinas.some(u => u.status === 'ALERT' || u.status === 'OFFLINE') ? (
                  <div className="space-y-3">
                    {allUsinas
                      .filter(u => u.status === 'ALERT' || u.status === 'OFFLINE')
                      .map(u => (
                        <div key={u.id} className={`p-3 rounded-2xl border ${simulatorTheme === 'light' ? 'bg-white border-slate-100' : 'bg-slate-900/40 border-slate-800/80'} flex items-start gap-2.5`}>
                          <CheckCircleIcon className="text-emerald-500 text-sm mt-0.5 flex-shrink-0" />
                          <div className="text-[11px]">
                            <span className="block font-bold">{u.name}</span>
                            <span className="block text-[10px] text-slate-400 mt-0.5">Verificar status do datalogger: {u.datalogger || 'SN não informado'}</span>
                          </div>
                        </div>
                      ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-16 space-y-2">
                    <CheckCircleIcon className="text-emerald-500" style={{ fontSize: 36 }} />
                    <span className={`text-xs font-bold ${simulatorTheme === 'light' ? 'text-slate-700' : 'text-slate-200'}`}>
                      Nenhum alarme no histórico
                    </span>
                    <span className="text-[10px] text-slate-400">Tudo funcionando normalmente por aqui.</span>
                  </div>
                )
              )}
            </div>
          )}

          {/* TAB 3: SERVIÇO (SERVICE) */}
          {activeTab === 'servico' && (
            <div className="space-y-4">
              {/* Service Hero Banner */}
              <div className="relative rounded-3xl overflow-hidden h-36 bg-gradient-to-r from-blue-700 to-indigo-900 flex items-center shadow-lg">
                {heroImage ? (
                  <img src={heroImage} alt="Instalador" className="absolute inset-0 w-full h-full object-cover opacity-30 mix-blend-overlay" />
                ) : (
                  <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-amber-500/20 via-transparent to-transparent"></div>
                )}
                <div className="relative z-10 px-5 text-left">
                  <span className="block text-[10px] tracking-wider uppercase font-black text-orange-400">
                    Instaladores SETEC
                  </span>
                  <span className="block text-sm font-black text-white mt-1 leading-snug">
                    Assistência Homologada e<br />Suporte Técnico Solar
                  </span>
                  <span className="inline-block text-[9px] font-bold bg-white/10 text-white rounded-full px-2 py-0.5 mt-2">
                    Controle de Garantia e Manutenção
                  </span>
                </div>
              </div>

              {/* Services 2x3 Grid */}
              <div className="grid grid-cols-2 gap-3">
                {[
                  { id: 'product_details', name: 'Detalles do Produto', icon: <BuildIcon className="text-indigo-500" /> },
                  { id: 'quick_install', name: 'Instalação rápida', icon: <CameraAltIcon className="text-sky-500" /> },
                  { id: 'warranty', name: 'Pedido de garantia', icon: <AssignmentIcon className="text-amber-500" /> },
                  { id: 'unit_groups', name: 'Grupos de unidades', icon: <GroupWorkIcon className="text-pink-500" /> },
                  { id: 'user_manual', name: 'Manual do Utilizador', icon: <MenuBookIcon className="text-purple-500" /> },
                  { id: 'contact_us', name: 'Contate-nos', icon: <ContactPhoneIcon className="text-emerald-500" /> }
                ].map((serv) => (
                  <div
                    key={serv.id}
                    onClick={() => setActiveModal(serv.id as any)}
                    className={`p-4 rounded-3xl border flex flex-col items-center text-center justify-center min-h-[105px] cursor-pointer transition-all hover:scale-[1.02] ${
                      simulatorTheme === 'light'
                        ? 'bg-white border-slate-100 shadow-sm shadow-slate-100/50 hover:bg-slate-50'
                        : 'bg-slate-900/60 border-slate-800/80 hover:bg-slate-900/80'
                    }`}
                  >
                    <div className="w-9 h-9 rounded-2xl flex items-center justify-center bg-slate-100/10 mb-2 shadow-inner">
                      {serv.icon}
                    </div>
                    <span className={`text-[11px] font-bold leading-tight ${simulatorTheme === 'light' ? 'text-slate-800 font-extrabold' : 'text-slate-200'}`}>
                      {serv.name}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: EU (PROFILE) */}
          {activeTab === 'eu' && (
            <div className="space-y-4">
              
              {/* Profile Card Header */}
              <div className="rounded-3xl overflow-hidden shadow-md border border-slate-800/20 bg-gradient-to-b from-indigo-800 via-indigo-900 to-slate-900">
                <div className="h-16 bg-gradient-to-r from-blue-700 to-purple-800 relative">
                  {/* Small edit badge */}
                  <IconButton className="absolute top-2 right-2 p-1 bg-white/10 text-white hover:bg-white/20">
                    <BuildIcon style={{ fontSize: 13 }} />
                  </IconButton>
                </div>
                
                <div className="px-5 pb-5 pt-0 flex flex-col items-center text-center -mt-10 relative z-10">
                  {/* Photo Container */}
                  <div className="w-20 h-20 rounded-full border-4 border-slate-900 bg-slate-800 overflow-hidden flex items-center justify-center shadow-lg">
                    <PersonIcon className="text-slate-400 text-5xl" />
                  </div>

                  <span className="block font-black text-sm text-white mt-2">
                    {clientObj?.name || 'Elionaldo'}
                  </span>
                  
                  <span className="block text-[9px] font-mono tracking-wider text-slate-400 mt-0.5">
                    ID: SE-{clientObj?.id ? clientObj.id.slice(0, 6).toUpperCase() : 'CPVYA'}
                  </span>
                </div>
              </div>

              {/* Profile Menu options */}
              <div className={`rounded-3xl border overflow-hidden ${
                simulatorTheme === 'light' ? 'bg-white border-slate-100' : 'bg-slate-900/60 border-slate-800/80'
              }`}>
                {[
                  { id: 'org_mgmt', name: 'Gestão organizacional', icon: <BusinessIcon className="text-slate-400 text-sm" /> },
                  { id: 'account_sec', name: 'Conta e segurança', icon: <SecurityIcon className="text-slate-400 text-sm" /> },
                  { id: 'notifications', name: 'Notificações', icon: <NotificationsIcon className="text-slate-400 text-sm" /> },
                  { id: 'app_feedback', name: 'Comentários do aplicativo', icon: <FeedbackIcon className="text-slate-400 text-sm" /> },
                  { id: 'data_mig', name: 'Migração de dados', icon: <StorageIcon className="text-slate-400 text-sm" /> },
                  { id: 'about_us', name: 'Sobre nós', icon: <InfoIcon className="text-slate-400 text-sm" /> },
                  { id: 'languages', name: 'Idiomas', icon: <LanguageIcon className="text-slate-400 text-sm" /> },
                  { id: 'privacy', name: 'Política de Privacidade', icon: <AssignmentIcon className="text-slate-400 text-sm" /> },
                  { id: 'download_app', name: 'Baixar aplicativo', icon: <DownloadIcon className="text-slate-400 text-sm" /> }
                ].map((opt) => (
                  <div
                    key={opt.id}
                    onClick={() => {
                      if (opt.id === 'download_app') {
                        triggerToast('Download do APK iniciado!', 'success');
                      } else {
                        setActiveModal(opt.id as any);
                      }
                    }}
                    className={`px-4 py-3 flex items-center justify-between border-b cursor-pointer transition-colors ${
                      simulatorTheme === 'light'
                        ? 'border-slate-100/50 hover:bg-slate-50'
                        : 'border-slate-800/50 hover:bg-slate-900/50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {opt.icon}
                      <span className="text-[11px] font-bold">{opt.name}</span>
                    </div>
                    <ArrowForwardIosIcon style={{ fontSize: 9 }} className="text-slate-500" />
                  </div>
                ))}

                {/* Clear Cache options */}
                <div
                  onClick={handleClearCache}
                  className={`px-4 py-3 flex items-center justify-between border-b cursor-pointer transition-colors ${
                    simulatorTheme === 'light'
                      ? 'border-slate-100/50 hover:bg-slate-50'
                      : 'border-slate-800/50 hover:bg-slate-900/50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <DeleteSweepIcon className="text-slate-400 text-sm" />
                    <span className="text-[11px] font-bold">Limpar cachê</span>
                    <span className="text-[9px] text-slate-500 font-mono">Imagens, dados, etc.</span>
                  </div>
                  
                  <div className="flex items-center gap-1">
                    {clearingCache ? (
                      <span className="text-[10px] text-orange-500 animate-pulse font-bold">Limpando...</span>
                    ) : (
                      <span className="text-[10px] text-slate-400 font-mono font-bold bg-slate-200/10 px-1.5 py-0.5 rounded-md">
                        {cacheSize}
                      </span>
                    )}
                    <ArrowForwardIosIcon style={{ fontSize: 9 }} className="text-slate-500" />
                  </div>
                </div>

                {/* Logout Button */}
                <div
                  onClick={() => {
                    localStorage.removeItem('user_role');
                    localStorage.removeItem('user_email');
                    navigate('/login');
                  }}
                  className={`px-4 py-3 flex items-center justify-between cursor-pointer transition-colors text-rose-500 hover:bg-rose-500/5`}
                >
                  <div className="flex items-center gap-3">
                    <ExitToAppIcon className="text-sm" />
                    <span className="text-[11px] font-bold">Sair do Aplicativo</span>
                  </div>
                  <ArrowForwardIosIcon style={{ fontSize: 9 }} className="text-slate-500" />
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Floating Add Center Button and Bottom Tab Navigator */}
        <div className={`absolute bottom-0 left-0 w-full z-45 border-t ${
          simulatorTheme === 'light' ? 'bg-white/95 border-slate-100/90' : 'bg-slate-950/95 border-slate-900/90'
        } backdrop-blur-md`}>
          
          {/* Middle Floating Gradient Plus Button */}
          {!isCliente && (
            <div className="absolute top-[-26px] left-1/2 -translate-x-1/2 z-50">
              <button
                onClick={() => setPlusMenuOpen(prev => !prev)}
                className="w-[52px] h-[52px] rounded-full bg-gradient-to-tr from-indigo-700 via-purple-600 to-pink-500 text-white shadow-lg hover:shadow-indigo-500/25 flex items-center justify-center transform active:scale-95 hover:scale-105 transition-all outline-none"
              >
                <AddIcon 
                  style={{ fontSize: 26 }} 
                  className={`transition-all duration-300 ${plusMenuOpen ? 'rotate-45' : ''}`} 
                />
              </button>
            </div>
          )}

          {/* Tab buttons */}
          <div className="flex justify-around items-center h-14 relative px-2">
            
            {/* Tab: Plantas */}
            <button
              onClick={() => {
                setActiveTab('plantas');
                setPlusMenuOpen(false);
              }}
              className="flex-1 flex flex-col items-center justify-center text-center focus:outline-none"
            >
              <SolarPowerIcon 
                className={`text-[20px] transition-transform ${activeTab === 'plantas' ? 'text-purple-600 scale-110 font-bold' : 'text-slate-400'}`} 
              />
              <span className={`text-[9px] font-bold mt-0.5 ${activeTab === 'plantas' ? 'text-purple-600 font-black' : 'text-slate-400'}`}>
                Plantas
              </span>
              {activeTab === 'plantas' && <div className="w-1.5 h-1.5 rounded-full bg-purple-600 mt-0.5"></div>}
            </button>

            {/* Tab: Falha */}
            <button
              onClick={() => {
                setActiveTab('falha');
                setPlusMenuOpen(false);
              }}
              className="flex-1 flex flex-col items-center justify-center text-center focus:outline-none pr-6"
            >
              <WarningIcon 
                className={`text-[20px] transition-transform ${activeTab === 'falha' ? 'text-purple-600 scale-110' : 'text-slate-400'}`} 
              />
              <span className={`text-[9px] font-bold mt-0.5 ${activeTab === 'falha' ? 'text-purple-600 font-black' : 'text-slate-400'}`}>
                Falha
              </span>
              {activeTab === 'falha' && <div className="w-1.5 h-1.5 rounded-full bg-purple-600 mt-0.5"></div>}
            </button>

            {/* Empty center spacing for the floating button */}
            {!isCliente && <div className="w-12"></div>}

            {/* Tab: Serviço */}
            <button
              onClick={() => {
                setActiveTab('servico');
                setPlusMenuOpen(false);
              }}
              className="flex-1 flex flex-col items-center justify-center text-center focus:outline-none pl-6"
            >
              <SupportAgentIcon 
                className={`text-[20px] transition-transform ${activeTab === 'servico' ? 'text-purple-600 scale-110' : 'text-slate-400'}`} 
              />
              <span className={`text-[9px] font-bold mt-0.5 ${activeTab === 'servico' ? 'text-purple-600 font-black' : 'text-slate-400'}`}>
                Serviço
              </span>
              {activeTab === 'servico' && <div className="w-1.5 h-1.5 rounded-full bg-purple-600 mt-0.5"></div>}
            </button>

            {/* Tab: Eu */}
            <button
              onClick={() => {
                setActiveTab('eu');
                setPlusMenuOpen(false);
              }}
              className="flex-1 flex flex-col items-center justify-center text-center focus:outline-none"
            >
              <AccountCircleIcon 
                className={`text-[20px] transition-transform ${activeTab === 'eu' ? 'text-purple-600 scale-110' : 'text-slate-400'}`} 
              />
              <span className={`text-[9px] font-bold mt-0.5 ${activeTab === 'eu' ? 'text-purple-600 font-black' : 'text-slate-400'}`}>
                Eu
              </span>
              {activeTab === 'eu' && <div className="w-1.5 h-1.5 rounded-full bg-purple-600 mt-0.5"></div>}
            </button>
          </div>

          {/* OS Navigation home indicator bar */}
          <div className="w-28 h-1 bg-slate-500 rounded-full mx-auto mb-1 mt-0.5"></div>
        </div>

        {/* PLUS BUTTON BOTTOM SHEET DRAWER OVERLAY */}
        {plusMenuOpen && (
          <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm z-40 transition-opacity">
            <div className={`absolute bottom-16 left-0 w-full rounded-t-[32px] p-5 shadow-2xl transition-transform transform translate-y-0 ${
              simulatorTheme === 'light' ? 'bg-white text-slate-800' : 'bg-slate-900 text-slate-100'
            }`}>
              <div className="flex justify-between items-center mb-4">
                <span className="text-xs font-black uppercase tracking-wider text-slate-400">Ativação de Equipamentos</span>
                <IconButton 
                  onClick={() => setPlusMenuOpen(false)} 
                  size="small" 
                  className={simulatorTheme === 'light' ? 'text-slate-800' : 'text-white'}
                >
                  <CloseIcon fontSize="small" />
                </IconButton>
              </div>

              <div className="space-y-3">
                <button
                  onClick={() => {
                    setPlusMenuOpen(false);
                    setActiveModal('add_plant');
                  }}
                  className="w-full py-3 px-4 rounded-2xl flex items-center gap-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold text-xs shadow-md transition-all hover:scale-[1.01]"
                >
                  <AddCircleIcon style={{ fontSize: 18 }} />
                  Adicionar Nova Planta Solar
                </button>
                <button
                  onClick={() => {
                    setPlusMenuOpen(false);
                    setActiveModal('scan_qr');
                    startScanning();
                  }}
                  className="w-full py-3 px-4 rounded-2xl flex items-center gap-3 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition-all hover:scale-[1.01]"
                >
                  <QrCodeScannerIcon style={{ fontSize: 18 }} className="text-orange-400" />
                  Escanear Datalogger (QR Code)
                </button>
              </div>
            </div>
          </div>
        )}

        {/* BOTTOM SHEET / DIALOG MODALS CONTAINER */}
        {activeModal && (
          <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-end justify-center">
            
            {/* Main Modal Shell */}
            <div className={`w-full rounded-t-[32px] max-h-[80%] overflow-y-auto p-5 shadow-2xl transition-all ${
              simulatorTheme === 'light' ? 'bg-white text-slate-800' : 'bg-slate-900 text-slate-100'
            }`}>
              
              {/* Modal Header */}
              <div className="flex justify-between items-center mb-4 border-b border-slate-800/10 pb-2">
                <span className="text-xs font-black uppercase tracking-wider text-slate-400">
                  {activeModal === 'add_plant' && 'Nova Planta Solar'}
                  {activeModal === 'scan_qr' && 'Escanear QR Code'}
                  {activeModal === 'product_details' && 'Detalhes do Produto'}
                  {activeModal === 'quick_install' && 'Instalação Rápida'}
                  {activeModal === 'warranty' && 'Solicitar Garantia'}
                  {activeModal === 'unit_groups' && 'Grupos de Unidades'}
                  {activeModal === 'user_manual' && 'Manual do Utilizador'}
                  {activeModal === 'contact_us' && 'Fale Conosco'}
                  {activeModal === 'org_mgmt' && 'Gestão Organizacional'}
                  {activeModal === 'account_sec' && 'Conta e Segurança'}
                  {activeModal === 'notifications' && 'Configurações de Alertas'}
                  {activeModal === 'app_feedback' && 'Comentários do App'}
                  {activeModal === 'data_mig' && 'Exportação de Dados'}
                  {activeModal === 'about_us' && 'Sobre a SETEC'}
                  {activeModal === 'languages' && 'Configurar Idiomas'}
                  {activeModal === 'privacy' && 'Privacidade'}
                </span>
                
                <IconButton onClick={() => { setActiveModal(null); setScanResult(null); }} size="small" className="text-inherit">
                  <CloseIcon fontSize="small" />
                </IconButton>
              </div>

              {/* MODAL: ADD PLANT */}
              {activeModal === 'add_plant' && (
                <form onSubmit={handleAddPlantSubmit} className="space-y-3 text-left">
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Nome da Usina *</label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: Cesar Casa"
                      value={newPlantName}
                      onChange={(e) => setNewPlantName(e.target.value)}
                      className={`w-full p-2.5 rounded-xl border text-xs outline-none bg-transparent ${
                        simulatorTheme === 'light' ? 'border-slate-200 text-slate-800' : 'border-slate-800 text-slate-100'
                      }`}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Capacidade (kWp)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={newPlantCapacity}
                        onChange={(e) => setNewPlantCapacity(e.target.value)}
                        className={`w-full p-2.5 rounded-xl border text-xs outline-none bg-transparent ${
                          simulatorTheme === 'light' ? 'border-slate-200 text-slate-800' : 'border-slate-800 text-slate-100'
                        }`}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Qtd Painéis</label>
                      <input
                        type="number"
                        value={newPlantPanels}
                        onChange={(e) => setNewPlantPanels(e.target.value)}
                        className={`w-full p-2.5 rounded-xl border text-xs outline-none bg-transparent ${
                          simulatorTheme === 'light' ? 'border-slate-200 text-slate-800' : 'border-slate-800 text-slate-100'
                        }`}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Fabricante Inversor</label>
                      <input
                        type="text"
                        value={newPlantManufacturer}
                        onChange={(e) => setNewPlantManufacturer(e.target.value)}
                        className={`w-full p-2.5 rounded-xl border text-xs outline-none bg-transparent ${
                          simulatorTheme === 'light' ? 'border-slate-200 text-slate-800' : 'border-slate-800 text-slate-100'
                        }`}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Modelo Inversor</label>
                      <input
                        type="text"
                        value={newPlantModel}
                        onChange={(e) => setNewPlantModel(e.target.value)}
                        className={`w-full p-2.5 rounded-xl border text-xs outline-none bg-transparent ${
                          simulatorTheme === 'light' ? 'border-slate-200 text-slate-800' : 'border-slate-800 text-slate-100'
                        }`}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Cidade *</label>
                      <input
                        type="text"
                        required
                        placeholder="Ex: Fortaleza"
                        value={newPlantCity}
                        onChange={(e) => setNewPlantCity(e.target.value)}
                        className={`w-full p-2.5 rounded-xl border text-xs outline-none bg-transparent ${
                          simulatorTheme === 'light' ? 'border-slate-200 text-slate-800' : 'border-slate-800 text-slate-100'
                        }`}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Estado (UF) *</label>
                      <input
                        type="text"
                        required
                        placeholder="Ex: CE"
                        maxLength={2}
                        value={newPlantState}
                        onChange={(e) => setNewPlantState(e.target.value)}
                        className={`w-full p-2.5 rounded-xl border text-xs outline-none bg-transparent ${
                          simulatorTheme === 'light' ? 'border-slate-200 text-slate-800' : 'border-slate-800 text-slate-100'
                        }`}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Número Serial Datalogger</label>
                    <input
                      type="text"
                      placeholder="Ex: SLS8847192"
                      value={newPlantDatalogger}
                      onChange={(e) => setNewPlantDatalogger(e.target.value)}
                      className={`w-full p-2.5 rounded-xl border text-xs outline-none bg-transparent ${
                        simulatorTheme === 'light' ? 'border-slate-200 text-slate-800' : 'border-slate-800 text-slate-100'
                      }`}
                    />
                  </div>

                  <Button
                    type="submit"
                    variant="contained"
                    color="primary"
                    fullWidth
                    className="py-3 font-bold rounded-2xl bg-gradient-to-r from-blue-600 to-orange-500 mt-2 text-xs"
                  >
                    Gravar e Sincronizar Usina
                  </Button>
                </form>
              )}

              {/* MODAL: SCAN QR CODE */}
              {activeModal === 'scan_qr' && (
                <div className="text-center space-y-4 py-2">
                  <div className="relative w-full aspect-video rounded-2xl border-2 border-slate-700 bg-slate-950 overflow-hidden flex items-center justify-center shadow-inner">
                    {scanning ? (
                      <div className="absolute inset-0 flex flex-col items-center justify-center space-y-2">
                        <div className="w-8 h-8 rounded-full border-2 border-orange-500 border-t-transparent animate-spin"></div>
                        <span className="text-[10px] text-orange-400 font-bold uppercase tracking-wider">Acessando Câmera...</span>
                        {/* Red laser animation */}
                        <div className="absolute left-0 w-full h-0.5 bg-red-500 scanner-line"></div>
                      </div>
                    ) : scanResult ? (
                      <div className="flex flex-col items-center justify-center p-4 space-y-2">
                        <CheckCircleIcon className="text-emerald-500 text-3xl" />
                        <span className="text-xs font-bold">{scanResult}</span>
                        <span className="text-[10px] text-slate-400">QR Code lido com sucesso!</span>
                      </div>
                    ) : (
                      <div className="text-slate-500 text-xs">Aguardando câmera...</div>
                    )}
                  </div>

                  {scanResult ? (
                    <div className="flex gap-2">
                      <Button
                        variant="outlined"
                        onClick={() => { setScanResult(null); startScanning(); }}
                        fullWidth
                        size="small"
                        className="rounded-xl"
                      >
                        Ler Novamente
                      </Button>
                      <Button
                        variant="contained"
                        onClick={handleRegisterScanned}
                        fullWidth
                        size="small"
                        className="rounded-xl bg-orange-500 hover:bg-orange-600"
                      >
                        Cadastrar Usina
                      </Button>
                    </div>
                  ) : (
                    <Button
                      variant="outlined"
                      onClick={startScanning}
                      disabled={scanning}
                      fullWidth
                      className="rounded-xl text-xs"
                    >
                      {scanning ? 'Sincronizando Sensor...' : 'Simular Leitura'}
                    </Button>
                  )}
                </div>
              )}

              {/* MODAL: PRODUCT DETAILS */}
              {activeModal === 'product_details' && (
                <div className="text-left text-xs space-y-3 font-medium">
                  <div className="p-3 bg-slate-200/5 rounded-2xl border border-slate-800/10">
                    <span className="block font-black text-indigo-400">Datalogger SETEC WiFi V2</span>
                    <span className="block text-[10px] text-slate-400 mt-1">
                      Datalogger universal RS485 para inversores Solis, Growatt e Deye. Envio em tempo real a cada 1 minuto.
                    </span>
                  </div>
                  <div className="p-3 bg-slate-200/5 rounded-2xl border border-slate-800/10">
                    <span className="block font-black text-indigo-400">Inversor SETEC Smart Grid</span>
                    <span className="block text-[10px] text-slate-400 mt-1">
                      Inversores monofásicos e trifásicos com eficiência de até 98.6%. Proteção CC integrada tipo II (DPS).
                    </span>
                  </div>
                </div>
              )}

              {/* MODAL: QUICK INSTALLATION */}
              {activeModal === 'quick_install' && (
                <div className="text-left text-xs space-y-3 font-medium">
                  <div className="space-y-2">
                    <span className="font-black text-sky-400 block">Passos de Conexão Rápida:</span>
                    <div className="pl-2 border-l-2 border-slate-700 space-y-2 text-[11px] text-slate-300">
                      <div>
                        <span className="font-bold block text-white">1. Fixação Física:</span>
                        Instale o inversor solar em local ventilado e abrigado de sol direto e chuva.
                      </div>
                      <div>
                        <span className="font-bold block text-white">2. Conexão do Datalogger:</span>
                        Insira o Datalogger WiFi na porta RS485 (na parte inferior do inversor) e aperte a trava rosqueável.
                      </div>
                      <div>
                        <span className="font-bold block text-white">3. Cadastro da Rede:</span>
                        Acesse a rede WiFi gerada pelo datalogger (AP_xxxxxxxx) e insira a senha padrão do roteador do cliente.
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* MODAL: WARRANTY REQUEST */}
              {activeModal === 'warranty' && (
                <form onSubmit={handleWarrantySubmit} className="space-y-3 text-left">
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Selecione a Planta *</label>
                    <select
                      required
                      value={warrantyPlant}
                      onChange={(e) => setWarrantyPlant(e.target.value)}
                      className={`w-full p-2.5 rounded-xl border text-xs outline-none bg-transparent ${
                        simulatorTheme === 'light' ? 'border-slate-200 text-slate-800' : 'border-slate-800 text-slate-100'
                      }`}
                    >
                      <option value="">Selecione...</option>
                      {allUsinas.map(u => (
                        <option key={u.id} value={u.name}>{u.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Nº de Série Inversor/Datalogger</label>
                    <input
                      type="text"
                      placeholder="Ex: SLS88471"
                      value={warrantySerial}
                      onChange={(e) => setWarrantySerial(e.target.value)}
                      className={`w-full p-2.5 rounded-xl border text-xs outline-none bg-transparent ${
                        simulatorTheme === 'light' ? 'border-slate-200 text-slate-800' : 'border-slate-800 text-slate-100'
                      }`}
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Descrição do Defeito *</label>
                    <textarea
                      required
                      rows={3}
                      placeholder="Descreva o problema observado..."
                      value={warrantyDesc}
                      onChange={(e) => setWarrantyDesc(e.target.value)}
                      className={`w-full p-2.5 rounded-xl border text-xs outline-none bg-transparent ${
                        simulatorTheme === 'light' ? 'border-slate-200 text-slate-800' : 'border-slate-800 text-slate-100'
                      }`}
                    />
                  </div>

                  <Button
                    type="submit"
                    variant="contained"
                    disabled={submittingWarranty}
                    fullWidth
                    className="py-3 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs"
                  >
                    {submittingWarranty ? 'Registrando Ticket...' : 'Enviar Pedido de Assistência'}
                  </Button>
                </form>
              )}

              {/* MODAL: UNIT GROUPS */}
              {activeModal === 'unit_groups' && (
                <div className="text-left text-xs space-y-3 font-medium">
                  <span className="font-black block text-pink-400">Usinas por Região:</span>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center p-2 bg-slate-200/5 rounded-xl">
                      <span className="font-bold">Região Metropolitana (Fortaleza/Caucaia)</span>
                      <Chip size="small" label={`${allUsinas.length} usinas`} color="primary" />
                    </div>
                    <div className="flex justify-between items-center p-2 bg-slate-200/5 rounded-xl">
                      <span className="font-bold">Interior do Ceará</span>
                      <Chip size="small" label="0 usinas" variant="outlined" />
                    </div>
                  </div>
                </div>
              )}

              {/* MODAL: USER MANUAL */}
              {activeModal === 'user_manual' && (
                <div className="text-left text-xs space-y-2 font-medium">
                  <div className="p-2.5 bg-slate-200/5 rounded-xl border border-slate-800/10">
                    <span className="font-bold block">Capítulo 1: Entendendo o Gráfico de Geração</span>
                    <span className="block text-[10px] text-slate-400 mt-0.5">
                      Explicação do gráfico diário em forma de seno e cálculo da potência instantânea do inversor.
                    </span>
                  </div>
                  <div className="p-2.5 bg-slate-200/5 rounded-xl border border-slate-800/10">
                    <span className="font-bold block">Capítulo 2: Relatório de Economia Mensal</span>
                    <span className="block text-[10px] text-slate-400 mt-0.5">
                      Como exportar o demonstrativo de faturas e acompanhar a economia estimada em R$.
                    </span>
                  </div>
                </div>
              )}

              {/* MODAL: CONTACT US */}
              {activeModal === 'contact_us' && (
                <div className="space-y-3 text-center py-2">
                  <p className="text-xs text-slate-400 font-medium">Selecione um canal direto de atendimento da SETEC SOLAR:</p>
                  
                  <div className="space-y-2">
                    <Button
                      variant="contained"
                      color="success"
                      fullWidth
                      startIcon={<WhatsAppIcon />}
                      href="https://wa.me/5511999999999?text=Preciso+de+suporte+com+minha+planta+solar"
                      target="_blank"
                      className="rounded-2xl py-3 font-bold text-xs"
                    >
                      Suporte WhatsApp
                    </Button>
                    <div className="flex gap-2">
                      <Button
                        variant="outlined"
                        fullWidth
                        startIcon={<PhoneIcon />}
                        href="tel:08000000000"
                        className="rounded-xl text-[10px]"
                      >
                        0800-000-0000
                      </Button>
                      <Button
                        variant="outlined"
                        fullWidth
                        startIcon={<EmailIcon />}
                        href="mailto:suporte@setecsolar.com"
                        className="rounded-xl text-[10px]"
                      >
                        Enviar Email
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* MODAL: ORGANIZATIONAL MANAGEMENT */}
              {activeModal === 'org_mgmt' && (
                <div className="text-left text-xs space-y-3 font-medium">
                  <div className="flex justify-between border-b border-slate-800/10 py-1.5">
                    <span className="text-slate-400">Organização contratada</span>
                    <span className="font-bold">SETEC SOLAR BRASIL</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-800/10 py-1.5">
                    <span className="text-slate-400">Perfil de simulação</span>
                    <span className="font-bold text-orange-500">Cliente Proprietário</span>
                  </div>
                  <div className="flex justify-between py-1.5">
                    <span className="text-slate-400">Contrato master</span>
                    <span className="font-bold">#STC-2026-990</span>
                  </div>
                </div>
              )}

              {/* MODAL: ACCOUNT & SECURITY */}
              {activeModal === 'account_sec' && (
                <form onSubmit={handlePasswordReset} className="space-y-3 text-left">
                  <p className="text-[10px] text-slate-400 font-medium">Simule a troca de senha da sua conta de cliente:</p>
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Senha Atual</label>
                    <input
                      type="password"
                      required
                      value={oldPassword}
                      onChange={(e) => setOldPassword(e.target.value)}
                      className={`w-full p-2.5 rounded-xl border text-xs outline-none bg-transparent ${
                        simulatorTheme === 'light' ? 'border-slate-200 text-slate-800' : 'border-slate-800 text-slate-100'
                      }`}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Nova Senha</label>
                    <input
                      type="password"
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className={`w-full p-2.5 rounded-xl border text-xs outline-none bg-transparent ${
                        simulatorTheme === 'light' ? 'border-slate-200 text-slate-800' : 'border-slate-800 text-slate-100'
                      }`}
                    />
                  </div>
                  <Button
                    type="submit"
                    variant="contained"
                    fullWidth
                    className="py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 font-bold text-xs"
                  >
                    Alterar Senha
                  </Button>
                </form>
              )}

              {/* MODAL: NOTIFICATIONS SETTINGS */}
              {activeModal === 'notifications' && (
                <div className="text-left text-xs space-y-4 font-medium">
                  <p className="text-[10px] text-slate-400">Selecione por quais canais você deseja receber os alarmes de falha das usinas:</p>
                  
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <div>
                        <span className="font-bold block">Relatórios por E-mail</span>
                        <span className="text-[9px] text-slate-400">Resumo semanal de faturamento</span>
                      </div>
                      <input 
                        type="checkbox" 
                        checked={notifEmail} 
                        onChange={(e) => {
                          setNotifEmail(e.target.checked);
                          triggerToast(`E-mail ${e.target.checked ? 'ativado' : 'desativado'}`);
                        }}
                        className="w-4 h-4 accent-blue-600" 
                      />
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <div>
                        <span className="font-bold block">Alertas por WhatsApp</span>
                        <span className="text-[9px] text-slate-400">Notificação imediata de usina offline</span>
                      </div>
                      <input 
                        type="checkbox" 
                        checked={notifWhatsapp} 
                        onChange={(e) => {
                          setNotifWhatsapp(e.target.checked);
                          triggerToast(`WhatsApp ${e.target.checked ? 'ativado' : 'desativado'}`);
                        }}
                        className="w-4 h-4 accent-blue-600" 
                      />
                    </div>

                    <div className="flex justify-between items-center">
                      <div>
                        <span className="font-bold block">Push Notifications</span>
                        <span className="text-[9px] text-slate-400">Notificações pop-up nativas do app</span>
                      </div>
                      <input 
                        type="checkbox" 
                        checked={notifApp} 
                        onChange={(e) => {
                          setNotifApp(e.target.checked);
                          triggerToast(`Push ${e.target.checked ? 'ativado' : 'desativado'}`);
                        }}
                        className="w-4 h-4 accent-blue-600" 
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* MODAL: APP FEEDBACK */}
              {activeModal === 'app_feedback' && (
                <form onSubmit={handleFeedbackSubmit} className="space-y-3 text-left">
                  <p className="text-[10px] text-slate-400 font-medium">Deixe seu feedback sobre o funcionamento do aplicativo:</p>
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Nota (1 a 5 Estrelas)</label>
                    <select
                      value={feedbackScore}
                      onChange={(e) => setFeedbackScore(parseInt(e.target.value))}
                      className={`w-full p-2.5 rounded-xl border text-xs outline-none bg-transparent ${
                        simulatorTheme === 'light' ? 'border-slate-200 text-slate-800' : 'border-slate-800 text-slate-100'
                      }`}
                    >
                      <option value={5}>⭐⭐⭐⭐⭐ (Excelente)</option>
                      <option value={4}>⭐⭐⭐⭐ (Bom)</option>
                      <option value={3}>⭐⭐⭐ (Regular)</option>
                      <option value={2}>⭐⭐ (Ruim)</option>
                      <option value={1}>⭐ (Péssimo)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Comentário</label>
                    <textarea
                      required
                      rows={3}
                      placeholder="Digite suas observações..."
                      value={feedbackText}
                      onChange={(e) => setFeedbackText(e.target.value)}
                      className={`w-full p-2.5 rounded-xl border text-xs outline-none bg-transparent ${
                        simulatorTheme === 'light' ? 'border-slate-200 text-slate-800' : 'border-slate-800 text-slate-100'
                      }`}
                    />
                  </div>
                  <Button
                    type="submit"
                    disabled={submittingFeedback}
                    variant="contained"
                    fullWidth
                    className="py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 font-bold text-xs"
                  >
                    {submittingFeedback ? 'Enviando...' : 'Gravar Avaliação'}
                  </Button>
                </form>
              )}

              {/* MODAL: DATA MIGRATION */}
              {activeModal === 'data_mig' && (
                <div className="text-center py-2 space-y-3">
                  <p className="text-xs text-slate-400 font-medium">Simule a exportação da telemetria da sua usina para planilhas:</p>
                  
                  <div className="flex gap-2">
                    <Button
                      variant="outlined"
                      fullWidth
                      className="rounded-xl font-bold py-2.5 text-[11px]"
                      onClick={() => triggerToast('Histórico em CSV exportado!', 'success')}
                    >
                      Exportar em CSV
                    </Button>
                    <Button
                      variant="outlined"
                      fullWidth
                      className="rounded-xl font-bold py-2.5 text-[11px]"
                      onClick={() => triggerToast('Histórico em JSON exportado!', 'success')}
                    >
                      Exportar em JSON
                    </Button>
                  </div>
                </div>
              )}

              {/* MODAL: ABOUT US */}
              {activeModal === 'about_us' && (
                <div className="text-left text-xs space-y-2 font-medium leading-relaxed">
                  <p>
                    A <strong className="text-orange-500">SETEC SOLAR</strong> é pioneira no desenvolvimento de sistemas de monitoramento inteligentes e telemetria avançada para usinas fotovoltaicas.
                  </p>
                  <p className="text-[11px] text-slate-400">
                    Nosso foco é maximizar o retorno financeiro do cliente através do monitoramento preventivo ativo (NOC) e alarmes baseados em IA.
                  </p>
                  <div className="pt-2 text-[10px] text-slate-500">
                    Versão do Aplicativo: v2.4.1-build2026
                  </div>
                </div>
              )}

              {/* MODAL: LANGUAGES */}
              {activeModal === 'languages' && (
                <div className="text-left text-xs space-y-2 font-medium">
                  {[
                    { code: 'pt', name: 'Português (Brasil)', active: true },
                    { code: 'en', name: 'English (US)', active: false },
                    { code: 'es', name: 'Español (ES)', active: false }
                  ].map((lang) => (
                    <div
                      key={lang.code}
                      onClick={() => {
                        if (!lang.active) triggerToast(`Idioma alterado para ${lang.name}`);
                        setActiveModal(null);
                      }}
                      className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer ${
                        lang.active 
                          ? 'border-blue-500 bg-blue-500/5 font-extrabold' 
                          : `${simulatorTheme === 'light' ? 'border-slate-100 hover:bg-slate-50' : 'border-slate-800/80 hover:bg-slate-900/50'}`
                      }`}
                    >
                      <span>{lang.name}</span>
                      {lang.active && <CheckIcon className="text-blue-500 text-sm" />}
                    </div>
                  ))}
                </div>
              )}

              {/* MODAL: PRIVACY POLICY */}
              {activeModal === 'privacy' && (
                <div className="text-left text-[11px] space-y-2 text-slate-400 font-medium max-h-[200px] overflow-y-auto pr-1">
                  <p>
                    Seus dados de geolocalização e telemetria de geração de energia são coletados estritamente para apresentar o rendimento financeiro e técnico da sua usina solar.
                  </p>
                  <p>
                    Não compartilhamos nenhuma informação pessoal identificável com terceiros sem consentimento. Todos os dados são transmitidos utilizando criptografia TLS 1.3 de ponta a ponta.
                  </p>
                </div>
              )}

            </div>
          </div>
        )}

        {/* Dynamic Inner-Simulator Notifications Toast */}
        {toast && (
          <div className="absolute top-16 left-4 right-4 z-[60] bg-slate-900 border border-slate-800 shadow-2xl rounded-2xl p-3 flex items-center gap-2 animate-bounce">
            {toast.severity === 'success' ? (
              <CheckCircleIcon className="text-emerald-500 text-lg flex-shrink-0" />
            ) : toast.severity === 'error' ? (
              <ErrorIcon className="text-rose-500 text-lg flex-shrink-0" />
            ) : (
              <InfoIcon className="text-blue-400 text-lg flex-shrink-0" />
            )}
            <span className="text-[11px] font-bold text-slate-100 text-left leading-snug">{toast.message}</span>
          </div>
        )}

      </Paper>
    </Box>
  );
}

// Wrapper to require layout for admin views
function AdminWrapper({ children }: { children: React.ReactNode }) {
  const role = localStorage.getItem('user_role');
  if (!role || role === 'CLIENTE') {
    return <Navigate to="/login" replace />;
  }
  return <Layout>{children}</Layout>;
}

export default function App() {
  return (
    <Routes>
      {/* Rota inicial agora é a tela de login */}
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<Login />} />
      
      {/* Rotas administrativas protegidas */}
      <Route path="/dashboard" element={<AdminWrapper><Dashboard /></AdminWrapper>} />
      <Route path="/clientes" element={<AdminWrapper><Clientes /></AdminWrapper>} />
      <Route path="/usinas" element={<AdminWrapper><Usinas /></AdminWrapper>} />
      <Route path="/noc" element={<AdminWrapper><Noc /></AdminWrapper>} />
      <Route path="/faturas" element={<AdminWrapper><Faturas /></AdminWrapper>} />
      <Route path="/financeiro" element={<AdminWrapper><Financeiro /></AdminWrapper>} />
      <Route path="/manutencao" element={<AdminWrapper><Manutencao /></AdminWrapper>} />
      <Route path="/chamados" element={<AdminWrapper><Chamados /></AdminWrapper>} />
      <Route path="/tickets" element={<AdminWrapper><Tickets /></AdminWrapper>} />
      <Route path="/relatorios" element={<AdminWrapper><Relatorios /></AdminWrapper>} />
      <Route path="/configuracoes" element={<AdminWrapper><Configuracoes /></AdminWrapper>} />

      {/* Rota dedicada do cliente */}
      <Route path="/app-cliente" element={<AppCliente />} />
    </Routes>
  );
}

