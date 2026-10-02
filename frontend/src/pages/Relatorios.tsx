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

    if (format === 'PDF') {
      const printWin = window.open('', '_blank');
      if (!printWin) return;

      const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Relatório - ${usina.name} - SETEC ENERGIA</title>
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; margin: 30px; color: #1e293b; background: #fff; }
    .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #f57c00; padding-bottom: 15px; margin-bottom: 25px; }
    .logo { font-size: 24px; font-weight: 800; color: #f57c00; letter-spacing: -0.5px; }
    .sublogo { font-size: 12px; color: #64748b; font-weight: 600; text-transform: uppercase; }
    .badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-weight: 700; font-size: 12px; }
    .online { background: #dcfce7; color: #166534; }
    .offline { background: #fee2e2; color: #991b1b; }
    .alert { background: #fef3c7; color: #92400e; }
    .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin-bottom: 25px; }
    .card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 15px; text-align: center; }
    .card-title { font-size: 11px; color: #64748b; text-transform: uppercase; font-weight: 700; }
    .card-value { font-size: 22px; font-weight: 800; color: #0f172a; margin-top: 5px; }
    .section-title { font-size: 16px; font-weight: 700; color: #0f172a; border-left: 4px solid #f57c00; padding-left: 10px; margin: 25px 0 15px 0; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 25px; }
    th { background: #f1f5f9; text-align: left; padding: 10px; font-size: 12px; color: #475569; border-bottom: 2px solid #cbd5e1; }
    td { padding: 10px; border-bottom: 1px solid #e2e8f0; font-size: 13px; }
    .footer { margin-top: 40px; padding-top: 15px; border-top: 1px solid #e2e8f0; text-align: center; font-size: 11px; color: #94a3b8; }
    @media print {
      body { margin: 0; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="logo">SETEC ENERGIA</div>
      <div class="sublogo">Sistema de Gestão & Monitoramento Fotovoltaico</div>
    </div>
    <div style="text-align: right;">
      <span class="badge ${usina.status === 'ONLINE' ? 'online' : usina.status === 'OFFLINE' ? 'offline' : 'alert'}">${usina.status || 'ONLINE'}</span>
      <div style="font-size: 11px; color: #64748b; margin-top: 5px;">Emissão: ${nowStr}</div>
    </div>
  </div>

  <h2 style="margin: 0 0 5px 0; color: #0f172a;">${usina.name}</h2>
  <p style="margin: 0 0 20px 0; color: #64748b; font-size: 14px;">Cliente: <strong>${clientName}</strong> | Datalogger S/N: <code>${usina.datalogger || 'N/A'}</code></p>

  <div class="grid">
    <div class="card">
      <div class="card-title">Potência Instalada</div>
      <div class="card-value" style="color: #3b82f6;">${usina.capacityKwp || 0} kWp</div>
    </div>
    <div class="card">
      <div class="card-title">Geração Hoje</div>
      <div class="card-value" style="color: #f59e0b;">${usina.generationToday !== null && usina.generationToday !== undefined ? usina.generationToday : 0} kWh</div>
    </div>
    <div class="card">
      <div class="card-title">Geração Acumulada</div>
      <div class="card-value" style="color: #10b981;">${usina.generationTotal !== null && usina.generationTotal !== undefined ? usina.generationTotal.toLocaleString('pt-BR') : 0} kWh</div>
    </div>
  </div>

  <div class="section-title">Especificações Técnicas</div>
  <table>
    <tr><th>Fabricante / Marca</th><td>${usina.manufacturer || usina.dataloggerSupplier?.name || 'Inversor Fotovoltaico'}</td></tr>
    <tr><th>Modelo do Inversor</th><td>${usina.model || 'Standard'}</td></tr>
    <tr><th>Capacidade do Inversor</th><td>${usina.inverterCapacity || usina.capacityKwp || 0} kW</td></tr>
    <tr><th>Módulos Solares</th><td>${usina.moduleCount || 0} painéis</td></tr>
    <tr><th>Distribuidora de Energia</th><td>${usina.utilityCompany || 'Neoenergia Cosern'}</td></tr>
    <tr><th>Localização</th><td>${usina.city || 'Tibau'} - ${usina.state || 'RN'}</td></tr>
  </table>

  <div class="section-title">Impacto Ambiental & Economia Estimada</div>
  <table>
    <tr><th>Economia Estimada Mês</th><td><strong>R$ ${((usina.generationToday || 5) * 0.92 * 30).toFixed(2)}</strong></td></tr>
    <tr><th>Redução de CO₂ Evitada</th><td>${((usina.generationTotal || 100) * 0.42).toFixed(1)} kg CO₂</td></tr>
    <tr><th>Equivalência em Árvores</th><td>${Math.max(1, Math.round((usina.generationTotal || 100) * 0.05))} árvores plantadas</td></tr>
  </table>

  <div class="footer">
    SETEC ENERGIA — Relatório gerado automaticamente via Plataforma de Monitoramento. Todos os direitos reservados.
  </div>

  <script>
    window.onload = function() {
      setTimeout(function() { window.print(); }, 400);
    };
  </script>
</body>
</html>`;

      printWin.document.write(html);
      printWin.document.close();
      return;
    }

    // CSV Format (UTF-8 BOM for Excel)
    let csv = '\uFEFFUsina;Cliente;Datalogger_SN;Fabricante;Potencia_kWp;Geracao_Hoje_kWh;Geracao_Total_kWh;Status\n';
    csv += `"${usina.name}";"${clientName}";"${usina.datalogger || ''}";"${usina.manufacturer || ''}";${usina.capacityKwp || 0};${usina.generationToday || 0};${usina.generationTotal || 0};"${usina.status || ''}"\n`;

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Relatorio_${usina.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Export all usinas report summary
  const downloadConsolidatedReport = (format: 'PDF' | 'CSV') => {
    const nowStr = new Date().toLocaleDateString('pt-BR') + ' ' + new Date().toLocaleTimeString('pt-BR');

    if (format === 'PDF') {
      const printWin = window.open('', '_blank');
      if (!printWin) return;

      const rows = usinas.map((u, i) => {
        const clientName = u.client || clients.find(c => c.id === u.clientId)?.name || 'N/A';
        const mfr = u.manufacturer || u.dataloggerSupplier?.name || 'N/A';
        return `<tr>
          <td>${i + 1}</td>
          <td><strong>${u.name}</strong></td>
          <td>${clientName}</td>
          <td>${mfr}</td>
          <td>${u.capacityKwp || 0} kWp</td>
          <td style="color:#10b981;font-weight:700;">${u.generationToday || 0} kWh</td>
          <td>${(u.generationTotal || 0).toLocaleString('pt-BR')} kWh</td>
          <td><span style="font-weight:700;color:${u.status === 'ONLINE' ? '#166534' : u.status === 'OFFLINE' ? '#991b1b' : '#92400e'}">${u.status}</span></td>
        </tr>`;
      }).join('');

      const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Relatório Consolidado - SETEC ENERGIA</title>
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; margin: 30px; color: #1e293b; background: #fff; }
    .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #f57c00; padding-bottom: 15px; margin-bottom: 25px; }
    .logo { font-size: 24px; font-weight: 800; color: #f57c00; }
    .sublogo { font-size: 12px; color: #64748b; font-weight: 600; text-transform: uppercase; }
    .grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin-bottom: 25px; }
    .card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 15px; text-align: center; }
    .card-title { font-size: 11px; color: #64748b; text-transform: uppercase; font-weight: 700; }
    .card-value { font-size: 20px; font-weight: 800; color: #0f172a; margin-top: 5px; }
    table { width: 100%; border-collapse: collapse; margin-top: 15px; }
    th { background: #f1f5f9; text-align: left; padding: 10px; font-size: 11px; color: #475569; border-bottom: 2px solid #cbd5e1; text-transform: uppercase; }
    td { padding: 8px 10px; border-bottom: 1px solid #e2e8f0; font-size: 12px; }
    .footer { margin-top: 40px; padding-top: 15px; border-top: 1px solid #e2e8f0; text-align: center; font-size: 11px; color: #94a3b8; }
    @media print { body { margin: 0; } }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="logo">SETEC ENERGIA</div>
      <div class="sublogo">Relatório Geral de Desempenho de Usinas</div>
    </div>
    <div style="text-align: right; font-size: 12px; color: #64748b;">
      Emissão: <strong>${nowStr}</strong>
    </div>
  </div>

  <div class="grid">
    <div class="card">
      <div class="card-title">Total de Usinas</div>
      <div class="card-value">${totalUsinas}</div>
    </div>
    <div class="card">
      <div class="card-title">Operacionais (Online)</div>
      <div class="card-value" style="color: #10b981;">${usinasOnline}</div>
    </div>
    <div class="card">
      <div class="card-title">Potência Instalada</div>
      <div class="card-value" style="color: #3b82f6;">${totalCapacityKwp.toFixed(1)} kWp</div>
    </div>
    <div class="card">
      <div class="card-title">Geração Hoje / Acumulada</div>
      <div class="card-value" style="color: #f59e0b; font-size: 16px;">
        ${totalGenerationToday.toFixed(1)} kWh <br/><small style="color: #10b981; font-size: 13px;">Total: ${totalGenerationTotal.toLocaleString('pt-BR')} kWh</small>
      </div>
    </div>
  </div>

  <h3 style="color: #0f172a; margin-bottom: 10px;">Listagem Detalhada das Usinas</h3>
  <table>
    <thead>
      <tr>
        <th>#</th>
        <th>Usina</th>
        <th>Cliente</th>
        <th>Inversor / Marca</th>
        <th>Potência</th>
        <th>Geração Hoje</th>
        <th>Geração Total</th>
        <th>Status</th>
      </tr>
    </thead>
    <tbody>
      ${rows}
    </tbody>
  </table>

  <div class="footer">
    SETEC ENERGIA — Monitoramento & Gestão Fotovoltaica. Documento emitido para fins de controle interno e prestação de contas.
  </div>

  <script>
    window.onload = function() {
      setTimeout(function() { window.print(); }, 400);
    };
  </script>
</body>
</html>`;

      printWin.document.write(html);
      printWin.document.close();
      return;
    }

    // CSV format for Excel
    let csv = '\uFEFF#;Usina;Cliente;Inversor;Potencia_kWp;Geracao_Hoje_kWh;Geracao_Total_kWh;Status\n';
    usinas.forEach((u, i) => {
      const clientName = u.client || clients.find(c => c.id === u.clientId)?.name || 'N/A';
      const mfr = u.manufacturer || u.dataloggerSupplier?.name || 'N/A';
      csv += `${i + 1};"${u.name}";"${clientName}";"${mfr}";${u.capacityKwp || 0};${u.generationToday || 0};${u.generationTotal || 0};"${u.status || ''}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Relatorio_Consolidado_SETEC_${new Date().toISOString().split('T')[0]}.csv`;
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
