import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import './Dashboard.css';
import { useApp } from '../context/AppContext';
import { StatusBadge } from '../components/ui/StatusBadge';
import { EmptyState } from '../components/ui/EmptyState';

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
import TaskAltIcon from '@mui/icons-material/TaskAlt';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import LightModeIcon from '@mui/icons-material/LightMode';
import LayersIcon from '@mui/icons-material/Layers';
import SearchIcon from '@mui/icons-material/Search';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';

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
        ${cfg.pulse ? `<div style="position:absolute;width:100%;height:100%;border-radius:50%;background:${cfg.pulse};opacity:.6;animation:ping 1.5s cubic-bezier(0,0,.2,1) infinite;"></div>` : ''}
        <div style="width:14px;height:14px;border-radius:50%;background:${cfg.color};border:2px solid ${cfg.border};box-shadow:0 0 10px ${cfg.color};"></div>
      </div>
      <style>@keyframes ping{75%,100%{transform:scale(2.2);opacity:0;}}</style>
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
  const [searchTerm, setSearchTerm] = useState('');
  const [isTableCollapsed, setIsTableCollapsed] = useState(false);

  // Centro do mapa: média das coordenadas das usinas, ou Brasil
  const mapCenter: [number, number] = useMemo(() => {
    if (usinas.length > 0) {
      const validUsinas = usinas.filter(u => u.gpsLatitude != null && u.gpsLongitude != null);
      if (validUsinas.length > 0) {
        return [
          validUsinas.reduce((acc, u) => acc + Number(u.gpsLatitude), 0) / validUsinas.length,
          validUsinas.reduce((acc, u) => acc + Number(u.gpsLongitude), 0) / validUsinas.length,
        ];
      }
    }
    return [-14.235, -51.925];
  }, [usinas]);

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

  // Filtra usinas pela aba ativa e busca textual
  const usinasFiltradas = useMemo(() => {
    return usinas.filter(u => {
      let matchesTab = true;
      if (activeTab === 'Normal')       matchesTab = u.status === 'ONLINE';
      else if (activeTab === 'Com alerta')   matchesTab = u.status === 'ALERT';
      else if (activeTab === 'Crítico')      matchesTab = u.status === 'CRITICAL';
      else if (activeTab === 'Desconhecido') matchesTab = u.status === 'OFFLINE';

      if (!matchesTab) return false;

      if (!searchTerm.trim()) return true;
      const term = searchTerm.toLowerCase();
      const name = (u.name || '').toLowerCase();
      const client = (u.client || '').toLowerCase();
      const city = (u.city || '').toLowerCase();
      const state = (u.state || '').toLowerCase();
      const manufacturer = (u.manufacturer || '').toLowerCase();

      return name.includes(term) || client.includes(term) || city.includes(term) || state.includes(term) || manufacturer.includes(term);
    });
  }, [usinas, activeTab, searchTerm]);

  const getInverterBadgeClass = (m?: string | null) => {
    const norm = (m || '').toLowerCase();
    if (norm.includes('solis')) return 'solis';
    if (norm.includes('growatt')) return 'growatt';
    if (norm.includes('deye')) return 'deye';
    if (norm.includes('huawei')) return 'huawei';
    return 'default';
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
                  <div style={{ fontFamily: 'Inter, sans-serif', padding: '4px', minWidth: '190px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <strong style={{ color: '#ff6b00', fontSize: '13.5px' }}>{u.name}</strong>
                      <StatusBadge status={u.status} size="small" />
                    </div>
                    <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '2px' }}>
                      👤 {u.client || 'Cliente N/A'}
                    </div>
                    <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '6px' }}>
                      📍 {u.city ? `${u.city} - ${u.state}` : 'Localização não definida'}
                    </div>
                    <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '6px', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                      <span style={{ fontSize: '12px', color: '#f1f5f9', fontWeight: 600 }}>
                        ⚡ {u.capacityKwp} kWp instalado
                      </span>
                      {u.powerNow !== null && u.powerNow !== undefined && (
                        <span style={{ fontSize: '12px', color: '#38bdf8', fontWeight: 600 }}>
                          ⚡ Potência: {u.powerNow.toFixed(2)} kW
                        </span>
                      )}
                      {u.generationToday !== null && u.generationToday !== undefined && (
                        <span style={{ fontSize: '12px', color: '#22c55e', fontWeight: 600 }}>
                          ☀️ {u.generationToday.toFixed(1)} kWh hoje
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => navigate('/usinas')}
                      style={{
                        marginTop: '10px',
                        width: '100%',
                        padding: '6px 10px',
                        background: 'rgba(255, 107, 0, 0.15)',
                        color: '#ff6b00',
                        border: '1px solid rgba(255, 107, 0, 0.35)',
                        borderRadius: '6px',
                        fontSize: '11px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '4px',
                      }}
                    >
                      Ver Detalhes <OpenInNewIcon sx={{ fontSize: 13 }} />
                    </button>
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>
      </div>

      {/* Overlays sobre o mapa */}
      <div className="dashboard-overlays">

        {/* Ticker / Header Superior do NOC */}
        <div className="dashboard-header-bar">
          <div className="noc-live-badge">
            <span className="noc-pulse-dot" />
            <span>SETEC SOLAR NOC • TEMPO REAL</span>
          </div>

          {/* Botões de controle do tema do mapa */}
          <div className="map-theme-control">
            <button
              type="button"
              className={`map-theme-btn ${mapTheme === 'dark' ? 'active' : ''}`}
              onClick={() => setMapTheme('dark')}
              title="Visualização Escura"
            >
              <DarkModeIcon sx={{ fontSize: 15 }} /> Escuro
            </button>
            <button
              type="button"
              className={`map-theme-btn ${mapTheme === 'light' ? 'active' : ''}`}
              onClick={() => setMapTheme('light')}
              title="Visualização Clara"
            >
              <LightModeIcon sx={{ fontSize: 15 }} /> Claro
            </button>
            <button
              type="button"
              className={`map-theme-btn ${mapTheme === 'satellite' ? 'active' : ''}`}
              onClick={() => setMapTheme('satellite')}
              title="Visualização Satélite"
            >
              <LayersIcon sx={{ fontSize: 15 }} /> Satélite
            </button>
          </div>
        </div>

        {/* Cards de resumo estatístico */}
        <div className="dashboard-top-cards">

          {/* Usinas */}
          <div className="dash-card card-primary clickable" onClick={() => navigate('/usinas')}>
            <div className="dash-card-header">
              <div className="dash-card-header-left">
                <div className="dash-card-header-icon icon-orange">
                  <BoltIcon fontSize="inherit" />
                </div>
                <span>Usinas & Potência</span>
              </div>
              <StatusBadge status="ONLINE" label={`${normais} operando`} size="small" />
            </div>
            <div className="dash-card-content">
              <div className="dash-stat-block">
                <span className="dash-stat-label">Total Monitorado</span>
                <span className="dash-stat-value">
                  {total} <span style={{ fontSize: '13px', color: '#94a3b8', fontWeight: 500 }}>({totalKwp.toFixed(1)} kWp)</span>
                </span>
                <span className="dash-stat-sub">
                  <TaskAltIcon sx={{ fontSize: 14, color: '#22c55e' }} /> {normais} plantas online
                </span>
              </div>
              <div className="dash-stat-block" style={{ textAlign: 'right' }}>
                <span className="dash-stat-label">Com atenção</span>
                <span className="dash-stat-value" style={{ color: problemas > 0 ? '#ef4444' : '#22c55e' }}>
                  {problemas}
                </span>
                <span className="dash-stat-sub" style={{ justifyContent: 'flex-end' }}>
                  {alertas} alertas • {offline} offline
                </span>
              </div>
            </div>
          </div>

          {/* Geração Hoje (NOC) */}
          <div className="dash-card card-success clickable" onClick={() => navigate('/noc')}>
            <div className="dash-card-header">
              <div className="dash-card-header-left">
                <div className="dash-card-header-icon icon-green">
                  <SpeedIcon fontSize="inherit" />
                </div>
                <span>Geração Hoje (NOC)</span>
              </div>
              <span style={{ fontSize: '11px', color: '#38bdf8', fontWeight: 600 }}>⚡ {totalPowerNow.toFixed(1)} kW</span>
            </div>
            <div className="dash-card-content">
              <div className="dash-stat-block">
                <span className="dash-stat-label">Produzido Hoje</span>
                <span className="dash-stat-value" style={{ color: '#22c55e' }}>
                  {totalGenToday > 0 ? `${totalGenToday.toFixed(1)} kWh` : '0.0 kWh'}
                </span>
                <span className="dash-stat-sub" style={{ color: '#38bdf8' }}>
                  ⚡ Potência agora: {totalPowerNow.toFixed(2)} kW
                </span>
              </div>
              <div className="dash-stat-block" style={{ textAlign: 'right' }}>
                <span className="dash-stat-label">Histórico Acumulado</span>
                <span className="dash-stat-value" style={{ fontSize: '17px' }}>
                  {totalGenAccum > 1000 ? `${(totalGenAccum / 1000).toFixed(2)} MWh` : `${totalGenAccum.toFixed(0)} kWh`}
                </span>
                <span className="dash-stat-sub" style={{ justifyContent: 'flex-end', color: '#94a3b8' }}>
                  Telemetria unificada
                </span>
              </div>
            </div>
          </div>

          {/* Clientes */}
          <div className="dash-card card-clients clickable" onClick={() => navigate('/clientes')}>
            <div className="dash-card-header">
              <div className="dash-card-header-left">
                <div className="dash-card-header-icon icon-blue">
                  <AssessmentIcon fontSize="inherit" />
                </div>
                <span>Carteira de Clientes</span>
              </div>
              <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600 }}>
                {clients.filter(c => c.status === 'ACTIVE').length} ativos
              </span>
            </div>
            <div className="dash-card-content">
              <div className="dash-stat-block">
                <span className="dash-stat-label">Cadastrados</span>
                <span className="dash-stat-value">{clients.length}</span>
                <span className="dash-stat-sub">
                  <TaskAltIcon sx={{ fontSize: 14, color: '#38bdf8' }} /> {clients.filter(c => c.status === 'ACTIVE').length} contas ativas
                </span>
              </div>
              <div className="dash-stat-block" style={{ textAlign: 'right' }}>
                <span className="dash-stat-label">Inativos / Pendentes</span>
                <span className="dash-stat-value" style={{ color: '#94a3b8' }}>
                  {clients.filter(c => c.status !== 'ACTIVE').length}
                </span>
                <span className="dash-stat-sub" style={{ justifyContent: 'flex-end' }}>
                  Gerenciar carteira
                </span>
              </div>
            </div>
          </div>

          {/* Chamados */}
          <div className="dash-card card-warning clickable" onClick={() => navigate('/chamados')}>
            <div className="dash-card-header">
              <div className="dash-card-header-left">
                <div className="dash-card-header-icon icon-amber">
                  <SupportAgentIcon fontSize="inherit" />
                </div>
                <span>Central de Chamados</span>
              </div>
              <StatusBadge status="COMPLETED" label="0 pendências" size="small" />
            </div>
            <div className="dash-card-content">
              <div className="dash-stat-block">
                <span className="dash-stat-label">Em Aberto</span>
                <span className="dash-stat-value" style={{ color: '#ff6b00' }}>0</span>
                <span className="dash-stat-sub" style={{ color: '#ff6b00' }}>
                  Ver chamados...
                </span>
              </div>
              <div className="dash-stat-block" style={{ textAlign: 'right' }}>
                <span className="dash-stat-label">Resolvidos Hoje</span>
                <span className="dash-stat-value" style={{ color: '#22c55e' }}>0</span>
                <span className="dash-stat-sub" style={{ justifyContent: 'flex-end' }}>
                  SLA 100% cumprido
                </span>
              </div>
            </div>
          </div>

        </div>

        {/* Tabela Flutuante de usinas */}
        <div className={`dashboard-bottom-section ${isTableCollapsed ? 'collapsed' : ''}`}>
          
          <div className="dashboard-bottom-header">
            {/* Abas de filtro */}
            <div className="dash-tabs">
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

            {/* Controles: Busca e Minimizar */}
            <div className="dash-table-controls">
              <div className="dash-search-box">
                <SearchIcon sx={{ fontSize: 16, color: '#64748b' }} />
                <input
                  type="text"
                  placeholder="Buscar usina, cliente, cidade..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="dash-search-input"
                />
              </div>

              <button
                type="button"
                className="dash-icon-btn"
                onClick={() => setIsTableCollapsed(!isTableCollapsed)}
                title={isTableCollapsed ? 'Expandir painel' : 'Recolher painel'}
              >
                {isTableCollapsed ? <KeyboardArrowUpIcon sx={{ fontSize: 18 }} /> : <KeyboardArrowDownIcon sx={{ fontSize: 18 }} />}
              </button>
            </div>
          </div>

          {!isTableCollapsed && (
            <div className="dash-table-container">
              {usinasFiltradas.length > 0 ? (
                <table className="dash-table">
                  <thead>
                    <tr>
                      <th>Usina</th>
                      <th>Cliente</th>
                      <th>Cidade / UF</th>
                      <th>Plataforma / Inversor</th>
                      <th>Potência (kWp)</th>
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
                      >
                        <td style={{ color: '#f1f5f9', fontWeight: 600 }}>{u.name}</td>
                        <td style={{ color: '#94a3b8' }}>{u.client || '—'}</td>
                        <td style={{ color: '#94a3b8' }}>
                          {u.city ? `${u.city} - ${u.state}` : '—'}
                        </td>
                        <td>
                          <span className={`inverter-badge ${getInverterBadgeClass(u.manufacturer || u.dataloggerSupplier?.name)}`}>
                            {u.manufacturer || u.dataloggerSupplier?.name || 'Local'}
                          </span>
                        </td>
                        <td style={{ color: '#94a3b8', fontWeight: 600 }}>{u.capacityKwp} kWp</td>
                        <td style={{ color: u.powerNow && u.powerNow > 0 ? '#38bdf8' : '#94a3b8', fontWeight: 600 }}>
                          {u.powerNow !== null && u.powerNow !== undefined ? `${u.powerNow.toFixed(2)} kW` : '—'}
                        </td>
                        <td style={{ color: u.generationToday && u.generationToday > 0 ? '#22c55e' : '#94a3b8', fontWeight: 700 }}>
                          {u.generationToday !== null && u.generationToday !== undefined ? `${u.generationToday.toFixed(1)} kWh` : '—'}
                        </td>
                        <td style={{ color: '#94a3b8', fontSize: '12px' }}>
                          {u.generationTotal !== null && u.generationTotal !== undefined
                            ? u.generationTotal > 1000 ? `${(u.generationTotal / 1000).toFixed(2)} MWh` : `${u.generationTotal.toFixed(0)} kWh`
                            : '—'}
                        </td>
                        <td>
                          <StatusBadge status={u.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <EmptyState
                  title={searchTerm ? 'Nenhuma usina encontrada para a busca' : total === 0 ? 'Nenhuma usina cadastrada ainda' : 'Nenhuma usina com esse status'}
                  description={
                    searchTerm
                      ? `Não encontramos resultados correspondentes a "${searchTerm}". Tente outros termos.`
                      : total === 0
                      ? 'Cadastre a primeira usina fotovoltaica para iniciar o monitoramento.'
                      : 'Não há usinas correspondentes à categoria selecionada no momento.'
                  }
                  action={
                    total === 0 ? (
                      <button
                        onClick={() => navigate('/usinas')}
                        style={{
                          padding: '8px 20px',
                          background: '#ff6b00',
                          color: '#fff',
                          border: 'none',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          fontSize: '13px',
                          fontWeight: 600,
                          boxShadow: '0 4px 12px rgba(255, 107, 0, 0.35)',
                        }}
                      >
                        Cadastrar primeira usina
                      </button>
                    ) : undefined
                  }
                />
              )}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
