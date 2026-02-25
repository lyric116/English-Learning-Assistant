import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Select } from '@/components/ui/Select';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { FeedbackAlert } from '@/components/ui/FeedbackAlert';
import { useToast } from '@/components/ui/toast-context';
import { useLocalStorage } from '@/hooks/use-local-storage';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { ModuleSection } from '@/components/layout/ModuleSection';
import {
  BookOpen, Type, ListChecks, RotateCcw,
  Trophy, ChevronRight, AlertTriangle, CheckCircle2, XCircle,
} from 'lucide-react';
import type {
  QuizDifficulty,
  QuizGenerationConfig,
  QuizQuestion,
  ReadingContent,
  TestResult,
  WrongQuestionRecord,
} from '@/types';
import { AIConfigBanner } from '@/components/settings/AIConfigBanner';

type Phase = 'select' | 'quiz' | 'result';
const QUIZ_DIFFICULTY_LABELS: Record<QuizDifficulty, string> = {
  easy: '基础',
  medium: '进阶',
  hard: '高阶',
};
const QUESTION_COUNT_OPTIONS = [5, 10, 15, 20];

interface QuizMetrics {
  total: number;
  answered: number;
  unanswered: number;
  correct: number;
  incorrect: number;
  accuracy: number;
  score: number;
}

function calculateQuizMetrics(questions: QuizQuestion[], userAnswers: Array<number | null>): QuizMetrics {
  const total = questions.length;
  if (total === 0) {
    return {
      total: 0,
      answered: 0,
      unanswered: 0,
      correct: 0,
      incorrect: 0,
      accuracy: 0,
      score: 0,
    };
  }

  let answered = 0;
  let correct = 0;
  questions.forEach((question, index) => {
    const userAnswer = userAnswers[index];
    if (typeof userAnswer === 'number') {
      answered += 1;
    }
    if (userAnswer === question.correctIndex) {
      correct += 1;
    }
  });

  const unanswered = total - answered;
  const incorrect = total - correct;
  const score = Math.round((correct / total) * 100);
  const accuracy = answered > 0 ? Math.round((correct / answered) * 100) : 0;

  return {
    total,
    answered,
    unanswered,
    correct,
    incorrect,
    accuracy,
    score,
  };
}

function createWrongQuestionId(type: 'reading' | 'vocabulary', question: string): string {
  return `${type}:${question.trim().toLowerCase()}`;
}

function inferWrongReason(type: 'reading' | 'vocabulary'): string {
  return type === 'reading' ? '阅读信息定位偏差' : '词义/用法辨析错误';
}

function normalizeWrongQuestionRecord(record: WrongQuestionRecord): WrongQuestionRecord {
  return {
    ...record,
    repeatCount: typeof record.repeatCount === 'number' && record.repeatCount > 0 ? record.repeatCount : 1,
    firstWrongAt: record.firstWrongAt || record.lastPracticedAt || new Date().toISOString(),
    lastPracticedAt: record.lastPracticedAt || record.firstWrongAt || new Date().toISOString(),
    difficulty: record.difficulty || 'medium',
    wrongReason: record.wrongReason || inferWrongReason(record.type),
  };
}

