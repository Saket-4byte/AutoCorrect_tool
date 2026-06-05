import React from 'react';
import { Sparkles, Settings } from 'lucide-react';

interface HeaderProps {
  isDemoMode: boolean;
  isApiKeyConfigured: boolean;
  onOpenSettings: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  isDemoMode,
  isApiKeyConfigured,
  onOpenSettings
}) => {
  return (
    <header className="app-header">
      <div className="header-brand">
        <div className="logo-container">
          <Sparkles className="logo-icon" size={24} />
        </div>
        <div className="brand-text">
          <h1>LuminaWrite</h1>
          <span className="brand-subtitle">Grammarly Lite AI</span>
        </div>
      </div>

      <div className="header-actions">
        {/* Connection status badge */}
        <div className={`status-badge ${isDemoMode ? 'status-demo' : isApiKeyConfigured ? 'status-active' : 'status-missing'}`} onClick={onOpenSettings}>
          <span className="status-dot"></span>
          <span className="status-label">
            {isDemoMode 
              ? 'Demo Sandbox' 
              : isApiKeyConfigured 
                ? 'Gemini Live' 
                : 'Configure API Key'}
          </span>
        </div>

        <button 
          className="btn-icon header-btn" 
          onClick={onOpenSettings}
          title="Open API & AI settings"
          aria-label="Settings"
        >
          <Settings size={20} />
        </button>
      </div>
    </header>
  );
};
