import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import './Dashboard.css';
import { useApp } from '../context/AppContext';

import L from 'leaflet';
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

// Corrige ícone padrão do Leaflet no Vite
const DefaultIcon = L.icon({ iconUrl: icon, shadowUrl: iconShadow, iconAnchor: [12, 41] });
L.Marker.prototype.options.icon = DefaultIcon;

import BoltIcon from '@mui/icons-material/Bolt';
import AssessmentIcon from '@mui/icons-material/Assessment';
import SupportAgentIcon from '@mui/icons-material/SupportAgent';
import SpeedIcon from '@mui/icons-material/Speed';
import FilterListIcon from '@mui/icons-material/FilterList';
import InboxIcon from '@mui/icons-material/Inbox';

import WifiOffIcon from '@mui/icons-material/WifiOff';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import TaskAltIcon from '@mui/icons-material/TaskAlt';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import LightModeIcon from '@mui/icons-material/LightMode';
import LayersIcon from '@mui/icons-material/Layers';

type StatusFilter = 'Todos' | 'Normal' | 'Com alerta' | 'Crítico' | 'Desconhecido';

const createDashboardMarker = (status: string) => {
  const configs: Record<string, { color: string; pulse: string; border: string }> = {
    ONLINE:   { color: '#22c55e', pulse: '#16a34a', border: '#0f172a' },
    ALERT:    { color: '#f59e0b', pulse: '#d97706', border: '#0f172a' },
    CRITICAL: { color: '#ef4444', pulse: '#dc2626', border: '#0f172a' },
    OFFLINE:  { color: '#64748b', pulse: '', border: '#e2e8f0' },
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

export default function Dashboard() {
  const { clients, usinas } = useApp();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<StatusFilter>('Todos');
  const [mapTheme, setMapTheme] = useState<'dark' | 'light' | 'satellite'>('dark');

  // Centro do mapa: média das coordenadas das usinas, ou Brasil
  const mapCenter: [number, number] = usinas.length > 0
    ? [
        usinas.reduce((acc, u) => acc + (u.gpsLatitude ?? -14.235), 0) / usinas.length,
        usinas.reduce((acc, u) => acc + (u.gpsLongitude ?? -51.925), 0) / usinas.length,
      ]
    : [-14.235, -51.925];

  // Contagens e Métricas de Geração (NOC Solar)
  const total = usinas.length;
  const normais   = usinas.filter(u => u.status === 'ONLINE').length;
  const alertas   = usinas.filter(u => u.status === 'ALERT').length;
  const criticos  = usinas.filter(u => u.status === 'CRITICAL').length;
  const offline   = usinas.filter(u => u.status === 'OFFLINE').length;
  const problemas = alertas + criticos + offline;

  const totalKwp = usinas.reduce((acc, u) => acc + (u.capacityKwp || 0), 0);
  const totalPowerNow = usinas.reduce((acc, u) => acc + (u.powerNow || 0), 0);
  const totalGenToday = usinas.reduce((acc, u) => acc + (u.generationToday || 0), 0);
  const totalGenAccum = usinas.reduce((acc, u) => acc + (u.generationTotal || 0), 0);

  const tabs: { name: StatusFilter; count: number; color: string }[] = [
    { name: 'Todos',        count: total,    color: 'orange' },
    { name: 'Normal',       count: normais,  color: 'green' },
    { name: 'Com alerta',   count: alertas,  color: 'yellow' },
    { name: 'Crítico',      count: criticos, color: 'red' },
    { name: 'Desconhecido', count: offline,  color: '' },
  ];

  // Filtra usinas pela aba ativa
  const usinasFiltradas = usinas.filter(u => {
    if (activeTab === 'Todos')        return true;
    if (activeTab === 'Normal')       return u.status === 'ONLINE';
    if (activeTab === 'Com alerta')   return u.status === 'ALERT';
    if (activeTab === 'Crítico')      return u.status === 'CRITICAL';
    if (activeTab === 'Desconhecido') return u.status === 'OFFLINE';
    return true;
  });

  // Ícone de status para as linhas da tabela
  const StatusIcon = ({ status }: { status: string }) => {
    if (status === 'ONLINE')   return <TaskAltIcon sx={{ fontSize: 16, color: '#10b981' }} />;
    if (status === 'ALERT')    return <WarningAmberIcon sx={{ fontSize: 16, color: '#f59e0b' }} />;
    if (status === 'CRITICAL') return <WarningAmberIcon sx={{ fontSize: 16, color: '#ef4444' }} />;
    return <WifiOffIcon sx={{ fontSize: 16, color: '#6b7280' }} />;
  };

  const statusLabel: Record<string, string> = {
    ONLINE:   'Normal',
    ALERT:    'Alerta',
    CRITICAL: 'Crítico',
    OFFLINE:  'Offline',
  };

  return (
    <div className="dashboard-container">
      {/* Mapa de fundo */}
      <div className={`dashboard-map map-${mapTheme}`}>
        <MapContainer center={mapCenter} zoom={total > 0 ? 6 : 4} style={{ height: '100%', width: '100%' }} zoomControl={false}>
          <TileLayer
            key={mapTheme}
            attribution={
              mapTheme === 'satellite'
                ? 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
                : '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
            }
            url={
              mapTheme === 'satellite'
                ? 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
                : mapTheme === 'light'
                ? 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png'
                : 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
            }
          />
          {usinas.map((u, idx) => {
            const hasCoords = u.gpsLatitude !== null && u.gpsLatitude !== undefined && u.gpsLongitude !== null && u.gpsLongitude !== undefined;
            const baseLat = hasCoords ? Number(u.gpsLatitude) : -23.5505;
            const baseLng = hasCoords ? Number(u.gpsLongitude) : -46.6333;
            // Aplica pequeno offset apenas se não houver coordenadas exatas para não empilhar pinos
            const lat = hasCoords ? baseLat : baseLat + (idx % 5 - 2) * 0.04;
            const lng = hasCoords ? baseLng : baseLng + (Math.floor(idx / 5) - 2) * 0.04;

            return (
              <Marker key={u.id} position={[lat, lng]} icon={createDashboardMarker(u.status)}>
                <Popup>
                  <div style={{ fontFamily: 'Inter, sans-serif', padding: '4px' }}>
                    <strong style={{ color: '#f57c00', fontSize: '14px' }}>{u.name}</strong><br />
                    <span style={{ fontSize: '12px', color: '#64748b' }}>👤 {u.client || 'Cliente N/A'}</span><br />
                    <span style={{ fontSize: '12px', color: '#64748b' }}>📍 {u.city ? `${u.city} - ${u.state}` : 'Localização não definida'}</span><br />
                    <span style={{ fontSize: '12px', color: '#22c55e', fontWeight: 600 }}>⚡ {u.capacityKwp} kWp instalado</span><br />
                    {u.generationToday !== null && u.generationToday !== undefined && (
                      <span style={{ fontSize: '12px', color: '#38bdf8', fontWeight: 600 }}>☀️ {u.generationToday.toFixed(1)} kWh hoje</span>
                    )}<br />
                    <span style={{ fontSize: '11px', color: u.status === 'ONLINE' ? '#16a34a' : '#dc2626', fontWeight: 700 }}>
                      Status: {statusLabel[u.status] || u.status}
                    </span>
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>
      </div>

      {/* Overlays sobre o mapa */}
      <div className="dashboard-overlays">

        {/* Cards de resumo */}
        <div className="dashboard-top-cards">

          {/* Usinas */}
          <div className="dash-card" onClick={() => navigate('/usinas')} style={{ cursor: 'pointer' }}>
            <div className="dash-card-header info">
              <BoltIcon fontSize="small" /> Usinas & Potência
            </div>
            <div className="dash-card-content">
              <div className="dash-stat-block">
                <span className="dash-stat-label">Total / Instalado</span>
                <span className="dash-stat-value">{total} <span style={{ fontSize: '12px', color: '#64748b' }}>({totalKwp.toFixed(1)} kWp)</span></span>
                <span className="dash-stat-sub">
                  <TaskAltIcon fontSize="inherit" sx={{ color: '#10b981' }} /> {normais} online
                </span>
              </div>
              <div className="dash-stat-block">
                <span className="dash-stat-label">Com problema</span>
                <span className="dash-stat-value" style={{ color: problemas > 0 ? 'var(--color-danger)' : 'var(--color-success)' }}>
                  {problemas}
                </span>
                <span className="dash-stat-sub" style={{ color: 'var(--color-text-muted)' }}>
                  {alertas} alertas, {offline} offline
                </span>
              </div>
            </div>
          </div>

          {/* Geração Hoje */}
          <div className="dash-card">
            <div className="dash-card-header" style={{ color: '#22c55e' }}>
              <SpeedIcon fontSize="small" /> Geração Hoje (NOC)
            </div>
            <div className="dash-card-content">
              <div className="dash-stat-block">
                <span className="dash-stat-label">Produzido hoje</span>
                <span className="dash-stat-value" style={{ color: '#22c55e' }}>
                  {totalGenToday > 0 ? `${totalGenToday.toFixed(1)} kWh` : '—'}
                </span>
                <span className="dash-stat-sub" style={{ color: '#38bdf8' }}>
                  ⚡ Potência agora: {totalPowerNow.toFixed(2)} kW
                </span>
              </div>
              <div className="dash-stat-block">
                <span className="dash-stat-label">Total Histórico</span>
                <span className="dash-stat-value" style={{ fontSize: '15px' }}>
                  {totalGenAccum > 1000 ? `${(totalGenAccum / 1000).toFixed(2)} MWh` : `${totalGenAccum.toFixed(0)} kWh`}
                </span>
              </div>
            </div>
          </div>

          {/* Clientes */}
          <div className="dash-card" onClick={() => navigate('/clientes')} style={{ cursor: 'pointer' }}>
            <div className="dash-card-header danger">
              <AssessmentIcon fontSize="small" /> Clientes
            </div>
            <div className="dash-card-content">
              <div className="dash-stat-block">
                <span className="dash-stat-label">Cadastrados</span>
                <span className="dash-stat-value">{clients.length}</span>
                <span className="dash-stat-sub">{clients.filter(c => c.status === 'ACTIVE').length} ativos</span>
              </div>
              <div className="dash-stat-block">
                <span className="dash-stat-label">Inativos</span>
                <span className="dash-stat-value" style={{ color: 'var(--color-text-muted)' }}>
                  {clients.filter(c => c.status !== 'ACTIVE').length}
                </span>
              </div>
            </div>
          </div>

          {/* Chamados */}
          <div className="dash-card" onClick={() => navigate('/chamados')} style={{ cursor: 'pointer' }}>
            <div className="dash-card-header warning">
              <SupportAgentIcon fontSize="small" /> Chamados
            </div>
            <div className="dash-card-content">
              <div className="dash-stat-block">
                <span className="dash-stat-label">Em aberto</span>
                <span className="dash-stat-value">0</span>
                <span className="dash-stat-sub" style={{ color: 'var(--color-primary-orange)', cursor: 'pointer' }}>
                  Ver todos...
                </span>
              </div>
              <div className="dash-stat-block">
                <span className="dash-stat-label">Resolvidos hoje</span>
                <span className="dash-stat-value" style={{ color: 'var(--color-success)' }}>0</span>
              </div>
            </div>
          </div>

        </div>

        {/* Botões do tema do mapa */}
        <div className="map-theme-control">
          <button
            type="button"
            className={`map-theme-btn ${mapTheme === 'dark' ? 'active' : ''}`}
            onClick={() => setMapTheme('dark')}
          >
            <DarkModeIcon sx={{ fontSize: 16 }} /> Escuro
          </button>
          <button
            type="button"
            className={`map-theme-btn ${mapTheme === 'light' ? 'active' : ''}`}
            onClick={() => setMapTheme('light')}
          >
            <LightModeIcon sx={{ fontSize: 16 }} /> Claro
          </button>
          <button
            type="button"
            className={`map-theme-btn ${mapTheme === 'satellite' ? 'active' : ''}`}
            onClick={() => setMapTheme('satellite')}
          >
            <LayersIcon sx={{ fontSize: 16 }} /> Satélite
          </button>
        </div>

        {/* Tabela de usinas */}
        <div className="dashboard-bottom-section">
          <div className="dash-tabs">
            <div style={{ display: 'flex', gap: '1px', flex: 1 }}>
              {tabs.map(tab => (
                <div
                  key={tab.name}
                  className={`dash-tab ${activeTab === tab.name ? 'active' : ''}`}
                  onClick={() => setActiveTab(tab.name)}
                >
                  {tab.name}
                  <span className={`dash-tab-count ${tab.color}`}>{tab.count}</span>
                </div>
              ))}
            </div>
            <div style={{ paddingRight: '16px', display: 'flex', alignItems: 'center' }}>
              <FilterListIcon sx={{ color: 'var(--color-text-muted)', cursor: 'pointer', fontSize: 20 }} />
            </div>
          </div>

          <div className="dash-table-container">
            {usinasFiltradas.length > 0 ? (
              <table className="dash-table">
                <thead>
                  <tr>
                    <th>Usina</th>
                    <th>Cliente</th>
                    <th>Cidade / UF</th>
                    <th>Fornecedor / Plataforma</th>
                    <th>kWp</th>
                    <th>Potência Agora</th>
                    <th>Geração Hoje</th>
                    <th>Geração Total</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {usinasFiltradas.map(u => (
                    <tr
                      key={u.id}
                      className="dash-table-row"
                      onClick={() => navigate('/usinas')}
                      style={{ cursor: 'pointer' }}
                    >
                      <td style={{ color: 'var(--color-text-main)', fontWeight: 600 }}>{u.name}</td>
                      <td style={{ color: 'var(--color-text-muted)' }}>{u.client || '—'}</td>
                      <td style={{ color: 'var(--color-text-muted)' }}>
                        {u.city ? `${u.city} - ${u.state}` : '—'}
                      </td>
                      <td>
                        <span style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: '4px',
                          background: u.manufacturer?.toLowerCase().includes('solis') ? '#854d0e20' : u.manufacturer?.toLowerCase().includes('growatt') ? '#15803d20' : '#1e293b',
                          color: u.manufacturer?.toLowerCase().includes('solis') ? '#eab308' : u.manufacturer?.toLowerCase().includes('growatt') ? '#22c55e' : '#94a3b8',
                          border: '1px solid rgba(255,255,255,0.08)'
                        }}>
                          {u.manufacturer || u.dataloggerSupplier?.name || 'Local'}
                        </span>
                      </td>
                      <td style={{ color: 'var(--color-text-muted)', fontWeight: 600 }}>{u.capacityKwp} kWp</td>
                      <td style={{ color: u.powerNow && u.powerNow > 0 ? '#38bdf8' : 'var(--color-text-muted)', fontWeight: 600 }}>
                        {u.powerNow !== null && u.powerNow !== undefined ? `${u.powerNow.toFixed(2)} kW` : '—'}
                      </td>
                      <td style={{ color: u.generationToday && u.generationToday > 0 ? '#22c55e' : 'var(--color-text-muted)', fontWeight: 700 }}>
                        {u.generationToday !== null && u.generationToday !== undefined ? `${u.generationToday.toFixed(1)} kWh` : '—'}
                      </td>
                      <td style={{ color: 'var(--color-text-muted)', fontSize: '12px' }}>
                        {u.generationTotal !== null && u.generationTotal !== undefined
                          ? u.generationTotal > 1000 ? `${(u.generationTotal / 1000).toFixed(2)} MWh` : `${u.generationTotal.toFixed(0)} kWh`
                          : '—'}
                      </td>
                      <td>
                        <span className={`dash-status-badge ${u.status?.toLowerCase()}`}>
                          <StatusIcon status={u.status} />
                          {statusLabel[u.status] || u.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (

              <div className="dash-empty-state">
                <InboxIcon className="dash-empty-icon" />
                <span>
                  {total === 0
                    ? 'Nenhuma usina cadastrada ainda.'
                    : 'Nenhuma usina com esse status no momento.'}
                </span>
                {total === 0 && (
                  <button
                    onClick={() => navigate('/usinas')}
                    style={{
                      marginTop: '8px',
                      padding: '8px 20px',
                      background: 'var(--color-primary-orange)',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '13px',
                      fontWeight: 600,
                    }}
                  >
                    Cadastrar primeira usina
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
