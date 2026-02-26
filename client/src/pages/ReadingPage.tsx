import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Textarea';
import { Select } from '@/components/ui/Select';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { FeedbackAlert } from '@/components/ui/FeedbackAlert';
import { useToast } from '@/components/ui/toast-context';
import { useLocalStorage } from '@/hooks/use-local-storage';
import { useTts } from '@/hooks/use-tts';
import { api } from '@/lib/api';
import { ModuleSection } from '@/components/layout/ModuleSection';
import {
  Volume2, Bookmark, BookmarkCheck, FileQuestion,
  ArrowLeftRight, BookOpen, X, Sparkles, Languages,
  ChevronDown, Trash2, Search,
} from 'lucide-react';
import { AIConfigBanner } from '@/components/settings/AIConfigBanner';
import type {
  ReadingContent,
  ReadingDifficulty,
  ReadingFavorite,
  ReadingGenerationConfig,
  ReadingLanguage,
  ReadingLength,
  ReadingTopic,
  VocabItem,
} from '@/types';

const TOPIC_LABELS: Record<ReadingTopic, string> = {
  general: '综合',
  work: '职场',
  travel: '旅行',
  technology: '科技',
  culture: '文化',
  education: '学习',
};

const DIFFICULTY_LABELS: Record<ReadingDifficulty, string> = {
  easy: '基础',
  medium: '进阶',
  hard: '高阶',
};

const LENGTH_LABELS: Record<ReadingLength, string> = {
  short: '短篇',
  medium: '中篇',
  long: '长篇',
};

const LANGUAGE_LABELS: Record<ReadingLanguage, string> = {
  en: '英文 → 中文',
  zh: '中文 → 英文',
};

const TOPIC_OPTIONS: ReadingTopic[] = ['general', 'work', 'travel', 'technology', 'culture', 'education'];
const DIFFICULTY_OPTIONS: ReadingDifficulty[] = ['easy', 'medium', 'hard'];
const LENGTH_OPTIONS: ReadingLength[] = ['short', 'medium', 'long'];
const LANGUAGE_OPTIONS: ReadingLanguage[] = ['en', 'zh'];
type FavoriteSortMode = 'saved-desc' | 'saved-asc' | 'title-asc' | 'vocab-desc';

function normalizeFavorite(item: ReadingContent | ReadingFavorite): ReadingFavorite {
  const savedAt = typeof (item as ReadingFavorite).savedAt === 'number'
    ? (item as ReadingFavorite).savedAt
    : Date.now();
  const tags = Array.isArray((item as ReadingFavorite).tags)
    ? (item as ReadingFavorite).tags.filter(tag => typeof tag === 'string' && tag.trim()).map(tag => tag.trim())
    : [];

  return {
    ...item,
    savedAt,
    tags,
  };
}

const READING_PRESETS: Array<{
  id: string;
  label: string;
  description: string;
  config: Pick<ReadingGenerationConfig, 'topic' | 'difficulty' | 'length'>;
}> = [
  {
    id: 'daily-quick',
    label: '日常速读',
    description: '综合主题，短篇，快速进入学习状态',
    config: { topic: 'general', difficulty: 'easy', length: 'short' },
  },
  {
    id: 'work-drill',
    label: '职场演练',
    description: '职场主题，中等难度，中篇输出',
    config: { topic: 'work', difficulty: 'medium', length: 'medium' },
  },
  {
    id: 'travel-dialog',
    label: '旅行场景',
    description: '旅行主题，基础难度，短篇对话友好',
    config: { topic: 'travel', difficulty: 'easy', length: 'short' },
  },
  {
    id: 'tech-advanced',
    label: '科技进阶',
    description: '科技主题，高阶难度，长篇信息密度高',
    config: { topic: 'technology', difficulty: 'hard', length: 'long' },
  },
];

