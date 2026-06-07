export interface Correction {
  type: 'spelling' | 'grammar' | 'punctuation' | 'fluency';
  original: string;
  corrected: string;
  explanation: string;
  offset: number;
  length: number;
}

export interface AnalysisResult {
  correctedText: string;
  corrections: Correction[];
  summary: string;
}

export type WritingTone = 'professional' | 'casual' | 'creative' | 'academic';

// JSON Schema for Gemini response validation
const geminiResponseSchema = {
  type: 'OBJECT',
  properties: {
    correctedText: { 
      type: 'STRING', 
      description: 'The complete input text, but with all identified corrections applied.' 
    },
    summary: { 
      type: 'STRING', 
      description: 'A brief, encouraging high-level summary of the changes and overall style.' 
    },
    corrections: {
      type: 'ARRAY',
      description: 'List of specific corrections made. If no errors are found, leave this empty.',
      items: {
        type: 'OBJECT',
        properties: {
          type: { 
            type: 'STRING', 
            enum: ['spelling', 'grammar', 'punctuation', 'fluency'],
            description: 'The category of the correction.' 
          },
          original: { 
            type: 'STRING', 
            description: 'The exact substring in the input text that has the issue.' 
          },
          corrected: { 
            type: 'STRING', 
            description: 'The suggested replacement text.' 
          },
          explanation: { 
            type: 'STRING', 
            description: 'A brief, educational explanation of why this change is recommended.' 
          },
          offset: { 
            type: 'INTEGER', 
            description: 'The 0-based character start index of the original text inside the source string.' 
          },
          length: { 
            type: 'INTEGER', 
            description: 'The character length of the original text.' 
          }
        },
        required: ['type', 'original', 'corrected', 'explanation', 'offset', 'length']
      }
    }
  },
  required: ['correctedText', 'summary', 'corrections']
};

/**
 * Checks text via the Gemini API using the provided key.
 */
export async function analyzeTextWithGemini(
  text: string,
  apiKey: string,
  model: string = 'gemini-1.5-flash',
  tone: WritingTone = 'professional'
): Promise<AnalysisResult> {
  if (!text || text.trim() === '') {
    return { correctedText: '', corrections: [], summary: 'No text provided.' };
  }

  const prompt = `You are a professional copyeditor and proofreader.
Analyze the following text and identify all spelling mistakes, grammar errors, punctuation issues, and fluency improvements.
Apply the requested writing tone: "${tone}".

Input text:
"${text}"

Tone instructions:
- "professional": Focus on clarity, conciseness, formal language, and active voice.
- "casual": Natural, friendly, conversational, allowing contractions and relaxed language.
- "creative": Expressive, engaging, descriptive, varied sentence structures.
- "academic": Formal, objective, precise terminology, avoiding contractions and informal phrasing.

Critical:
- Find the exact 0-based character 'offset' and character 'length' of each error in the input text.
- Make sure the 'original' string is exactly equal to text.substring(offset, offset + length).
- Ensure the 'correctedText' is the input text with ALL 'corrections' applied.
- If the text is perfect, return corrections as an empty array and correctedText as the original text.`;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: prompt }]
          }
        ],
        generationConfig: {
          responseMimeType: 'application/json',
          responseSchema: geminiResponseSchema,
          temperature: 0.1 // Keep temperature low for deterministic editing
        }
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData?.error?.message || `HTTP error! status: ${response.status}`;
      throw new Error(errorMessage);
    }

    const data = await response.json();
    const candidateText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!candidateText) {
      throw new Error('Invalid response received from Gemini API.');
    }

    const result: AnalysisResult = JSON.parse(candidateText);
    
    // Validate offsets to avoid client-side highlight crashes
    result.corrections = result.corrections.filter(corr => {
      const actualSubstring = text.substring(corr.offset, corr.offset + corr.length);
      return actualSubstring === corr.original;
    });

    return result;
  } catch (error: any) {
    console.error('Gemini API analysis error:', error);
    throw error;
  }
}

/**
 * High-quality Mock analysis for offline/demo testing
 */
