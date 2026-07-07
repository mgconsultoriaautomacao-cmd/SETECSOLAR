import { useState } from 'react';
import AssessmentIcon from '@mui/icons-material/Assessment';
import FilterAltIcon from '@mui/icons-material/FilterAlt';
import InboxIcon from '@mui/icons-material/Inbox';
import UnfoldMoreIcon from '@mui/icons-material/UnfoldMore';
import './Faturas.css'; // Reusing common data-table and page styles
import './Relatorios.css';

export default function Relatorios() {
  const [activeTab, setActiveTab] = useState('Todos');
  const [activeToggle, setActiveToggle] = useState('Todo o histórico');

  const tabs = [
    { id: 'Todos', label: 'Todos', count: 0, colorClass: 'blue' },
    { id: 'Ok', label: 'Ok', count: 0, colorClass: 'green' },
    { id: 'Falha', label: 'Falha', count: 0, colorClass: 'red' },
    { id: 'Alerta', label: 'Alerta', count: 0, colorClass: 'yellow' },
    { id: 'Sem lista de compensação', label: 'Sem lista de compensação', count: 0, colorClass: 'blue' },
    { id: 'Em tratamento', label: 'Em tratamento', count: 0, colorClass: 'gray' },
    { id: 'Incompletos', label: 'Incompletos', count: 0, colorClass: 'brown' },
  ];

  return (
    <div className="page-container">
      <div className="page-header">
        <AssessmentIcon fontSize="medium" />
        Gestão de Relatórios
      </div>

      <div className="relatorios-summary-cards">
        <div className="summary-card">
          <span className="summary-card-title">Total de usinas</span>
          <span className="summary-card-value">1</span>
        </div>
        <div className="summary-card">
          <span className="summary-card-title">Usinas monitoradas</span>
          <span className="summary-card-value">0</span>
        </div>
        <div className="summary-card">
          <span className="summary-card-title">Usinas Pro/Avançado</span>
          <span className="summary-card-value">0</span>
        </div>
        <div className="summary-card">
          <span className="summary-card-title">Usinas arquivadas</span>
          <span className="summary-card-value"></span>
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

          <div className="history-toggle">
            <button 
              className={`toggle-btn ${activeToggle === 'Mês a mês' ? 'active' : ''}`}
              onClick={() => setActiveToggle('Mês a mês')}
            >
              Mês a mês
            </button>
            <button 
              className={`toggle-btn ${activeToggle === 'Todo o histórico' ? 'active' : ''}`}
              onClick={() => setActiveToggle('Todo o histórico')}
            >
              Todo o histórico
            </button>
          </div>
        </div>

        <table className="data-table">
          <thead>
            <tr>
              <th><div className="th-content">Usina <UnfoldMoreIcon fontSize="small" sx={{opacity: 0.5}} /></div></th>
              <th><div className="th-content"><FilterAltIcon fontSize="small" /> Cliente</div></th>
              <th><div className="th-content"><FilterAltIcon fontSize="small" /> Concessionária</div></th>
              <th><div className="th-content"><FilterAltIcon fontSize="small" /> Responsável</div></th>
              <th><div className="th-content"><FilterAltIcon fontSize="small" /> Relatórios recentes</div></th>
              <th><div className="th-content">Total de relatórios <UnfoldMoreIcon fontSize="small" sx={{opacity: 0.5}} /></div></th>
            </tr>
          </thead>
        </table>
        
        <div className="empty-state">
          <InboxIcon className="empty-icon" />
          <span>Não há dados</span>
        </div>
      </div>
    </div>
  );
}
