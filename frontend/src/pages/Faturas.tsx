import { useState } from 'react';
import ReceiptIcon from '@mui/icons-material/Receipt';
import FilterAltIcon from '@mui/icons-material/FilterAlt';
import DownloadIcon from '@mui/icons-material/Download';
import InboxIcon from '@mui/icons-material/Inbox';
import './Faturas.css';

export default function Faturas() {
  const [activeTab, setActiveTab] = useState('Todos');

  const tabs = [
    { id: 'Todos', label: 'Todos', count: 0, colorClass: 'blue' },
    { id: 'Disponível', label: 'Disponível', count: 0, colorClass: 'green' },
    { id: 'Não disponível', label: 'Não disponível', count: 0, colorClass: 'yellow' },
  ];

  return (
    <div className="page-container">
      <div className="page-header">
        <ReceiptIcon fontSize="medium" />
        Faturas
      </div>

      <div className="page-toolbar">
        <div className="tabs-container">
          {tabs.map(tab => (
            <div 
              key={tab.id}
              className={`status-tab ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label} <span className={`tab-badge ${tab.colorClass}`}>{tab.count}</span>
            </div>
          ))}
        </div>

        <div className="toolbar-actions">
          <div className="upload-text">
            <DownloadIcon fontSize="small" sx={{ transform: 'rotate(180deg)' }} />
            Arraste PDFs de faturas ou clique no botão para enviar arquivos.
          </div>
          <button className="btn-primary">
            <DownloadIcon fontSize="small" sx={{ transform: 'rotate(180deg)' }} />
            Upload de Faturas
          </button>
        </div>
      </div>

      <div className="data-table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th><div className="th-content">Unidade Consumidora</div></th>
              <th><div className="th-content"><FilterAltIcon fontSize="small" /> Contrato</div></th>
              <th><div className="th-content"><FilterAltIcon fontSize="small" /> Usinas</div></th>
              <th><div className="th-content"><FilterAltIcon fontSize="small" /> Responsáveis</div></th>
              <th><div className="th-content">Concessionária</div></th>
              <th><div className="th-content"><FilterAltIcon fontSize="small" /> Origem</div></th>
              <th><div className="th-content">Status</div></th>
              <th><div className="th-content">Mês/Ano <FilterAltIcon fontSize="small" /></div></th>
            </tr>
          </thead>
        </table>
        
        <div className="empty-state">
          <InboxIcon className="empty-icon" />
          <span>Não há dados</span>
        </div>

        <div className="pagination-footer">
          <span>0 - 0 de 0</span>
          <span className="pagination-btn">&lt;</span>
          <span>1</span>
          <span className="pagination-btn">&gt;</span>
        </div>
      </div>
    </div>
  );
}