export function QuizPage() {
  const quizContextKey = 'quizCurrentReading';
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const routeState = (location.state as {
    currentReading?: ReadingContent;
    quizMode?: 'normal' | 'wrong-book';
    wrongType?: 'reading' | 'vocabulary';
  }) ?? {};
  const routeReading = routeState.currentReading ?? null;
  const routeWrongMode = routeState.quizMode === 'wrong-book';
  const routeWrongType = routeState.wrongType ?? 'vocabulary';
  const autoRetryStartedRef = useRef(false);
  const timeoutSubmittedRef = useRef(false);

  const [phase, setPhase] = useState<Phase>('select');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [qIndex, setQIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<(number | null)[]>([]);
  const [answered, setAnswered] = useState(false);
  const [testType, setTestType] = useState<'reading' | 'vocabulary'>('reading');
  const [showReview, setShowReview] = useState(false);
  const [difficulty, setDifficulty] = useState<QuizDifficulty>('medium');
  const [questionCount, setQuestionCount] = useState(5);
  const [timedMode, setTimedMode] = useState(false);
  const [timeLimitMinutes, setTimeLimitMinutes] = useState(15);
  const [activeConfig, setActiveConfig] = useState<QuizGenerationConfig | null>(null);
  const [quizStartedAt, setQuizStartedAt] = useState<number | null>(null);
  const [wrongBookMode, setWrongBookMode] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);
  const [storedReading, setStoredReading] = useLocalStorage<ReadingContent | null>(quizContextKey, null);
  const [testHistory, setTestHistory] = useLocalStorage<TestResult[]>('testHistory', []);
  const [wrongQuestionBook, setWrongQuestionBook] = useLocalStorage<WrongQuestionRecord[]>('wrongQuestionBook', []);
  const currentReading = routeReading ?? storedReading;
  const restoredFromStorage = !routeReading && !!storedReading;

  useEffect(() => {
    if (routeReading) {
      setStoredReading(routeReading);
    }
  }, [routeReading, setStoredReading]);

  useEffect(() => {
    const hasLegacy = wrongQuestionBook.some(item => (
      typeof item.repeatCount !== 'number'
      || !item.firstWrongAt
      || !item.lastPracticedAt
      || !item.wrongReason
    ));
    if (!hasLegacy) return;
    setWrongQuestionBook(prev => prev.map(item => normalizeWrongQuestionRecord(item)));
  }, [setWrongQuestionBook, wrongQuestionBook]);

  const startQuiz = async (type: 'reading' | 'vocabulary') => {
    if (!currentReading) {
      toast('没有阅读内容，请先在阅读页面生成内容', 'warning');
      navigate('/reading');
      return;
    }
    if (questionCount < 1 || questionCount > 20) {
      toast('题量必须在 1 到 20 之间', 'warning');
      return;
    }
    if (timeLimitMinutes < 1 || timeLimitMinutes > 60) {
      toast('限时分钟必须在 1 到 60 之间', 'warning');
      return;
    }
    setErrorMessage('');
    setTestType(type);
    setWrongBookMode(false);
    setLoading(true);
    try {
      const config: QuizGenerationConfig = {
        testType: type,
        questionCount,
        difficulty,
        timedMode,
        timeLimitMinutes,
      };
      const result = type === 'reading'
        ? await api.quiz.readingQuestions(currentReading.english, {
          questionCount,
          difficulty,
          timedMode,
          timeLimitMinutes,
        }) as QuizQuestion[]
        : await api.quiz.vocabularyQuestions(currentReading.vocabulary, {
          questionCount,
          difficulty,
          timedMode,
          timeLimitMinutes,
        }) as QuizQuestion[];
      if (!Array.isArray(result) || result.length === 0) {
        toast('未生成有效题目，请重试或更换阅读内容', 'warning');
        return;
      }
      setQuestions(result);
      setActiveConfig(config);
      setUserAnswers(new Array(result.length).fill(null));
      setQIndex(0);
      setAnswered(false);
      setQuizStartedAt(Date.now());
      timeoutSubmittedRef.current = false;
      setRemainingSeconds(config.timedMode ? config.timeLimitMinutes * 60 : null);
      setPhase('quiz');
      setErrorMessage('');
      toast(`已生成 ${result.length} 道${type === 'reading' ? '阅读理解' : '词汇'}题`, 'success');
    } catch (err) {
      const message = (err as Error).message;
      setErrorMessage(message);
      toast(`生成测试题失败: ${message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const startWrongBookQuiz = useCallback((type: 'reading' | 'vocabulary') => {
    const source = wrongQuestionBook
      .filter(item => item.type === type)
      .sort((a, b) => {
        if (b.repeatCount !== a.repeatCount) return b.repeatCount - a.repeatCount;
        return Date.parse(a.lastPracticedAt) - Date.parse(b.lastPracticedAt);
      });

    if (source.length === 0) {
      toast(type === 'reading' ? '暂无阅读错题可重练' : '暂无词汇错题可重练', 'warning');
      return;
    }

    const selected = source.slice(0, questionCount);
    const questionsFromWrongBook = selected.map(item => ({
      question: item.question,
      options: item.options,
      correctIndex: item.correctIndex,
      explanation: item.explanation,
    }));

    const config: QuizGenerationConfig = {
      testType: type,
      questionCount: questionsFromWrongBook.length,
      difficulty,
      timedMode,
      timeLimitMinutes,
    };

    setTestType(type);
    setWrongBookMode(true);
    setActiveConfig(config);
    setQuestions(questionsFromWrongBook);
    setUserAnswers(new Array(questionsFromWrongBook.length).fill(null));
    setQIndex(0);
    setAnswered(false);
    setShowReview(false);
    setQuizStartedAt(Date.now());
    timeoutSubmittedRef.current = false;
    setRemainingSeconds(config.timedMode ? config.timeLimitMinutes * 60 : null);
    setErrorMessage('');
    setPhase('quiz');
    toast(`已加载 ${questionsFromWrongBook.length} 道${type === 'reading' ? '阅读' : '词汇'}错题`, 'success');
  }, [difficulty, questionCount, timeLimitMinutes, timedMode, toast, wrongQuestionBook]);

  useEffect(() => {
    if (!routeWrongMode || autoRetryStartedRef.current || phase !== 'select' || loading) return;
    autoRetryStartedRef.current = true;
    startWrongBookQuiz(routeWrongType);
  }, [loading, phase, routeWrongMode, routeWrongType, startWrongBookQuiz]);

  const selectOption = useCallback((optionIdx: number) => {
    if (answered) return;
    setUserAnswers(prev => {
      const next = [...prev];
      next[qIndex] = optionIdx;
      return next;
    });
    setAnswered(true);
  }, [answered, qIndex]);

  const finalizeQuiz = useCallback((reason: 'complete' | 'timeout' = 'complete') => {
    if (phase !== 'quiz' || questions.length === 0) return;
    const metrics = calculateQuizMetrics(questions, userAnswers);
    const timeSpentSeconds = quizStartedAt
      ? Math.max(1, Math.round((Date.now() - quizStartedAt) / 1000))
      : undefined;
    const nowIso = new Date().toISOString();
    const wrongItems = questions
      .map((question, index) => ({
        question,
        userAnswer: userAnswers[index],
        sourceQuestionIndex: index,
      }))
      .filter(item => item.userAnswer !== item.question.correctIndex);
    setTestHistory(prev => [...prev, {
      type: testType,
      score: metrics.score,
      date: new Date().toISOString(),
      readingTitle: currentReading?.title || '未知阅读',
      questionCount: activeConfig?.questionCount ?? questions.length,
      difficulty: activeConfig?.difficulty ?? difficulty,
      timedMode: activeConfig?.timedMode ?? false,
      timeLimitMinutes: activeConfig?.timeLimitMinutes ?? 15,
      timeSpentSeconds,
    }].slice(-20));
    if (wrongItems.length > 0) {
      setWrongQuestionBook(prev => {
        const mapped = new Map(prev.map(item => [item.id, normalizeWrongQuestionRecord(item)]));
        wrongItems.forEach(item => {
          const id = createWrongQuestionId(testType, item.question.question);
          const existing = mapped.get(id);
          if (existing) {
            mapped.set(id, {
              ...existing,
              options: item.question.options,
              correctIndex: item.question.correctIndex,
              explanation: item.question.explanation,
              userAnswer: item.userAnswer,
              sourceQuestionIndex: item.sourceQuestionIndex,
              readingTitle: currentReading?.title || existing.readingTitle,
              difficulty: activeConfig?.difficulty ?? existing.difficulty,
              repeatCount: existing.repeatCount + 1,
              wrongReason: existing.wrongReason || inferWrongReason(testType),
              lastPracticedAt: nowIso,
            });
            return;
          }
          mapped.set(id, {
            id,
            type: testType,
            question: item.question.question,
            options: item.question.options,
            correctIndex: item.question.correctIndex,
            explanation: item.question.explanation,
            userAnswer: item.userAnswer,
            wrongReason: inferWrongReason(testType),
            readingTitle: currentReading?.title || '未知阅读',
            sourceQuestionIndex: item.sourceQuestionIndex,
            difficulty: activeConfig?.difficulty ?? difficulty,
            repeatCount: 1,
            firstWrongAt: nowIso,
            lastPracticedAt: nowIso,
          });
        });
        return Array.from(mapped.values()).sort((a, b) => (
          Date.parse(b.lastPracticedAt) - Date.parse(a.lastPracticedAt)
        ));
      });
    }
    setRemainingSeconds(null);
    setPhase('result');
    if (reason === 'timeout') {
      toast('已超时，系统已自动交卷', 'warning');
    }
  }, [activeConfig, currentReading?.title, difficulty, phase, questions, quizStartedAt, setTestHistory, setWrongQuestionBook, testType, toast, userAnswers]);

  const nextQuestion = useCallback(() => {
    if (!answered) return;
    if (qIndex + 1 >= questions.length) {
      finalizeQuiz('complete');
    } else {
      setQIndex(i => i + 1);
      setAnswered(false);
    }
  }, [answered, finalizeQuiz, qIndex, questions.length]);

  // Keyboard shortcuts
  useEffect(() => {
    if (phase !== 'quiz') return;
    const handler = (e: KeyboardEvent) => {
      if (e.key >= '1' && e.key <= '4' && !answered) {
        const idx = parseInt(e.key) - 1;
        if (idx < (questions[qIndex]?.options.length ?? 0)) selectOption(idx);
      }
      if ((e.key === 'Enter' || e.key === ' ') && answered) {
        e.preventDefault();
        nextQuestion();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [phase, answered, qIndex, questions, selectOption, nextQuestion]);

  useEffect(() => {
    if (phase !== 'quiz' || !activeConfig?.timedMode || remainingSeconds === null || remainingSeconds <= 0) return;
    const timer = window.setInterval(() => {
      setRemainingSeconds(prev => (prev === null ? null : Math.max(0, prev - 1)));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [activeConfig?.timedMode, phase, remainingSeconds]);

  useEffect(() => {
    if (phase !== 'quiz' || !activeConfig?.timedMode || remainingSeconds === null || remainingSeconds > 0) return;
    if (timeoutSubmittedRef.current) return;
    timeoutSubmittedRef.current = true;
    finalizeQuiz('timeout');
  }, [activeConfig?.timedMode, finalizeQuiz, phase, remainingSeconds]);

  const metrics = useMemo(() => calculateQuizMetrics(questions, userAnswers), [questions, userAnswers]);
  const q = questions[qIndex];

  const wrongQuestions = questions
    .map((q, i) => ({ ...q, userAnswer: userAnswers[i], index: i }))
    .filter(q => q.userAnswer !== q.correctIndex);
  const readingWrongCount = wrongQuestionBook.filter(item => item.type === 'reading').length;
  const vocabularyWrongCount = wrongQuestionBook.filter(item => item.type === 'vocabulary').length;
  const wrongBookTotal = wrongQuestionBook.length;
  const highRepeatWrongCount = wrongQuestionBook.filter(item => item.repeatCount >= 2).length;
  const latestWrong = wrongQuestionBook[0] ?? null;
  const timerMinutes = remainingSeconds === null ? 0 : Math.floor(remainingSeconds / 60);
  const timerSeconds = remainingSeconds === null ? 0 : remainingSeconds % 60;
  const timerText = `${String(timerMinutes).padStart(2, '0')}:${String(timerSeconds).padStart(2, '0')}`;
  const timerUrgent = remainingSeconds !== null && remainingSeconds <= 60;

  const scoreColor = metrics.score >= 80 ? 'text-green-500' : metrics.score >= 60 ? 'text-yellow-500' : 'text-red-500';
  const scoreEmoji = metrics.score >= 90 ? '🎉' : metrics.score >= 70 ? '👍' : metrics.score >= 50 ? '💪' : '📚';

  return (
    <div className="max-w-4xl mx-auto animate-fade-in-up">
      <AIConfigBanner />
      {errorMessage && (
        <FeedbackAlert
          type="error"
          message={errorMessage}
          onClose={() => setErrorMessage('')}
          className="mb-6"
        />
      )}

      <ModuleSection
        index={0}
        type="input"
        title="选择测试输入"
        description="设置题型参数后开始测试。"
      >
        {phase === 'select' && !loading ? (
          !currentReading ? (
            <EmptyState
              icon={<ListChecks className="h-16 w-16" />}
              title="暂无阅读内容"
              description="请先在双语阅读页面生成内容，然后点击「生成测试」进入测试。"
              action={
                <Button onClick={() => navigate('/reading')}>
                  <BookOpen className="h-4 w-4 mr-1.5" /> 前往双语阅读
                </Button>
              }
            />
          ) : (
            <div className="space-y-4">
              <Card>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <Select value={String(questionCount)} onChange={e => setQuestionCount(Number(e.target.value))}>
                    {QUESTION_COUNT_OPTIONS.map(item => (
                      <option key={item} value={item}>{item} 题</option>
                    ))}
                  </Select>
                  <Select value={difficulty} onChange={e => setDifficulty(e.target.value as QuizDifficulty)}>
                    <option value="easy">基础难度</option>
                    <option value="medium">进阶难度</option>
                    <option value="hard">高阶难度</option>
                  </Select>
                  <Select value={timedMode ? 'timed' : 'free'} onChange={e => setTimedMode(e.target.value === 'timed')}>
                    <option value="free">非限时</option>
                    <option value="timed">限时模式</option>
                  </Select>
                  <Select
                    value={String(timeLimitMinutes)}
                    onChange={e => setTimeLimitMinutes(Number(e.target.value))}
                    disabled={!timedMode}
                  >
                    <option value="5">5 分钟</option>
                    <option value="10">10 分钟</option>
                    <option value="15">15 分钟</option>
                    <option value="20">20 分钟</option>
                    <option value="30">30 分钟</option>
                  </Select>
                </div>
                <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
                  <span className="rounded-full bg-muted px-2.5 py-1">题量: {questionCount} 题</span>
                  <span className="rounded-full bg-muted px-2.5 py-1">难度: {QUIZ_DIFFICULTY_LABELS[difficulty]}</span>
                  <span className="rounded-full bg-muted px-2.5 py-1">
                    模式: {timedMode ? `${timeLimitMinutes} 分钟限时` : '非限时'}
                  </span>
                </div>
              </Card>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card
                className="cursor-pointer group hover:shadow-xl hover:border-primary-300 dark:hover:border-primary-700 transition-all"
                onClick={() => startQuiz('reading')}
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2.5 rounded-lg bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform">
                    <BookOpen className="h-6 w-6" />
                  </div>
                  <h2 className="typo-h3">阅读理解测试</h2>
                </div>
                <p className="text-muted-foreground typo-body-sm">
                  根据阅读内容生成理解题目，测试你对文章的理解程度。
                </p>
              </Card>
              <Card
                className="cursor-pointer group hover:shadow-xl hover:border-primary-300 dark:hover:border-primary-700 transition-all"
                onClick={() => startQuiz('vocabulary')}
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2.5 rounded-lg bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400 group-hover:scale-110 transition-transform">
                    <Type className="h-6 w-6" />
                  </div>
                  <h2 className="typo-h3">词汇测试</h2>
                </div>
                <p className="text-muted-foreground typo-body-sm">
                  根据学习的词汇生成测试题，检验词汇掌握情况。
                </p>
              </Card>
              </div>
              {wrongBookTotal > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card
                    className={cn(
                      'cursor-pointer group transition-all',
                      readingWrongCount > 0
                        ? 'hover:shadow-xl hover:border-amber-300 dark:hover:border-amber-700'
                        : 'opacity-60 cursor-not-allowed',
                    )}
                    onClick={() => readingWrongCount > 0 && startWrongBookQuiz('reading')}
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2.5 rounded-lg bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 group-hover:scale-110 transition-transform">
                        <AlertTriangle className="h-6 w-6" />
                      </div>
                      <h2 className="typo-h3">重练阅读错题</h2>
                    </div>
                    <p className="text-muted-foreground typo-body-sm">
                      错题库可用 {readingWrongCount} 题，按重复次数优先抽取。
                    </p>
                  </Card>
                  <Card
                    className={cn(
                      'cursor-pointer group transition-all',
                      vocabularyWrongCount > 0
                        ? 'hover:shadow-xl hover:border-amber-300 dark:hover:border-amber-700'
                        : 'opacity-60 cursor-not-allowed',
                    )}
                    onClick={() => vocabularyWrongCount > 0 && startWrongBookQuiz('vocabulary')}
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2.5 rounded-lg bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 group-hover:scale-110 transition-transform">
                        <AlertTriangle className="h-6 w-6" />
                      </div>
                      <h2 className="typo-h3">重练词汇错题</h2>
                    </div>
                    <p className="text-muted-foreground typo-body-sm">
                      错题库可用 {vocabularyWrongCount} 题，按重复次数优先抽取。
                    </p>
                  </Card>
                </div>
              )}
              {currentReading.title && (
                <p className="text-center text-sm text-muted-foreground">
                  当前阅读：<span className="font-medium text-foreground">{currentReading.title}</span>
                </p>
              )}
              {restoredFromStorage && (
                <p className="text-center text-xs text-muted-foreground">
                  已从本地恢复上次阅读上下文（页面刷新后仍可继续测试）。
                </p>
              )}
            </div>
          )
        ) : (
          <Card>
            <p className="typo-body-sm text-muted-foreground">
              当前阶段：<span className="font-semibold text-foreground">
                {phase === 'quiz' ? '答题中' : phase === 'result' ? '查看结果' : '选择测试'}
              </span>
              {currentReading?.title ? <> · 阅读标题：<span className="font-semibold text-foreground">{currentReading.title}</span></> : null}
              {activeConfig ? (
                <>
                  {' '}· 配置：<span className="font-semibold text-foreground">
                    {wrongBookMode ? '错题重练 / ' : ''}
                    {activeConfig.questionCount}题 / {QUIZ_DIFFICULTY_LABELS[activeConfig.difficulty]} / {activeConfig.timedMode ? `${activeConfig.timeLimitMinutes}分钟限时` : '非限时'}
                  </span>
                </>
              ) : null}
            </p>
          </Card>
        )}
      </ModuleSection>

      <ModuleSection
        index={1}
        type="result"
        title="测试结果"
        description="完成答题并查看分数与错题回顾。"
      >
        {loading && <LoadingSpinner text="AI 正在生成测试题..." />}

        {phase === 'quiz' && q && (
          <div className="animate-soft-pop">
            <div className="mb-5">
              <div className="flex justify-between text-sm text-muted-foreground mb-1.5">
                <span>问题 {qIndex + 1} / {questions.length}</span>
                <span className="flex items-center gap-1.5">
                  {testType === 'reading'
                    ? <><BookOpen className="h-3.5 w-3.5" /> 阅读理解</>
                    : <><Type className="h-3.5 w-3.5" /> 词汇测试</>
                  }
                </span>
              </div>
              {activeConfig?.timedMode && (
                <p className={cn('mb-1.5 text-xs font-medium', timerUrgent ? 'text-red-600 dark:text-red-400' : 'text-muted-foreground')}>
                  剩余时间 {timerText}
                </p>
              )}
              {activeConfig && (
                <p className="mb-1.5 text-xs text-muted-foreground">
                  {wrongBookMode ? '错题重练 · ' : ''}
                  难度 {QUIZ_DIFFICULTY_LABELS[activeConfig.difficulty]} · {activeConfig.timedMode ? `${activeConfig.timeLimitMinutes} 分钟限时` : '非限时'}
                </p>
              )}
              <div className="flashcard-progress-track">
                <div
                  className="flashcard-progress-fill"
                  style={{ width: `${((qIndex + 1) / questions.length) * 100}%` }}
                />
              </div>
            </div>

            <Card className="analysis-highlight-card pt-6 mb-4">
              <p className="typo-h3 mb-5 break-words">{q.question}</p>
              <div className="space-y-3">
                {q.options.map((opt, i) => {
                  const isSelected = userAnswers[qIndex] === i;
                  const isCorrect = i === q.correctIndex;
                  const showResult = answered;

                  return (
                    <div
                      key={i}
                      onClick={() => selectOption(i)}
                      className={cn(
                        'quiz-option border rounded-lg p-4 cursor-pointer flex items-center gap-3 transition-all',
                        showResult && isCorrect && 'correct',
                        showResult && isSelected && !isCorrect && 'incorrect',
                        !showResult && 'border-border hover:bg-muted',
                      )}
                    >
                      <span className={cn(
                        'flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold border',
                        showResult && isCorrect && 'bg-green-500 text-white border-green-500',
                        showResult && isSelected && !isCorrect && 'bg-red-500 text-white border-red-500',
                        !showResult && 'border-border text-muted-foreground',
                      )}>
                        {showResult && isCorrect ? <CheckCircle2 className="h-4 w-4" /> :
                         showResult && isSelected && !isCorrect ? <XCircle className="h-4 w-4" /> :
                         String.fromCharCode(65 + i)}
                      </span>
                      <span className="flex-1">{opt}</span>
                      <span className="text-xs text-muted-foreground">
                        {!answered && `按 ${i + 1}`}
                      </span>
                    </div>
                  );
                })}
              </div>
              {answered && (
                <div className="analysis-item mt-4 text-sm space-y-1" style={{ '--item-color': '#0ea5e9' } as React.CSSProperties}>
                  <p>
                    <span className="font-semibold text-primary-700 dark:text-primary-300">你的答案：</span>
                    <span className="text-primary-800 dark:text-primary-200">
                      {typeof userAnswers[qIndex] === 'number'
                        ? `${String.fromCharCode(65 + userAnswers[qIndex]!)}. ${q.options[userAnswers[qIndex]!] || ''}`
                        : '未作答'}
                    </span>
                  </p>
                  <p>
                    <span className="font-semibold text-primary-700 dark:text-primary-300">正确答案：</span>
                    <span className="text-primary-800 dark:text-primary-200">
                      {String.fromCharCode(65 + q.correctIndex)}. {q.options[q.correctIndex]}
                    </span>
                  </p>
                  <p>
                    <span className="font-semibold text-primary-700 dark:text-primary-300">解析：</span>
                    <span className="text-primary-800 dark:text-primary-200">{q.explanation || '暂无解析'}</span>
                  </p>
                </div>
              )}
            </Card>

            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                按 1-4 选择答案，Enter 下一题
              </p>
              <div className="flex items-center gap-2">
                <Button variant="secondary" onClick={() => finalizeQuiz('complete')}>
                  提前交卷
                </Button>
                <Button onClick={nextQuestion} disabled={!answered}>
                  {qIndex + 1 >= questions.length ? '查看结果' : '下一题'}
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          </div>
        )}

        {phase === 'result' && (
          <div className="animate-soft-pop">
            <Card className="analysis-highlight-card pt-6 text-center mb-6">
              <p className="text-4xl mb-2">{scoreEmoji}</p>
              <h2 className="typo-h2 mb-1">
                {testType === 'reading' ? '阅读理解测试' : '词汇测试'} 完成
              </h2>
              <p className={cn('text-6xl font-bold my-6', scoreColor)}>{metrics.score}%</p>
              <div className="flex justify-center gap-8 mb-6">
                <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                  <CheckCircle2 className="h-5 w-5" />
                  <span className="font-medium">正确 {metrics.correct}</span>
                </div>
                <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                  <XCircle className="h-5 w-5" />
                  <span className="font-medium">错误 {metrics.incorrect}</span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mb-6">
                作答率 {metrics.answered}/{metrics.total} · 作答正确率 {metrics.accuracy}% · 未作答 {metrics.unanswered}
              </p>

              {metrics.score < 80 && (
                <div className="mb-6 text-left text-sm">
                  <p className="analysis-card-header !mb-3 justify-center">
                    <AlertTriangle className="h-4 w-4 text-yellow-500" /> <span className="font-semibold">改进建议</span>
                  </p>
                  <ul className="space-y-2">
                    <li className="analysis-item" style={{ '--item-color': '#f59e0b' } as React.CSSProperties}>加强阅读理解能力，注重把握文章主旨</li>
                    <li className="analysis-item" style={{ '--item-color': '#f59e0b' } as React.CSSProperties}>扩大词汇量，特别是关键学术词汇</li>
                    <li className="analysis-item" style={{ '--item-color': '#f59e0b' } as React.CSSProperties}>练习识别文章的逻辑结构和论证方式</li>
                  </ul>
                </div>
              )}

              <div className="flex flex-wrap justify-center gap-3">
                {metrics.incorrect > 0 && (
                  <Button variant="secondary" onClick={() => setShowReview(!showReview)}>
                    <AlertTriangle className="h-4 w-4 mr-1.5" />
                    {showReview ? '收起错题' : `查看错题 (${metrics.incorrect})`}
                  </Button>
                )}
                <Button
                  variant="secondary"
                  onClick={() => {
                    setPhase('select');
                    setQuestions([]);
                    setShowReview(false);
                    setWrongBookMode(false);
                    setRemainingSeconds(null);
                    timeoutSubmittedRef.current = false;
                  }}
                >
                  <RotateCcw className="h-4 w-4 mr-1.5" /> 重新选择
                </Button>
                <Button onClick={() => navigate('/achievements')}>
                  <Trophy className="h-4 w-4 mr-1.5" /> 查看成就
                </Button>
              </div>
            </Card>

            {showReview && wrongQuestions.length > 0 && (
              <div className="space-y-4">
                <div className="analysis-card-header">
                  <XCircle className="h-5 w-5 text-red-500" />
                  <h3 className="typo-h3">错题回顾</h3>
                </div>
                {wrongQuestions.map((wq, i) => (
                  <Card key={i} className="border-red-200 dark:border-red-900/50">
                    <p className="font-semibold mb-3">
                      <span className="text-red-500 mr-2">#{wq.index + 1}</span>
                      {wq.question}
                    </p>
                    <div className="space-y-2 text-sm">
                      {wq.options.map((opt, oi) => (
                        <div key={oi} className={cn(
                          'px-3 py-2 rounded-md flex items-center gap-2',
                          oi === wq.correctIndex && 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300',
                          oi === wq.userAnswer && oi !== wq.correctIndex && 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 line-through',
                        )}>
                          {oi === wq.correctIndex && <CheckCircle2 className="h-4 w-4 shrink-0" />}
                          {oi === wq.userAnswer && oi !== wq.correctIndex && <XCircle className="h-4 w-4 shrink-0" />}
                          <span>{opt}</span>
                        </div>
                      ))}
                    </div>
                    {wq.userAnswer === null && (
                      <p className="mt-2 text-xs text-yellow-600 dark:text-yellow-400">该题未作答（可能因提前交卷或限时结束）</p>
                    )}
                    {wq.explanation && (
                      <p className="mt-3 text-sm text-muted-foreground">
                        <span className="font-medium">解释：</span>{wq.explanation}
                      </p>
                    )}
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}
      </ModuleSection>

      <ModuleSection
        index={2}
        type="history"
        title="测试历史"
        description="最近测验会保存在本地，便于持续追踪。"
      >
        <Card className="mb-4">
          <p className="typo-body-sm text-muted-foreground">
            错题本累计 <span className="font-semibold text-foreground">{wrongBookTotal}</span> 题，
            重复错题 <span className="font-semibold text-foreground">{highRepeatWrongCount}</span> 题。
          </p>
          {latestWrong && (
            <p className="text-xs text-muted-foreground mt-1.5 truncate">
              最近错题：{latestWrong.question}
            </p>
          )}
        </Card>
        <Card>
          {testHistory.length > 0 ? (
            <div className="space-y-2">
              {testHistory.slice(-6).reverse().map((item, idx) => (
                <div key={`${item.date}-${idx}`} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/60 bg-muted/30 px-3 py-2 text-sm">
                  <span className="font-medium">{item.type === 'reading' ? '阅读理解' : '词汇测试'}</span>
                  <span className="text-muted-foreground">{item.readingTitle}</span>
                  <span className="text-muted-foreground">
                    {item.questionCount ?? 5}题 · {item.difficulty ? QUIZ_DIFFICULTY_LABELS[item.difficulty] : '进阶'}
                  </span>
                  {item.timeSpentSeconds ? (
                    <span className="text-muted-foreground">用时 {Math.round(item.timeSpentSeconds / 60)} 分</span>
                  ) : null}
                  <span className="font-semibold text-primary-600 dark:text-primary-400">{item.score} 分</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="typo-body-sm text-muted-foreground">暂无测试历史，先完成一次测验。</p>
          )}
        </Card>
      </ModuleSection>

      <ModuleSection
        index={3}
        type="action"
        title="测试操作"
        description="在不同阶段快速切换下一步动作。"
      >
        <Card>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" size="sm" onClick={() => navigate('/reading')}>
              前往双语阅读
            </Button>
            {readingWrongCount > 0 && phase === 'select' && (
              <Button variant="secondary" size="sm" onClick={() => startWrongBookQuiz('reading')}>
                重练阅读错题
              </Button>
            )}
            {vocabularyWrongCount > 0 && phase === 'select' && (
              <Button variant="secondary" size="sm" onClick={() => startWrongBookQuiz('vocabulary')}>
                重练词汇错题
              </Button>
            )}
            {phase !== 'select' && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setPhase('select');
                  setQuestions([]);
                  setShowReview(false);
                  setAnswered(false);
                  setWrongBookMode(false);
                  setRemainingSeconds(null);
                  timeoutSubmittedRef.current = false;
                }}
              >
                返回选题
              </Button>
            )}
            {phase === 'result' && (
              <Button size="sm" onClick={() => navigate('/achievements')}>
                查看学习成就
              </Button>
            )}
          </div>
        </Card>
      </ModuleSection>
    </div>
  );
}
