import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Box,
  Grid,
  Paper,
  Typography,
  Chip,
  List,
  ListItem,
  ListItemIcon,
  IconButton,
  Tooltip,
  LinearProgress,
  CircularProgress,
  Alert,
  Tabs,
  Tab,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
} from '@mui/material';
import WarningIcon from '@mui/icons-material/Warning';
import FlashOnIcon from '@mui/icons-material/FlashOn';
import PowerSettingsNewIcon from '@mui/icons-material/PowerSettingsNew';
import WifiOffIcon from '@mui/icons-material/WifiOff';
import MapIcon from '@mui/icons-material/Map';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import SolarPowerIcon from '@mui/icons-material/SolarPower';
import BoltIcon from '@mui/icons-material/Bolt';
import RefreshIcon from '@mui/icons-material/Refresh';
import CloudDownloadIcon from '@mui/icons-material/CloudDownload';
import ElectricMeterIcon from '@mui/icons-material/ElectricMeter';
import SignalWifiOffIcon from '@mui/icons-material/SignalWifiOff';
import RouterIcon from '@mui/icons-material/Router';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import LightModeIcon from '@mui/icons-material/LightMode';
import LayersIcon from '@mui/icons-material/Layers';
import AssessmentIcon from '@mui/icons-material/Assessment';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import ShowChartIcon from '@mui/icons-material/ShowChart';

import {
  ResponsiveContainer,
  ComposedChart,
  BarChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
} from 'recharts';

import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useApp } from '../context/AppContext';

const API_URL =
  import.meta.env.VITE_API_URL ||
  (typeof window !== 'undefined' && window.location.hostname === 'localhost'
    ? 'http://localhost:3001/api'
    : '/api');

interface DeviceReading {
  usinaId: string;
  usinaNome: string;
  deviceSn: string;
  powerNow: number | null;
  generationToday: number | null;
  generationTotal: number | null;
  gridVoltage: number | null;
  temperature: number | null;
  status: 'ONLINE' | 'OFFLINE' | 'FAULT' | 'NO_SN';
  lastUpdate: string;
}

interface NocEvent {
  id: string;
  time: string;
  usina: string;
  type: 'DISCONNECT' | 'LOW_PRODUCTION' | 'OFF' | 'COMM_ERROR' | 'OVERVOLTAGE' | 'ONLINE';
  msg: string;
  severity: 'CRITICAL' | 'WARNING' | 'INFO' | 'OK';
}

const getHeaders = () => ({
  'Content-Type': 'application/json',
  'x-user-role': localStorage.getItem('user_role') || 'SUPER_ADMIN',
  'x-user-email': localStorage.getItem('user_email') || 'admin@setec.com',
});

const createCustomMarker = (status: string) => {
  const configs: Record<string, { color: string; pulse: string; border: string }> = {
    ONLINE:   { color: '#22c55e', pulse: '#16a34a', border: '#0f172a' },
    ALERT:    { color: '#f59e0b', pulse: '#d97706', border: '#0f172a' },
    CRITICAL: { color: '#f43f5e', pulse: '#dc2626', border: '#0f172a' },
    FAULT:    { color: '#f43f5e', pulse: '#dc2626', border: '#0f172a' },
    OFFLINE:  { color: '#64748b', pulse: '', border: '#e2e8f0' },
    NO_SN:    { color: '#7c3aed', pulse: '', border: '#e2e8f0' },
  };
  const cfg = configs[status] || configs.OFFLINE;

  return L.divIcon({
    html: `
      <div style="position:relative;display:flex;align-items:center;justify-content:center;width:24px;height:24px;">
        ${cfg.pulse ? `<div style="position:absolute;width:100%;height:100%;border-radius:50%;background:${cfg.pulse};opacity:.5;animation:ping 1.5s cubic-bezier(0,0,.2,1) infinite;"></div>` : ''}
        <div style="width:14px;height:14px;border-radius:50%;background:${cfg.color};border:2px solid ${cfg.border};box-shadow:0 2px 6px rgba(0,0,0,0.6);"></div>
      </div>
      <style>@keyframes ping{75%,100%{transform:scale(2);opacity:0;}}</style>
    `,
    className: '',
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });
};

