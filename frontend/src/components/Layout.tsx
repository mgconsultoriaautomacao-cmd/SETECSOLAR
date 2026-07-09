import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import logoSetec from '../assets/logosetec.jpg';
import './Layout.css';
import {
  Avatar,
  Menu,
  MenuItem,
  Divider,
} from '@mui/material';
import DashboardIcon from '@mui/icons-material/Dashboard';
import PeopleIcon from '@mui/icons-material/People';
import SolarPowerIcon from '@mui/icons-material/SolarPower';
import TvIcon from '@mui/icons-material/Tv';
import ReceiptIcon from '@mui/icons-material/Receipt';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import EngineeringIcon from '@mui/icons-material/Engineering';
import SupportAgentIcon from '@mui/icons-material/SupportAgent';
import AssessmentIcon from '@mui/icons-material/Assessment';
import SettingsIcon from '@mui/icons-material/Settings';
import ExitToAppIcon from '@mui/icons-material/ExitToApp';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import MenuIcon from '@mui/icons-material/Menu';
import CloseIcon from '@mui/icons-material/Close';
import LightModeIcon from '@mui/icons-material/LightMode';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import PhoneIphoneIcon from '@mui/icons-material/PhoneIphone';

interface LayoutProps {
  children: React.ReactNode;
}

const menuItems = [
  { text: 'Dashboard',       icon: <DashboardIcon />,    path: '/dashboard' },
  { text: 'Clientes',        icon: <PeopleIcon />,       path: '/clientes' },
  { text: 'Usinas',          icon: <SolarPowerIcon />,   path: '/usinas' },
  { text: 'NOC Solar',       icon: <TvIcon />,           path: '/noc' },
  { text: 'Faturas',         icon: <ReceiptIcon />,      path: '/faturas' },
  { text: 'Financeiro',      icon: <AttachMoneyIcon />,  path: '/financeiro' },
  { text: 'Manutenções (O.S)', icon: <EngineeringIcon />, path: '/manutencao' },
  { text: 'Chamados',        icon: <SupportAgentIcon />, path: '/chamados' },
  { text: 'Relatórios',      icon: <AssessmentIcon />,   path: '/relatorios' },
  { text: 'Configurações',   icon: <SettingsIcon />,     path: '/configuracoes' },
];

