import React from 'react';
import './SolarLoader.css';
import WbSunnyIcon from '@mui/icons-material/WbSunny';
import BoltIcon from '@mui/icons-material/Bolt';

interface SolarLoaderProps {
  /** Texto principal exibido durante o carregamento */
  title?: string;
  /** Subtítulo ou dica explicativa */
  subtitle?: string;
  /** Se true, exibe como modal overlay cobrindo a tela toda */
  fullScreen?: boolean;
  /** Tamanho do sol (px) */
  size?: number;
}

export const SolarLoader: React.FC<SolarLoaderProps> = ({
  title = 'Sincronizando Energia Solar...',
  subtitle = 'Conectando aos inversores e processando dados de geração.',
  fullScreen = false,
}) => {
  const containerClass = fullScreen ? 'solar-loader-overlay' : 'solar-loader-inline';

  return (
    <div className={containerClass}>
      <div className="solar-loader-content">
        {/* Sol Pulsante Energizado */}
        <div className="solar-sun-wrapper">
          <div className="solar-sun-ring" />
          <div className="solar-sun-ring solar-sun-ring-delay" />
          
          <div className="solar-sun-disc">
            <WbSunnyIcon sx={{ color: '#ffffff', fontSize: 32, filter: 'drop-shadow(0 0 6px #ffffff)' }} />
          </div>

          {/* Raios Solares SVG Animados */}
          <svg className="solar-rays-svg" viewBox="0 0 100 100">
            <circle
              cx="50"
              cy="50"
              r="42"
              fill="none"
              stroke="#f59e0b"
              strokeWidth="2"
              strokeDasharray="4 8"
              opacity="0.7"
            />
            <circle
              cx="50"
              cy="50"
              r="48"
              fill="none"
              stroke="#ff6b00"
              strokeWidth="1.5"
              strokeDasharray="6 12"
              opacity="0.5"
            />
          </svg>
        </div>

        {/* Ray Energy Flow */}
        <svg className="solar-energy-stream" viewBox="0 0 140 24">
          <path
            d="M 10 12 Q 35 2, 70 12 T 130 12"
            fill="none"
            stroke="#ff6b00"
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray="12 12"
            style={{ animation: 'solarEnergyRay 1.2s linear infinite' }}
          />
          <path
            d="M 10 12 Q 35 22, 70 12 T 130 12"
            fill="none"
            stroke="#f59e0b"
            strokeWidth="2"
            strokeLinecap="round"
            strokeDasharray="8 12"
            style={{ animation: 'solarEnergyRay 1.6s linear infinite reverse' }}
          />
        </svg>

        {/* Título & Subtítulo */}
        <div className="solar-loader-title">
          <BoltIcon sx={{ color: '#f59e0b', fontSize: 20 }} />
          {title}
        </div>
        
        {subtitle && <div className="solar-loader-subtitle">{subtitle}</div>}

        {/* Barra de Progresso de Carga Solar */}
        <div className="solar-progress-track">
          <div className="solar-progress-bar" />
        </div>
      </div>
    </div>
  );
};

export default SolarLoader;
