import { useState } from 'react';
import ConfirmationNumberIcon from '@mui/icons-material/ConfirmationNumber';
import FilterAltIcon from '@mui/icons-material/FilterAlt';
import InboxIcon from '@mui/icons-material/Inbox';
import ViewColumnIcon from '@mui/icons-material/ViewColumn';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import UnfoldMoreIcon from '@mui/icons-material/UnfoldMore';
import './Faturas.css'; // Reusing common data-table and page styles
import './Tickets.css';

export default function Tickets() {
  const [activeTab, setActiveTab] = useState('Meus sem resolução');

  const tabs = [
    { id: 'Todos sem resolução', label: 'Todos sem resolução', count: 0 },
    { id: 'Meus sem resolução', label: 'Meus sem resolução', count: 0 },
    { id: 'Abertos', label: 'Abertos', count: 0 },
    { id: 'Em Andamento', label: 'Em Andamento', count: 0 },
    { id: 'Sem Prazo', label: 'Sem Prazo', count: 0 },
    { id: 'Em Atraso', label: 'Em Atraso', count: 0 },
    { id: 'Concluídos', label: 'Concluídos', count: 0 },
    { id: 'Em espera', label: 'Em espera', count: 0 },
    { id: 'Cancelados', label: 'Cancelados', count: 0 },
  ];

  return (
    <div className="page-container">
      <div className="tickets-header-top">
        <div className="page-header">
          <ConfirmationNumberIcon fontSize="medium" />
          Tickets
        </div>
        <div className="tickets-top-actions">
          <button className="btn-primary">Novo ticket</button>
          <div className="links-group">
            <span className="link-item active">Visão geral</span>
            <span className="link-item">Modelos e subtipos</span>
          </div>
        </div>
      </div>

      <div className="data-table-container">
        <div className="tickets-toolbar">
          <div className="tickets-tabs">
            {tabs.map(tab => (
              <div 
                key={tab.id}
                className={`tickets-tab ${activeTab === tab.id ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label} <span className="tickets-tab-badge">{tab.count}</span>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="btn-secondary" style={{ padding: '4px' }}>
              <MoreVertIcon fontSize="small" />
            </button>
            <button className="btn-secondary">
              <ViewColumnIcon fontSize="small" /> Colunas
            </button>
          </div>
        </div>

        <table className="data-table">
          <thead>
            <tr>
              <th><div className="th-content"><input type="checkbox" /> # - Título <UnfoldMoreIcon fontSize="small" sx={{opacity: 0.5}} /></div></th>
              <th><div className="th-content">Usina <UnfoldMoreIcon fontSize="small" sx={{opacity: 0.5}} /></div></th>
              <th><div className="th-content">Cliente <UnfoldMoreIcon fontSize="small" sx={{opacity: 0.5}} /></div></th>
              <th><div className="th-content">Status <FilterAltIcon fontSize="small" /></div></th>
              <th><div className="th-content">Tipo <FilterAltIcon fontSize="small" /></div></th>
              <th><div className="th-content">Responsáveis <UnfoldMoreIcon fontSize="small" sx={{opacity: 0.5}} /></div></th>
              <th><div className="th-content">Criação <FilterAltIcon fontSize="small" /></div></th>
              <th><div className="th-content">Prazo <UnfoldMoreIcon fontSize="small" sx={{opacity: 0.5}} /></div></th>
            </tr>
          </thead>
        </table>
        
        <div className="empty-state">
          <InboxIcon className="empty-icon" />
          <span>No Data</span>
        </div>
      </div>
    </div>
  );
}