export default function Layout({ children }: LayoutProps) {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => setAnchorEl(null);

  const handleLogout = () => {
    handleMenuClose();
    navigate('/login');
  };

  const userRole = localStorage.getItem('user_role') || 'CLIENTE';
  
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('theme') || 'dark';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  const handleNavClick = (path: string) => {
    navigate(path);
    setMobileOpen(false);
  };

  const currentPage = menuItems.find(item => item.path === location.pathname)?.text || 'Painel';

  return (
    <div className="layout-container">
      {/* Sidebar — visível só em desktop */}
      <aside className="sidebar-drawer">
        <div className="sidebar-content">
          <div>
            <div className="sidebar-logo-container">
              <div className="sidebar-logo-card" onClick={() => navigate('/dashboard')} role="button" tabIndex={0}>
                <img src={logoSetec} alt="SETEC SOLAR" className="sidebar-logo" />
              </div>
            </div>
            <ul className="sidebar-menu">
              {menuItems.map(item => {
                const isActive = location.pathname === item.path;
                return (
                  <li key={item.text} className="sidebar-menu-item">
                    <div
                      className={`sidebar-link ${isActive ? 'active' : ''}`}
                      onClick={() => navigate(item.path)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={e => e.key === 'Enter' && navigate(item.path)}
                    >
                      <div className="sidebar-link-icon">{item.icon}</div>
                      <div className="sidebar-link-text">{item.text}</div>
                    </div>
                  </li>
                );
              })}
              {['SUPER_ADMIN', 'GESTOR', 'OPERADOR'].includes(userRole) && (
                <li className="sidebar-menu-item" style={{ marginTop: 'auto', borderTop: '1px solid var(--color-border)', paddingTop: '8px' }}>
                  <div
                    className="sidebar-link"
                    onClick={() => window.open('/app-cliente', '_blank')}
                    role="button"
                    tabIndex={0}
                  >
                    <div className="sidebar-link-icon"><PhoneIphoneIcon /></div>
                    <div className="sidebar-link-text">Simular App Cliente</div>
                  </div>
                </li>
              )}
            </ul>
          </div>
          <div className="sidebar-footer">
            <div className="sidebar-logout" onClick={handleLogout} role="button" tabIndex={0}>
              <div className="sidebar-link-icon"><ExitToAppIcon /></div>
              <div className="sidebar-link-text">Sair do sistema</div>
            </div>
          </div>
        </div>
      </aside>

      {/* Overlay escuro quando menu mobile está aberto */}
      {mobileOpen && (
        <div className="mobile-overlay" onClick={() => setMobileOpen(false)} />
      )}

      {/* Drawer lateral mobile */}
      <aside className={`mobile-drawer ${mobileOpen ? 'open' : ''}`}>
        <div className="sidebar-content">
          <div>
            <div className="sidebar-logo-container" style={{ justifyContent: 'space-between', gap: '8px' }}>
              <div className="sidebar-logo-card" onClick={() => { navigate('/dashboard'); setMobileOpen(false); }} role="button" tabIndex={0} style={{ flex: 1 }}>
                <img src={logoSetec} alt="SETEC SOLAR" className="sidebar-logo" />
              </div>
              <button
                onClick={() => setMobileOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8b929c', padding: '4px' }}
                aria-label="Fechar menu"
              >
                <CloseIcon />
              </button>
            </div>
            <ul className="sidebar-menu">
              {menuItems.map(item => {
                const isActive = location.pathname === item.path;
                return (
                  <li key={item.text} className="sidebar-menu-item">
                    <div
                      className={`sidebar-link ${isActive ? 'active' : ''}`}
                      onClick={() => handleNavClick(item.path)}
                      role="button"
                      tabIndex={0}
                    >
                      <div className="sidebar-link-icon">{item.icon}</div>
                      <div className="sidebar-link-text">{item.text}</div>
                    </div>
                  </li>
                );
              })}
              {['SUPER_ADMIN', 'GESTOR', 'OPERADOR'].includes(userRole) && (
                <li className="sidebar-menu-item" style={{ marginTop: 'auto', borderTop: '1px solid var(--color-border)', paddingTop: '8px' }}>
                  <div
                    className="sidebar-link"
                    onClick={() => {
                      window.open('/app-cliente', '_blank');
                      setMobileOpen(false);
                    }}
                    role="button"
                    tabIndex={0}
                  >
                    <div className="sidebar-link-icon"><PhoneIphoneIcon /></div>
                    <div className="sidebar-link-text">Simular App Cliente</div>
                  </div>
                </li>
              )}
            </ul>
          </div>
          <div className="sidebar-footer">
            <div className="sidebar-logout" onClick={handleLogout} role="button" tabIndex={0}>
              <div className="sidebar-link-icon"><ExitToAppIcon /></div>
              <div className="sidebar-link-text">Sair do sistema</div>
            </div>
          </div>
        </div>
      </aside>

      {/* Barra do topo */}
      <header className="app-bar">
        {/* Botão hamburguer — só aparece em mobile */}
        <button
          className="mobile-menu-btn"
          onClick={() => setMobileOpen(true)}
          aria-label="Abrir menu de navegação"
        >
          <MenuIcon />
        </button>

        <div className="app-bar-title">{currentPage}</div>

        <div className="app-bar-actions" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button 
            onClick={toggleTheme} 
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-main)' }}
            aria-label="Alternar Tema"
          >
            {theme === 'dark' ? <LightModeIcon /> : <DarkModeIcon />}
          </button>
          
          <button onClick={handleMenuOpen} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
            <Avatar sx={{ bgcolor: 'var(--color-primary-orange)', width: 36, height: 36, fontSize: '15px' }}>
              {localStorage.getItem('user_email')?.[0]?.toUpperCase() || 'A'}
            </Avatar>
          </button>
          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleMenuClose}
            transformOrigin={{ horizontal: 'right', vertical: 'top' }}
            anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
            slotProps={{
              paper: {
                sx: {
                  bgcolor: 'var(--color-bg-panel)',
                  color: 'var(--color-text-main)',
                  border: '1px solid var(--color-border)',
                  mt: 1.5,
                  minWidth: 180,
                },
              }
            }}
          >
            <MenuItem onClick={handleMenuClose} sx={{ display: 'flex', gap: 1, fontSize: '14px' }}>
              <AccountCircleIcon fontSize="small" /> Minha conta
            </MenuItem>
            <Divider sx={{ borderColor: 'var(--color-border)' }} />
            <MenuItem onClick={handleLogout} sx={{ display: 'flex', gap: 1, color: 'var(--color-danger)', fontSize: '14px' }}>
              <ExitToAppIcon fontSize="small" /> Sair
            </MenuItem>
          </Menu>
        </div>
      </header>

      {/* Conteúdo principal */}
      <main className="main-content">
        {children}
      </main>
    </div>
  );
}
