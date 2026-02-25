import { useEffect, useMemo, useState } from 'react';
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object';
}

function readStringField(source: Record<string, unknown>, keys: string[], fallback = ''): string {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return fallback;
}

function readTagList(source: Record<string, unknown>): string[] {
  const tags = source.tags ?? source.tag ?? source.labels ?? source.label;
  if (Array.isArray(tags)) {
    return tags
      .map(item => (typeof item === 'string' ? item.trim() : ''))
      .filter(Boolean);
  }
  if (typeof tags === 'string') {
    return tags
      .split(/[，,|/]/)
      .map(item => item.trim())
      .filter(Boolean);
  }
  return [];
}

function toObjectArray(value: unknown): Record<string, unknown>[] {
  if (!Array.isArray(value)) return [];
  return value.filter(isRecord);
}

function normalizeToken(value: string): string {
  return value.replace(/^[^A-Za-z]+|[^A-Za-z]+$/g, '').toLowerCase();
}

function normalizeLookupText(value: string): string {
  return value
    .toLowerCase()
    .replace(/[\s,.;:!?()[\]{}"'`，。；：！？（）【】]/g, '');
}

function isSentenceAnalysisV2(value: unknown): value is SentenceAnalysis {
  if (!isRecord(value)) return false;
  const words = value.words;
  const phrases = value.phrases;
  const grammarPoints = value.grammarPoints;
  if (!Array.isArray(words) || !Array.isArray(phrases) || !Array.isArray(grammarPoints)) return false;
  return grammarPoints.every(item => (
    isRecord(item)
    && typeof item.title === 'string'
    && Array.isArray(item.tags)
  ));
}

function normalizeSentenceAnalysis(value: unknown): SentenceAnalysis {
  const root = isRecord(value) ? value : {};
  const structureSource = isRecord(root.structure) ? root.structure : {};

  const structure = {
    type: readStringField(structureSource, ['type', 'sentenceType'], '未识别句型'),
    explanation: readStringField(structureSource, ['explanation', 'description', 'detail'], '未提供结构解释'),
    pattern: readStringField(structureSource, ['pattern', 'formula', 'template']),
  };

  const clauses = toObjectArray(root.clauses).map(item => ({
    text: readStringField(item, ['text', 'content']),
    type: readStringField(item, ['type', 'clauseType']),
    function: readStringField(item, ['function', 'role']),
    connector: readStringField(item, ['connector', 'marker']),
  })).filter(item => item.text || item.type || item.function || item.connector);

  const tense = toObjectArray(root.tense ?? root.tenses).map(item => ({
    name: readStringField(item, ['name', 'tense']),
    explanation: readStringField(item, ['explanation', 'detail', 'description']),
  })).filter(item => item.name || item.explanation);

  const components = toObjectArray(root.components).map(item => ({
    text: readStringField(item, ['text', 'content']),
    type: readStringField(item, ['type', 'componentType']),
    explanation: readStringField(item, ['explanation', 'detail']),
  })).filter(item => item.text || item.type || item.explanation);

  const wordsSource = root.words ?? root.wordDetails ?? root.tokens;
  const words = toObjectArray(wordsSource).map(item => ({
    text: readStringField(item, ['text', 'word', 'token']),
    lemma: readStringField(item, ['lemma', 'baseForm', 'root', 'word']),
    partOfSpeech: readStringField(item, ['partOfSpeech', 'pos', 'type']),
    meaning: readStringField(item, ['meaning', 'definition', 'explanation']),
    role: readStringField(item, ['role', 'function', 'usage']),
  })).filter(item => item.text || item.lemma || item.meaning);

  const phrases = toObjectArray(root.phrases).map(item => ({
    text: readStringField(item, ['text', 'phrase']),
    category: readStringField(item, ['category', 'type']),
    function: readStringField(item, ['function', 'role', 'usage']),
    explanation: readStringField(item, ['explanation', 'detail', 'meaning']),
  })).filter(item => item.text || item.category || item.explanation);

  const grammarPoints = toObjectArray(root.grammarPoints ?? root.grammar).map(item => ({
    title: readStringField(item, ['title', 'point', 'name']),
    explanation: readStringField(item, ['explanation', 'detail', 'description']),
    tags: readTagList(item),
  })).filter(item => item.title || item.explanation || item.tags.length > 0);

  return {
    structure,
    clauses,
    tense,
    components,
    words,
    phrases,
    grammarPoints,
  };
}

export function SentenceAnalysisPage() {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SentenceAnalysis | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [activeTooltip, setActiveTooltip] = useState<number | null>(null);
  const [activeWordKey, setActiveWordKey] = useState<string | null>(null);
  const [activeGrammarIndex, setActiveGrammarIndex] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);
  const [history, setHistory] = useLocalStorage<AnalysisRecord[]>('sentenceHistory', []);
  const { toast } = useToast();

  const wordLookup = useMemo(() => {
    const map = new Map<string, SentenceAnalysis['words'][number]>();
    if (!result) return map;
    result.words.forEach(item => {
      const wordKey = normalizeToken(item.text);
      if (wordKey && !map.has(wordKey)) map.set(wordKey, item);
      const lemmaKey = normalizeToken(item.lemma);
      if (lemmaKey && !map.has(lemmaKey)) map.set(lemmaKey, item);
    });
    return map;
  }, [result]);

  const sentenceTokens = useMemo(
    () => input.split(/(\s+)/).filter(token => token.length > 0),
    [input],
  );
  const activeWordInfo = activeWordKey ? wordLookup.get(activeWordKey) ?? null : null;
  const activeGrammar = useMemo(() => {
    if (!result || activeGrammarIndex === null) return null;
    return result.grammarPoints[activeGrammarIndex] ?? null;
  }, [activeGrammarIndex, result]);
  const linkedPhraseIndexes = useMemo(() => {
    const linked = new Set<number>();
    if (!result || activeGrammarIndex === null) return linked;
    const grammarPoint = result.grammarPoints[activeGrammarIndex];
    if (!grammarPoint) return linked;

    const terms = [grammarPoint.title, ...grammarPoint.tags]
      .map(normalizeLookupText)
      .filter(term => term.length > 1);

    result.phrases.forEach((phrase, index) => {
      const phraseText = [
        phrase.text,
        phrase.category,
        phrase.function,
        phrase.explanation,
      ].map(normalizeLookupText).join(' ');
      if (terms.some(term => phraseText.includes(term))) {
        linked.add(index);
      }
    });

    if (linked.size === 0 && result.phrases[activeGrammarIndex]) {
      linked.add(activeGrammarIndex);
    }
    return linked;
  }, [activeGrammarIndex, result]);

  useEffect(() => {
    const hasLegacy = history.some(item => !isSentenceAnalysisV2(item.result));
    if (!hasLegacy) return;
    setHistory(prev => prev.map(item => ({
      ...item,
      result: normalizeSentenceAnalysis(item.result),
    })));
  }, [history, setHistory]);

  const analyze = async () => {
    if (!input.trim()) return;
    setErrorMessage('');
    setLoading(true);
    setResult(null);
    setActiveTooltip(null);
    setActiveWordKey(null);
    setActiveGrammarIndex(null);
    try {
      const data = await api.sentence.analyze(input);
      const normalized = normalizeSentenceAnalysis(data);
      setResult(normalized);
      setHistory(prev => [
        { sentence: input.trim(), result: normalized, timestamp: Date.now() },
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
    setResult(normalizeSentenceAnalysis(record.result));
    setActiveTooltip(null);
    setActiveWordKey(null);
    setActiveGrammarIndex(null);
  };

  const clearCurrent = () => {
    setInput('');
    setResult(null);
    setActiveTooltip(null);
    setActiveWordKey(null);
    setActiveGrammarIndex(null);
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
        description="查看结构拆解、词级信息、从句时态、短语和语法要点。"
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
                <p className="text-xl leading-relaxed font-serif pl-5 pr-5">
                  {sentenceTokens.map((token, i) => {
                    if (/^\s+$/.test(token)) {
                      return <span key={`space-${i}`}>{token}</span>;
                    }
                    const tokenKey = normalizeToken(token);
                    const matchedWord = tokenKey ? wordLookup.get(tokenKey) : null;
                    if (!matchedWord) {
                      return <span key={`token-${i}`}>{token}</span>;
                    }
                    return (
                      <button
                        key={`token-${i}`}
                        type="button"
                        onMouseEnter={() => setActiveWordKey(tokenKey)}
                        onClick={() => setActiveWordKey(prev => (prev === tokenKey ? null : tokenKey))}
                        className={cn(
                          'inline rounded-md px-0.5 transition-colors',
                          activeWordKey === tokenKey
                            ? 'bg-sky-100 text-sky-700 dark:bg-sky-900/45 dark:text-sky-300'
                            : 'hover:bg-sky-100/70 hover:text-sky-700 dark:hover:bg-sky-900/35 dark:hover:text-sky-300',
                        )}
                      >
                        {token}
                      </button>
                    );
                  })}
                </p>
                <span className="absolute bottom-1 right-3 text-3xl leading-none text-primary-300/50 dark:text-primary-600/40 font-serif select-none">"</span>
              </div>
              {result.words.length > 0 && (
                <p className="mt-2 text-xs text-muted-foreground">悬停或点击高亮词汇，可查看词义、词性和句中作用。</p>
              )}
              {activeWordInfo && (
                <div className="analysis-item mt-4" style={{ '--item-color': '#0ea5e9' } as React.CSSProperties}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold font-serif text-base">{activeWordInfo.text || '-'}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        词元: {activeWordInfo.lemma || '-'} · 词性: {activeWordInfo.partOfSpeech || '未标注'}
                      </p>
                      <p className="text-sm text-muted-foreground mt-2">{activeWordInfo.meaning || '未返回该词解释'}</p>
                      {activeWordInfo.role && <p className="text-xs text-muted-foreground mt-1.5">句中作用: {activeWordInfo.role}</p>}
                    </div>
                    <button
                      type="button"
                      className="tap-target p-1.5 rounded-full hover:bg-muted transition-colors shrink-0"
                      onClick={() => setActiveWordKey(null)}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              )}
              {result.structure && (
                <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
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
                  <div className="analysis-item" style={{ '--item-color': '#14b8a6' } as React.CSSProperties}>
                    <div className="flex items-center gap-1.5 mb-1">
                      <Braces className="h-3.5 w-3.5 text-teal-500" />
                      <p className="text-xs font-semibold text-teal-600 dark:text-teal-400 uppercase tracking-wide">句型公式</p>
                    </div>
                    <p>{result.structure.pattern || '未返回句型公式'}</p>
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

            {result.words && result.words.length > 0 && (
              <Card>
                <div className="analysis-card-header">
                  <Type className="h-5 w-5 text-sky-500" />
                  <h2 className="text-lg font-bold">词级信息</h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {result.words.slice(0, 12).map((w, i) => (
                    <div
                      key={`${w.text}-${i}`}
                      className="analysis-item text-sm"
                      style={{ '--item-color': '#0ea5e9' } as React.CSSProperties}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-semibold font-serif truncate">{w.text || '-'}</p>
                        <span className="text-xs rounded-full bg-sky-100 dark:bg-sky-900/40 text-sky-700 dark:text-sky-300 px-2 py-0.5">
                          {w.partOfSpeech || '未标注'}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">词元: {w.lemma || '-'}</p>
                      <p className="text-muted-foreground mt-1">{w.meaning || '未返回词义'}</p>
                      {w.role && <p className="text-xs text-muted-foreground mt-1">句中作用: {w.role}</p>}
                    </div>
                  ))}
                </div>
                {result.words.length > 12 && (
                  <p className="text-xs text-muted-foreground mt-3">已展示前 12 个词级条目，共 {result.words.length} 个。</p>
                )}
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
                      {c.connector && <p className="text-muted-foreground text-xs mt-0.5">连接词: {c.connector}</p>}
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
                    <li
                      key={i}
                      className={cn(
                        'analysis-item text-sm transition-colors',
                        linkedPhraseIndexes.has(i) && 'ring-1 ring-indigo-300/60 bg-indigo-50/45 dark:bg-indigo-900/30',
                      )}
                      style={{ '--item-color': linkedPhraseIndexes.has(i) ? '#6366f1' : '#10b981' } as React.CSSProperties}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-medium bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-full">
                          {p.category || '短语'}
                        </span>
                        {p.function && <span className="text-xs text-muted-foreground">作用: {p.function}</span>}
                        {linkedPhraseIndexes.has(i) && (
                          <span className="text-xs font-medium rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 px-2 py-0.5">
                            已关联
                          </span>
                        )}
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
                <>
                  <ul className="space-y-3">
                    {result.grammarPoints.map((g, i) => (
                      <li key={i}>
                        <button
                          type="button"
                          onClick={() => setActiveGrammarIndex(prev => (prev === i ? null : i))}
                          className={cn(
                            'w-full text-left analysis-item text-sm transition-colors',
                            activeGrammarIndex === i && 'ring-1 ring-indigo-300/70 bg-indigo-50/45 dark:bg-indigo-900/30',
                          )}
                          style={{ '--item-color': '#6366f1' } as React.CSSProperties}
                        >
                          <p className="font-semibold">{g.title || '语法点'}</p>
                          {g.tags.length > 0 && (
                            <div className="mt-1 flex flex-wrap gap-1.5">
                              {g.tags.slice(0, 4).map(tag => (
                                <span key={tag} className="text-[11px] rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 px-2 py-0.5">
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}
                          <p className="mt-1 text-muted-foreground line-clamp-2">{g.explanation}</p>
                        </button>
                      </li>
                    ))}
                  </ul>
                  {activeGrammar && (
                    <div className="analysis-item mt-4" style={{ '--item-color': '#6366f1' } as React.CSSProperties}>
                      <p className="font-semibold">{activeGrammar.title || '语法点说明'}</p>
                      <p className="mt-1 text-muted-foreground">{activeGrammar.explanation}</p>
                      {linkedPhraseIndexes.size > 0 && result.phrases.length > 0 && (
                        <div className="mt-2.5 flex flex-wrap gap-1.5">
                          {Array.from(linkedPhraseIndexes).slice(0, 4).map(index => (
                            <span
                              key={`linked-phrase-${index}`}
                              className="text-[11px] rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 px-2 py-0.5"
                            >
                              {result.phrases[index]?.text || '关联片段'}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </>
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
