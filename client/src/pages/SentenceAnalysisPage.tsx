import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Textarea } from '@/components/ui/Textarea';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { FeedbackAlert } from '@/components/ui/FeedbackAlert';
import { useToast } from '@/components/ui/toast-context';
import { useLocalStorage } from '@/hooks/use-local-storage';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { ModuleSection } from '@/components/layout/ModuleSection';
import { AlignLeft, Copy, Check, X, GitMerge, Clock, Quote, Sparkles, Type, Braces, History } from 'lucide-react';
import { AIConfigBanner } from '@/components/settings/AIConfigBanner';
import type { SentenceAnalysis } from '@/types';

const examples = [
  { label: '简单句', text: 'The cat sat on the mat.' },
  { label: '复合句', text: "I believe that he will come tomorrow if it doesn't rain." },
  { label: '复杂句', text: 'The book, which was written by a famous author, has won several awards and is now being adapted into a movie that will be released next year.' },
];

const componentColorMap: Record<string, string> = {
  主语: 'component-subject', 谓语: 'component-predicate', 宾语: 'component-object',
  定语: 'component-attribute', 状语: 'component-adverbial', 补语: 'component-complement',
  同位语: 'component-appositive',
};

// Color legend for component types
const legend = [
  { label: '主语', color: '#3b82f6' },
  { label: '谓语', color: '#ef4444' },
  { label: '宾语', color: '#10b981' },
  { label: '定语', color: '#f59e0b' },
  { label: '状语', color: '#8b5cf6' },
  { label: '补语', color: '#ec4899' },
];

function getComponentClass(type: string) {
  for (const [key, cls] of Object.entries(componentColorMap)) {
    if (type.includes(key)) return cls;
  }
  return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
}

interface AnalysisRecord {
  sentence: string;
  result: SentenceAnalysis;
  timestamp: number;
}