export function ReadingPage() {
  const quizContextKey = 'quizCurrentReading';
  const navigate = useNavigate();
  const { speak, speaking } = useTts();
  const { toast } = useToast();
  const [inputText, setInputText] = useState('');
  const [language, setLanguage] = useState<ReadingLanguage>('en');
  const [topic, setTopic] = useState<ReadingTopic>('general');
  const [difficulty, setDifficulty] = useState<ReadingDifficulty>('medium');
  const [length, setLength] = useState<ReadingLength>('medium');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [historyHydrated, setHistoryHydrated] = useState(false);
  const [reading, setReading] = useState<ReadingContent | null>(null);
  const [viewMode, setViewMode] = useState<'alternate' | 'parallel'>('alternate');
  const [readingHistory, setHistory] = useLocalStorage<ReadingContent[]>('readingHistory', []);
  const [, setQuizReadingContext] = useLocalStorage<ReadingContent | null>(quizContextKey, null);
  const [favorites, setFavorites] = useLocalStorage<ReadingFavorite[]>('readingFavorites', []);
  const [showFavorites, setShowFavorites] = useState(false);
  const [favoriteQuery, setFavoriteQuery] = useState('');
  const [favoriteSort, setFavoriteSort] = useState<FavoriteSortMode>('saved-desc');

  const isFavorited = reading ? favorites.some(f => f.english === reading.english) : false;
  const activePreset = READING_PRESETS.find(preset => (
    preset.config.topic === topic
    && preset.config.difficulty === difficulty
    && preset.config.length === length
  ))?.id;

  useEffect(() => {
    const hasLegacy = favorites.some(item => (
      typeof item.savedAt !== 'number'
      || !Array.isArray(item.tags)
    ));
    if (!hasLegacy) return;
    setFavorites(prev => prev.map(item => normalizeFavorite(item)));
  }, [favorites, setFavorites]);

  useEffect(() => {
    if (historyHydrated || readingHistory.length > 0) return;
    let cancelled = false;
    const hydrate = async () => {
      try {
        const remote = await api.reading.history(20) as ReadingContent[];
        if (!Array.isArray(remote) || remote.length === 0 || cancelled) return;
        setHistory(prev => (prev.length > 0 ? prev : remote.slice(0, 20)));
        toast(`已从后端恢复 ${remote.length} 条阅读历史`, 'info');
      } catch {
        // Keep local-first behavior when backend history is unavailable.
      } finally {
        if (!cancelled) setHistoryHydrated(true);
      }
    };
    void hydrate();
    return () => {
      cancelled = true;
    };
  }, [historyHydrated, readingHistory.length, setHistory, toast]);

  const filteredFavorites = useMemo(() => {
    const keyword = favoriteQuery.trim().toLowerCase();
    const filtered = favorites.filter(item => {
      if (!keyword) return true;
      const haystack = [
        item.title || '',
        item.english || '',
        item.chinese || '',
        ...(item.tags || []),
      ].join(' ').toLowerCase();
      return haystack.includes(keyword);
    });

    return [...filtered].sort((a, b) => {
      switch (favoriteSort) {
        case 'saved-asc':
          return a.savedAt - b.savedAt;
        case 'title-asc':
          return (a.title || '').localeCompare(b.title || '', 'zh-Hans-CN');
        case 'vocab-desc':
          return (b.vocabulary?.length || 0) - (a.vocabulary?.length || 0);
        case 'saved-desc':
        default:
          return b.savedAt - a.savedAt;
      }
    });
  }, [favoriteQuery, favoriteSort, favorites]);

  const generate = async () => {
    if (!inputText.trim()) return;
    if (!LANGUAGE_OPTIONS.includes(language)
      || !TOPIC_OPTIONS.includes(topic)
      || !DIFFICULTY_OPTIONS.includes(difficulty)
      || !LENGTH_OPTIONS.includes(length)) {
      toast('阅读参数无效，请重新选择后再试', 'warning');
      return;
    }
    setErrorMessage('');
    setLoading(true);
    try {
      const config: ReadingGenerationConfig = { language, topic, difficulty, length };
      const result = await api.reading.generate(inputText, config) as ReadingContent;
      const withTimestamp = { ...result, timestamp: Date.now(), generationConfig: config };
      setReading(withTimestamp);
      setErrorMessage('');
      setQuizReadingContext(withTimestamp);
      setHistory(prev => [withTimestamp, ...prev].slice(0, 10));
      toast('双语内容生成成功', 'success');
    } catch (err) {
      const message = (err as Error).message;
      setErrorMessage(message);
      toast(`生成失败: ${message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const toggleFavorite = () => {
    if (!reading) return;
    if (isFavorited) {
      setFavorites(prev => prev.filter(f => f.english !== reading.english));
      toast('已取消收藏', 'info');
    } else {
      const generatedTags = reading.generationConfig
        ? [
            TOPIC_LABELS[reading.generationConfig.topic],
            DIFFICULTY_LABELS[reading.generationConfig.difficulty],
            LENGTH_LABELS[reading.generationConfig.length],
          ]
        : [];
      const nextFavorite = normalizeFavorite({ ...reading, savedAt: Date.now(), tags: generatedTags });
      setFavorites(prev => [nextFavorite, ...prev.filter(item => item.english !== reading.english)]);
      toast('已保存到收藏', 'success');
    }
  };

  const goToQuiz = () => {
    if (!reading) return;
    setQuizReadingContext(reading);
    navigate('/quiz', { state: { currentReading: reading } });
  };

  const loadFavorite = (fav: ReadingFavorite) => {
    setReading(fav);
    setQuizReadingContext(fav);
    setShowFavorites(false);
  };

  const removeFavorite = (fav: ReadingFavorite) => {
    setFavorites(prev => prev.filter(f => f.english !== fav.english));
    toast('已移除收藏', 'info');
  };

  const addFavoriteTag = (fav: ReadingFavorite) => {
    const tag = window.prompt('输入标签名称（例如：考试 / 语法 / 商务）')?.trim();
    if (!tag) return;
    setFavorites(prev => prev.map(item => {
      if (item.english !== fav.english) return item;
      const nextTags = Array.from(new Set([...item.tags, tag])).slice(0, 8);
      return { ...item, tags: nextTags };
    }));
    toast('标签已更新', 'success');
  };

  const removeFavoriteTag = (fav: ReadingFavorite, tag: string) => {
    setFavorites(prev => prev.map(item => (
      item.english === fav.english
        ? { ...item, tags: item.tags.filter(t => t !== tag) }
        : item
    )));
    toast('标签已移除', 'info');
  };

  const applyPreset = (presetId: string) => {
    const preset = READING_PRESETS.find(item => item.id === presetId);
    if (!preset) return;
    setTopic(preset.config.topic);
    setDifficulty(preset.config.difficulty);
    setLength(preset.config.length);
    toast(`已应用模板：${preset.label}`, 'info');
  };

  const enParagraphs = reading?.english.split('\n').filter(p => p.trim()) || [];
  const zhParagraphs = reading?.chinese.split('\n').filter(p => p.trim()) || [];

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
        title="输入阅读素材"
        description="输入素材并设置主题、难度、篇幅与语言方向。"
      >
        <Card>
          <div className="relative">
            <Textarea
              rows={5}
              placeholder="输入英文或中文文本，AI 将生成双语对照内容..."
              value={inputText}
              onChange={e => setInputText(e.target.value)}
            />
            {inputText && (
              <button
                onClick={() => setInputText('')}
                className="tap-target absolute top-2 right-2 p-1 rounded-full text-muted-foreground hover:bg-muted transition"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-3 mt-4">
            <Select value={language} onChange={e => setLanguage(e.target.value as ReadingLanguage)}>
              <option value="en">英文 → 中文</option>
              <option value="zh">中文 → 英文</option>
            </Select>
            <Select value={topic} onChange={e => setTopic(e.target.value as ReadingTopic)}>
              {TOPIC_OPTIONS.map(option => (
                <option key={option} value={option}>{TOPIC_LABELS[option]}</option>
              ))}
            </Select>
            <Select value={difficulty} onChange={e => setDifficulty(e.target.value as ReadingDifficulty)}>
              {DIFFICULTY_OPTIONS.map(option => (
                <option key={option} value={option}>{DIFFICULTY_LABELS[option]}</option>
              ))}
            </Select>
            <Select value={length} onChange={e => setLength(e.target.value as ReadingLength)}>
              {LENGTH_OPTIONS.map(option => (
                <option key={option} value={option}>{LENGTH_LABELS[option]}</option>
              ))}
            </Select>
            <Button onClick={generate} loading={loading} disabled={loading || !inputText.trim()}>
              <Sparkles className="h-4 w-4 mr-1.5" />
              生成双语内容
            </Button>
            <span className="text-xs text-muted-foreground ml-auto hidden sm:inline">支持任意长度文本</span>
          </div>
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
            {READING_PRESETS.map(preset => (
              <button
                key={preset.id}
                type="button"
                onClick={() => applyPreset(preset.id)}
                className={`rounded-lg border px-3 py-2 text-left transition-colors ${
                  activePreset === preset.id
                    ? 'border-primary-400 bg-primary-50 dark:bg-primary-900/30'
                    : 'border-border/60 hover:border-primary-300 bg-muted/20'
                }`}
              >
                <p className="text-sm font-medium text-foreground">{preset.label}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{preset.description}</p>
              </button>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
            {activePreset && (
              <span className="rounded-full bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 px-2.5 py-1">
                模板: {READING_PRESETS.find(item => item.id === activePreset)?.label}
              </span>
            )}
            <span className="rounded-full bg-muted px-2.5 py-1">方向: {LANGUAGE_LABELS[language]}</span>
            <span className="rounded-full bg-muted px-2.5 py-1">主题: {TOPIC_LABELS[topic]}</span>
            <span className="rounded-full bg-muted px-2.5 py-1">难度: {DIFFICULTY_LABELS[difficulty]}</span>
            <span className="rounded-full bg-muted px-2.5 py-1">篇幅: {LENGTH_LABELS[length]}</span>
          </div>
        </Card>
      </ModuleSection>

      <ModuleSection
        index={1}
        type="result"
        title="阅读结果"
        description="查看双语内容与重点词汇。"
      >
        {loading && <LoadingSpinner text="AI 正在翻译并提取词汇..." />}

        {!reading && !loading && (
          <EmptyState
            icon={<BookOpen className="h-16 w-16" />}
            title="开始双语阅读"
            description="输入英文或中文文本，AI 将生成中英双语对照内容，并提取重点词汇。"
          />
        )}

        {reading && !loading && (
          <div className="animate-soft-pop">
            <Card className="analysis-highlight-card pt-6 mb-6">
              {reading.title && (
                <h2 className="typo-h2 mb-4 pb-3 border-b border-border/50 break-words">
                  {reading.title}
                </h2>
              )}
              {reading.generationConfig && (
                <div className="mb-4 flex flex-wrap gap-2 text-xs text-muted-foreground">
                  <span className="rounded-full bg-muted px-2.5 py-1">
                    {LANGUAGE_LABELS[reading.generationConfig.language]}
                  </span>
                  <span className="rounded-full bg-muted px-2.5 py-1">
                    主题: {TOPIC_LABELS[reading.generationConfig.topic]}
                  </span>
                  <span className="rounded-full bg-muted px-2.5 py-1">
                    难度: {DIFFICULTY_LABELS[reading.generationConfig.difficulty]}
                  </span>
                  <span className="rounded-full bg-muted px-2.5 py-1">
                    篇幅: {LENGTH_LABELS[reading.generationConfig.length]}
                  </span>
                </div>
              )}
              {viewMode === 'alternate' ? (
                <div className="space-y-4">
                  {enParagraphs.map((p, i) => (
                    <div key={i} className="group">
                      <p className="typo-body-lg font-serif break-words">{p}</p>
                      <p className="typo-body text-muted-foreground mt-1 pl-3 border-l-2 border-primary-200 dark:border-primary-800 break-words">
                        {zhParagraphs[i] || ''}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <p className="typo-label text-primary-500 mb-2">English</p>
                    {enParagraphs.map((p, i) => (
                      <p key={i} className="typo-body-lg font-serif break-words">{p}</p>
                    ))}
                  </div>
                  <div className="space-y-4 md:border-l md:border-border/50 md:pl-6">
                    <p className="typo-label text-primary-500 mb-2">中文</p>
                    {zhParagraphs.map((p, i) => (
                      <p key={i} className="typo-body text-muted-foreground break-words">{p}</p>
                    ))}
                  </div>
                </div>
              )}
            </Card>

            {reading.vocabulary.length > 0 && (
              <Card>
                <div className="flex items-center justify-between mb-4">
                  <div className="analysis-card-header !mb-0">
                    <Languages className="h-5 w-5 text-emerald-500" />
                    <h3 className="typo-h3">重点词汇</h3>
                  </div>
                  <span className="text-xs text-muted-foreground">{reading.vocabulary.length} 个词汇</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {reading.vocabulary.map((v: VocabItem, i: number) => (
                    <div
                      key={i}
                      className="analysis-item group animate-slide-in"
                      style={{ '--item-color': '#10b981', animationDelay: `${i * 50}ms` } as React.CSSProperties}
                    >
                      <div className="flex items-center justify-between">
                        <p className="font-bold text-primary-600 dark:text-primary-400">{v.word}</p>
                        <button
                          onClick={() => speak(v.word)}
                          className="tap-target p-1 rounded-full opacity-70 hover:opacity-100 transition-opacity text-muted-foreground hover:text-primary-500"
                          title="朗读单词"
                        >
                          <Volume2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      {v.phonetic && <p className="text-xs text-muted-foreground">{v.phonetic}</p>}
                      <p className="typo-body-sm mt-1">{v.meaning}</p>
                      {v.example && (
                        <p className="typo-body-sm italic mt-1 text-muted-foreground font-serif">{v.example}</p>
                      )}
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </div>
        )}
      </ModuleSection>

      <ModuleSection
        index={2}
        type="history"
        title="阅读历史 / 收藏"
        description="收藏的阅读可随时回放并继续用于测验。"
      >
        {favorites.length > 0 ? (
          <div>
            <button
              onClick={() => setShowFavorites(v => !v)}
              className="flex items-center gap-2 w-full px-4 py-2.5 rounded-lg bg-card border border-border/50 hover:border-primary-300 transition-colors group"
            >
              <BookmarkCheck className="h-4 w-4 text-amber-500" />
              <span className="text-sm font-medium">我的收藏</span>
              <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{favorites.length}</span>
              <ChevronDown className={`h-4 w-4 text-muted-foreground ml-auto transition-transform ${showFavorites ? 'rotate-180' : ''}`} />
            </button>
            {showFavorites && (
              <div className="mt-3 animate-fade-in-up">
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <div className="relative min-w-[220px] flex-1">
                    <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={favoriteQuery}
                      onChange={e => setFavoriteQuery(e.target.value)}
                      className="pl-8 h-9"
                      placeholder="搜索标题 / 内容 / 标签"
                    />
                  </div>
                  <Select value={favoriteSort} onChange={e => setFavoriteSort(e.target.value as FavoriteSortMode)}>
                    <option value="saved-desc">最新收藏</option>
                    <option value="saved-asc">最早收藏</option>
                    <option value="title-asc">按标题</option>
                    <option value="vocab-desc">按词汇数</option>
                  </Select>
                  <span className="text-xs text-muted-foreground">显示 {filteredFavorites.length}/{favorites.length}</span>
                </div>

                {filteredFavorites.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {filteredFavorites.map((fav, i) => (
                      <div
                        key={i}
                        className="analysis-item group cursor-pointer"
                        style={{ '--item-color': '#f59e0b' } as React.CSSProperties}
                        onClick={() => loadFavorite(fav)}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <p className="typo-h3 truncate">{fav.title || '无标题'}</p>
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2 font-serif italic">
                              {fav.english.slice(0, 120)}{fav.english.length > 120 ? '...' : ''}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1.5">
                              {fav.vocabulary?.length || 0} 个词汇 · 收藏于 {new Date(fav.savedAt).toLocaleDateString()}
                            </p>
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              {fav.tags.map(tag => (
                                <button
                                  key={tag}
                                  onClick={e => { e.stopPropagation(); removeFavoriteTag(fav, tag); }}
                                  className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] text-amber-700 dark:bg-amber-900/35 dark:text-amber-300"
                                  title="点击移除标签"
                                >
                                  {tag}
                                  <span className="text-[10px] opacity-80">x</span>
                                </button>
                              ))}
                              <button
                                onClick={e => { e.stopPropagation(); addFavoriteTag(fav); }}
                                className="rounded-full border border-border/60 px-2 py-0.5 text-[11px] text-muted-foreground hover:border-primary-300 hover:text-primary-600"
                              >
                                + 标签
                              </button>
                            </div>
                          </div>
                          <button
                            onClick={e => { e.stopPropagation(); removeFavorite(fav); }}
                            className="tap-target p-1.5 rounded-full opacity-70 hover:opacity-100 transition-opacity text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 shrink-0"
                            title="移除收藏"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <Card>
                    <p className="typo-body-sm text-muted-foreground">没有匹配结果，调整关键词或排序后再试。</p>
                  </Card>
                )}
              </div>
            )}
          </div>
        ) : (
          <Card>
            <p className="typo-body-sm text-muted-foreground">暂无收藏记录。生成阅读结果后可加入收藏。</p>
          </Card>
        )}
      </ModuleSection>

      <ModuleSection
        index={3}
        type="action"
        title="阅读操作"
        description="切换视图、朗读、收藏与进入测验。"
      >
        <Card>
          {reading ? (
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="secondary" size="sm"
                onClick={() => setViewMode(v => v === 'alternate' ? 'parallel' : 'alternate')}
              >
                <ArrowLeftRight className="h-4 w-4 mr-1.5" />
                {viewMode === 'alternate' ? '并排视图' : '交替视图'}
              </Button>
              <Button
                variant="secondary" size="sm"
                onClick={() => speak(reading.english)}
                disabled={speaking}
              >
                <Volume2 className={`h-4 w-4 mr-1.5 ${speaking ? 'animate-pulse' : ''}`} />
                {speaking ? '朗读中...' : '朗读全文'}
              </Button>
              <Button
                variant={isFavorited ? 'default' : 'outline'} size="sm"
                onClick={toggleFavorite}
              >
                {isFavorited
                  ? <><BookmarkCheck className="h-4 w-4 mr-1.5" />已收藏</>
                  : <><Bookmark className="h-4 w-4 mr-1.5" />收藏</>
                }
              </Button>
              <Button variant="secondary" size="sm" onClick={goToQuiz}>
                <FileQuestion className="h-4 w-4 mr-1.5" /> 生成测试
              </Button>
            </div>
          ) : (
            <p className="typo-body-sm text-muted-foreground">生成阅读结果后，可在这里切换视图和进入测试。</p>
          )}
        </Card>
      </ModuleSection>
    </div>
  );
}