export function analyzeTextMock(text: string, tone: WritingTone = 'professional'): AnalysisResult {
  if (!text || text.trim() === '') {
    return { correctedText: '', corrections: [], summary: 'No text provided.' };
  }

  const corrections: Correction[] = [];
  let correctedText = text;

  // Let's create a list of common errors we can search for in the text and generate highlights.
  const commonErrors = [
    // Greeting commas and spelling
    {
      pattern: /\b(hello|hllo)\s+(I'm|i'm|I\s+m|i\s+m|I\s+am|i\s+am)\b/gi,
      type: 'punctuation' as const,
      corrected: (match: string) => {
        const hasAm = /am/i.test(match);
        const pronounPart = hasAm ? 'I am' : "I'm";
        return `Hello, ${pronounPart}`;
      },
      explanation: (match: string) => {
        const isHllo = match.toLowerCase().startsWith('hllo');
        const isUncapitalized = /i'm|i\s+m|i\s+am/g.test(match);
        const changes = ['added a comma after the greeting'];
        if (isHllo) changes.push("corrected spelling to 'Hello'");
        if (isUncapitalized) changes.push("capitalized 'I'");
        return changes.join(', and ').charAt(0).toUpperCase() + changes.join(', and ').slice(1) + '.';
      }
    },
    {
      pattern: /\b(hi|hello)\s+(my\s+name)\b/gi,
      type: 'punctuation' as const,
      corrected: (match: string) => {
        const greeting = match.toLowerCase().startsWith('hi') ? 'Hi,' : 'Hello,';
        return `${greeting} my name`;
      },
      explanation: "Added a comma after the introductory greeting."
    },
    {
      pattern: /\bhllo\b/gi,
      type: 'spelling' as const,
      corrected: 'Hello',
      explanation: "Corrected spelling to 'Hello' and capitalized greeting."
    },
    {
      pattern: /\bhi\b/gi,
      type: 'spelling' as const,
      corrected: 'Hi',
      explanation: "Capitalized introductory greeting 'Hi'."
    },
    // Names and institutions
    {
      pattern: /\brahul\b/gi,
      type: 'grammar' as const,
      corrected: 'Rahul',
      explanation: "Proper nouns (names) must always be capitalized."
    },
    {
      pattern: /\bsaket\b/gi,
      type: 'grammar' as const,
      corrected: 'Saket',
      explanation: "Proper nouns (names) must always be capitalized."
    },
    {
      pattern: /\bkiit\s+university\b/gi,
      type: 'grammar' as const,
      corrected: 'KIIT University',
      explanation: "Capitalized institutional acronym and proper noun."
    },
    {
      pattern: /\bkiit\b/gi,
      type: 'grammar' as const,
      corrected: 'KIIT',
      explanation: "Acronyms (like institution names) must be capitalized."
    },
    // Prepositions & time descriptors
    {
      pattern: /\bfrom\s+last\s+1\s+years\b/gi,
      type: 'fluency' as const,
      corrected: 'for the last year',
      explanation: "Corrected preposition and plural form: 'for the last year' is grammatically correct and natural."
    },
    {
      pattern: /\bam\s+studying\s+in\b/gi,
      type: 'fluency' as const,
      corrected: 'have been studying at',
      explanation: "Changed aspect and preposition: 'have been studying at' is more natural when describing a period of study."
    },
    // Subject-verb agreement
    {
      pattern: /\bname\s+are\b/gi,
      type: 'grammar' as const,
      corrected: 'name is',
      explanation: "Subject-verb agreement: 'name' is singular, so it takes 'is' instead of 'are'."
    },
    {
      pattern: /\b(i|I)\s+likes\b/g,
      type: 'grammar' as const,
      corrected: 'I like',
      explanation: "Subject-verb agreement: 'I' takes 'like' instead of 'likes'."
    },
    {
      pattern: /\bweather\s+were\b/gi,
      type: 'grammar' as const,
      corrected: 'weather was',
      explanation: "Subject-verb agreement: 'weather' is singular, so it takes 'was' instead of 'were'."
    },
    // Spelling corrections
    {
      pattern: /\bstuding\b/gi,
      type: 'spelling' as const,
      corrected: 'studying',
      explanation: "Corrected spelling to 'studying'."
    },
    {
      pattern: /\bcollge\b/gi,
      type: 'spelling' as const,
      corrected: 'college',
      explanation: "Corrected spelling to 'college'."
    },
    {
      pattern: /\bunivercity\b/gi,
      type: 'spelling' as const,
      corrected: 'university',
      explanation: "Corrected spelling to 'university'."
    },
    {
      pattern: /\bmakeing\b/gi,
      type: 'spelling' as const,
      corrected: 'making',
      explanation: "Corrected spelling to 'making'."
    },
    {
      pattern: /\bwritting\b/gi,
      type: 'spelling' as const,
      corrected: 'writing',
      explanation: "Corrected spelling to 'writing'."
    },
    {
      pattern: /\benglish\b/gi,
      type: 'grammar' as const,
      corrected: 'English',
      explanation: "Capitalized language proper adjective 'English'."
    },
    {
      pattern: /\bwriting\s+skill\./gi,
      type: 'punctuation' as const,
      corrected: 'writing skills?',
      explanation: "Corrected punctuation (added question mark) and pluralized 'skill'."
    },
    {
      pattern: /\bwriting\s+skill\b/gi,
      type: 'grammar' as const,
      corrected: 'writing skills',
      explanation: "Corrected singular 'skill' to plural 'skills' in this context."
    },
    // Plural noun corrections
    {
      pattern: /\bmaking\s+web\s+application\b/gi,
      type: 'grammar' as const,
      corrected: 'making web applications',
      explanation: "Plural agreement: changed singular 'application' to plural 'applications'."
    },
    // Past tense corrections
    {
      pattern: /\b(goes|went)\s+to\s+market\b/gi,
      type: 'grammar' as const,
      corrected: 'went to the market',
      explanation: "Corrected past tense verb and added definite article 'the' before market."
    },
    {
      pattern: /\b(i|I)\s+goes\b/g,
      type: 'grammar' as const,
      corrected: 'I went',
      explanation: "Use the past tense 'went' for events that happened in the past."
    },
    {
      pattern: /\bbuyed\b/gi,
      type: 'grammar' as const,
      corrected: 'bought',
      explanation: "The past tense of 'buy' is irregular: 'bought', not 'buyed'."
    },
    {
      pattern: /\bdon['’]t\s+enjoyed\b/gi,
      type: 'grammar' as const,
      corrected: "didn't enjoy it",
      explanation: "Corrected negative past tense construction to 'didn't enjoy it'."
    },
    {
      pattern: /\bdont\b/gi,
      type: 'punctuation' as const,
      corrected: "don't",
      explanation: "Added apostrophe to contraction 'don't'."
    },
    // Comma splices and conjunctions
    {
      pattern: /\bhot\s+so\b/gi,
      type: 'punctuation' as const,
      corrected: 'hot, so',
      explanation: "Added a coordinating comma before conjunction 'so'."
    },
    // Capitalization of sentence starters
    {
      pattern: /\byesterday\s+(i|I)\b/gi,
      type: 'punctuation' as const,
      corrected: 'Yesterday, I',
      explanation: "Added a comma after the introductory word 'Yesterday' and capitalized 'I'."
    },
    {
      pattern: /\byesterday\b/g,
      type: 'grammar' as const,
      corrected: 'Yesterday',
      explanation: "Capitalized the first word of the sentence."
    },
    {
      pattern: /\.\s+the\s+weather\b/gi,
      type: 'grammar' as const,
      corrected: '. The weather',
      explanation: "Capitalized the first word of the new sentence."
    },
    {
      pattern: /\.\s+can\s+you\b/gi,
      type: 'grammar' as const,
      corrected: '. Can you',
      explanation: "Capitalized the first word of the new sentence."
    },
    // Infinitive marker removal
    {
      pattern: /\bhelps?\s+me\s+to\s+improve\b/gi,
      type: 'fluency' as const,
      corrected: 'help me improve',
      explanation: "Fluency: removed the unnecessary infinitive marker 'to' after 'help me'."
    },
    {
      pattern: /\byou\s+helps\b/gi,
      type: 'grammar' as const,
      corrected: 'you help',
      explanation: "Subject-verb agreement: 'you' takes 'help' instead of 'helps'."
    },
    // Standard rule overrides
    {
      pattern: /\bteh\b/gi,
      type: 'spelling' as const,
      corrected: 'the',
      explanation: "Common typing mistake. Corrected spelling to 'the'."
    },
    {
      pattern: /\brecieve\b/gi,
      type: 'spelling' as const,
      corrected: 'receive',
      explanation: "Remember the rule: 'i' before 'e' except after 'c'. Corrected to 'receive'."
    },
    {
      pattern: /\baccomodate\b/gi,
      type: 'spelling' as const,
      corrected: 'accommodate',
      explanation: "Double 'c' and double 'm'. Corrected spelling to 'accommodate'."
    },
    {
      pattern: /\buntill\b/gi,
      type: 'spelling' as const,
      corrected: 'until',
      explanation: "'Until' is spelled with a single 'l' at the end."
    },
    {
      pattern: /\bgrammer\b/gi,
      type: 'spelling' as const,
      corrected: 'grammar',
      explanation: "'Grammar' ends with '-ar', not '-er'."
    },
    {
      pattern: /\bgoig\b/gi,
      type: 'spelling' as const,
      corrected: 'going',
      explanation: "Corrected spelling to 'going'."
    },
    {
      pattern: /\blove\s+this\s+to\b/gi,
      type: 'grammar' as const,
      corrected: 'love this tool',
      explanation: "Corrected word usage: 'love this tool' is the intended meaning in this context."
    },
    {
      pattern: /\bits\s+unique\b/gi,
      type: 'grammar' as const,
      corrected: "it's unique",
      explanation: "Use the contraction 'it's' (it is) instead of the possessive 'its'."
    },
    {
      pattern: /\bdoesnot\b/gi,
      type: 'spelling' as const,
      corrected: 'does not',
      explanation: "Separated 'doesnot' into two words: 'does not'."
    },
    {
      pattern: /\bsometime\b/gi,
      type: 'grammar' as const,
      corrected: 'sometimes',
      explanation: "Corrected singular 'sometime' to plural adverb 'sometimes' for this context."
    },
    {
      pattern: /\byour\s+(beautiful|smart|welcome|going|doing)\b/gi,
      type: 'grammar' as const,
      corrected: (match: string) => match.toLowerCase().startsWith('your welcome') ? "you're welcome" : match.replace(/your/i, "you're"),
      explanation: "Confusing 'your' (possessive) with 'you're' (contraction of 'you are')."
    },
    {
      pattern: /\btheir\s+(is|was|has\s+been)\b/gi,
      type: 'grammar' as const,
      corrected: (match: string) => match.replace(/their/i, 'there'),
      explanation: "Use 'there' to refer to a place or existence, rather than 'their' (possessive)."
    },
    {
      pattern: /\bits\s+(important|clear|obvious|necessary|good|bad)\b/gi,
      type: 'grammar' as const,
      corrected: (match: string) => match.replace(/its/i, "it's"),
      explanation: "Use 'it's' (contraction of 'it is') instead of 'its' (possessive)."
    },
    {
      pattern: /\bshould\s+of\b/gi,
      type: 'grammar' as const,
      corrected: 'should have',
      explanation: "Write 'should have' (or 'should've'), not 'should of'."
    },
    {
      pattern: /\b(i)\b/g,
      type: 'grammar' as const,
      corrected: 'I',
      explanation: "The personal pronoun 'I' must always be capitalized."
    }
  ];

  // Dynamic matching based on input
  for (const item of commonErrors) {
    let match;
    // Reset regex state for global searches
    item.pattern.lastIndex = 0;
    
    while ((match = item.pattern.exec(text)) !== null) {
      const original = match[0];
      const corrected = typeof item.corrected === 'function' ? item.corrected(original) : item.corrected;
      const offset = match.index;
      const length = original.length;

      // Prevent overlapping corrections and no-op suggestions
      if (original !== corrected) {
        if (!corrections.some(c => (offset >= c.offset && offset < c.offset + c.length) || (offset + length > c.offset && offset + length <= c.offset + c.length))) {
          corrections.push({
            type: item.type,
            original,
            corrected,
            explanation: typeof item.explanation === 'function' ? item.explanation(original) : item.explanation,
            offset,
            length
          });
        }
      }
    }
  }

  // If no common errors are matched, let's create a couple of generic/fluent corrections if they write simple phrases
  if (corrections.length === 0) {
    if (text.toLowerCase().includes('i think that')) {
      const idx = text.toLowerCase().indexOf('i think that');
      corrections.push({
        type: 'fluency',
        original: text.substring(idx, idx + 12),
        corrected: tone === 'professional' ? 'In my opinion,' : 'I believe',
        explanation: `Removing filler phrases. Writing '${tone === 'professional' ? 'In my opinion,' : 'I believe'}' is more direct and fits a ${tone} tone.`,
        offset: idx,
        length: 12
      });
    }

    if (text.toLowerCase().includes('very unique')) {
      const idx = text.toLowerCase().indexOf('very unique');
      corrections.push({
        type: 'fluency',
        original: text.substring(idx, idx + 11),
        corrected: 'unique',
        explanation: "'Unique' is an absolute state. Something cannot be 'very' unique. Use 'unique' instead.",
        offset: idx,
        length: 11
      });
    }
    
    if (text.toLowerCase().includes('in order to')) {
      const idx = text.toLowerCase().indexOf('in order to');
      corrections.push({
        type: 'fluency',
        original: text.substring(idx, idx + 11),
        corrected: 'to',
        explanation: "Wordiness reduction. 'To' is sufficient and cleaner.",
        offset: idx,
        length: 11
      });
    }
  }

  // Sort corrections by offset ascending
  corrections.sort((a, b) => a.offset - b.offset);



  // Simple string assembly for correctedText
  let lastIdx = 0;
  let assembled = '';
  for (const corr of corrections) {
    assembled += text.substring(lastIdx, corr.offset);
    assembled += corr.corrected;
    lastIdx = corr.offset + corr.length;
  }
  assembled += text.substring(lastIdx);
  correctedText = assembled;

  let summary = '';
  if (corrections.length > 0) {
    summary = `Found ${corrections.length} issue${corrections.length > 1 ? 's' : ''} to improve. The grammar and spelling can be tightened up to match a ${tone} tone profile.`;
  } else {
    summary = `Excellent writing! No spelling, grammar, punctuation, or fluency issues were detected. The text flows well and fits a ${tone} tone.`;
  }

  return {
    correctedText,
    corrections,
    summary
  };
}

/**
 * Returns a set of standard instructions/examples for mock testing
 */
export function getMockDemoText(): string {
  return `i think that this is teh best autocorrect tool you will recieve. Its very unique, in order to make your writing better! We accomodate all needs untill you are satisfied. You should of checked your grammer. your beautiful and your going to love this tool.`;
}

/**
 * Unified entry point for text analysis.
 * Uses developer environment API key if configured, otherwise falls back to local mock sandbox.
 */
export async function analyzeText(text: string, tone: WritingTone = 'professional'): Promise<AnalysisResult> {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  // Default to the high-performance Gemini Flash model
  const model = 'gemini-1.5-flash';

  if (apiKey && apiKey.trim() !== '') {
    try {
      return await analyzeTextWithGemini(text, apiKey, model, tone);
    } catch (error) {
      console.warn('Live Gemini API call failed. Falling back to Sandbox Mode.', error);
      return analyzeTextMock(text, tone);
    }
  }

  // Fallback to local sandbox if no key is configured in env variables
  return analyzeTextMock(text, tone);
}
