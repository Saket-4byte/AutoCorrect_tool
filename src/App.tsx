import { useState } from 'react';
import { Header } from './components/Header';
import { EditorPane } from './components/EditorPane';
import { Sidebar } from './components/Sidebar';
import { 
  type Correction, 
  type WritingTone, 
  analyzeText, 
  getMockDemoText 
} from './services/gemini';
import { generateHighlightedHtml } from './services/diff';

function App() {
  const [text, setText] = useState<string>('');
  const [tone, setTone] = useState<WritingTone>('professional');
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  
  const [corrections, setCorrections] = useState<Correction[]>([]);
  const [summaryText, setSummaryText] = useState<string>('');
  const [hasAnalyzed, setHasAnalyzed] = useState<boolean>(false);
  
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'write' | 'review'>('write');

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

  // Load demo text and trigger preview immediately
  const handleLoadDemo = () => {
    handleTextChange(getMockDemoText());
  };

  // Run analysis (uses env API key if set, otherwise falls back to mock sandbox)
  const handleAnalyze = async () => {
    if (!text.trim()) return;
    
    setIsAnalyzing(true);
    setActiveIndex(null);
    
    try {
      const result = await analyzeText(text, tone);
      
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
      alert(`Checking failed: ${err.message || err}`);
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
      <Header />

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
          onAcceptAll={handleAcceptAllCorrections}
        />
      </main>
    </div>
  );
}

export default App;
