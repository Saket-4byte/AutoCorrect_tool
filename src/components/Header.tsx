import React from 'react';
import { Sparkles } from 'lucide-react';

export const Header: React.FC = () => {
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
    </header>
  );
};
