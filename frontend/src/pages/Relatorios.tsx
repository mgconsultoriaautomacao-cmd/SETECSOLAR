import { useState } from 'react';
import AssessmentIcon from '@mui/icons-material/Assessment';
import FilterAltIcon from '@mui/icons-material/FilterAlt';
import InboxIcon from '@mui/icons-material/Inbox';
import SearchIcon from '@mui/icons-material/Search';
import DownloadIcon from '@mui/icons-material/Download';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import TableChartIcon from '@mui/icons-material/TableChart';
import RefreshIcon from '@mui/icons-material/Refresh';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import WarningIcon from '@mui/icons-material/Warning';
import { useApp } from '../context/AppContext';
import './Faturas.css';
import './Relatorios.css';

export default function Relatorios() {
  const { usinas, clients, refreshData } = useApp();
  const [activeTab, setActiveTab] = useState('Todos');
  const [searchTerm, setSearchTerm] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Compute metrics
  const totalUsinas = usinas.length;
  const usinasOnline = usinas.filter(u => u.status === 'ONLINE').length;
  const usinasOffline = usinas.filter(u => u.status === 'OFFLINE').length;
  const usinasAlerta = usinas.filter(u => u.status === 'ALERT' || u.status === 'CRITICAL').length;

  const totalCapacityKwp = usinas.reduce((acc, u) => acc + (u.capacityKwp || 0), 0);
  const totalGenerationToday = usinas.reduce((acc, u) => acc + (u.generationToday || 0), 0);
  const totalGenerationTotal = usinas.reduce((acc, u) => acc + (u.generationTotal || 0), 0);

  const tabs = [
    { id: 'Todos', label: 'Todos', count: totalUsinas, colorClass: 'blue' },
    { id: 'Ok', label: 'Ok / Online', count: usinasOnline, colorClass: 'green' },
    { id: 'Falha', label: 'Falha / Offline', count: usinasOffline, colorClass: 'red' },
    { id: 'Alerta', label: 'Alerta', count: usinasAlerta, colorClass: 'yellow' },
  ];

  // Filter usinas
  const filteredUsinas = usinas.filter(u => {
    // Status tab filter
    if (activeTab === 'Ok' && u.status !== 'ONLINE') return false;
    if (activeTab === 'Falha' && u.status !== 'OFFLINE') return false;
    if (activeTab === 'Alerta' && (u.status !== 'ALERT' && u.status !== 'CRITICAL')) return false;

    // Search filter
    if (searchTerm.trim() !== '') {
      const term = searchTerm.toLowerCase();
      const clientName = (u.client || clients.find(c => c.id === u.clientId)?.name || '').toLowerCase();
      const usinaName = (u.name || '').toLowerCase();
      const datalogger = (u.datalogger || '').toLowerCase();
      const manufacturer = (u.manufacturer || u.dataloggerSupplier?.name || '').toLowerCase();

      return usinaName.includes(term) || clientName.includes(term) || datalogger.includes(term) || manufacturer.includes(term);
    }

    return true;
  });

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refreshData();
    setIsRefreshing(false);
  };

  // Export single usina report
  const downloadUsinaReport = (usina: any, format: 'PDF' | 'CSV') => {
    const clientName = usina.client || clients.find(c => c.id === usina.clientId)?.name || 'Cliente SETEC';
    const nowStr = new Date().toLocaleDateString('pt-BR') + ' ' + new Date().toLocaleTimeString('pt-BR');

    const content = `=====================================================
          RELATÓRIO DE DESEMPENHO E GERAÇÃO ENERGÉTICA
                  SETEC ENERGIA FOTOVOLTAICA
=====================================================
Data da Emissão: ${nowStr}
Usina: ${usina.name}
Código Datalogger / SN: ${usina.datalogger || 'N/A'}
Cliente Responsável: ${clientName}
Fabricante / Inversor: ${usina.manufacturer || 'Photovoltaic Inverter'} (${usina.model || 'Standard'})

--- PARÂMETROS TÉCNICOS ---
Potência Instalada: ${usina.capacityKwp || 0} kWp
Capacidade Inversor: ${usina.inverterCapacity || 0} kW
Módulos Solares: ${usina.moduleCount || 0} painéis
Cidade / UF: ${usina.city || 'RN'} / ${usina.state || 'RN'}
Status Operacional: ${usina.status || 'N/A'}

--- DADOS DE GERAÇÃO ENERGÉTICA ---
Geração de Hoje (E-Hoje): ${usina.generationToday !== null && usina.generationToday !== undefined ? usina.generationToday + ' kWh' : '0.0 kWh'}
Geração Acumulada (E-Total): ${usina.generationTotal !== null && usina.generationTotal !== undefined ? usina.generationTotal.toLocaleString('pt-BR') + ' kWh' : '0.0 kWh'}
Potência Atual (P-Now): ${usina.powerNow !== null && usina.powerNow !== undefined ? usina.powerNow + ' kW' : '0.0 kW'}

--- IMPACTO SOCIOAMBIENTAL E ECONOMIA ---
Economia Financeira Estimada Mês: R$ ${((usina.generationToday || 5) * 0.92 * 30).toFixed(2)}
Redução de Emissão de CO2: ${((usina.generationTotal || 100) * 0.42).toFixed(1)} kg CO2
Árvores Salvas Equivalentes: ${Math.max(1, Math.round((usina.generationTotal || 100) * 0.05))} árvores

-----------------------------------------------------
SETEC ENERGIA — Monitoramento & Gestão Fotovoltaica
=====================================================
`;

    const blob = new Blob([content], { type: format === 'CSV' ? 'text/csv;charset=utf-8;' : 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Relatorio_${usina.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.${format.toLowerCase()}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Export all usinas report summary
  const downloadConsolidatedReport = (format: 'PDF' | 'CSV') => {
    let content = `=====================================================
         RELATÓRIO CONSOLIDADO DE USINAS - SETEC ENERGIA
=====================================================
Data de Geracão: ${new Date().toLocaleDateString('pt-BR')} ${new Date().toLocaleTimeString('pt-BR')}
Total de Usinas Cadastradas: ${totalUsinas}
Usinas Operacionais (Online): ${usinasOnline}
Potência Total Instalada: ${totalCapacityKwp.toFixed(2)} kWp
Geração Total Acumulada: ${totalGenerationTotal.toLocaleString('pt-BR')} kWh

=====================================================
LISTAGEM DETALHADA DAS USINAS
=====================================================
Usina | Cliente | Fornecedor / Fabricante | Potência (kWp) | Status | E-Hoje (kWh) | E-Total (kWh)
---------------------------------------------------------------------------------------------------
`;

    usinas.forEach((u, i) => {
      const clientName = u.client || clients.find(c => c.id === u.clientId)?.name || 'N/A';
      const mfr = u.manufacturer || u.dataloggerSupplier?.name || 'N/A';
      content += `${i + 1}. ${u.name} | ${clientName} | ${mfr} | ${u.capacityKwp || 0} kWp | ${u.status} | ${u.generationToday || 0} kWh | ${u.generationTotal || 0} kWh\n`;
    });

    content += `\n=====================================================\nSETEC ENERGIA - Relatório Geral de Desempenho\n`;

    const blob = new Blob([content], { type: format === 'CSV' ? 'text/csv;charset=utf-8;' : 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Relatorio_Consolidado_SETEC_${new Date().toISOString().split('T')[0]}.${format.toLowerCase()}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="page-container">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <AssessmentIcon fontSize="medium" />
          <span>Gestão de Relatórios & Desempenho</span>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button 
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="toggle-btn active"
            style={{ borderRadius: 6, display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px' }}
          >
            <RefreshIcon fontSize="small" className={isRefreshing ? 'animate-spin' : ''} />
            {isRefreshing ? 'Atualizando...' : 'Atualizar'}
          </button>
          
          <button 
            onClick={() => downloadConsolidatedReport('PDF')}
            className="toggle-btn active"
            style={{ borderRadius: 6, display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', backgroundColor: '#3b82f6', color: '#fff', borderColor: '#3b82f6' }}
          >
            <PictureAsPdfIcon fontSize="small" />
            Baixar Relatório Geral (PDF)
          </button>
          
          <button 
            onClick={() => downloadConsolidatedReport('CSV')}
            className="toggle-btn"
            style={{ borderRadius: 6, display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px' }}
          >
            <TableChartIcon fontSize="small" />
            Exportar Excel (CSV)
          </button>
        </div>
      </div>

      <div className="relatorios-summary-cards">
        <div className="summary-card">
          <span className="summary-card-title">Total de Usinas</span>
          <span className="summary-card-value">{totalUsinas}</span>
        </div>
        <div className="summary-card">
          <span className="summary-card-title">Usinas Operacionais (Online)</span>
          <span className="summary-card-value" style={{ color: '#10b981' }}>{usinasOnline}</span>
        </div>
        <div className="summary-card">
          <span className="summary-card-title">Potência Instalada Total</span>
          <span className="summary-card-value" style={{ color: '#3b82f6' }}>{totalCapacityKwp.toFixed(1)} <small style={{ fontSize: 14 }}>kWp</small></span>
        </div>
        <div className="summary-card">
          <span className="summary-card-title">Geração Hoje Total</span>
          <span className="summary-card-value" style={{ color: '#f59e0b' }}>
            {totalGenerationToday > 0 ? totalGenerationToday.toFixed(1) : '0.0'} <small style={{ fontSize: 14 }}>kWh</small>
          </span>
        </div>
      </div>

      <div className="data-table-container">
        <div className="relatorios-toolbar">
          <div className="relatorios-tabs">
            {tabs.map(tab => (
              <div 
                key={tab.id}
                className={`rel-tab ${activeTab === tab.id ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label} <span className={`rel-tab-badge ${tab.colorClass}`}>{tab.count}</span>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ position: 'relative' }}>
              <SearchIcon fontSize="small" style={{ position: 'absolute', left: 10, top: 8, color: '#94a3b8' }} />
              <input
                type="text"
                placeholder="Buscar por usina, cliente ou datalogger..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                style={{
                  padding: '6px 12px 6px 34px',
                  borderRadius: 6,
                  border: '1px solid var(--color-border)',
                  backgroundColor: 'var(--color-bg-dark)',
                  color: 'var(--color-text-main)',
                  fontSize: 13,
                  width: 280,
                }}
              />
            </div>
          </div>
        </div>

        {filteredUsinas.length === 0 ? (
          <div className="empty-state" style={{ padding: '40px 20px', textAlign: 'center' }}>
            <InboxIcon className="empty-icon" style={{ fontSize: 48, opacity: 0.3, marginBottom: 10 }} />
            <div>Nenhuma usina encontrada com os filtros selecionados.</div>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Usina / Datalogger</th>
                <th><div className="th-content"><FilterAltIcon fontSize="small" /> Cliente</div></th>
                <th><div className="th-content"><FilterAltIcon fontSize="small" /> Integrador / Nuvem</div></th>
                <th>Potência (kWp)</th>
                <th>Geração Hoje</th>
                <th>Geração Total</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Ações / Relatório</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsinas.map((usina) => {
                const clientName = usina.client || clients.find(c => c.id === usina.clientId)?.name || 'Sem Cliente';
                const supplierName = usina.dataloggerSupplier?.name || usina.manufacturer || 'Solar';

                return (
                  <tr key={usina.id}>
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--color-text-main)' }}>{usina.name}</div>
                      <div style={{ fontSize: 11, color: '#94a3b8' }}>SN: {usina.datalogger || 'Sem datalogger'}</div>
                    </td>
                    <td>{clientName}</td>
                    <td>
                      <span style={{ fontSize: 12, padding: '2px 8px', borderRadius: 4, background: 'rgba(255,255,255,0.06)', color: '#cbd5e1' }}>
                        {supplierName}
                      </span>
                    </td>
                    <td><strong>{usina.capacityKwp || 0} kWp</strong></td>
                    <td style={{ color: '#f59e0b', fontWeight: 600 }}>
                      {usina.generationToday !== null && usina.generationToday !== undefined ? `${usina.generationToday} kWh` : '-'}
                    </td>
                    <td style={{ color: '#10b981', fontWeight: 600 }}>
                      {usina.generationTotal !== null && usina.generationTotal !== undefined ? `${usina.generationTotal.toLocaleString('pt-BR')} kWh` : '-'}
                    </td>
                    <td>
                      {usina.status === 'ONLINE' && (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: '#10b981', fontSize: 12, fontWeight: 600 }}>
                          <CheckCircleIcon fontSize="small" /> ONLINE
                        </span>
                      )}
                      {usina.status === 'OFFLINE' && (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: '#ef4444', fontSize: 12, fontWeight: 600 }}>
                          <ErrorIcon fontSize="small" /> OFFLINE
                        </span>
                      )}
                      {(usina.status === 'ALERT' || usina.status === 'CRITICAL') && (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: '#f59e0b', fontSize: 12, fontWeight: 600 }}>
                          <WarningIcon fontSize="small" /> ALERTA
                        </span>
                      )}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
                        <button
                          onClick={() => downloadUsinaReport(usina, 'PDF')}
                          title="Baixar Relatório em PDF / Texto"
                          style={{
                            padding: '4px 10px',
                            fontSize: 12,
                            borderRadius: 4,
                            border: '1px solid #3b82f6',
                            background: 'rgba(59, 130, 246, 0.1)',
                            color: '#60a5fa',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                          }}
                        >
                          <DownloadIcon fontSize="small" /> PDF
                        </button>
                        
                        <button
                          onClick={() => downloadUsinaReport(usina, 'CSV')}
                          title="Baixar Relatório em CSV / Excel"
                          style={{
                            padding: '4px 10px',
                            fontSize: 12,
                            borderRadius: 4,
                            border: '1px solid var(--color-border)',
                            background: 'var(--color-bg-panel)',
                            color: '#94a3b8',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                          }}
                        >
                          <TableChartIcon fontSize="small" /> CSV
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
