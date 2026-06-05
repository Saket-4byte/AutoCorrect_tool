import type { Correction } from './gemini';

/**
 * Escapes unsafe characters to prevent HTML injection in the review pane.
 */
export function escapeHtml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Generates an HTML string with span wrappers for text corrections.
 * Ensures HTML safety and preserves line breaks.
 */
export function generateHighlightedHtml(
  text: string,
  corrections: Correction[],
  activeIndex: number | null
): string {
  if (!text) return '';
  if (corrections.length === 0) {
    return escapeHtml(text).replace(/\n/g, '<br>');
  }

  // Ensure we sort corrections by offset ascending
  const sorted = [...corrections].sort((a, b) => a.offset - b.offset);

  let html = '';
  let lastIdx = 0;

  sorted.forEach((corr, index) => {
    // Verify that the correction sits inside bounds
    if (corr.offset < lastIdx || corr.offset + corr.length > text.length) {
      // Skip invalid offset or overlap
      return;
    }

    // Add normal text leading up to this correction
    html += escapeHtml(text.substring(lastIdx, corr.offset));

    // Determine highlighting classes
    const classes = [
      'correction-highlight',
      `highlight-${corr.type}`,
      activeIndex === index ? 'highlight-active' : ''
    ].filter(Boolean).join(' ');

    // Add wrapped original text
    html += `<span class="${classes}" data-index="${index}">${escapeHtml(corr.original)}</span>`;

    lastIdx = corr.offset + corr.length;
  });

  // Add the remaining text after the last correction
  html += escapeHtml(text.substring(lastIdx));

  // Convert newlines to breaks to preserve paragraphs
  return html.replace(/\n/g, '<br>');
}

/**
 * Utility to calculate readability indices (Flesch Kincaid simplified version / basic estimates)
 * returns a readable categorization.
 */
export function calculateReadability(text: string): {
  score: number;
  label: string;
  readingTimeMin: number;
} {
  const cleanText = text.trim();
  if (!cleanText) {
    return { score: 100, label: 'Easy', readingTimeMin: 0 };
  }

  const words = cleanText.split(/\s+/).filter(w => w.length > 0);
  const wordCount = words.length;
  const sentences = cleanText.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const sentenceCount = Math.max(1, sentences.length);
  
  // Calculate average syllables (rough estimate based on vowel count)
  let syllables = 0;
  words.forEach(w => {
    const vowelMatches = w.match(/[aeiouy]+/gi);
    syllables += vowelMatches ? vowelMatches.length : 1;
  });

  // Flesch Reading Ease formula
  // Score = 206.835 - (1.015 * ASL) - (84.6 * ASW)
  // where ASL = average sentence length, ASW = average syllables per word
  const asl = wordCount / sentenceCount;
  const asw = syllables / wordCount;
  
  let score = Math.round(206.835 - (1.015 * asl) - (84.6 * asw));
  score = Math.max(0, Math.min(100, score));

  let label = 'Medium';
  if (score > 80) label = 'Very Easy';
  else if (score > 60) label = 'Easy';
  else if (score > 40) label = 'Medium';
  else if (score > 20) label = 'Difficult';
  else label = 'Very Difficult';

  // Reading time (average 200 words per minute)
  const readingTimeMin = Math.max(1, Math.round(wordCount / 200));

  return {
    score,
    label,
    readingTimeMin
  };
}
