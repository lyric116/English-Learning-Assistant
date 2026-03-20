function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function countEnglishWords(text: string): number {
  return text.match(/[A-Za-z]+(?:['-][A-Za-z]+)*/g)?.length ?? 0;
}

function countCjkCharacters(text: string): number {
  return text.match(/[\u3400-\u9FFF]/g)?.length ?? 0;
}

export function estimateTextTokens(text: string): number {
  const englishWords = countEnglishWords(text);
  const cjkCharacters = countCjkCharacters(text);
  const remainingChars = Math.max(0, text.length - cjkCharacters);
  const punctuationUnits = Math.ceil(remainingChars / 18);

  return Math.max(
    1,
    Math.ceil(englishWords * 1.35) + cjkCharacters + punctuationUnits,
  );
}

export function estimateFlashcardsMaxTokens(maxWords: number): number {
  return clamp(220 + maxWords * 72, 320, 900);
}

export function estimateSentenceMaxTokens(sentence: string): number {
  const signalUnits = countEnglishWords(sentence) + Math.ceil(countCjkCharacters(sentence) * 0.6) + Math.ceil(sentence.length / 35);
  return clamp(520 + signalUnits * 24, 760, 1400);
}

export function estimateReadingMaxTokens(text: string, language: 'en' | 'zh'): number {
  const baseTokens = estimateTextTokens(text);
  const multiplier = language === 'zh' ? 1.45 : 1.15;
  return clamp(Math.ceil(baseTokens * multiplier) + 280, 700, 3200);
}