export function SentenceAnalysisPage() {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SentenceAnalysis | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [activeTooltip, setActiveTooltip] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);
  const [history, setHistory] = useLocalStorage<AnalysisRecord[]>('sentenceHistory', []);
  const { toast } = useToast();

  const analyze = async () => {
    if (!input.trim()) return;
    setErrorMessage('');
    setLoading(true);
    setResult(null);
    setActiveTooltip(null);
    try {
      const data = await api.sentence.analyze(input) as SentenceAnalysis;
      setResult(data);
      setHistory(prev => [
        { sentence: input.trim(), result: data, timestamp: Date.now() },
        ...prev.filter(h => h.sentence !== input.trim()),
      ].slice(0, 3));
      toast('分析完成', 'success');
    } catch (err) {
      const message = (err as Error).message;
      setErrorMessage(message);
      toast(`分析失败: ${message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const copyResult = async () => {
    if (!result) return;
    const text = JSON.stringify(result, null, 2);
    await navigator.clipboard.writeText(text);
    setCopied(true);
    toast('已复制到剪贴板', 'success');
    setTimeout(() => setCopied(false), 2000);
  };

  const loadRecord = (record: AnalysisRecord) => {
    setInput(record.sentence);
    setResult(record.result);
    setActiveTooltip(null);
  };

  const clearCurrent = () => {
    setInput('');
    setResult(null);
    setActiveTooltip(null);
    setErrorMessage('');
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
        title="输入待分析句子"
        description="支持手动输入或使用示例句，按回车即可触发分析。"
      >
        <Card>
          <div className="relative">
            <Textarea
              rows={5}
              placeholder="输入英语句子进行语法分析..."
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && analyze()}
            />
            {input && (
              <button
                onClick={() => setInput('')}
                className="tap-target absolute top-2 right-2 p-1 rounded-full text-muted-foreground hover:bg-muted transition"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <div className="flex items-center gap-2 mt-4 flex-wrap">
            <Button onClick={analyze} loading={loading} disabled={!input.trim()}>
              分析句子
            </Button>
            <div className="h-4 w-px bg-border mx-1" />
            {examples.map((ex, i) => (
              <button
                key={i}
                onClick={() => setInput(ex.text)}
                className="px-3 py-1 text-xs font-medium rounded-full border border-border text-muted-foreground hover:border-primary-300 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
              >
                {ex.label}
              </button>
            ))}
          </div>
        </Card>
      </ModuleSection>

      <ModuleSection
        index={1}
        type="result"
        title="句子分析结果"
        description="查看结构拆解、从句时态、短语和语法要点。"
      >
        {loading && <LoadingSpinner text="AI 正在分析句子结构..." />}

        {!result && !loading && (
          <EmptyState
            icon={<AlignLeft className="h-16 w-16" />}
            title="输入句子开始分析"
            description="支持简单句、复合句、复杂句等各种句型，AI 会标注句子成分并解析语法要点。"
          />
        )}

        {result && (
          <div className="space-y-6 animate-soft-pop">
          {/* Structure */}
            <Card className="analysis-highlight-card pt-6">
              <div className="flex items-center justify-between mb-4">
                <div className="analysis-card-header !mb-0">
                  <Braces className="h-5 w-5 text-primary-500" />
                  <h2 className="text-lg font-bold">句子结构</h2>
                </div>
                <Button variant="ghost" size="sm" onClick={copyResult}>
                  {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  {copied ? '已复制' : '复制'}
                </Button>
              </div>
              <div className="relative bg-muted/50 rounded-lg p-5 border border-border/30">
                <span className="absolute top-2 left-3 text-3xl leading-none text-primary-300/50 dark:text-primary-600/40 font-serif select-none">"</span>
                <p className="text-xl leading-relaxed font-serif pl-5 pr-5">{input}</p>
                <span className="absolute bottom-1 right-3 text-3xl leading-none text-primary-300/50 dark:text-primary-600/40 font-serif select-none">"</span>
              </div>
              {result.structure && (
                <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                  <div className="analysis-item" style={{ '--item-color': '#3b82f6' } as React.CSSProperties}>
                    <div className="flex items-center gap-1.5 mb-1">
                      <Type className="h-3.5 w-3.5 text-blue-500" />
                      <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wide">句子类型</p>
                    </div>
                    <p className="font-medium">{result.structure.type}</p>
                  </div>
                  <div className="analysis-item" style={{ '--item-color': '#8b5cf6' } as React.CSSProperties}>
                    <div className="flex items-center gap-1.5 mb-1">
                      <AlignLeft className="h-3.5 w-3.5 text-purple-500" />
                      <p className="text-xs font-semibold text-purple-600 dark:text-purple-400 uppercase tracking-wide">结构解释</p>
                    </div>
                    <p>{result.structure.explanation}</p>
                  </div>
                </div>
              )}
            </Card>

            {/* Components with legend */}
            {result.components && result.components.length > 0 && (
              <Card className="overflow-hidden">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold">句子成分</h2>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    {legend.map(l => (
                      <span key={l.label} className="flex items-center gap-1.5">
                        <span className="legend-dot" style={{ backgroundColor: l.color }} />
                        {l.label}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2.5">
                  {result.components.map((comp, i) => (
                    <button
                      key={i}
                      className={cn(
                        'component-chip',
                        getComponentClass(comp.type),
                        activeTooltip === i && 'component-chip-active',
                      )}
                      onClick={() => setActiveTooltip(activeTooltip === i ? null : i)}
                    >
                      <span className="component-chip-type">{comp.type}</span>
                      <span className="component-chip-text">{comp.text}</span>
                    </button>
                  ))}
                </div>

                {activeTooltip !== null && result.components[activeTooltip] && (() => {
                  const comp = result.components[activeTooltip];
                  return (
                    <div
                      className={cn('component-detail-panel mt-5 bg-muted/60 p-4', getComponentClass(comp.type))}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold tracking-wide text-muted-foreground mb-1">{comp.type}</p>
                          <p className="font-serif text-base italic text-foreground/90 mb-2">"{comp.text}"</p>
                          <p className="text-sm text-muted-foreground leading-relaxed">{comp.explanation}</p>
                        </div>
                        <button
                          onClick={() => setActiveTooltip(null)}
                          className="tap-target p-1.5 rounded-full hover:bg-background/80 transition-colors text-muted-foreground shrink-0"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })()}
              </Card>
            )}

          {/* Clauses & Tense */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <div className="analysis-card-header">
                <GitMerge className="h-5 w-5 text-blue-500" />
                <h2 className="text-lg font-bold">从句分析</h2>
              </div>
              {result.clauses && result.clauses.length > 0 ? (
                <ul className="space-y-3">
                  {result.clauses.map((c, i) => (
                    <li key={i} className="analysis-item text-sm animate-slide-in" style={{ '--item-color': '#3b82f6', animationDelay: `${i * 80}ms` } as React.CSSProperties}>
                      <p className="font-semibold">{c.type}</p>
                      <p className="text-muted-foreground text-xs mt-0.5">功能: {c.function}</p>
                      <p className="italic mt-1.5 text-foreground/80 font-serif">"{c.text}"</p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-muted-foreground text-sm py-4 text-center">未检测到从句结构</p>
              )}
            </Card>

            <Card>
              <div className="analysis-card-header">
                <Clock className="h-5 w-5 text-amber-500" />
                <h2 className="text-lg font-bold">时态分析</h2>
              </div>
              {result.tense && result.tense.length > 0 ? (
                <ul className="space-y-3">
                  {result.tense.map((t, i) => (
                    <li key={i} className="analysis-item text-sm animate-slide-in" style={{ '--item-color': '#f59e0b', animationDelay: `${i * 80}ms` } as React.CSSProperties}>
                      <p className="font-semibold">{t.name}</p>
                      <p className="mt-1 text-muted-foreground">{t.explanation}</p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-muted-foreground text-sm py-4 text-center">无法确定时态</p>
              )}
            </Card>
          </div>

          {/* Phrases & Grammar */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <div className="analysis-card-header">
                <Quote className="h-5 w-5 text-emerald-500" />
                <h2 className="text-lg font-bold">重要短语</h2>
              </div>
              {result.phrases && result.phrases.length > 0 ? (
                <ul className="space-y-3">
                  {result.phrases.map((p, i) => (
                    <li key={i} className="analysis-item text-sm" style={{ '--item-color': '#10b981' } as React.CSSProperties}>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-medium bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-full">{p.type}</span>
                      </div>
                      <p className="italic text-foreground/80 font-serif">"{p.text}"</p>
                      <p className="mt-1 text-muted-foreground">{p.explanation}</p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-muted-foreground text-sm py-4 text-center">未检测到特殊短语</p>
              )}
            </Card>

            <Card>
              <div className="analysis-card-header">
                <Sparkles className="h-5 w-5 text-indigo-500" />
                <h2 className="text-lg font-bold">语法要点</h2>
              </div>
              {result.grammarPoints && result.grammarPoints.length > 0 ? (
                <ul className="space-y-3">
                  {result.grammarPoints.map((g, i) => (
                    <li key={i} className="analysis-item text-sm" style={{ '--item-color': '#6366f1' } as React.CSSProperties}>
                      <p className="font-semibold">{g.point}</p>
                      <p className="mt-1 text-muted-foreground">{g.explanation}</p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-muted-foreground text-sm py-4 text-center">未检测到特殊语法点</p>
              )}
            </Card>
          </div>
          </div>
        )}
      </ModuleSection>

      <ModuleSection
        index={2}
        type="history"
        title="最近分析历史"
        description="保留最近 3 条分析记录，可一键重新加载。"
      >
        <Card>
          {history.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground mr-1">
                <History className="h-3.5 w-3.5" /> 最近分析
              </span>
              {history.map((h, i) => (
                <button
                  key={i}
                  onClick={() => loadRecord(h)}
                  className={cn(
                    'px-3 py-1.5 text-xs rounded-full border transition-all max-w-[260px] truncate',
                    h.sentence === input
                      ? 'border-primary-400 bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
                      : 'border-border text-muted-foreground hover:border-primary-300 hover:text-primary-600 dark:hover:text-primary-400',
                  )}
                  title={h.sentence}
                >
                  {h.sentence}
                </button>
              ))}
            </div>
          ) : (
            <p className="typo-body-sm text-muted-foreground">暂无历史记录，先完成一次句子分析。</p>
          )}
        </Card>
      </ModuleSection>

      <ModuleSection
        index={3}
        type="action"
        title="分析操作"
        description="快速重跑分析、复制结果或重置历史。"
      >
        <Card>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={analyze} loading={loading} disabled={!input.trim()}>
              重新分析
            </Button>
            <Button variant="secondary" size="sm" onClick={copyResult} disabled={!result}>
              复制结果
            </Button>
            <Button variant="ghost" size="sm" onClick={clearCurrent}>
              清空当前
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setHistory([])} disabled={history.length === 0}>
              清空历史
            </Button>
          </div>
        </Card>
      </ModuleSection>
    </div>
  );
}
