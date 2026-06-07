import React from 'react';
import { Sparkles, Check, X, Award, ArrowRight } from 'lucide-react';
import type { Correction } from '../services/gemini';

interface SidebarProps {
  corrections: Correction[];
  onAccept: (index: number) => void;
  onDismiss: (index: number) => void;
  activeIndex: number | null;
  onSelectIndex: (index: number | null) => void;
  summary: string;
  hasAnalyzed: boolean;
  onAcceptAll: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  corrections,
  onAccept,
  onDismiss,
  activeIndex,
  onSelectIndex,
  summary,
  hasAnalyzed,
  onAcceptAll
}) => {
  // Categorize counts
  const spellingCount = corrections.filter(c => c.type === 'spelling').length;
  const grammarCount = corrections.filter(c => c.type === 'grammar').length;
  const punctuationCount = corrections.filter(c => c.type === 'punctuation').length;
  const fluencyCount = corrections.filter(c => c.type === 'fluency').length;

  const getCategoryLabel = (type: string) => {
    switch (type) {
      case 'spelling': return 'Spelling';
      case 'grammar': return 'Grammar';
      case 'punctuation': return 'Punctuation';
      case 'fluency': return 'Fluency / Style';
      default: return 'Suggestion';
    }
  };

  return (
    <aside className="app-sidebar">
      {/* 1. Dashboard summary card */}
      <div className="sidebar-summary-card">
        <div className="summary-title">
          <Award size={18} className="summary-title-icon" />
          <h3>Writing Assistant</h3>
        </div>
        
        {!hasAnalyzed ? (
          <p className="summary-instructions">
            Enter your text and click the <strong>Correct Grammar</strong> button to begin checking.
          </p>
        ) : (
          <div className="summary-stats-grid">
            <div className="score-widget">
              <span className="score-value">{corrections.length}</span>
              <span className="score-label">Issues</span>
            </div>
            
            <div className="category-counts">
              <div className="count-row" style={{ color: 'var(--color-spelling)' }}>
                <span>Spelling</span>
                <strong>{spellingCount}</strong>
              </div>
              <div className="count-row" style={{ color: 'var(--color-grammar)' }}>
                <span>Grammar</span>
                <strong>{grammarCount}</strong>
              </div>
              <div className="count-row" style={{ color: 'var(--color-punctuation)' }}>
                <span>Punctuation</span>
                <strong>{punctuationCount}</strong>
              </div>
              <div className="count-row" style={{ color: 'var(--color-fluency)' }}>
                <span>Fluency</span>
                <strong>{fluencyCount}</strong>
              </div>
            </div>
          </div>
        )}

        {hasAnalyzed && summary && (
          <div className="summary-narrative">
            <p>{summary}</p>
          </div>
        )}
      </div>

      {/* 2. List of corrections */}
      <div className="suggestions-list-container">
        <div className="suggestions-list-header">
          <h3>Suggestions ({corrections.length})</h3>
          {corrections.length > 0 && (
            <button className="btn-secondary btn-sm btn-accept-all" onClick={onAcceptAll}>
              Accept All
            </button>
          )}
        </div>

        {!hasAnalyzed ? (
          <div className="suggestions-empty-state">
            <Sparkles size={32} className="pulse-icon" style={{ color: 'var(--color-primary-light)' }} />
            <p>Ready to analyze spelling, grammar, punctuation, and style improvements.</p>
          </div>
        ) : corrections.length === 0 ? (
          <div className="suggestions-empty-state clean">
            <div className="success-badge-large">
              <Check size={28} />
            </div>
            <h4>Looks excellent!</h4>
            <p>We didn't find any spelling, grammar, or style issues. Keep up the great work!</p>
          </div>
        ) : (
          <div className="suggestions-list">
            {corrections.map((corr, idx) => {
              const isActive = activeIndex === idx;
              return (
                <div
                  key={idx}
                  className={`suggestion-card card-${corr.type} ${isActive ? 'active' : ''}`}
                  onClick={() => onSelectIndex(isActive ? null : idx)}
                  onMouseEnter={() => onSelectIndex(idx)}
                >
                  <div className="suggestion-card-header">
                    <span className={`suggestion-tag badge-${corr.type}`}>
                      {getCategoryLabel(corr.type)}
                    </span>
                  </div>

                  <div className="suggestion-correction-diff">
                    <span className="diff-original">{corr.original}</span>
                    <ArrowRight className="diff-arrow" size={14} />
                    <span className="diff-corrected">{corr.corrected || '(remove)'}</span>
                  </div>

                  {isActive ? (
                    <div className="suggestion-card-expanded" onClick={(e) => e.stopPropagation()}>
                      <p className="suggestion-explanation">
                        {corr.explanation}
                      </p>
                      
                      <div className="suggestion-actions">
                        <button 
                          className="btn-suggestion-dismiss" 
                          onClick={() => onDismiss(idx)}
                          title="Ignore suggestion"
                        >
                          <X size={14} />
                          <span>Ignore</span>
                        </button>
                        <button 
                          className={`btn-suggestion-accept accept-${corr.type}`} 
                          onClick={() => onAccept(idx)}
                          title="Accept suggestion"
                        >
                          <Check size={14} />
                          <span>Accept</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="suggestion-card-preview-explanation">
                      {corr.explanation.length > 50 
                        ? `${corr.explanation.substring(0, 50)}...` 
                        : corr.explanation}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </aside>
  );
};
