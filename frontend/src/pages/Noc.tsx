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
  Alert,
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
import ElectricMeterIcon from '@mui/icons-material/ElectricMeter';
import SignalWifiOffIcon from '@mui/icons-material/SignalWifiOff';
import RouterIcon from '@mui/icons-material/Router';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import LightModeIcon from '@mui/icons-material/LightMode';
import LayersIcon from '@mui/icons-material/Layers';

import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useApp } from '../context/AppContext';

const API_URL = import.meta.env.VITE_API_URL !== undefined ? import.meta.env.VITE_API_URL : 'http://localhost:3001';

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
  'x-user-email': localStorage.getItem('user_email') || '',
});

const createCustomMarker = (status: string) => {
  const configs: Record<string, { color: string; pulse: string }> = {
    ONLINE:   { color: '#22c55e', pulse: '#16a34a' },
    ALERT:    { color: '#f59e0b', pulse: '#d97706' },
    CRITICAL: { color: '#f43f5e', pulse: '#dc2626' },
    FAULT:    { color: '#f43f5e', pulse: '#dc2626' },
    OFFLINE:  { color: '#475569', pulse: '' },
    NO_SN:    { color: '#7c3aed', pulse: '' },
  };
  const cfg = configs[status] || configs.OFFLINE;

  return L.divIcon({
    html: `
      <div style="position:relative;display:flex;align-items:center;justify-content:center;width:24px;height:24px;">
        ${cfg.pulse ? `<div style="position:absolute;width:100%;height:100%;border-radius:50%;background:${cfg.pulse};opacity:.5;animation:ping 1.5s cubic-bezier(0,0,.2,1) infinite;"></div>` : ''}
        <div style="width:14px;height:14px;border-radius:50%;background:${cfg.color};border:2px solid #0f172a;position:relative;"></div>
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
  const [readings, setReadings] = useState<DeviceReading[]>([]);
  const [events, setEvents] = useState<NocEvent[]>([]);
  const [filter, setFilter] = useState<'ALL' | 'CRITICAL' | 'WARNING' | 'OK'>('ALL');
  const [mapTheme, setMapTheme] = useState<'dark' | 'light' | 'satellite'>('dark');
  const [isFetching, setIsFetching] = useState(false);
  const [lastFetch, setLastFetch] = useState('');
  const [solarmanConfigured, setSolarmanConfigured] = useState<boolean | null>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMapRef = useRef<L.Map | null>(null);
  const prevReadingsRef = useRef<Map<string, DeviceReading>>(new Map());

  // ── Busca status do serviço Solarman ────────────────────────────────────
  useEffect(() => {
    fetch(`${API_URL}/solarman/status`, { headers: getHeaders() })
      .then(r => r.json())
      .then(d => setSolarmanConfigured(d.configured))
      .catch(() => setSolarmanConfigured(false));
  }, []);

  // ── Busca leituras do cache do servidor ─────────────────────────────────
  // useCallback com deps [] para garantir referência estável e evitar loop infinito.
  // NÃO chama refreshData() aqui pois isso recriaria a função e causaria re-render infinito.
  const fetchReadings = useCallback(async () => {
    setIsFetching(true);
    try {
      const response = await fetch(`${API_URL}/solarman/readings`, { headers: getHeaders() });
      if (!response.ok) return;
      const data: DeviceReading[] = await response.json();
      setReadings(data);
      setLastFetch(new Date().toLocaleTimeString('pt-BR'));

      // ── Gera eventos de log comparando com leitura anterior ──────────────
      const prev = prevReadingsRef.current;
      const newEvents: NocEvent[] = [];
      const now = new Date().toLocaleTimeString('pt-BR');

      data.forEach(r => {
        const old = prev.get(r.usinaId);
        const changed = !old || old.status !== r.status;

        if (r.status === 'ONLINE') {
          if (!old || old.status !== 'ONLINE') {
            newEvents.push({ id: `${r.usinaId}-${Date.now()}`, time: now, usina: r.usinaNome, type: 'ONLINE', msg: `Leitura OK — ${(r.powerNow ?? 0).toFixed(2)} kW gerados agora`, severity: 'OK' });
          } else if (r.gridVoltage && r.gridVoltage > 235) {
            newEvents.push({ id: `${r.usinaId}-v-${Date.now()}`, time: now, usina: r.usinaNome, type: 'OVERVOLTAGE', msg: `Sobretensão detectada: ${r.gridVoltage.toFixed(1)} V na rede`, severity: 'WARNING' });
          } else if (r.powerNow !== null && r.powerNow < 0.05 && new Date().getHours() >= 8 && new Date().getHours() <= 17) {
            newEvents.push({ id: `${r.usinaId}-lp-${Date.now()}`, time: now, usina: r.usinaNome, type: 'LOW_PRODUCTION', msg: `Geração muito baixa em horário solar: ${r.powerNow.toFixed(2)} kW`, severity: 'WARNING' });
          }
        } else if (r.status === 'OFFLINE' && changed) {
          newEvents.push({ id: `${r.usinaId}-off-${Date.now()}`, time: now, usina: r.usinaNome, type: 'DISCONNECT', msg: 'Datalogger offline — sem resposta do inversor', severity: 'CRITICAL' });
        } else if (r.status === 'FAULT' && changed) {
          newEvents.push({ id: `${r.usinaId}-f-${Date.now()}`, time: now, usina: r.usinaNome, type: 'OFF', msg: 'Falha crítica detectada no inversor', severity: 'CRITICAL' });
        }
      });

      if (newEvents.length > 0) {
        setEvents(prev => [...newEvents, ...prev].slice(0, 30));
      }

      prevReadingsRef.current = new Map(data.map(r => [r.usinaId, r]));
    } finally {
      setIsFetching(false);
    }
  }, []); // deps vazio = referência estável, sem re-criação

  // ── Auto-refresh a cada 30 segundos — executa apenas UMA vez ─────────────
  useEffect(() => {
    fetchReadings();
    const interval = setInterval(fetchReadings, 30_000);
    return () => clearInterval(interval);
  }, [fetchReadings]); // fetchReadings é estável (deps=[]), não vai re-executar

  // ── Força atualização no servidor + busca resultado ──────────────────────
  const handleForceRefresh = async () => {
    setIsFetching(true);
    try {
      await fetch(`${API_URL}/solarman/refresh`, { method: 'POST', headers: getHeaders() });
      await fetchReadings();
    } finally {
      setIsFetching(false);
    }
  };

  // ── Mapa Leaflet — inicializa ────────────────────────────────────────────
  useEffect(() => {
    if (mapRef.current && !leafletMapRef.current) {
      const map = L.map(mapRef.current, { zoomControl: true }).setView([-21.9064, -45.0616], 6);
      
      const url = mapTheme === 'satellite'
        ? 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
        : mapTheme === 'light'
        ? 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png'
        : 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';

      const attr = mapTheme === 'satellite'
        ? 'Tiles &copy; Esri &mdash; Source: Esri'
        : '&copy; OpenStreetMap &copy; CARTO';

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
  }, [mapTheme]);

  // ── Mapa — atualiza markers quando usinas ou readings mudam ─────────────
  useEffect(() => {
    if (!leafletMapRef.current) return;

    leafletMapRef.current.eachLayer(l => {
      if (l instanceof L.Marker) leafletMapRef.current!.removeLayer(l);
    });

    usinas.forEach(plant => {
      const reading = readings.find(r => r.usinaId === plant.id);
      const markerStatus = reading?.status ?? plant.status;

      const marker = L.marker(
        [plant.gpsLatitude ?? -23.5505, plant.gpsLongitude ?? -46.6333],
        { icon: createCustomMarker(markerStatus) }
      ).addTo(leafletMapRef.current!);

      const statusEmoji = markerStatus === 'ONLINE' ? '🟢 Online' : markerStatus === 'FAULT' ? '🔴 Falha' : markerStatus === 'OFFLINE' ? '⚫ Offline' : '🟡 Alerta';
      const liveData = reading
        ? `<span style="color:#4ade80;display:block;margin-top:4px;">⚡ ${(reading.powerNow ?? 0).toFixed(2)} kW agora</span>
           <span style="color:#94a3b8;display:block;">☀️ ${(reading.generationToday ?? 0).toFixed(1)} kWh hoje</span>
           ${reading.gridVoltage ? `<span style="color:#60a5fa;display:block;">🔌 ${reading.gridVoltage.toFixed(0)} V rede</span>` : ''}`
        : `<span style="color:#475569;display:block;font-size:10px;">Sem leitura disponível</span>`;

      marker.bindPopup(`
        <div style="color:#f8fafc;background:#0f172a;font-family:'Inter',sans-serif;font-size:12px;padding:10px;border-radius:8px;min-width:190px;line-height:1.6;">
          <strong style="font-size:13px;color:#f57c00;display:block;margin-bottom:4px;">${plant.name}</strong>
          <span style="color:#64748b;display:block;">📋 ${plant.client}</span>
          <span style="color:#64748b;display:block;">⚙️ ${plant.capacityKwp} kWp — ${plant.manufacturer}</span>
          <span style="color:#64748b;display:block;">📡 SN: ${plant.datalogger || 'Não configurado'}</span>
          ${liveData}
          <strong style="display:block;margin-top:6px;font-size:11px;">Status: ${statusEmoji}</strong>
        </div>
      `);
    });
  }, [usinas, readings, mapTheme]);

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
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: 1 }}>
            Central NOC Solar
            <Chip
              label={readings.length > 0 ? '🟢 Dados Reais' : '⚫ Aguardando'}
              size="small"
              sx={{
                bgcolor: readings.length > 0 ? '#16a34a' : '#334155',
                color: '#fff',
                fontWeight: 700,
                fontSize: 11,
                animation: readings.length > 0 ? 'none' : undefined,
              }}
            />
          </Typography>
          <Typography variant="caption" sx={{ color: '#64748b' }}>
            Monitoramento automático via SolarmanPV · Polling a cada 5 min · Frontend atualiza a cada 30s
            {lastFetch && <span style={{ color: '#22c55e', marginLeft: 8 }}>• Última leitura local: {lastFetch}</span>}
          </Typography>
        </Box>

        <Tooltip title="Forçar nova leitura dos inversores agora">
          <span>
            <IconButton
              onClick={handleForceRefresh}
              disabled={isFetching}
              sx={{ color: '#f57c00', border: '1px solid #f57c0040', bgcolor: '#f57c0010', '&:hover': { bgcolor: '#f57c0020' } }}
            >
              {isFetching
                ? <Box sx={{ width: 20, height: 20, border: '2px solid #f57c00', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite', '@keyframes spin': { '100%': { transform: 'rotate(360deg)' } } }} />
                : <RefreshIcon />
              }
            </IconButton>
          </span>
        </Tooltip>
      </Box>

      {/* ── Aviso se Solarman não configurado ─────────────────────────────── */}
      {solarmanConfigured === false && (
        <Alert
          severity="warning"
          icon={<RouterIcon />}
          sx={{ borderRadius: 2, bgcolor: '#f59e0b10', color: '#f59e0b', border: '1px solid #f59e0b30' }}
        >
          <strong>Credenciais SolarmanPV não configuradas.</strong> Edite o arquivo{' '}
          <code style={{ background: '#0f172a', padding: '1px 6px', borderRadius: 4 }}>backend/.env</code>{' '}
          e preencha <strong>SOLARMAN_EMAIL</strong> e <strong>SOLARMAN_PASSWORD</strong> com a conta Solarman Smart da SETEC.
          O sistema monitorará automaticamente todas as usinas com SN de datalogger cadastrado.
        </Alert>
      )}

      {/* ── Barra de métricas ────────────────────────────────────────────── */}
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

      {/* ── Grid principal ───────────────────────────────────────────────── */}
      <Grid container spacing={3}>

        {/* Mapa */}
        <Grid size={{ xs: 12, lg: 8 }}>
          <Paper sx={{ p: 3, bgcolor: '#0f172a', border: '1px solid #1e293b', height: 500, display: 'flex', flexDirection: 'column' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6" sx={{ fontWeight: 700, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: 1 }}>
                <MapIcon sx={{ color: '#f57c00' }} /> Mapa de Operações
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                {[
                  { color: '#22c55e', label: 'Online' },
                  { color: '#f59e0b', label: 'Alerta' },
                  { color: '#f43f5e', label: 'Falha' },
                  { color: '#475569', label: 'Offline' },
                ].map(({ color, label }) => (
                  <Box key={label} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: color }} />
                    <Typography variant="caption" sx={{ color: '#64748b', fontSize: 10 }}>{label}</Typography>
                  </Box>
                ))}
              </Box>
            </Box>
            <Box sx={{ flex: 1, bgcolor: '#020617', borderRadius: 2, overflow: 'hidden', border: '1px solid #1e293b', position: 'relative' }}>
              <div ref={mapRef} style={{ width: '100%', height: '100%', minHeight: 380 }} />
              
              {/* Botões do tema do mapa */}
              <Box sx={{
                position: 'absolute',
                top: 12,
                right: 12,
                display: 'flex',
                gap: '4px',
                bgcolor: 'rgba(30, 41, 59, 0.75)',
                backdropFilter: 'blur(8px)',
                border: '1px solid #334155',
                borderRadius: '8px',
                p: '4px',
                zIndex: 1000,
              }}>
                <button
                  type="button"
                  onClick={() => setMapTheme('dark')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 12px',
                    borderRadius: '6px',
                    fontSize: '11px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    color: mapTheme === 'dark' ? '#fff' : '#94a3b8',
                    backgroundColor: mapTheme === 'dark' ? '#ff6b00' : 'transparent',
                    border: 'none',
                    transition: 'all 0.2s',
                  }}
                >
                  <DarkModeIcon sx={{ fontSize: 14 }} /> Escuro
                </button>
                <button
                  type="button"
                  onClick={() => setMapTheme('light')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 12px',
                    borderRadius: '6px',
                    fontSize: '11px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    color: mapTheme === 'light' ? '#fff' : '#94a3b8',
                    backgroundColor: mapTheme === 'light' ? '#ff6b00' : 'transparent',
                    border: 'none',
                    transition: 'all 0.2s',
                  }}
                >
                  <LightModeIcon sx={{ fontSize: 14 }} /> Claro
                </button>
                <button
                  type="button"
                  onClick={() => setMapTheme('satellite')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 12px',
                    borderRadius: '6px',
                    fontSize: '11px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    color: mapTheme === 'satellite' ? '#fff' : '#94a3b8',
                    backgroundColor: mapTheme === 'satellite' ? '#ff6b00' : 'transparent',
                    border: 'none',
                    transition: 'all 0.2s',
                  }}
                >
                  <LayersIcon sx={{ fontSize: 14 }} /> Satélite
                </button>
              </Box>
            </Box>
          </Paper>
        </Grid>

        {/* Log de eventos */}
        <Grid size={{ xs: 12, lg: 4 }}>
          <Paper sx={{ p: 3, bgcolor: '#0f172a', border: '1px solid #1e293b', height: 500, display: 'flex', flexDirection: 'column' }}>
            <Box sx={{ mb: 2 }}>
              <Typography variant="h6" sx={{ fontWeight: 700, color: '#f8fafc' }}>Log de Eventos</Typography>
              <Typography variant="caption" sx={{ color: '#475569' }}>
                Alertas detectados automaticamente
              </Typography>
              <Box sx={{ display: 'flex', gap: 0.5, mt: 1.5, flexWrap: 'wrap' }}>
                {(['ALL', 'CRITICAL', 'WARNING', 'OK'] as const).map(f => (
                  <Chip
                    key={f}
                    label={f === 'ALL' ? 'Todos' : f === 'CRITICAL' ? 'Críticos' : f === 'WARNING' ? 'Alertas' : 'OK'}
                    size="small"
                    onClick={() => setFilter(f)}
                    sx={{
                      bgcolor: filter === f ? (f === 'CRITICAL' ? '#dc2626' : f === 'WARNING' ? '#d97706' : f === 'OK' ? '#16a34a' : '#f57c00') : '#1e293b',
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
                    {solarmanConfigured === false
                      ? 'Configure as credenciais\nSolarman no .env para\nver eventos reais'
                      : 'Aguardando primeira leitura...'}
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

      {/* Estilo popup Leaflet */}
      <style>{`
        .leaflet-popup-content-wrapper,.leaflet-popup-tip{background:#0f172a!important;border:1px solid #334155;box-shadow:0 10px 30px rgba(0,0,0,.6)!important;}
        .leaflet-container a.leaflet-popup-close-button{color:#64748b!important;}
      `}</style>
    </Box>
  );
}
