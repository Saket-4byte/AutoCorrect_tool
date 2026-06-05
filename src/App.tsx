import { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { EditorPane } from './components/EditorPane';
import { Sidebar } from './components/Sidebar';
import { SettingsModal } from './components/SettingsModal';
import { 
  type Correction, 
  type WritingTone, 
  analyzeTextWithGemini, 
  analyzeTextMock, 
  getMockDemoText 
} from './services/gemini';
import { generateHighlightedHtml } from './services/diff';

function App() {
  // Load configuration from localStorage on mount
  const [text, setText] = useState<string>('');
  const [tone, setTone] = useState<WritingTone>('professional');
  
  const [apiKey, setApiKey] = useState<string>(() => {
    return localStorage.getItem('lumina_write_api_key') || '';
  });
  
  const [model, setModel] = useState<string>(() => {
    return localStorage.getItem('lumina_write_model') || 'gemini-2.0-flash';
  });
  
  const [isDemoMode, setIsDemoMode] = useState<boolean>(() => {
    const savedMode = localStorage.getItem('lumina_write_demo_mode');
    return savedMode === null ? true : savedMode === 'true';
  });

  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  
  const [corrections, setCorrections] = useState<Correction[]>([]);
  const [summaryText, setSummaryText] = useState<string>('');
  const [hasAnalyzed, setHasAnalyzed] = useState<boolean>(false);
  
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'write' | 'review'>('write');

  // Persist settings changes
  useEffect(() => {
    localStorage.setItem('lumina_write_api_key', apiKey);
  }, [apiKey]);

  useEffect(() => {
    localStorage.setItem('lumina_write_model', model);
  }, [model]);

  useEffect(() => {
    localStorage.setItem('lumina_write_demo_mode', String(isDemoMode));
  }, [isDemoMode]);

  // Handle standard editor text modification
  const handleTextChange = (newText: string) => {
    setText(newText);
    // Clear existing corrections when text starts changing to keep state consistent
    setCorrections([]);
    setSummaryText('');
    setHasAnalyzed(false);
    setActiveIndex(null);
    setActiveTab('write');
  };

  // Load demo text and trigger preview immediately for a wow effect
  const handleLoadDemo = () => {
    handleTextChange(getMockDemoText());
  };

  // Run AI / Mock analysis
  const handleAnalyze = async () => {
    if (!text.trim()) return;
    
    setIsAnalyzing(true);
    setActiveIndex(null);
    
    try {
      let result;
      if (isDemoMode) {
        // Artificial delay for premium feel & mock checking simulator
        await new Promise(resolve => setTimeout(resolve, 900));
        result = analyzeTextMock(text, tone);
      } else {
        if (!apiKey) {
          setIsSettingsOpen(true);
          throw new Error('Please enter a Google Gemini API Key or use Demo Sandbox mode.');
        }
        result = await analyzeTextWithGemini(text, apiKey, model, tone);
      }
      
      setCorrections(result.corrections);
      setSummaryText(result.summary);
      setHasAnalyzed(true);
      
      // Auto-toggle tab if suggestions are returned
      if (result.corrections.length > 0) {
        setActiveTab('review');
      } else {
        setActiveTab('write');
      }
    } catch (err: any) {
      const isQuotaError = 
        String(err.message).toLowerCase().includes('quota') || 
        String(err.message).toLowerCase().includes('rate limit') || 
        String(err.message).toLowerCase().includes('billing') ||
        String(err.message).toLowerCase().includes('key');
        
      if (isQuotaError) {
        const confirmSwitch = window.confirm(
          `Gemini AI Error: Rate limit/quota exceeded or invalid API key.\n\n` +
          `Would you like to temporarily switch to "Demo Sandbox Mode" to test the tool offline?`
        );
        if (confirmSwitch) {
          setIsDemoMode(true);
          // Run analysis again in Mock mode immediately!
          setIsAnalyzing(true);
          setTimeout(() => {
            const result = analyzeTextMock(text, tone);
            setCorrections(result.corrections);
            setSummaryText(result.summary);
            setHasAnalyzed(true);
            if (result.corrections.length > 0) {
              setActiveTab('review');
            } else {
              setActiveTab('write');
            }
            setIsAnalyzing(false);
          }, 800);
        }
      } else {
        alert(`Checking failed: ${err.message || err}`);
      }
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Accept/Apply specific correction
  const handleAcceptCorrection = (indexToAccept: number) => {
    if (indexToAccept < 0 || indexToAccept >= corrections.length) return;
    
    const corr = corrections[indexToAccept];
    
    // Replace original phrase with corrected phrase in the editor text
    const prefix = text.substring(0, corr.offset);
    const suffix = text.substring(corr.offset + corr.length);
    const newText = prefix + corr.corrected + suffix;
    
    // Update main text
    setText(newText);
    
    // Shift offsets of other suggestions downstream in the text
    const shiftAmt = corr.corrected.length - corr.length;
    
    const updatedCorrections = corrections
      .filter((_, idx) => idx !== indexToAccept) // Remove accepted correction
      .map(c => {
        // Adjust offsets for downstream corrections only
        if (c.offset > corr.offset) {
          return {
            ...c,
            offset: c.offset + shiftAmt
          };
        }
        return c;
      });
      
    setCorrections(updatedCorrections);
    setActiveIndex(null);
    
    // If all corrections are completed, revert back to write tab
    if (updatedCorrections.length === 0) {
      setActiveTab('write');
    }
  };

  // Reject/Dismiss suggestion card
  const handleDismissCorrection = (indexToDismiss: number) => {
    const updatedCorrections = corrections.filter((_, idx) => idx !== indexToDismiss);
    setCorrections(updatedCorrections);
    setActiveIndex(null);
    
    if (updatedCorrections.length === 0) {
      setActiveTab('write');
    }
  };

  // Accept/Apply all suggestions at once
  const handleAcceptAllCorrections = () => {
    if (corrections.length === 0) return;
    
    // Sort descending by offset so that replacing text at the end of the text
    // doesn't invalidate offsets of preceding corrections.
    const sortedDesc = [...corrections].sort((a, b) => b.offset - a.offset);
    
    let tempText = text;
    for (const corr of sortedDesc) {
      const prefix = tempText.substring(0, corr.offset);
      const suffix = tempText.substring(corr.offset + corr.length);
      tempText = prefix + corr.corrected + suffix;
    }
    
    setText(tempText);
    setCorrections([]);
    setActiveIndex(null);
    setActiveTab('write');
  };

  // HTML rendering for highlighted review view
  const highlightedHtml = generateHighlightedHtml(text, corrections, activeIndex);

  return (
    <div className="app-container">
      <Header 
        isDemoMode={isDemoMode}
        isApiKeyConfigured={!!apiKey}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      <div className="hero-section">
        <div className="hero-badge">
          <span className="badge-spark">✨</span>
          <span>Elevate Your Voice</span>
        </div>
        <h2 className="hero-title">Write with Absolute Confidence</h2>
        <p className="hero-subtitle">
          AI-powered grammar correction, instant spelling checks, and real-time writing enhancement.
        </p>
      </div>

      <main className="workspace-grid">
        <EditorPane 
          text={text}
          onTextChange={handleTextChange}
          tone={tone}
          onToneChange={setTone}
          isAnalyzing={isAnalyzing}
          onAnalyze={handleAnalyze}
          highlightedHtml={highlightedHtml}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          onHighlightClick={setActiveIndex}
          hasCorrections={corrections.length > 0}
          onLoadDemo={handleLoadDemo}
        />

        <Sidebar 
          corrections={corrections}
          onAccept={handleAcceptCorrection}
          onDismiss={handleDismissCorrection}
          activeIndex={activeIndex}
          onSelectIndex={setActiveIndex}
          summary={summaryText}
          hasAnalyzed={hasAnalyzed}
          isDemoMode={isDemoMode}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onAcceptAll={handleAcceptAllCorrections}
        />
      </main>

      <SettingsModal 
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        apiKey={apiKey}
        onSaveApiKey={setApiKey}
        selectedModel={model}
        onSelectModel={setModel}
        isDemoMode={isDemoMode}
        onToggleDemoMode={setIsDemoMode}
      />
    </div>
  );
}

export default App;
