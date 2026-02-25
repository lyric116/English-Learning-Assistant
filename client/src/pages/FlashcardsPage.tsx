import { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Textarea';
import { Select } from '@/components/ui/Select';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { FeedbackAlert } from '@/components/ui/FeedbackAlert';
import { useLocalStorage } from '@/hooks/use-local-storage';
import { useTts } from '@/hooks/use-tts';
import { useToast } from '@/components/ui/toast-context';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { ModuleSection } from '@/components/layout/ModuleSection';
import { ChevronLeft, ChevronRight, Volume2, RotateCcw, Layers, BookOpen, Lightbulb, MessageSquareQuote } from 'lucide-react';
import { AIConfigBanner } from '@/components/settings/AIConfigBanner';
import type { Word, WordLearningStatus } from '@/types';

type RawWord = Omit<Word, 'learningStatus' | 'nextReviewAt' | 'accuracy' | 'reviewCount'>
  & Partial<Pick<Word, 'learningStatus' | 'nextReviewAt' | 'accuracy' | 'reviewCount'>>;

const REVIEW_INTERVAL_MS = 24 * 60 * 60 * 1000;
const STATUS_LABEL: Record<WordLearningStatus, string> = {
  new: '新词',
  reviewing: '复习中',
  mastered: '已掌握',
};

function isWordModelV2(word: RawWord): word is Word {
  return (
    (word.learningStatus === 'new' || word.learningStatus === 'reviewing' || word.learningStatus === 'mastered')
    && typeof word.nextReviewAt === 'number'
    && typeof word.accuracy === 'number'
    && typeof word.reviewCount === 'number'
  );
}

function normalizeWord(raw: RawWord, now: number): Word {
  const reviewCount = typeof raw.reviewCount === 'number' && raw.reviewCount >= 0 ? raw.reviewCount : 0;
  const accuracy = typeof raw.accuracy === 'number' && raw.accuracy >= 0 ? raw.accuracy : 0;
  const learningStatus: WordLearningStatus = raw.learningStatus ?? 'new';
  const nextReviewAt = typeof raw.nextReviewAt === 'number' ? raw.nextReviewAt : now + REVIEW_INTERVAL_MS;
  return {
    ...raw,
    learningStatus,
    nextReviewAt,
    accuracy,
    reviewCount,
  };
}

export function FlashcardsPage() {
  const [words, setWords] = useLocalStorage<Word[]>('flashcards', []);
  const [inputText, setInputText] = useState('');
  const [level, setLevel] = useState('all');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const { speak } = useTts();
  const { toast } = useToast();

  // Swipe handling
  const touchStart = useRef({ x: 0, y: 0 });
  const cardRef = useRef<HTMLDivElement>(null);
  const wordListRef = useRef<HTMLDivElement>(null);

  const handleExtract = async () => {
    if (!inputText.trim()) return;
    setErrorMessage('');
    setLoading(true);
    try {
      const result = await api.flashcards.extract(inputText, 10, level) as RawWord[];
      if (result.length === 0) {
        toast('未能提取到单词，请尝试更长的文本', 'warning');
        return;
      }
      const now = Date.now();
      const normalizedResult = result.map(item => normalizeWord(
        { ...item, learningStatus: 'new', reviewCount: 0, accuracy: 0, nextReviewAt: now + REVIEW_INTERVAL_MS },
        now,
      ));
      setWords(normalizedResult);
      setCurrentIndex(0);
      setFlipped(false);
      setErrorMessage('');
      toast(`成功提取 ${normalizedResult.length} 个单词`, 'success');
    } catch (err) {
      const message = (err as Error).message;
      setErrorMessage(message);
      toast(`提取失败: ${message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const goTo = useCallback((dir: -1 | 1) => {
    setCurrentIndex(i => {
      const next = i + dir;
      if (next < 0 || next >= words.length) return i;
      return next;
    });
    setFlipped(false);
  }, [words.length]);

  useEffect(() => {
    const hasLegacyData = words.some(word => !isWordModelV2(word as RawWord));
    if (!hasLegacyData) return;
    const now = Date.now();
    setWords(words.map(word => normalizeWord(word as RawWord, now)));
  }, [words, setWords]);

  // Keyboard shortcuts
  useEffect(() => {
    if (words.length === 0) return;
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLInputElement) return;
      switch (e.key) {
        case 'ArrowLeft': goTo(-1); break;
        case 'ArrowRight': goTo(1); break;
        case ' ':
        case 'Enter': e.preventDefault(); setFlipped(f => !f); break;
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [goTo, words.length]);

  // Touch swipe
  const onTouchStart = (e: React.TouchEvent) => {
    touchStart.current = { x: e.changedTouches[0].screenX, y: e.changedTouches[0].screenY };
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    const dx = e.changedTouches[0].screenX - touchStart.current.x;
    const dy = Math.abs(e.changedTouches[0].screenY - touchStart.current.y);
    if (Math.abs(dx) > 50 && dy < 75) {
      goTo(dx < 0 ? 1 : -1);
    }
  };

  // Auto-scroll word list to keep current word visible
  useEffect(() => {
    const container = wordListRef.current;
    if (!container) return;
    const activeEl = container.children[currentIndex] as HTMLElement | undefined;
    if (activeEl) {
      const left = activeEl.offsetLeft - container.offsetWidth / 2 + activeEl.offsetWidth / 2;
      container.scrollTo({ left, behavior: 'smooth' });
    }
  }, [currentIndex]);

  const word = words[currentIndex];
  const progress = words.length > 0 ? ((currentIndex + 1) / words.length) * 100 : 0;
  const now = Date.now();
  const statusSummary = words.reduce<Record<WordLearningStatus, number>>((acc, item) => {
    acc[item.learningStatus] += 1;
    return acc;
  }, { new: 0, reviewing: 0, mastered: 0 });
  const dueReviewCount = words.filter(item => item.nextReviewAt <= now).length;
  const clearWordSet = () => {
    setWords([]);
    setCurrentIndex(0);
    setFlipped(false);
  };

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
        title="输入学习文本"
        description="粘贴英文素材并选择词汇难度，系统将自动提取可学习单词。"
      >
        <Card className="ds-glass-panel">
          <Textarea
            rows={4}
            placeholder="在此粘贴英文文本，AI 将自动提取值得学习的单词..."
            value={inputText}
            onChange={e => setInputText(e.target.value)}
          />
          <div className="flex flex-wrap items-center gap-3 mt-4">
            <Select value={level} onChange={e => setLevel(e.target.value)}>
              <option value="all">全部级别</option>
              <option value="cet4">CET-4 以上</option>
              <option value="cet6">CET-6 以上</option>
              <option value="advanced">高级词汇</option>
            </Select>
            <Button onClick={handleExtract} loading={loading} disabled={!inputText.trim()}>
              提取单词
            </Button>
            {inputText && (
              <Button variant="ghost" size="sm" onClick={() => setInputText('')}>
                <RotateCcw className="h-3.5 w-3.5" /> 清空
              </Button>
            )}
          </div>
        </Card>
      </ModuleSection>

      <ModuleSection
        index={1}
        type="result"
        title="闪卡学习结果"
        description="翻转查看释义、词源和例句，支持键盘与手势切换。"
      >
        {loading && <LoadingSpinner text="AI 正在分析文本并提取单词..." />}

        {words.length === 0 && !loading && (
          <EmptyState
            icon={<Layers className="h-16 w-16" />}
            title="还没有闪卡"
            description="在上方输入英文文本，AI 会自动提取值得学习的单词并生成闪卡。"
          />
        )}

        {words.length > 0 && !loading && word && (
          <div className="flex flex-col items-center animate-soft-pop">
            <div className="relative w-full flex justify-center mb-6" style={{ maxWidth: 520 }}>
              <button
                className="flashcard-nav-arrow left"
                onClick={() => goTo(-1)}
                disabled={currentIndex === 0}
                aria-label="上一张"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>

              <div className="flashcard-premium w-full">
                <div className="flashcard-premium-inner">
                  <div
                    ref={cardRef}
                    className="flashcard-container swipe-container"
                    onClick={() => setFlipped(f => !f)}
                    onTouchStart={onTouchStart}
                    onTouchEnd={onTouchEnd}
                    role="button"
                    tabIndex={0}
                    aria-label={flipped ? '点击翻转到正面' : '点击翻转查看详情'}
                  >
                    <div className={cn('flashcard-inner', flipped && 'flipped')} style={{ minHeight: 400 }}>
                      <div className="flashcard-front bg-card p-8 flex flex-col items-center justify-center gap-2">
                        <p className="text-4xl md:text-5xl font-bold font-serif text-primary-700 dark:text-primary-400 text-center tracking-tight">
                          {word.word}
                        </p>
                        <div className="w-12 h-0.5 bg-primary-300/50 dark:bg-primary-600/50 rounded-full my-2" />
                        <p className="text-lg text-muted-foreground font-light tracking-wide">{word.phonetic}</p>
                        <div className="mt-1 flex flex-wrap items-center justify-center gap-1.5 text-[11px]">
                          <span className="rounded-full bg-primary-100 px-2 py-0.5 text-primary-700 dark:bg-primary-900/40 dark:text-primary-300">
                            {STATUS_LABEL[word.learningStatus]}
                          </span>
                          <span className="rounded-full bg-muted px-2 py-0.5 text-muted-foreground">
                            复习 {word.reviewCount} 次
                          </span>
                          <span className="rounded-full bg-muted px-2 py-0.5 text-muted-foreground">
                            正确率 {word.accuracy}%
                          </span>
                        </div>
                        <button
                          className="tap-target mt-3 p-2.5 rounded-full hover:bg-primary-50 dark:hover:bg-primary-900/30 transition-colors"
                          onClick={e => { e.stopPropagation(); speak(word.word); }}
                          aria-label="朗读单词"
                        >
                          <Volume2 className="h-5 w-5 text-primary-400" />
                        </button>
                        <p className="mt-auto text-xs text-muted-foreground tracking-wider">
                          点击翻转 · ← → 切换 · 空格翻转
                        </p>
                      </div>

                      <div className="flashcard-back bg-card p-6 overflow-y-auto">
                        <div className="flex items-center gap-3 mb-5">
                          <div className="flex-1 min-w-0">
                            <p className="text-2xl font-bold font-serif text-primary-700 dark:text-primary-400 truncate">{word.word}</p>
                            <p className="text-sm text-muted-foreground mt-0.5">{word.phonetic}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              下次复习: {new Date(word.nextReviewAt).toLocaleDateString()}
                            </p>
                          </div>
                          <button
                            className="tap-target shrink-0 p-1.5 rounded-full hover:bg-muted transition-colors"
                            onClick={e => { e.stopPropagation(); speak(word.example || word.word); }}
                            aria-label="朗读例句"
                          >
                            <Volume2 className="h-4 w-4 text-primary-500" />
                          </button>
                        </div>
                        <div className="space-y-3 text-sm">
                          <div className="flashcard-section" style={{ '--section-color': '#0ea5e9' } as React.CSSProperties}>
                            <div className="flex items-center gap-1.5 mb-1">
                              <BookOpen className="h-3.5 w-3.5 text-primary-500" />
                              <span className="text-xs font-semibold text-primary-600 dark:text-primary-400 uppercase tracking-wide">释义</span>
                            </div>
                            <p className="font-medium leading-relaxed">{word.definition}</p>
                          </div>
                          <div className="flashcard-section" style={{ '--section-color': '#8b5cf6' } as React.CSSProperties}>
                            <div className="flex items-center gap-1.5 mb-1">
                              <Lightbulb className="h-3.5 w-3.5 text-violet-500" />
                              <span className="text-xs font-semibold text-violet-600 dark:text-violet-400 uppercase tracking-wide">词源</span>
                            </div>
                            <p className="text-muted-foreground leading-relaxed">{word.etymology}</p>
                          </div>
                          <div className="flashcard-section" style={{ '--section-color': '#10b981' } as React.CSSProperties}>
                            <div className="flex items-center gap-1.5 mb-1">
                              <MessageSquareQuote className="h-3.5 w-3.5 text-emerald-500" />
                              <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wide">例句</span>
                            </div>
                            <p className="italic leading-relaxed">{word.example}</p>
                            <p className="text-muted-foreground mt-1.5 text-xs">{word.exampleTranslation}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <button
                className="flashcard-nav-arrow right"
                onClick={() => goTo(1)}
                disabled={currentIndex === words.length - 1}
                aria-label="下一张"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>

            <div className="w-full mb-8" style={{ maxWidth: 520 }}>
              <div className="flashcard-progress-track">
                <div className="flashcard-progress-fill" style={{ width: `${progress}%` }} />
              </div>
              <p className="text-center text-xs text-muted-foreground mt-2 tabular-nums">
                {currentIndex + 1} / {words.length}
              </p>
            </div>

            <div className="w-full" style={{ maxWidth: 520 }}>
              <div ref={wordListRef} className="flashcard-wordlist">
                {words.map((w, i) => (
                  <button
                    key={w.word}
                    onClick={() => { setCurrentIndex(i); setFlipped(false); }}
                    className={cn(
                      'shrink-0 px-3.5 py-1.5 rounded-full text-sm font-medium transition-all duration-200 whitespace-nowrap',
                      i === currentIndex
                        ? 'bg-primary-500 text-white shadow-md shadow-primary-500/25 scale-105'
                        : 'bg-muted text-muted-foreground hover:bg-primary-100 dark:hover:bg-primary-900/30 hover:text-primary-700 dark:hover:text-primary-300',
                    )}
                  >
                    {w.word}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </ModuleSection>

      <ModuleSection
        index={2}
        type="history"
        title="词卡历史"
        description="自动保存最近一次词卡集合，刷新后可继续学习。"
      >
        <Card>
          {words.length > 0 ? (
            <>
              <p className="typo-body-sm text-muted-foreground mb-2">
                当前词卡集合共 <span className="font-semibold text-foreground">{words.length}</span> 个单词，待复习 <span className="font-semibold text-foreground">{dueReviewCount}</span> 个。
              </p>
              <div className="mb-3 flex flex-wrap gap-2 text-xs">
                <span className="rounded-full bg-muted px-2.5 py-1 text-muted-foreground">新词 {statusSummary.new}</span>
                <span className="rounded-full bg-muted px-2.5 py-1 text-muted-foreground">复习中 {statusSummary.reviewing}</span>
                <span className="rounded-full bg-muted px-2.5 py-1 text-muted-foreground">已掌握 {statusSummary.mastered}</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {words.slice(0, 14).map(item => (
                  <span key={item.word} className="rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground">
                    {item.word}
                  </span>
                ))}
                {words.length > 14 && (
                  <span className="rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground">
                    +{words.length - 14}
                  </span>
                )}
              </div>
            </>
          ) : (
            <p className="typo-body-sm text-muted-foreground">暂无词卡历史，先在输入区提取单词。</p>
          )}
        </Card>
      </ModuleSection>

      <ModuleSection
        index={3}
        type="action"
        title="学习操作"
        description="快速控制当前词卡会话。"
      >
        <Card>
          {words.length > 0 && word ? (
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" size="sm" onClick={() => { setCurrentIndex(0); setFlipped(false); }}>
                回到首张
              </Button>
              <Button variant="secondary" size="sm" onClick={() => speak(word.word)}>
                朗读当前单词
              </Button>
              <Button variant="ghost" size="sm" onClick={clearWordSet}>
                清空词卡集合
              </Button>
            </div>
          ) : (
            <p className="typo-body-sm text-muted-foreground">提取单词后，可在这里快速重置或清空学习会话。</p>
          )}
        </Card>
      </ModuleSection>
    </div>
  );
}
