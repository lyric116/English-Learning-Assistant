import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Textarea';
import { Select } from '@/components/ui/Select';
import { Card } from '@/components/ui/Card';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { useToast } from '@/components/ui/toast-context';
import { useLocalStorage } from '@/hooks/use-local-storage';
import { useTts } from '@/hooks/use-tts';
import { api } from '@/lib/api';
import {
  Volume2, Bookmark, BookmarkCheck, FileQuestion,
  ArrowLeftRight, BookOpen, X, Sparkles, Languages,
  ChevronDown, Trash2,
} from 'lucide-react';
import { AIConfigBanner } from '@/components/settings/AIConfigBanner';
import type { ReadingContent, VocabItem } from '@/types';

export function ReadingPage() {
  const quizContextKey = 'quizCurrentReading';
  const navigate = useNavigate();
  const { speak, speaking } = useTts();
  const { toast } = useToast();
  const [inputText, setInputText] = useState('');
  const [language, setLanguage] = useState('en');
  const [loading, setLoading] = useState(false);
  const [reading, setReading] = useState<ReadingContent | null>(null);
  const [viewMode, setViewMode] = useState<'alternate' | 'parallel'>('alternate');
  const [, setHistory] = useLocalStorage<ReadingContent[]>('readingHistory', []);
  const [, setQuizReadingContext] = useLocalStorage<ReadingContent | null>(quizContextKey, null);
  const [favorites, setFavorites] = useLocalStorage<ReadingContent[]>('readingFavorites', []);
  const [showFavorites, setShowFavorites] = useState(false);

  const isFavorited = reading ? favorites.some(f => f.english === reading.english) : false;

  const generate = async () => {
    if (!inputText.trim()) return;
    setLoading(true);
    try {
      const result = await api.reading.generate(inputText, language) as ReadingContent;
      setReading(result);
      const withTimestamp = { ...result, timestamp: Date.now() };
      setQuizReadingContext(withTimestamp);
      setHistory(prev => [withTimestamp, ...prev].slice(0, 10));
      toast('双语内容生成成功', 'success');
    } catch (err) {
      toast(`生成失败: ${(err as Error).message}`, 'error');
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
      setFavorites(prev => [...prev, { ...reading, savedAt: Date.now() } as ReadingContent & { savedAt: number }]);
      toast('已保存到收藏', 'success');
    }
  };

  const goToQuiz = () => {
    if (!reading) return;
    setQuizReadingContext(reading);
    navigate('/quiz', { state: { currentReading: reading } });
  };

  const loadFavorite = (fav: ReadingContent) => {
    setReading(fav);
    setQuizReadingContext(fav);
    setShowFavorites(false);
  };

  const removeFavorite = (fav: ReadingContent) => {
    setFavorites(prev => prev.filter(f => f.english !== fav.english));
    toast('已移除收藏', 'info');
  };

  const enParagraphs = reading?.english.split('\n').filter(p => p.trim()) || [];
  const zhParagraphs = reading?.chinese.split('\n').filter(p => p.trim()) || [];

  return (
    <div className="max-w-4xl mx-auto animate-fade-in-up">
      <AIConfigBanner />

      <Card className="mb-10">
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
              className="absolute top-2 right-2 p-1 rounded-full text-muted-foreground hover:bg-muted transition"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-3 mt-4">
          <Select value={language} onChange={e => setLanguage(e.target.value)}>
            <option value="en">英文 → 中文</option>
            <option value="zh">中文 → 英文</option>
          </Select>
          <Button onClick={generate} loading={loading} disabled={loading || !inputText.trim()}>
            <Sparkles className="h-4 w-4 mr-1.5" />
            生成双语内容
          </Button>
          <span className="text-xs text-muted-foreground ml-auto hidden sm:inline">
            支持任意长度文本
          </span>
        </div>
      </Card>

      {/* Favorites panel */}
      {favorites.length > 0 && (
        <div className="mb-8">
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
            <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3 animate-fade-in-up">
              {favorites.map((fav, i) => (
                <div
                  key={i}
                  className="analysis-item group cursor-pointer"
                  style={{ '--item-color': '#f59e0b' } as React.CSSProperties}
                  onClick={() => loadFavorite(fav)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-sm truncate">{fav.title || '无标题'}</p>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2 font-serif italic">
                        {fav.english.slice(0, 120)}{fav.english.length > 120 ? '...' : ''}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1.5">
                        {fav.vocabulary?.length || 0} 个词汇
                      </p>
                    </div>
                    <button
                      onClick={e => { e.stopPropagation(); removeFavorite(fav); }}
                      className="p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 shrink-0"
                      title="移除收藏"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {loading && <LoadingSpinner text="AI 正在翻译并提取词汇..." />}

      {!reading && !loading && (
        <EmptyState
          icon={<BookOpen className="h-16 w-16" />}
          title="开始双语阅读"
          description="输入英文或中文文本，AI 将生成中英双语对照内容，并提取重点词汇。"
        />
      )}

      {reading && !loading && (
        <div className="animate-fade-in-up">
          {/* Toolbar */}
          <div className="flex flex-wrap items-center gap-2 mb-4 p-3 bg-muted/50 rounded-lg">
            <Button
              variant="outline" size="sm"
              onClick={() => setViewMode(v => v === 'alternate' ? 'parallel' : 'alternate')}
            >
              <ArrowLeftRight className="h-4 w-4 mr-1.5" />
              {viewMode === 'alternate' ? '并排视图' : '交替视图'}
            </Button>
            <Button
              variant="outline" size="sm"
              onClick={() => speak(reading.english)}
              disabled={speaking}
            >
              <Volume2 className={`h-4 w-4 mr-1.5 ${speaking ? 'animate-pulse' : ''}`} />
              {speaking ? '朗读中...' : '朗读'}
            </Button>

            <div className="flex-1" />

            <Button
              variant={isFavorited ? 'default' : 'outline'} size="sm"
              onClick={toggleFavorite}
            >
              {isFavorited
                ? <><BookmarkCheck className="h-4 w-4 mr-1.5" />已收藏</>
                : <><Bookmark className="h-4 w-4 mr-1.5" />收藏</>
              }
            </Button>
            <Button variant="outline" size="sm" onClick={goToQuiz}>
              <FileQuestion className="h-4 w-4 mr-1.5" /> 生成测试
            </Button>
          </div>

          {/* Reading content */}
          <Card className="analysis-highlight-card pt-6 mb-6">
            {reading.title && (
              <h2 className="text-xl font-bold mb-4 pb-3 border-b border-border/50">
                {reading.title}
              </h2>
            )}
            {viewMode === 'alternate' ? (
              <div className="space-y-4">
                {enParagraphs.map((p, i) => (
                  <div key={i} className="group">
                    <p className="text-lg leading-relaxed font-serif">{p}</p>
                    <p className="text-base text-muted-foreground leading-relaxed mt-1 pl-3 border-l-2 border-primary-200 dark:border-primary-800">
                      {zhParagraphs[i] || ''}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <p className="text-xs font-bold uppercase tracking-wider text-primary-500 mb-2">English</p>
                  {enParagraphs.map((p, i) => (
                    <p key={i} className="text-lg leading-relaxed font-serif">{p}</p>
                  ))}
                </div>
                <div className="space-y-4 md:border-l md:border-border/50 md:pl-6">
                  <p className="text-xs font-bold uppercase tracking-wider text-primary-500 mb-2">中文</p>
                  {zhParagraphs.map((p, i) => (
                    <p key={i} className="text-base text-muted-foreground leading-relaxed">{p}</p>
                  ))}
                </div>
              </div>
            )}
          </Card>

          {/* Vocabulary */}
          {reading.vocabulary.length > 0 && (
            <Card>
              <div className="flex items-center justify-between mb-4">
                <div className="analysis-card-header !mb-0">
                  <Languages className="h-5 w-5 text-emerald-500" />
                  <h3 className="font-bold">重点词汇</h3>
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
                        className="p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-primary-500"
                        title="朗读单词"
                      >
                        <Volume2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    {v.phonetic && <p className="text-xs text-muted-foreground">{v.phonetic}</p>}
                    <p className="text-sm mt-1">{v.meaning}</p>
                    {v.example && (
                      <p className="text-sm italic mt-1 text-muted-foreground font-serif">{v.example}</p>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
