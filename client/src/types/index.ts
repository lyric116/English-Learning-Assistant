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
export interface SentenceStructure {
  type: string;
  explanation: string;
  pattern: string;
}

export interface SentenceClause {
  text: string;
  type: string;
  function: string;
  connector: string;
}

export interface SentenceTense {
  name: string;
  explanation: string;
}

export interface SentenceComponent {
  text: string;
  type: string;
  explanation: string;
}

export interface SentenceWordInfo {
  text: string;
  lemma: string;
  partOfSpeech: string;
  meaning: string;
  role: string;
}

export interface SentencePhrase {
  text: string;
  category: string;
  function: string;
  explanation: string;
}

export interface SentenceGrammarPoint {
  title: string;
  explanation: string;
  tags: string[];
}

export interface SentenceAnalysis {
  structure: SentenceStructure;
  clauses: SentenceClause[];
  tense: SentenceTense[];
  components: SentenceComponent[];
  words: SentenceWordInfo[];
  phrases: SentencePhrase[];
  grammarPoints: SentenceGrammarPoint[];
}

// Reading content
export type ReadingLanguage = 'en' | 'zh';
export type ReadingTopic = 'general' | 'work' | 'travel' | 'technology' | 'culture' | 'education';
export type ReadingDifficulty = 'easy' | 'medium' | 'hard';
export type ReadingLength = 'short' | 'medium' | 'long';

export interface ReadingGenerationConfig {
  language: ReadingLanguage;
  topic: ReadingTopic;
  difficulty: ReadingDifficulty;
  length: ReadingLength;
}

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
  generationConfig?: ReadingGenerationConfig;
}

export interface ReadingFavorite extends ReadingContent {
  savedAt: number;
  tags: string[];
}

// Quiz
export type QuizDifficulty = 'easy' | 'medium' | 'hard';

export interface QuizGenerationConfig {
  testType: 'reading' | 'vocabulary';
  questionCount: number;
  difficulty: QuizDifficulty;
  timedMode: boolean;
  timeLimitMinutes: number;
}

export interface QuizQuestion {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface WrongQuestionRecord {
  id: string;
  type: 'reading' | 'vocabulary';
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  userAnswer: number | null;
  wrongReason: string;
  readingTitle: string;
  sourceQuestionIndex: number;
  difficulty: QuizDifficulty;
  repeatCount: number;
  firstWrongAt: string;
  lastPracticedAt: string;
}

export interface TestResult {
  type: 'reading' | 'vocabulary';
  score: number;
  date: string;
  readingTitle: string;
  questionCount?: number;
  difficulty?: QuizDifficulty;
  timedMode?: boolean;
  timeLimitMinutes?: number;
  timeSpentSeconds?: number;
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
export type ReportTemplateType = 'weekly' | 'exam_sprint' | 'workplace_boost' | 'monthly' | 'term';

export interface LearningReportTemplateSection {
  title: string;
  bullets: string[];
}

export interface LearningReportTemplateProfile {
  templateType: ReportTemplateType;
  title: string;
  sections: LearningReportTemplateSection[];
}

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
  templateType?: ReportTemplateType;
  templateProfile?: LearningReportTemplateProfile;
  timestamp?: number;
}
