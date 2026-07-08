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
import DevicesIcon from '@mui/icons-material/Devices';
import FilterListIcon from '@mui/icons-material/FilterList';
import InboxIcon from '@mui/icons-material/Inbox';
import WifiOffIcon from '@mui/icons-material/WifiOff';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import TaskAltIcon from '@mui/icons-material/TaskAlt';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import LightModeIcon from '@mui/icons-material/LightMode';
import LayersIcon from '@mui/icons-material/Layers';

type StatusFilter = 'Todos' | 'Normal' | 'Com alerta' | 'Crítico' | 'Desconhecido';

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

  // Contagens de status
  const total = usinas.length;
  const normais   = usinas.filter(u => u.status === 'ONLINE').length;
  const alertas   = usinas.filter(u => u.status === 'ALERT').length;
  const criticos  = usinas.filter(u => u.status === 'CRITICAL').length;
  const offline   = usinas.filter(u => u.status === 'OFFLINE').length;
  const problemas = alertas + criticos + offline;

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
          {usinas.map(u => {
            const lat = u.gpsLatitude ?? -14.235;
            const lng = u.gpsLongitude ?? -51.925;
            return (
              <Marker key={u.id} position={[lat, lng]}>
                <Popup>
                  <strong>{u.name}</strong><br />
                  Cliente: {u.client || 'N/A'}<br />
                  Status: {statusLabel[u.status] || u.status}<br />
                  {u.capacityKwp} kWp
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
              <BoltIcon fontSize="small" /> Usinas cadastradas
            </div>
            <div className="dash-card-content">
              <div className="dash-stat-block">
                <span className="dash-stat-label">Total no sistema</span>
                <span className="dash-stat-value">{total}</span>
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

          {/* Tickets */}
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

          {/* Desempenho */}
          <div className="dash-card">
            <div className="dash-card-header info">
              <SpeedIcon fontSize="small" /> Desempenho
            </div>
            <div className="dash-card-content">
              <div className="dash-stat-block">
                <span className="dash-stat-label">Precisam atenção</span>
                <span className="dash-stat-value" style={{ color: problemas > 0 ? 'var(--color-warning)' : 'var(--color-success)' }}>
                  {problemas}
                </span>
                <span className="dash-stat-sub" style={{ color: 'var(--color-primary-orange)', cursor: 'pointer' }}>
                  {problemas > 0 ? 'Ver usinas...' : 'Tudo em dia ✓'}
                </span>
              </div>
            </div>
          </div>

          {/* Acessos */}
          <div className="dash-card">
            <div className="dash-card-header">
              <DevicesIcon fontSize="small" /> Acessos
            </div>
            <div className="dash-card-content">
              <div className="dash-stat-block">
                <span className="dash-stat-label">Clientes — últimos 30 dias</span>
                <span className="dash-stat-value">
                  0 <span style={{ fontSize: '12px', fontWeight: 'normal', color: 'var(--color-text-muted)' }}>
                    de {clients.length}
                  </span>
                </span>
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
                    <th>Responsável</th>
                    <th>kWp</th>
                    <th>Datalogger</th>
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
                      <td style={{ color: 'var(--color-text-main)', fontWeight: 500 }}>{u.name}</td>
                      <td style={{ color: 'var(--color-text-muted)' }}>{u.client || '—'}</td>
                      <td style={{ color: 'var(--color-text-muted)' }}>
                        {u.city ? `${u.city} - ${u.state}` : '—'}
                      </td>
                      <td style={{ color: 'var(--color-text-muted)' }}>—</td>
                      <td style={{ color: 'var(--color-text-muted)' }}>{u.capacityKwp}</td>
                      <td style={{ color: 'var(--color-text-muted)', fontFamily: 'monospace', fontSize: '12px' }}>
                        {u.datalogger || '—'}
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
