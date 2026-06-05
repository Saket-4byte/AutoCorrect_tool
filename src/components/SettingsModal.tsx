import React, { useState } from 'react';
import { X, Eye, EyeOff, Info, Shield, Key } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  apiKey: string;
  onSaveApiKey: (key: string) => void;
  selectedModel: string;
  onSelectModel: (model: string) => void;
  isDemoMode: boolean;
  onToggleDemoMode: (isDemo: boolean) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  apiKey,
  onSaveApiKey,
  selectedModel,
  onSelectModel,
  isDemoMode,
  onToggleDemoMode
}) => {
  const [keyInput, setKeyInput] = useState(apiKey);
  const [showKey, setShowKey] = useState(false);
  const [model, setModel] = useState(selectedModel);
  const [demo, setDemo] = useState(isDemoMode);

  if (!isOpen) return null;

  const handleSave = () => {
    onSaveApiKey(keyInput);
    onSelectModel(model);
    onToggleDemoMode(demo);
    onClose();
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-container">
        <div className="modal-header">
          <div className="modal-title">
            <Key className="title-icon" size={20} />
            <h2>Settings & API Integration</h2>
          </div>
          <button className="btn-icon modal-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="modal-body">
          {/* Operation Mode */}
          <div className="setting-section">
            <h3>Operation Mode</h3>
            <p className="setting-description">
              Choose whether to use local sandbox simulated corrections or connect directly to the live Gemini AI model.
            </p>
            <div className="mode-toggle-group">
              <button 
                type="button"
                className={`mode-btn ${demo ? 'active' : ''}`}
                onClick={() => setDemo(true)}
              >
                <span>Demo Sandbox</span>
                <small>No API Key required (Offline-friendly)</small>
              </button>
              <button 
                type="button"
                className={`mode-btn ${!demo ? 'active' : ''}`}
                onClick={() => setDemo(false)}
              >
                <span>Live Gemini AI</span>
                <small>Requires a Google Gemini API Key</small>
              </button>
            </div>
          </div>

          {/* API Key configuration */}
          {!demo && (
            <div className="setting-section">
              <h3>Google Gemini API Key</h3>
              <p className="setting-description">
                Don't have a key? You can get a <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="external-link">FREE Gemini API Key here</a>.
              </p>
              
              <div className="input-with-button">
                <input
                  type={showKey ? 'text' : 'password'}
                  className="input-text"
                  placeholder="Paste your AI Studio API key here..."
                  value={keyInput}
                  onChange={(e) => setKeyInput(e.target.value)}
                />
                <button
                  type="button"
                  className="btn-icon toggle-reveal"
                  onClick={() => setShowKey(!showKey)}
                  title={showKey ? 'Hide key' : 'Show key'}
                >
                  {showKey ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              
              <div className="security-notice">
                <Shield size={14} className="notice-icon" />
                <span>Your API key is saved locally in your browser's <code>localStorage</code>. It is sent directly to Google APIs and never stored on external servers.</span>
              </div>
            </div>
          )}

          {/* Model Selection */}
          {!demo && (
            <div className="setting-section">
              <h3>Select AI Model</h3>
              <p className="setting-description">
                Choose the Gemini model version. Gemini 2.0 Flash is recommended for balanced speed and accuracy.
              </p>
              <select
                className="select-dropdown"
                value={model}
                onChange={(e) => setModel(e.target.value)}
              >
                <option value="gemini-2.5-flash">Gemini 2.5 Flash (Ultra fast & state of the art)</option>
                <option value="gemini-2.0-flash">Gemini 2.0 Flash (Fast & reliable)</option>
                <option value="gemini-1.5-flash">Gemini 1.5 Flash (Solid legacy option)</option>
              </select>
            </div>
          )}

          {/* Info Card */}
          <div className="modal-info-card">
            <Info size={16} className="info-icon" />
            <div>
              <h4>Did you know?</h4>
              <p>Gemini APIs have a highly generous free-tier allowing up to 15 requests per minute, which is perfect for grammar and spelling autocorrect checks!</p>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="btn-primary" onClick={handleSave}>
            Save Configuration
          </button>
        </div>
      </div>
    </div>
  );
};
