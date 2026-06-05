import React from 'react';
import { Trash2, FileText, CheckCircle2, RefreshCw, PenTool, BookOpen } from 'lucide-react';
import type { WritingTone } from '../services/gemini';
import { calculateReadability } from '../services/diff';

interface EditorPaneProps {
  text: string;
  onTextChange: (text: string) => void;
  tone: WritingTone;
  onToneChange: (tone: WritingTone) => void;
  isAnalyzing: boolean;
  onAnalyze: () => void;
  highlightedHtml: string;
  activeTab: 'write' | 'review';
  onTabChange: (tab: 'write' | 'review') => void;
  onHighlightClick: (index: number) => void;
  hasCorrections: boolean;
  onLoadDemo: () => void;
}

export const EditorPane: React.FC<EditorPaneProps> = ({
  text,
  onTextChange,
  tone,
  onToneChange,
  isAnalyzing,
  onAnalyze,
  highlightedHtml,
  activeTab,
  onTabChange,
  onHighlightClick,
  hasCorrections,
  onLoadDemo
}) => {
  const stats = calculateReadability(text);
  const wordCount = text.trim() === '' ? 0 : text.trim().split(/\s+/).length;
  const charCount = text.length;

  const handleContainerClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // Check if the click target is a correction span
    const target = e.target as HTMLElement;
    if (target.classList.contains('correction-highlight')) {
      const indexAttr = target.getAttribute('data-index');
      if (indexAttr !== null) {
        onHighlightClick(parseInt(indexAttr, 10));
      }
    }
  };

  return (
    <div className="editor-card">
      <div className="editor-header">
        <div className="tab-group">
          <button
            className={`tab-btn ${activeTab === 'write' ? 'active' : ''}`}
            onClick={() => onTabChange('write')}
          >
            <PenTool size={16} />
            <span>Write</span>
          </button>
          <button
            className={`tab-btn ${activeTab === 'review' ? 'active' : ''}`}
            onClick={() => onTabChange('review')}
            disabled={!hasCorrections}
            title={!hasCorrections ? 'Analyze your text first to review corrections' : ''}
          >
            <BookOpen size={16} />
            <span>Review {hasCorrections && <span className="tab-badge">!</span>}</span>
          </button>
        </div>

        <div className="tone-selector">
          <label htmlFor="tone-select">Tone:</label>
          <select
            id="tone-select"
            value={tone}
            onChange={(e) => onToneChange(e.target.value as WritingTone)}
            disabled={isAnalyzing}
          >
            <option value="professional">💼 Professional</option>
            <option value="casual">💬 Casual</option>
            <option value="academic">🎓 Academic</option>
            <option value="creative">🎨 Creative</option>
          </select>
        </div>
      </div>

      <div className="editor-content-area">
        {activeTab === 'write' ? (
          <textarea
            className="editor-textarea"
            placeholder="Type or paste your text here to correct..."
            value={text}
            onChange={(e) => onTextChange(e.target.value)}
            disabled={isAnalyzing}
          />
        ) : (
          <div 
            className="editor-highlighted-view"
            onClick={handleContainerClick}
            dangerouslySetInnerHTML={{ __html: highlightedHtml }}
          />
        )}

        {isAnalyzing && (
          <div className="analysis-overlay">
            <div className="loading-spinner-container">
              <RefreshCw className="spinner-icon animate-spin" size={40} />
              <p>Lumina AI is proofreading...</p>
            </div>
          </div>
        )}
      </div>

      <div className="editor-footer">
        <div className="editor-stats">
          <div className="stat-pill" title="Word count">
            <FileText size={14} />
            <span>{wordCount} words</span>
          </div>
          <div className="stat-pill" title="Character count">
            <span>{charCount} chars</span>
          </div>
          {text.trim() && (
            <>
              <div className="stat-pill" title="Readability estimate">
                <span>Readability: <strong>{stats.label}</strong> ({stats.score})</span>
              </div>
              <div className="stat-pill" title="Estimated reading time">
                <span>⏱️ {stats.readingTimeMin} min read</span>
              </div>
            </>
          )}
        </div>

        <div className="editor-actions">
          {text.trim() === '' && (
            <button 
              className="btn-secondary btn-sm" 
              onClick={onLoadDemo}
              disabled={isAnalyzing}
            >
              Load Demo Text
            </button>
          )}
          
          {text.trim() !== '' && (
            <button 
              className="btn-icon btn-danger" 
              onClick={() => onTextChange('')}
              disabled={isAnalyzing}
              title="Clear editor"
            >
              <Trash2 size={16} />
            </button>
          )}

          <button
            className={`btn-primary btn-analyze ${isAnalyzing ? 'loading' : ''}`}
            onClick={onAnalyze}
            disabled={isAnalyzing || text.trim() === ''}
          >
            {isAnalyzing ? (
              <>
                <RefreshCw size={16} className="animate-spin" />
                <span>Checking...</span>
              </>
            ) : (
              <>
                <CheckCircle2 size={16} />
                <span>Proofread text</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
