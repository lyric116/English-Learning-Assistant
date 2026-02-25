// Flashcard word
export type WordLearningStatus = 'new' | 'reviewing' | 'mastered';

export interface Word {
  word: string;
  phonetic: string;
  definition: string;
  etymology: string;
  example: string;
  exampleTranslation: string;
  learningStatus: WordLearningStatus;
  nextReviewAt: number;
  accuracy: number;
  reviewCount: number;
}

// Sentence analysis
export interface SentenceAnalysis {
  structure: { type: string; explanation: string };
  clauses: Array<{ text: string; type: string; function: string }>;
  tense: Array<{ name: string; explanation: string }>;
  components: Array<{ text: string; type: string; explanation: string }>;
  phrases: Array<{ text: string; type: string; explanation: string }>;
  grammarPoints: Array<{ point: string; explanation: string }>;
}

// Reading content
export interface VocabItem {
  word: string;
  phonetic?: string;
  meaning: string;
  example?: string;
}

export interface ReadingContent {
  english: string;
  chinese: string;
  vocabulary: VocabItem[];
  timestamp?: number;
  title?: string;
}

// Quiz
export interface QuizQuestion {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface TestResult {
  type: 'reading' | 'vocabulary';
  score: number;
  date: string;
  readingTitle: string;
}

export interface FlashcardSessionSummary {
  sessionId: string;
  startedAt: string;
  updatedAt: string;
  extractedCount: number;
  studiedCount: number;
  correctCount: number;
  incorrectCount: number;
  accuracy: number;
  dueCount: number;
}

// AI config
export interface AIConfig {
  apiKey: string;
  baseUrl: string;
  model: string;
}

export interface AIProviderPreset {
  id: string;
  name: string;
  baseUrl: string;
  models: string[];
}

// Learning report
export interface LearningReport {
  title: string;
  period: string;
  summary: string;
  timeStats: { totalHours: number; averageDaily: number; trend: string };
  vocabulary: { learned: number; mastered: number; needReview: number };
  reading: { articles: number; topTopics: string[]; averageDifficulty: string };
  tests: { completed: number; averageScore: number; improvement: string };
  strengths: string[];
  weaknesses: string[];
  suggestions: string[];
  timestamp?: number;
}