export default function Noc() {
  const { usinas } = useApp();
  const [activeTab, setActiveTab] = useState(0);
  const [readings, setReadings] = useState<DeviceReading[]>([]);
  const [events, setEvents] = useState<NocEvent[]>([]);
  const [filter, setFilter] = useState<'ALL' | 'CRITICAL' | 'WARNING' | 'OK'>('ALL');
  const [mapTheme, setMapTheme] = useState<'dark' | 'light' | 'satellite'>(() => {
    const saved = localStorage.getItem('noc_map_theme');
    if (saved === 'dark' || saved === 'light' || saved === 'satellite') return saved;
    return 'dark';
  });

  const [solarmanConfigured, setSolarmanConfigured] = useState<boolean | null>(null);
  const [isFetching, setIsFetching] = useState(false);
  const [lastFetch, setLastFetch] = useState<string | null>(null);

  // Analytics State
  const [selectedUsinaId, setSelectedUsinaId] = useState('all');
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);
  const [startDate, setStartDate] = useState(''); // YYYY-MM-DD
  const [endDate, setEndDate] = useState('');     // YYYY-MM-DD

  const mapRef = useRef<HTMLDivElement | null>(null);
  const leafletMapRef = useRef<L.Map | null>(null);

  const handleMapThemeChange = (newTheme: 'dark' | 'light' | 'satellite') => {
    setMapTheme(newTheme);
    localStorage.setItem('noc_map_theme', newTheme);
  };

  // ── Leituras ao vivo em tempo real ──────────────────────────────────────────
  const fetchReadings = useCallback(async () => {
    try {
      setIsFetching(true);
      const res = await fetch(`${API_URL}/solarman/readings`, { headers: getHeaders() });
      if (res.ok) {
        const data: DeviceReading[] = await res.json();
        setReadings(data);
        setLastFetch(new Date().toLocaleTimeString('pt-BR'));

        const newEvents: NocEvent[] = [];
        data.forEach(r => {
          if (r.status === 'FAULT' || r.status === 'OFFLINE') {
            newEvents.push({
              id: `${r.usinaId}-off`,
              time: new Date(r.lastUpdate || Date.now()).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
              usina: r.usinaNome,
              type: 'COMM_ERROR',
              msg: `Inversor sem comunicação via Stick SN: ${r.deviceSn}`,
              severity: 'CRITICAL',
            });
          } else if (r.status === 'ONLINE' && r.powerNow !== null && r.powerNow === 0) {
            newEvents.push({
              id: `${r.usinaId}-low`,
              time: new Date(r.lastUpdate || Date.now()).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
              usina: r.usinaNome,
              type: 'LOW_PRODUCTION',
              msg: 'Inversor online mas com geração zerada neste instante.',
              severity: 'WARNING',
            });
          }
        });
        setEvents(newEvents);
      }

      const statusRes = await fetch(`${API_URL}/solarman/status`, { headers: getHeaders() });
      if (statusRes.ok) {
        const st = await statusRes.json();
        setSolarmanConfigured(st.configured);
      }
    } catch (err) {
      console.error('NOC polling error:', err);
    } finally {
      setIsFetching(false);
    }
  }, []);

  // ── Buscar Analytics de Geração ───────────────────────────────────────────
  const fetchAnalytics = useCallback(async () => {
    setLoadingAnalytics(true);
    try {
      let url = `${API_URL}/solarman/analytics?usinaId=${selectedUsinaId}`;
      if (startDate) url += `&startDate=${startDate}`;
      if (endDate)   url += `&endDate=${endDate}`;
      const res = await fetch(url, { headers: getHeaders() });
      if (res.ok) {
        const data = await res.json();
        setAnalyticsData(data);
      }
    } catch (err) {
      console.error('Erro ao buscar analytics de geração:', err);
    } finally {
      setLoadingAnalytics(false);
    }
  }, [selectedUsinaId, startDate, endDate]);

  useEffect(() => {
    fetchReadings();
    const interval = setInterval(fetchReadings, 30000);
    return () => clearInterval(interval);
  }, [fetchReadings]);

  useEffect(() => {
    if (activeTab === 1) {
      fetchAnalytics();
    }
  }, [activeTab, selectedUsinaId, fetchAnalytics]);

  const [syncLoading, setSyncLoading] = useState(false);

  const handleSyncAllCloud = async () => {
    setSyncLoading(true);
    try {
      await fetch(`${API_URL}/solarman/sync-all`, { method: 'POST', headers: getHeaders() });
      await fetchReadings();
      if (activeTab === 1) await fetchAnalytics();
    } catch (err) {
      console.error('Erro ao sincronizar usinas cloud:', err);
    } finally {
      setSyncLoading(false);
    }
  };

  const handleForceRefresh = async () => {
    setIsFetching(true);
    try {
      await fetch(`${API_URL}/solarman/refresh`, { method: 'POST', headers: getHeaders() });
      await fetchReadings();
      if (activeTab === 1) await fetchAnalytics();
    } catch (err) {
      console.error('Refresh error:', err);
    } finally {
      setIsFetching(false);
    }
  };

  // ── Mapa — inicialização de tiles ─────────────────────────────────────────
  useEffect(() => {
    if (activeTab !== 0) return;
    if (!mapRef.current) return;

    if (!leafletMapRef.current) {
      const map = L.map(mapRef.current, { zoomControl: true }).setView([-23.5505, -46.6333], 8);

      const tileConfigs: Record<string, { url: string; attr: string }> = {
        dark: {
          url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
          attr: '&copy; <a href="https://carto.com/">CARTO</a>',
        },
        light: {
          url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
          attr: '&copy; <a href="https://carto.com/">CARTO</a>',
        },
        satellite: {
          url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
          attr: 'Esri, Maxar, Earthstar Geographics',
        },
      };

      const { url, attr } = tileConfigs[mapTheme] || tileConfigs.dark;
      L.tileLayer(url, {
        attribution: attr,
        subdomains: 'abcd',
        maxZoom: 20,
      }).addTo(map);
      leafletMapRef.current = map;
    }
    return () => {
      if (leafletMapRef.current) { leafletMapRef.current.remove(); leafletMapRef.current = null; }
    };
  }, [mapTheme, activeTab]);

  // ── Mapa — atualiza markers quando usinas ou readings mudam ─────────────
  useEffect(() => {
    if (activeTab !== 0 || !leafletMapRef.current) return;

    leafletMapRef.current.eachLayer(l => {
      if (l instanceof L.Marker) leafletMapRef.current!.removeLayer(l);
    });

    const bounds: L.LatLngTuple[] = [];

    usinas.forEach((plant, idx) => {
      const reading = readings.find(r => r.usinaId === plant.id);
      const markerStatus = reading?.status ?? plant.status;

      const hasCoords = plant.gpsLatitude !== null && plant.gpsLatitude !== undefined && plant.gpsLongitude !== null && plant.gpsLongitude !== undefined;
      const baseLat = hasCoords ? Number(plant.gpsLatitude) : -23.5505;
      const baseLng = hasCoords ? Number(plant.gpsLongitude) : -46.6333;
      
      // Se a usina NÃO tem coordenada cadastrada, distribui em pequenos offsets para não empilhar sobre o mesmo ponto
      const lat = hasCoords ? baseLat : baseLat + (idx % 5 - 2) * 0.04;
      const lng = hasCoords ? baseLng : baseLng + (Math.floor(idx / 5) - 2) * 0.04;

      bounds.push([lat, lng]);

      const marker = L.marker(
        [lat, lng],
        { icon: createCustomMarker(markerStatus) }
      ).addTo(leafletMapRef.current!);

      const statusEmoji = markerStatus === 'ONLINE' ? '🟢 Online' : markerStatus === 'FAULT' ? '🔴 Falha' : markerStatus === 'OFFLINE' ? '⚫ Offline' : '🟡 Alerta';
      const liveData = reading
        ? `<span style="color:#4ade80;display:block;margin-top:4px;">⚡ ${(reading.powerNow ?? 0).toFixed(2)} kW agora</span>
           <span style="color:#94a3b8;display:block;">☀️ ${(reading.generationToday ?? 0).toFixed(1)} kWh hoje</span>
           ${reading.gridVoltage ? `<span style="color:#60a5fa;display:block;">🔌 ${reading.gridVoltage.toFixed(0)} V rede</span>` : ''}`
        : `<span style="color:#475569;display:block;font-size:10px;">Sem leitura disponível</span>`;

      marker.bindPopup(`
        <div style="color:#f8fafc;background:#0f172a;font-family:'Inter',sans-serif;font-size:12px;padding:10px;border-radius:8px;min-width:200px;line-height:1.6;">
          <strong style="font-size:13px;color:#f57c00;display:block;margin-bottom:4px;">${plant.name}</strong>
          <span style="color:#64748b;display:block;">📋 Cliente: ${plant.client}</span>
          <span style="color:#64748b;display:block;">📍 ${plant.city ? `${plant.city} - ${plant.state}` : 'Localização'}</span>
          <span style="color:#64748b;display:block;">⚙️ ${plant.capacityKwp} kWp — ${plant.manufacturer || 'Inversor'}</span>
          <span style="color:#64748b;display:block;">📡 SN: ${plant.datalogger || 'Não configurado'}</span>
          ${liveData}
          <strong style="display:block;margin-top:6px;font-size:11px;">Status: ${statusEmoji}</strong>
        </div>
      `);
    });

    if (bounds.length > 0) {
      leafletMapRef.current.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
    }
  }, [usinas, readings, mapTheme, activeTab]);

  // ── Helpers de UI ────────────────────────────────────────────────────────
  const getEventIcon = (type: NocEvent['type']) => {
    const icons: Record<string, React.ReactElement> = {
      DISCONNECT:     <WifiOffIcon sx={{ color: '#f43f5e' }} />,
      LOW_PRODUCTION: <WarningIcon sx={{ color: '#f59e0b' }} />,
      OFF:            <PowerSettingsNewIcon sx={{ color: '#dc2626' }} />,
      COMM_ERROR:     <SignalWifiOffIcon sx={{ color: '#64748b' }} />,
      OVERVOLTAGE:    <FlashOnIcon sx={{ color: '#f97316' }} />,
      ONLINE:         <CheckCircleIcon sx={{ color: '#22c55e' }} />,
    };
    return icons[type] ?? <WarningIcon />;
  };

  const getSeverityStyle = (s: NocEvent['severity']) => ({
    CRITICAL: { bg: '#f43f5e18', text: '#f43f5e', border: '#f43f5e30' },
    WARNING:  { bg: '#f59e0b18', text: '#f59e0b', border: '#f59e0b30' },
    INFO:     { bg: '#60a5fa18', text: '#60a5fa', border: '#60a5fa30' },
    OK:       { bg: '#22c55e18', text: '#22c55e', border: '#22c55e30' },
  }[s]);

  const filteredEvents = events.filter(e => filter === 'ALL' || e.severity === filter);

  // ── Totalizadores ────────────────────────────────────────────────────────
  const totalOnline = readings.filter(r => r.status === 'ONLINE').length;
  const totalFault = readings.filter(r => r.status === 'FAULT' || r.status === 'OFFLINE').length;
  const totalPowerNow = readings.reduce((s, r) => s + (r.powerNow ?? 0), 0);
  const totalToday = readings.reduce((s, r) => s + (r.generationToday ?? 0), 0);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: 1 }}>
            Central NOC Solar & Analytics
            <Chip
              label={readings.length > 0 ? '🟢 Dados Reais' : '⚫ Aguardando'}
              size="small"
              sx={{
                bgcolor: readings.length > 0 ? '#16a34a' : '#334155',
                color: '#fff',
                fontWeight: 700,
                fontSize: 11,
              }}
            />
          </Typography>
          <Typography variant="caption" sx={{ color: '#64748b' }}>
            Monitoramento em tempo real e relatórios de geração diária, semanal, mensal e comparativo
            {lastFetch && <span style={{ color: '#22c55e', marginLeft: 8 }}>• Atualizado às {lastFetch}</span>}
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Tabs
            value={activeTab}
            onChange={(_, val) => setActiveTab(val)}
            sx={{
              bgcolor: '#0a1628',
              borderRadius: 2,
              p: 0.5,
              border: '1px solid #1e3a5f',
              '& .MuiTab-root': {
                color: '#94a3b8',
                fontWeight: 600,
                fontSize: '0.85rem',
                minHeight: 38,
                borderRadius: 1.5,
                textTransform: 'none',
                px: 2,
                '&.Mui-selected': {
                  color: '#fff',
                  bgcolor: '#f57c00',
                },
              },
              '& .MuiTabs-indicator': { display: 'none' },
            }}
          >
            <Tab icon={<MapIcon sx={{ fontSize: 18 }} />} iconPosition="start" label="NOC & Mapa ao Vivo" />
            <Tab icon={<AssessmentIcon sx={{ fontSize: 18 }} />} iconPosition="start" label="Acompanhamento de Geração" />
          </Tabs>

          <Button
            variant="outlined"
            size="small"
            startIcon={syncLoading ? <CircularProgress size={14} color="inherit" /> : <CloudDownloadIcon sx={{ fontSize: 18 }} />}
            onClick={handleSyncAllCloud}
            disabled={syncLoading}
            sx={{
              borderColor: '#f97316',
              color: '#f97316',
              fontWeight: 700,
              fontSize: '0.8rem',
              borderRadius: 1.5,
              textTransform: 'none',
              px: 1.8,
              '&:hover': { borderColor: '#ea580c', bgcolor: '#f9731610' },
            }}
          >
            {syncLoading ? 'Sincronizando...' : 'Sincronizar Cloud'}
          </Button>

          <Tooltip title="Forçar atualização das leituras agora">
            <span>
              <IconButton
                onClick={handleForceRefresh}
                disabled={isFetching}
                sx={{ color: '#f57c00', border: '1px solid #f57c0040', bgcolor: '#f57c0010', '&:hover': { bgcolor: '#f57c0020' } }}
              >
                {isFetching ? <LinearProgress color="warning" sx={{ width: 20 }} /> : <RefreshIcon />}
              </IconButton>
            </span>
          </Tooltip>
        </Box>
      </Box>

      {/* ── ALERTA DE CONFIGURAÇÃO SOLARMAN ─────────────────────────────────── */}
      {solarmanConfigured === false && (
        <Alert
          severity="warning"
          icon={<RouterIcon />}
          sx={{ borderRadius: 2, bgcolor: '#f59e0b10', color: '#f59e0b', border: '1px solid #f59e0b30' }}
        >
          <strong>Credenciais SolarmanPV não configuradas.</strong> Configure a conta da SETEC para sincronizar leituras automaticamente.
        </Alert>
      )}

      {/* ── ABA 0: NOC CENTRAL & MAPA AO VIVO ───────────────────────────────── */}
      {activeTab === 0 && (
        <>
          {/* Barra de Métricas ao Vivo */}
          {readings.length > 0 && (
            <Paper sx={{ p: 2, bgcolor: '#0a1628', border: '1px solid #1e3a5f', borderRadius: 2 }}>
              {isFetching && <LinearProgress color="success" sx={{ mb: 1.5, borderRadius: 1 }} />}
              <Grid container spacing={2}>
                {[
                  { icon: <BoltIcon sx={{ color: '#f59e0b', fontSize: 30 }} />, label: 'Potência Total Agora', value: `${totalPowerNow.toFixed(2)} kW`, color: '#f59e0b' },
                  { icon: <SolarPowerIcon sx={{ color: '#22c55e', fontSize: 30 }} />, label: 'Geração Total Hoje', value: `${totalToday.toFixed(1)} kWh`, color: '#22c55e' },
                  { icon: <CheckCircleIcon sx={{ color: '#22c55e', fontSize: 30 }} />, label: 'Inversores Online', value: `${totalOnline} / ${readings.length}`, color: '#22c55e' },
                  { icon: <SignalWifiOffIcon sx={{ color: '#f43f5e', fontSize: 30 }} />, label: 'Falhas / Offline', value: totalFault > 0 ? `${totalFault} alerta(s)` : 'Nenhuma falha', color: totalFault > 0 ? '#f43f5e' : '#22c55e' },
                ].map(({ icon, label, value, color }) => (
                  <Grid key={label} size={{ xs: 6, sm: 3 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      {icon}
                      <Box>
                        <Typography variant="caption" sx={{ color: '#475569', display: 'block', lineHeight: 1 }}>{label}</Typography>
                        <Typography variant="h6" sx={{ color, fontWeight: 700, lineHeight: 1.2, fontSize: '1.1rem' }}>{value}</Typography>
                      </Box>
                    </Box>
                  </Grid>
                ))}
              </Grid>
            </Paper>
          )}

          {/* Grid Principal NOC */}
          <Grid container spacing={3}>
            {/* Mapa */}
            <Grid size={{ xs: 12, lg: 8 }}>
              <Paper sx={{ p: 3, bgcolor: '#0f172a', border: '1px solid #1e293b', height: 520, display: 'flex', flexDirection: 'column' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6" sx={{ fontWeight: 700, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: 1 }}>
                    <MapIcon sx={{ color: '#f57c00' }} /> Mapa de Operações em Tempo Real
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                    {[
                      { color: '#22c55e', label: 'Online' },
                      { color: '#f59e0b', label: 'Alerta' },
                      { color: '#f43f5e', label: 'Falha' },
                      { color: '#64748b', label: 'Offline' },
                    ].map(({ color, label }) => (
                      <Box key={label} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: color }} />
                        <Typography variant="caption" sx={{ color: '#64748b', fontSize: 10 }}>{label}</Typography>
                      </Box>
                    ))}
                  </Box>
                </Box>
                <Box sx={{ flex: 1, bgcolor: '#020617', borderRadius: 2, overflow: 'hidden', border: '1px solid #1e293b', position: 'relative' }}>
                  <div ref={mapRef} style={{ width: '100%', height: '100%', minHeight: 400 }} />
                  
                  {/* Botões do tema do mapa */}
                  <Box sx={{
                    position: 'absolute', top: 12, right: 12, display: 'flex', gap: '4px',
                    bgcolor: 'rgba(30, 41, 59, 0.75)', backdropFilter: 'blur(8px)', border: '1px solid #334155', borderRadius: '8px', p: '4px', zIndex: 1000,
                  }}>
                    <button
                      type="button"
                      onClick={() => handleMapThemeChange('dark')}
                      style={{
                        background: mapTheme === 'dark' ? '#f57c00' : 'transparent',
                        color: mapTheme === 'dark' ? '#fff' : '#94a3b8',
                        border: 'none', borderRadius: '6px', padding: '4px 8px', fontSize: '11px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px'
                      }}
                    >
                      <DarkModeIcon sx={{ fontSize: 14 }} /> Escuro
                    </button>
                    <button
                      type="button"
                      onClick={() => handleMapThemeChange('light')}
                      style={{
                        background: mapTheme === 'light' ? '#f57c00' : 'transparent',
                        color: mapTheme === 'light' ? '#fff' : '#94a3b8',
                        border: 'none', borderRadius: '6px', padding: '4px 8px', fontSize: '11px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px'
                      }}
                    >
                      <LightModeIcon sx={{ fontSize: 14 }} /> Claro
                    </button>
                    <button
                      type="button"
                      onClick={() => handleMapThemeChange('satellite')}
                      style={{
                        background: mapTheme === 'satellite' ? '#f57c00' : 'transparent',
                        color: mapTheme === 'satellite' ? '#fff' : '#94a3b8',
                        border: 'none', borderRadius: '6px', padding: '4px 8px', fontSize: '11px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px'
                      }}
                    >
                      <LayersIcon sx={{ fontSize: 14 }} /> Satélite
                    </button>
                  </Box>
                </Box>
              </Paper>
            </Grid>

            {/* Eventos e Log do NOC */}
            <Grid size={{ xs: 12, lg: 4 }}>
              <Paper sx={{ p: 3, bgcolor: '#0f172a', border: '1px solid #1e293b', height: 520, display: 'flex', flexDirection: 'column' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6" sx={{ fontWeight: 700, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: 1 }}>
                    <WarningIcon sx={{ color: '#f59e0b' }} /> Eventos & Alertas
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 0.5 }}>
                    {(['ALL', 'CRITICAL', 'WARNING'] as const).map(f => (
                      <Chip
                        key={f}
                        label={f === 'ALL' ? 'Todos' : f === 'CRITICAL' ? 'Críticos' : 'Alertas'}
                        size="small"
                        onClick={() => setFilter(f)}
                        sx={{
                          bgcolor: filter === f ? (f === 'CRITICAL' ? '#dc2626' : f === 'WARNING' ? '#d97706' : '#f57c00') : '#1e293b',
                          color: filter === f ? '#fff' : '#64748b',
                          fontWeight: filter === f ? 700 : 400,
                          fontSize: 10,
                          cursor: 'pointer',
                        }}
                      />
                    ))}
                  </Box>
                </Box>

                <Box sx={{ flex: 1, overflowY: 'auto', pr: 0.5 }}>
                  {filteredEvents.length === 0 ? (
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 2, color: '#334155' }}>
                      <ElectricMeterIcon sx={{ fontSize: 48, opacity: 0.3 }} />
                      <Typography variant="caption" sx={{ textAlign: 'center', color: '#475569' }}>
                        Nenhum alerta crítico registrado no momento.
                      </Typography>
                    </Box>
                  ) : (
                    <List disablePadding>
                      {filteredEvents.map(event => {
                        const style = getSeverityStyle(event.severity);
                        return (
                          <ListItem
                            key={event.id}
                            sx={{ p: 1.5, bgcolor: '#020617', borderRadius: 2, border: '1px solid #1e293b', mb: 1, alignItems: 'flex-start', gap: 1 }}
                          >
                            <ListItemIcon sx={{ minWidth: 0, mt: 0.3 }}>
                              {getEventIcon(event.type)}
                            </ListItemIcon>
                            <Box sx={{ flex: 1, minWidth: 0 }}>
                              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Typography variant="body2" sx={{ fontWeight: 600, color: '#f1f5f9', fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {event.usina}
                                </Typography>
                                <Typography variant="caption" sx={{ color: '#475569', ml: 1, flexShrink: 0, fontSize: 10 }}>
                                  {event.time}
                                </Typography>
                              </Box>
                              <Typography variant="caption" sx={{ color: '#94a3b8', display: 'block', mt: 0.3, lineHeight: 1.4 }}>
                                {event.msg}
                              </Typography>
                              <Box sx={{ mt: 0.5, display: 'inline-block', px: 1, py: 0.2, borderRadius: 1, bgcolor: style.bg, border: `1px solid ${style.border}` }}>
                                <Typography sx={{ color: style.text, fontSize: 9, fontWeight: 700 }}>{event.severity}</Typography>
                              </Box>
                            </Box>
                          </ListItem>
                        );
                      })}
                    </List>
                  )}
                </Box>
              </Paper>
            </Grid>
          </Grid>
        </>
      )}

      {/* ── ABA 1: ACOMPANHAMENTO DE GERAÇÃO (DIÁRIO, SEMANAL, MENSAL) ──────── */}
      {activeTab === 1 && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {/* Seletor de Usina */}
          <Paper sx={{ p: 2, bgcolor: '#0f172a', border: '1px solid #1e293b', borderRadius: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <AssessmentIcon sx={{ color: '#f57c00', fontSize: 28 }} />
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 700, color: '#f8fafc' }}>
                  Acompanhamento de Geração Solar
                </Typography>
                <Typography variant="caption" sx={{ color: '#64748b' }}>
                  Visão consolidada da produção diária, semanal e mensal com meta projetada
                </Typography>
              </Box>
            </Box>

            <FormControl size="small" sx={{ minWidth: 240 }}>
              <InputLabel id="usina-analytics-select" shrink sx={{ color: '#94a3b8' }}>Filtrar Usina</InputLabel>
              <Select
                labelId="usina-analytics-select"
                value={selectedUsinaId}
                label="Filtrar Usina"
                notched
                onChange={(e) => setSelectedUsinaId(e.target.value)}
                sx={{
                  color: '#f8fafc',
                  bgcolor: '#020617',
                  border: '1px solid #334155',
                  '& .MuiSelect-icon': { color: '#94a3b8' },
                }}
              >
                <MenuItem value="all">🌐 Todas as Usinas (Consolidado)</MenuItem>
                {usinas.map(u => (
                  <MenuItem key={u.id} value={u.id}>
                    ☀️ {u.name} ({u.capacityKwp} kWp)
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Filtro de Período por Datas */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
              <CalendarMonthIcon sx={{ color: '#f57c00', fontSize: 20 }} />
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                <input
                  id="analytics-start-date"
                  type="date"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  style={{
                    background: '#020617',
                    border: '1px solid #334155',
                    color: '#f8fafc',
                    borderRadius: 6,
                    padding: '6px 10px',
                    fontSize: 13,
                    outline: 'none',
                    cursor: 'pointer',
                  }}
                />
                <Typography sx={{ color: '#475569', fontSize: 12 }}>até</Typography>
                <input
                  id="analytics-end-date"
                  type="date"
                  value={endDate}
                  onChange={e => setEndDate(e.target.value)}
                  style={{
                    background: '#020617',
                    border: '1px solid #334155',
                    color: '#f8fafc',
                    borderRadius: 6,
                    padding: '6px 10px',
                    fontSize: 13,
                    outline: 'none',
                    cursor: 'pointer',
                  }}
                />
              </Box>
              {(startDate || endDate) && (
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => { setStartDate(''); setEndDate(''); }}
                  sx={{
                    borderColor: '#334155',
                    color: '#94a3b8',
                    fontSize: 11,
                    py: 0.5,
                    px: 1,
                    minWidth: 'unset',
                    textTransform: 'none',
                    '&:hover': { borderColor: '#f43f5e', color: '#f43f5e' },
                  }}
                >
                  Limpar
                </Button>
              )}
              <Button
                id="btn-apply-date-filter"
                size="small"
                variant="contained"
                onClick={fetchAnalytics}
                startIcon={<ShowChartIcon sx={{ fontSize: 16 }} />}
                sx={{
                  bgcolor: '#f57c00',
                  color: '#fff',
                  fontWeight: 700,
                  fontSize: 11,
                  py: 0.6,
                  px: 1.5,
                  textTransform: 'none',
                  '&:hover': { bgcolor: '#ea580c' },
                }}
              >
                Aplicar
              </Button>
            </Box>
          </Paper>

          {/* Indicador de período filtrado */}
          {analyticsData?.period?.filtered && (
            <Alert
              severity="info"
              icon={<CalendarMonthIcon />}
              sx={{ bgcolor: '#f57c0010', color: '#f97316', border: '1px solid #f57c0030', borderRadius: 2 }}
            >
              <strong>Período filtrado:</strong>{' '}
              {analyticsData.period.startDate} até {analyticsData.period.endDate}
              {' '}({analyticsData.period.days} dias){' — '}
              <strong>Total no período: {analyticsData.period.totalKwhInPeriod?.toFixed(1) ?? '—'} kWh</strong>
            </Alert>
          )}

          {loadingAnalytics && <LinearProgress color="warning" sx={{ borderRadius: 1 }} />}

          {analyticsData && (
            <>
              {/* 4 Cards de Resumo Executivo */}
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  <Paper sx={{ p: 2.5, bgcolor: '#0a1628', border: '1px solid #1e3a5f', borderRadius: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600 }}>GERAÇÃO HOJE</Typography>
                      <BoltIcon sx={{ color: '#f59e0b' }} />
                    </Box>
                    <Typography variant="h4" sx={{ fontWeight: 800, color: '#f59e0b' }}>
                      {analyticsData.summary.generationToday.toLocaleString('pt-BR')} <span style={{ fontSize: 16 }}>kWh</span>
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#475569', display: 'block', mt: 0.5 }}>
                      Capacidade total: {analyticsData.summary.totalCapacityKwp} kWp
                    </Typography>
                  </Paper>
                </Grid>

                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  <Paper sx={{ p: 2.5, bgcolor: '#0a1628', border: '1px solid #1e3a5f', borderRadius: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600 }}>GERAÇÃO SEMANAL</Typography>
                      <CalendarMonthIcon sx={{ color: '#3b82f6' }} />
                    </Box>
                    <Typography variant="h4" sx={{ fontWeight: 800, color: '#60a5fa' }}>
                      {analyticsData.summary.generationThisWeek.toLocaleString('pt-BR')} <span style={{ fontSize: 16 }}>kWh</span>
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#475569', display: 'block', mt: 0.5 }}>
                      Últimos 7 dias acumulados
                    </Typography>
                  </Paper>
                </Grid>

                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  <Paper sx={{ p: 2.5, bgcolor: '#0a1628', border: '1px solid #1e3a5f', borderRadius: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600 }}>GERAÇÃO MENSAL</Typography>
                      <SolarPowerIcon sx={{ color: '#22c55e' }} />
                    </Box>
                    <Typography variant="h4" sx={{ fontWeight: 800, color: '#22c55e' }}>
                      {analyticsData.summary.generationThisMonth.toLocaleString('pt-BR')} <span style={{ fontSize: 16 }}>kWh</span>
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#22c55e', display: 'block', mt: 0.5, fontWeight: 700 }}>
                      {analyticsData.summary.overallTargetPercent}% da meta mensal ({analyticsData.summary.estimatedKwhMonth.toLocaleString('pt-BR')} kWh)
                    </Typography>
                  </Paper>
                </Grid>

                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  <Paper sx={{ p: 2.5, bgcolor: '#0a1628', border: '1px solid #1e3a5f', borderRadius: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600 }}>COMPARATIVO MÊS A MÊS</Typography>
                      <TrendingUpIcon sx={{ color: analyticsData.summary.monthOverMonthChangePercent >= 0 ? '#22c55e' : '#f43f5e' }} />
                    </Box>
                    <Typography variant="h4" sx={{ fontWeight: 800, color: analyticsData.summary.monthOverMonthChangePercent >= 0 ? '#22c55e' : '#f43f5e' }}>
                      {analyticsData.summary.monthOverMonthChangePercent >= 0 ? `+${analyticsData.summary.monthOverMonthChangePercent}%` : `${analyticsData.summary.monthOverMonthChangePercent}%`}
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#475569', display: 'block', mt: 0.5 }}>
                      Mês anterior: {analyticsData.summary.generationLastMonth.toLocaleString('pt-BR')} kWh
                    </Typography>
                  </Paper>
                </Grid>
              </Grid>

              {/* Gráfico 1: Geração Diária (Últimos 30 Dias) */}
              <Paper sx={{ p: 3, bgcolor: '#0f172a', border: '1px solid #1e293b', borderRadius: 2 }}>
                <Typography variant="h6" sx={{ fontWeight: 700, color: '#f8fafc', mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <ShowChartIcon sx={{ color: '#f57c00' }} /> Histórico de Geração Diária (Últimos 30 Dias em kWh)
                </Typography>
                <Box sx={{ width: '100%', height: 320 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={analyticsData.dailyHistory}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis dataKey="dayLabel" stroke="#64748b" fontSize={11} />
                      <YAxis stroke="#64748b" fontSize={11} unit=" kWh" />
                      <RechartsTooltip
                        contentStyle={{ backgroundColor: '#020617', borderColor: '#334155', borderRadius: '8px', color: '#fff' }}
                        formatter={(val: any) => [`${val} kWh`, 'Geração']}
                      />
                      <Legend wrapperStyle={{ color: '#94a3b8', fontSize: 12 }} />
                      <Bar dataKey="kwh" name="Geração Realizada (kWh)" fill="#f57c00" radius={[4, 4, 0, 0]} />
                      <Line type="monotone" dataKey="targetKwh" name="Meta Projetada (kWh)" stroke="#22c55e" strokeWidth={2} dot={false} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </Box>
              </Paper>

              {/* Gráfico 2 e Tabela Resumo */}
              <Grid container spacing={3}>
                {/* Gráfico Comparativo Mensal */}
                <Grid size={{ xs: 12, lg: 5 }}>
                  <Paper sx={{ p: 3, bgcolor: '#0f172a', border: '1px solid #1e293b', borderRadius: 2, height: '100%' }}>
                    <Typography variant="h6" sx={{ fontWeight: 700, color: '#f8fafc', mb: 2 }}>
                      🗓️ Evolução Mensal (kWh)
                    </Typography>
                    <Box sx={{ width: '100%', height: 280 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={analyticsData.monthlyHistory}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                          <XAxis dataKey="monthLabel" stroke="#64748b" fontSize={11} />
                          <YAxis stroke="#64748b" fontSize={11} />
                          <RechartsTooltip
                            contentStyle={{ backgroundColor: '#020617', borderColor: '#334155', borderRadius: '8px', color: '#fff' }}
                          />
                          <Bar dataKey="kwh" name="Geração (kWh)" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                          <Bar dataKey="targetKwh" name="Meta (kWh)" fill="#334155" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </Box>
                  </Paper>
                </Grid>

                {/* Tabela Detalhada por Usina */}
                <Grid size={{ xs: 12, lg: 7 }}>
                  <Paper sx={{ p: 3, bgcolor: '#0f172a', border: '1px solid #1e293b', borderRadius: 2 }}>
                    <Typography variant="h6" sx={{ fontWeight: 700, color: '#f8fafc', mb: 2 }}>
                      📋 Resumo de Geração por Usina
                    </Typography>
                    <TableContainer sx={{ maxHeight: 280 }}>
                      <Table size="small" stickyHeader>
                        <TableHead>
                          <TableRow sx={{ '& th': { bgcolor: '#020617', color: '#94a3b8', fontWeight: 700, borderBottom: '1px solid #1e293b' } }}>
                            <TableCell>Usina / Cliente</TableCell>
                            <TableCell align="right">Capacidade</TableCell>
                            <TableCell align="right">Hoje (kWh)</TableCell>
                            <TableCell align="right">Mês (kWh)</TableCell>
                            <TableCell align="right">Meta Mês</TableCell>
                            <TableCell align="center">Comparativo</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {analyticsData.usinaDetails.map((u: any) => (
                            <TableRow key={u.id} sx={{ '& td': { borderColor: '#1e293b', color: '#e2e8f0', fontSize: 12 } }}>
                              <TableCell>
                                <strong style={{ color: '#f57c00' }}>{u.name}</strong>
                                <Typography variant="caption" sx={{ color: '#64748b', display: 'block' }}>{u.clientName}</Typography>
                              </TableCell>
                              <TableCell align="right">{u.capacityKwp} kWp</TableCell>
                              <TableCell align="right" sx={{ color: '#f59e0b', fontWeight: 700 }}>{u.generationToday} kWh</TableCell>
                              <TableCell align="right" sx={{ color: '#22c55e', fontWeight: 700 }}>{u.generationThisMonth} kWh</TableCell>
                              <TableCell align="right">
                                <Chip
                                  label={`${u.targetPercent}%`}
                                  size="small"
                                  sx={{
                                    bgcolor: u.targetPercent >= 90 ? '#16a34a20' : '#f59e0b20',
                                    color: u.targetPercent >= 90 ? '#22c55e' : '#f59e0b',
                                    fontWeight: 700,
                                    fontSize: 10,
                                  }}
                                />
                              </TableCell>
                              <TableCell align="center">
                                <span style={{ color: u.monthOverMonthPercent >= 0 ? '#22c55e' : '#f43f5e', fontWeight: 700 }}>
                                  {u.monthOverMonthPercent >= 0 ? `+${u.monthOverMonthPercent}%` : `${u.monthOverMonthPercent}%`}
                                </span>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Paper>
                </Grid>
              </Grid>
            </>
          )}
        </Box>
      )}

      {/* Estilo popup Leaflet */}
      <style>{`
        .leaflet-popup-content-wrapper,.leaflet-popup-tip{background:#0f172a!important;border:1px solid #334155;box-shadow:0 10px 30px rgba(0,0,0,.6)!important;}
        .leaflet-container a.leaflet-popup-close-button{color:#64748b!important;}
      `}</style>
    </Box>
  );
}
