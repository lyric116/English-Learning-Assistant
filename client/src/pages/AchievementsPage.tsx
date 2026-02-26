import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { FeedbackAlert } from '@/components/ui/FeedbackAlert';
import { useToast } from '@/components/ui/toast-context';
import { useLocalStorage } from '@/hooks/use-local-storage';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { ModuleSection } from '@/components/layout/ModuleSection';
import {
  Trophy, Clock, BookOpen, Target, TrendingUp,
  ThumbsUp, AlertTriangle, Lightbulb, Share2,
  X, BarChart3,
} from 'lucide-react';
import type {
  FlashcardSessionSummary,
  LearningReport,
  LearningReportTemplateProfile,
  ReportTemplateType,
  Word,
  ReadingContent,
  TestResult,
  WrongQuestionRecord,
} from '@/types';
import { AIConfigBanner } from '@/components/settings/AIConfigBanner';

const reportTypes: Array<{ value: ReportTemplateType; label: string; description: string; icon: typeof Clock }> = [
  { value: 'weekly', label: '周报', description: '平衡复盘本周学习节奏与短板', icon: Clock },
  { value: 'exam_sprint', label: '考试冲刺', description: '聚焦提分路径与错题突破优先级', icon: Target },
  { value: 'workplace_boost', label: '职场提升', description: '强调商务表达、阅读沟通与应用场景', icon: TrendingUp },
];

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

type TrendMetricKey = 'frequency' | 'accuracy' | 'wrongQuestions';
type TrendDirection = 'up' | 'down' | 'stable';

interface TrendMetric {
  key: TrendMetricKey;
  label: string;
  current: number;
  previous: number;
  unit: string;
  trend: TrendDirection;
  positive: boolean;
  description: string;
}

function formatDateTime(value: string): string {
  const ts = Date.parse(value);
  if (Number.isNaN(ts)) return value;
  return new Date(ts).toLocaleString();
}

function buildTemplateProfile(report: LearningReport, templateType: ReportTemplateType): LearningReportTemplateProfile {
  const strengthTop = report.strengths.slice(0, 3);
  const weaknessTop = report.weaknesses.slice(0, 3);
  const suggestionTop = report.suggestions.slice(0, 4);

  if (templateType === 'exam_sprint') {
    return {
      templateType,
      title: '考试冲刺结构',
      sections: [
        { title: '提分突破点', bullets: weaknessTop.length > 0 ? weaknessTop : ['暂无明显薄弱项'] },
        { title: '冲刺行动清单', bullets: suggestionTop.length > 0 ? suggestionTop : ['建议维持稳定刷题节奏'] },
        { title: '稳定得分项', bullets: strengthTop.length > 0 ? strengthTop : ['暂无明显稳定项'] },
      ],
    };
  }

  if (templateType === 'workplace_boost') {
    return {
      templateType,
      title: '职场提升结构',
      sections: [
        { title: '场景应用优势', bullets: strengthTop.length > 0 ? strengthTop : ['暂无明确优势项'] },
        { title: '沟通风险点', bullets: weaknessTop.length > 0 ? weaknessTop : ['暂无明确风险点'] },
        { title: '应用升级建议', bullets: suggestionTop.length > 0 ? suggestionTop : ['建议保持每周稳定输入与输出'] },
      ],
    };
  }

  return {
    templateType,
    title: '周报结构',
    sections: [
      { title: '本周亮点', bullets: strengthTop.length > 0 ? strengthTop : ['暂无明显亮点'] },
      { title: '待优化点', bullets: weaknessTop.length > 0 ? weaknessTop : ['暂无明显短板'] },
      { title: '下周行动项', bullets: suggestionTop.length > 0 ? suggestionTop : ['建议继续保持学习频率'] },
    ],
  };
}

function parseTimestamp(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string') {
    const parsed = Date.parse(value);
    if (!Number.isNaN(parsed)) {
      return parsed;
    }
  }
  return null;
}

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 10) / 10;
}

function resolveTrend(current: number, previous: number, higherIsBetter: boolean): Pick<TrendMetric, 'trend' | 'positive' | 'description'> {
  if (current === previous) {
    return {
      trend: 'stable',
      positive: true,
      description: '与上一周期持平',
    };
  }

  const increased = current > previous;
  const trend: TrendDirection = increased ? 'up' : 'down';
  const positive = higherIsBetter ? increased : !increased;
  const diff = Math.abs(current - previous);

  return {
    trend,
    positive,
    description: `较上一周期${increased ? '增加' : '减少'} ${diff}`,
  };
}

function formatMetricValue(metric: TrendMetric): string {
  if (metric.unit === '%') {
    const fixed = Number.isInteger(metric.current) ? metric.current.toFixed(0) : metric.current.toFixed(1);
    return `${fixed}%`;
  }
  return `${metric.current}${metric.unit}`;
}

function buildTrendMetrics(args: {
  readingHistory: ReadingContent[];
  testHistory: TestResult[];
  flashcardSessionSummary: FlashcardSessionSummary | null;
  wrongQuestionBook: WrongQuestionRecord[];
}): TrendMetric[] {
  const { readingHistory, testHistory, flashcardSessionSummary, wrongQuestionBook } = args;
  const now = Date.now();
  const currentStart = now - SEVEN_DAYS_MS;
  const previousStart = now - (SEVEN_DAYS_MS * 2);

  const learningEventTimes: number[] = [
    ...readingHistory
      .map(item => parseTimestamp(item.timestamp))
      .filter((value): value is number => value !== null),
    ...testHistory
      .map(item => parseTimestamp(item.date))
      .filter((value): value is number => value !== null),
  ];

  const flashcardTime = parseTimestamp(flashcardSessionSummary?.updatedAt);
  if (flashcardTime !== null) {
    learningEventTimes.push(flashcardTime);
  }

  const currentFrequency = learningEventTimes.filter(ts => ts >= currentStart).length;
  const previousFrequency = learningEventTimes.filter(ts => ts >= previousStart && ts < currentStart).length;
  const frequencyTrend = resolveTrend(currentFrequency, previousFrequency, true);
  const frequencyMetric: TrendMetric = {
    key: 'frequency',
    label: '学习频次',
    current: currentFrequency,
    previous: previousFrequency,
    unit: '次',
    ...frequencyTrend,
  };

  const testsWithDate = testHistory
    .map(item => ({ score: item.score, ts: parseTimestamp(item.date) }))
    .filter((item): item is { score: number; ts: number } => item.ts !== null);

  const currentScores = testsWithDate.filter(item => item.ts >= currentStart).map(item => item.score);
  const previousScores = testsWithDate.filter(item => item.ts >= previousStart && item.ts < currentStart).map(item => item.score);
  const currentAccuracy = average(currentScores);
  const previousAccuracy = average(previousScores);
  const accuracyTrend = resolveTrend(currentAccuracy, previousAccuracy, true);
  const accuracyMetric: TrendMetric = {
    key: 'accuracy',
    label: '测试正确率',
    current: currentAccuracy,
    previous: previousAccuracy,
    unit: '%',
    ...accuracyTrend,
  };

  const currentWrongAdded = wrongQuestionBook.filter(item => {
    const ts = parseTimestamp(item.firstWrongAt);
    return ts !== null && ts >= currentStart;
  }).length;
  const previousWrongAdded = wrongQuestionBook.filter(item => {
    const ts = parseTimestamp(item.firstWrongAt);
    return ts !== null && ts >= previousStart && ts < currentStart;
  }).length;
  const wrongTrend = resolveTrend(currentWrongAdded, previousWrongAdded, false);
  const wrongMetric: TrendMetric = {
    key: 'wrongQuestions',
    label: '新增错题',
    current: currentWrongAdded,
    previous: previousWrongAdded,
    unit: '题',
    ...wrongTrend,
  };

  return [frequencyMetric, accuracyMetric, wrongMetric];
}

function buildPersonalizedSuggestions(args: {
  trendMetrics: TrendMetric[];
  report: LearningReport | null;
  selectedType: ReportTemplateType;
  wrongQuestionBook: WrongQuestionRecord[];
  flashcardSessionSummary: FlashcardSessionSummary | null;
}): string[] {
  const { trendMetrics, report, selectedType, wrongQuestionBook, flashcardSessionSummary } = args;
  const tips: string[] = [];
  const frequencyMetric = trendMetrics.find(item => item.key === 'frequency');
  const accuracyMetric = trendMetrics.find(item => item.key === 'accuracy');
  const wrongMetric = trendMetrics.find(item => item.key === 'wrongQuestions');

  if (frequencyMetric && frequencyMetric.current < 3) {
    tips.push('近 7 天学习频次偏低，建议固定每周至少 3 次学习时段（每次 20-30 分钟）。');
  } else if (frequencyMetric && frequencyMetric.trend === 'down') {
    tips.push('学习频次较上一周期下降，建议在日历中预留固定学习时间，避免节奏回落。');
  }

  if (accuracyMetric && accuracyMetric.current > 0 && accuracyMetric.current < 75) {
    tips.push('近 7 天测试正确率低于 75%，建议优先复盘最近两次测验中的错题解释。');
  } else if (accuracyMetric && accuracyMetric.trend === 'down') {
    tips.push('测试正确率出现下降，建议本周先做中等难度题并控制题量，稳定后再提难度。');
  }

  if (wrongMetric && wrongMetric.current > 0) {
    tips.push('本周期有新增错题，建议每天完成 10 分钟错题重练并记录错因。');
  }

  if (wrongQuestionBook.length >= 8) {
    tips.push(`当前错题本累计 ${wrongQuestionBook.length} 题，建议按阅读/词汇分组，每组先清理高重复错题。`);
  }

  if (flashcardSessionSummary && flashcardSessionSummary.dueCount >= 20) {
    tips.push(`待复习词条 ${flashcardSessionSummary.dueCount} 个，建议先完成复习队列再新增提词，避免遗忘堆积。`);
  }

  if (report?.weaknesses?.length) {
    tips.push(`优先修复薄弱项：${report.weaknesses[0]}，并在下一轮报告中观察该项是否改善。`);
  }

  if (selectedType === 'exam_sprint') {
    tips.push('考试冲刺模式下，建议本周采用“错题重练 + 定时测验”组合，每日完成至少一轮。');
  }

  if (selectedType === 'workplace_boost') {
    tips.push('职场提升模式下，建议每周至少完成 2 篇职场主题阅读并输出 3 句英文复述。');
  }

  if (tips.length === 0) {
    tips.push('当前数据表现稳定，建议保持节奏并在下周聚焦一个能力点做专项突破。');
  }

  return Array.from(new Set(tips)).slice(0, 5);
}

function buildStructuredShareContent(args: {
  report: LearningReport;
  trendMetrics: TrendMetric[];
  personalizedSuggestions: string[];
  flashcardSessionSummary: FlashcardSessionSummary | null;
  readingWrongCount: number;
  vocabularyWrongCount: number;
}): string {
  const { report, trendMetrics, personalizedSuggestions, flashcardSessionSummary, readingWrongCount, vocabularyWrongCount } = args;

  const keyMetrics = [
    `学习时长 ${report.timeStats.totalHours}h（日均 ${report.timeStats.averageDaily}h）`,
    `词汇 学习 ${report.vocabulary.learned} / 掌握 ${report.vocabulary.mastered} / 待复习 ${report.vocabulary.needReview}`,
    `阅读 ${report.reading.articles} 篇（主题：${report.reading.topTopics.join('、') || '暂无'}）`,
    `测验 ${report.tests.completed} 次（平均分 ${report.tests.averageScore}）`,
    `错题本 阅读 ${readingWrongCount} 题 / 词汇 ${vocabularyWrongCount} 题`,
  ];

  if (flashcardSessionSummary) {
    keyMetrics.push(`最近闪卡会话 学习 ${flashcardSessionSummary.studiedCount} 词（正确率 ${flashcardSessionSummary.accuracy}%）`);
  }

  const trendLines = trendMetrics.map(metric => {
    const delta = Math.abs(metric.current - metric.previous);
    const deltaFixed = Number.isInteger(delta) ? delta.toFixed(0) : delta.toFixed(1);
    const deltaText = delta === 0 ? '持平' : `${metric.trend === 'up' ? '+' : '-'}${deltaFixed}${metric.unit}`;
    const trendText = metric.trend === 'up' ? '上升' : metric.trend === 'down' ? '下降' : '稳定';
    return `${metric.label}: ${formatMetricValue(metric)}（${trendText}，${deltaText}）`;
  });

  const actionItems = personalizedSuggestions.slice(0, 3);

  return [
    `【${report.title}】`,
    `周期：${report.period}`,
    '',
    '摘要：',
    report.summary,
    '',
    '关键指标：',
    ...keyMetrics.map(line => `- ${line}`),
    '',
    '趋势概览：',
    ...trendLines.map(line => `- ${line}`),
    '',
    '下一步行动：',
    ...actionItems.map((line, index) => `${index + 1}. ${line}`),
  ].join('\n');
}

export function AchievementsPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [selectedType, setSelectedType] = useState<ReportTemplateType>('weekly');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [historyHydrated, setHistoryHydrated] = useState(false);
  const [report, setReport] = useState<LearningReport | null>(null);
  const [showShare, setShowShare] = useState(false);
  const [flashcards] = useLocalStorage<Word[]>('flashcards', []);
  const [flashcardSessionSummary] = useLocalStorage<FlashcardSessionSummary | null>('flashcardSessionSummary', null);
  const [readingHistory] = useLocalStorage<ReadingContent[]>('readingHistory', []);
  const [testHistory] = useLocalStorage<TestResult[]>('testHistory', []);
  const [wrongQuestionBook] = useLocalStorage<WrongQuestionRecord[]>('wrongQuestionBook', []);
  const [reportHistory, setReportHistory] = useLocalStorage<(LearningReport & { timestamp?: number })[]>('reportHistory', []);

  const readingWrongCount = wrongQuestionBook.filter(item => item.type === 'reading').length;
  const vocabularyWrongCount = wrongQuestionBook.filter(item => item.type === 'vocabulary').length;
  const trendMetrics = useMemo(
    () => buildTrendMetrics({ readingHistory, testHistory, flashcardSessionSummary, wrongQuestionBook }),
    [readingHistory, testHistory, flashcardSessionSummary, wrongQuestionBook],
  );

  const hasData = flashcards.length > 0
    || readingHistory.length > 0
    || testHistory.length > 0
    || Boolean(flashcardSessionSummary);

  useEffect(() => {
    if (historyHydrated || reportHistory.length > 0) return;
    let cancelled = false;
    const hydrate = async () => {
      try {
        const remote = await api.report.history(20) as (LearningReport & { timestamp?: number })[];
        if (!Array.isArray(remote) || remote.length === 0 || cancelled) return;
        setReportHistory(prev => (prev.length > 0 ? prev : remote.slice(0, 20)));
        toast(`已从后端恢复 ${remote.length} 条报告历史`, 'info');
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
  }, [historyHydrated, reportHistory.length, setReportHistory, toast]);

  const generateReport = async () => {
    if (!hasData) {
      toast('暂无学习数据，请先完成一些学习活动', 'warning');
      return;
    }
    setErrorMessage('');
    setLoading(true);
    try {
      const learningData = { flashcards, flashcardSessionSummary, readingHistory, testHistory };
      const result = await api.report.generate(selectedType, learningData) as LearningReport;
      const normalized: LearningReport = {
        ...result,
        templateType: selectedType,
        templateProfile: result.templateProfile || buildTemplateProfile(result, selectedType),
      };
      setReport(normalized);
      setErrorMessage('');
      setReportHistory(prev => [{ ...normalized, timestamp: Date.now() }, ...prev].slice(0, 10));
      toast('学习报告生成成功', 'success');
    } catch (err) {
      const message = (err as Error).message;
      setErrorMessage(message);
      toast(`生成报告失败: ${message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const personalizedSuggestions = useMemo(
    () => buildPersonalizedSuggestions({
      trendMetrics,
      report,
      selectedType,
      wrongQuestionBook,
      flashcardSessionSummary,
    }),
    [trendMetrics, report, selectedType, wrongQuestionBook, flashcardSessionSummary],
  );

  const shareContent = useMemo(
    () => (report ? buildStructuredShareContent({
      report,
      trendMetrics,
      personalizedSuggestions,
      flashcardSessionSummary,
      readingWrongCount,
      vocabularyWrongCount,
    }) : ''),
    [
      report,
      trendMetrics,
      personalizedSuggestions,
      flashcardSessionSummary,
      readingWrongCount,
      vocabularyWrongCount,
    ],
  );

  const copyShareContent = () => {
    if (!shareContent) return;
    navigator.clipboard.writeText(shareContent).then(() => {
      toast('已复制到剪贴板', 'success');
      setShowShare(false);
    }).catch(() => {
      toast('复制失败，请手动复制内容', 'error');
    });
  };

  // Quick stats from localStorage
  const quickStats = [
    { label: '已学单词', value: flashcards.length, icon: BookOpen },
    { label: '阅读篇数', value: readingHistory.length, icon: BookOpen },
    { label: '测试次数', value: testHistory.length, icon: Target },
    { label: '平均分数', value: testHistory.length > 0 ? Math.round(testHistory.reduce((s, t) => s + t.score, 0) / testHistory.length) : 0, icon: TrendingUp, suffix: '分' },
  ];

  const statColors = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6'];

  const loadHistoryReport = (saved: LearningReport & { timestamp?: number }) => {
    const { timestamp, ...reportData } = saved;
    void timestamp;
    const templateType = reportData.templateType || selectedType;
    setReport({
      ...reportData,
      templateType,
      templateProfile: reportData.templateProfile || buildTemplateProfile(reportData, templateType),
    });
    setSelectedType(templateType);
    toast('已加载历史报告', 'info');
  };

  const retryWrongQuestions = (type: 'reading' | 'vocabulary') => {
    const total = type === 'reading' ? readingWrongCount : vocabularyWrongCount;
    if (total === 0) {
      toast(type === 'reading' ? '暂无阅读错题可重练' : '暂无词汇错题可重练', 'warning');
      return;
    }
    navigate('/quiz', { state: { quizMode: 'wrong-book', wrongType: type } });
  };

  return (
    <>
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
        title="设置报告输入"
        description="选择报告周期并生成学习报告。"
      >
        <Card>
          <div className="analysis-card-header">
            <BarChart3 className="h-5 w-5 text-primary-500" />
            <h2 className="font-bold">生成学习报告</h2>
          </div>
          <div className="flex flex-wrap gap-3 mb-4">
            {reportTypes.map(rt => {
              const Icon = rt.icon;
              return (
                <button
                  key={rt.value}
                  onClick={() => setSelectedType(rt.value)}
                  className={cn(
                    'flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-medium transition-all',
                    selectedType === rt.value
                      ? 'bg-primary-100 dark:bg-primary-900/40 border-primary-500 text-primary-700 dark:text-primary-300 shadow-sm'
                      : 'border-border text-muted-foreground hover:border-primary-300 hover:text-primary-600 dark:hover:text-primary-400',
                  )}
                  title={rt.description}
                >
                  <Icon className="h-4 w-4" />
                  {rt.label}
                </button>
              );
            })}
          </div>
          <p className="text-xs text-muted-foreground mb-3">
            当前模板：{reportTypes.find(item => item.value === selectedType)?.description}
          </p>
          <Button onClick={generateReport} loading={loading} disabled={loading || !hasData}>
            <BarChart3 className="h-4 w-4 mr-1.5" />
            生成学习报告
          </Button>
          {!hasData && (
            <p className="text-xs text-muted-foreground mt-2">暂无学习数据，请先完成一些学习活动。</p>
          )}
        </Card>
      </ModuleSection>

      <ModuleSection
        index={1}
        type="result"
        title="报告结果"
        description="查看学习统计、优势弱项与学习建议。"
      >
        {loading && <LoadingSpinner text="AI 正在分析学习数据..." />}

        {!report && !loading && !hasData && (
          <EmptyState
            icon={<Trophy className="h-16 w-16" />}
            title="开始你的学习之旅"
            description="完成闪卡学习、双语阅读或理解测试后，即可生成学习报告。"
          />
        )}

        {report && !loading && (
          <div className="space-y-6 animate-soft-pop">
            <Card className="analysis-highlight-card pt-6">
              <h2 className="text-xl font-bold">{report.title}</h2>
              <p className="text-sm text-muted-foreground mb-3">{report.period}</p>
              <p className="leading-relaxed">{report.summary}</p>
            </Card>

            {report.templateProfile && (
              <Card>
                <div className="analysis-card-header">
                  <Target className="h-5 w-5 text-primary-500" />
                  <h3 className="font-bold">{report.templateProfile.title}</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {report.templateProfile.sections.map(section => (
                    <div key={section.title} className="analysis-item text-sm" style={{ '--item-color': '#6366f1' } as React.CSSProperties}>
                      <p className="font-semibold mb-1">{section.title}</p>
                      <ul className="space-y-1 text-muted-foreground">
                        {section.bullets.map((bullet, index) => (
                          <li key={`${section.title}-${index}`}>• {bullet}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            <Card>
              <div className="analysis-card-header">
                <TrendingUp className="h-5 w-5 text-primary-500" />
                <h3 className="font-bold">趋势统计（近 7 天 vs 前 7 天）</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {trendMetrics.map(metric => (
                  <div
                    key={metric.key}
                    className="analysis-item text-sm"
                    style={{ '--item-color': metric.positive ? '#16a34a' : '#f59e0b' } as React.CSSProperties}
                  >
                    <p className="font-semibold mb-1">{metric.label}</p>
                    <p className="text-2xl font-bold text-foreground">{formatMetricValue(metric)}</p>
                    <p className={cn('text-xs font-medium mt-1', metric.positive ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400')}>
                      {metric.trend === 'up' ? '上升' : metric.trend === 'down' ? '下降' : '稳定'}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">{metric.description}{metric.unit}</p>
                  </div>
                ))}
              </div>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="!pl-0 overflow-hidden">
                <div className="analysis-item h-full !rounded-none" style={{ '--item-color': '#0ea5e9' } as React.CSSProperties}>
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="h-5 w-5 text-sky-500" />
                    <h3 className="font-bold">学习时间</h3>
                  </div>
                  <p className="text-3xl font-bold text-primary-600 dark:text-primary-400">{report.timeStats.totalHours}h</p>
                  <p className="text-sm text-muted-foreground mt-1">日均 {report.timeStats.averageDaily}h · {report.timeStats.trend}</p>
                </div>
              </Card>
              <Card className="!pl-0 overflow-hidden">
                <div className="analysis-item h-full !rounded-none" style={{ '--item-color': '#10b981' } as React.CSSProperties}>
                  <div className="flex items-center gap-2 mb-2">
                    <BookOpen className="h-5 w-5 text-emerald-500" />
                    <h3 className="font-bold">词汇学习</h3>
                  </div>
                  <p className="text-3xl font-bold text-primary-600 dark:text-primary-400">{report.vocabulary.learned}</p>
                  <p className="text-sm text-muted-foreground mt-1">掌握 {report.vocabulary.mastered} · 待复习 {report.vocabulary.needReview}</p>
                </div>
              </Card>
              <Card className="!pl-0 overflow-hidden">
                <div className="analysis-item h-full !rounded-none" style={{ '--item-color': '#f59e0b' } as React.CSSProperties}>
                  <div className="flex items-center gap-2 mb-2">
                    <Target className="h-5 w-5 text-amber-500" />
                    <h3 className="font-bold">测试成绩</h3>
                  </div>
                  <p className="text-3xl font-bold text-primary-600 dark:text-primary-400">{report.tests.averageScore}分</p>
                  <p className="text-sm text-muted-foreground mt-1">完成 {report.tests.completed} 次 · {report.tests.improvement}</p>
                </div>
              </Card>
            </div>

            <Card>
              <div className="analysis-card-header">
                <BookOpen className="h-5 w-5 text-blue-500" />
                <h3 className="font-bold">阅读情况</h3>
              </div>
              <div className="analysis-item" style={{ '--item-color': '#3b82f6' } as React.CSSProperties}>
                <p>阅读 {report.reading.articles} 篇 · 难度: {report.reading.averageDifficulty}</p>
                <p className="text-sm text-muted-foreground mt-1">常见主题: {report.reading.topTopics.join(', ')}</p>
              </div>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <div className="analysis-card-header">
                  <ThumbsUp className="h-5 w-5 text-green-500" />
                  <h3 className="font-bold">学习优势</h3>
                </div>
                <ul className="space-y-2">
                  {report.strengths.map((s, i) => (
                    <li key={i} className="analysis-item text-sm animate-slide-in" style={{ '--item-color': '#22c55e', animationDelay: `${i * 80}ms` } as React.CSSProperties}>
                      {s}
                    </li>
                  ))}
                </ul>
              </Card>
              <Card>
                <div className="analysis-card-header">
                  <AlertTriangle className="h-5 w-5 text-yellow-500" />
                  <h3 className="font-bold">待改进</h3>
                </div>
                <ul className="space-y-2">
                  {report.weaknesses.map((w, i) => (
                    <li key={i} className="analysis-item text-sm animate-slide-in" style={{ '--item-color': '#f59e0b', animationDelay: `${i * 80}ms` } as React.CSSProperties}>
                      {w}
                    </li>
                  ))}
                </ul>
              </Card>
            </div>

            <Card>
              <div className="analysis-card-header">
                <Lightbulb className="h-5 w-5 text-primary-500" />
                <h3 className="font-bold">学习建议</h3>
              </div>
              <ul className="space-y-2">
                {report.suggestions.map((s, i) => (
                  <li key={i} className="analysis-item text-sm animate-slide-in" style={{ '--item-color': '#6366f1', animationDelay: `${i * 80}ms` } as React.CSSProperties}>
                    {s}
                  </li>
                ))}
              </ul>
            </Card>

            <Card>
              <div className="analysis-card-header">
                <Lightbulb className="h-5 w-5 text-violet-500" />
                <h3 className="font-bold">个性化行动建议（数据驱动）</h3>
              </div>
              <ul className="space-y-2">
                {personalizedSuggestions.map((tip, index) => (
                  <li key={`${tip.slice(0, 16)}-${index}`} className="analysis-item text-sm" style={{ '--item-color': '#8b5cf6' } as React.CSSProperties}>
                    {tip}
                  </li>
                ))}
              </ul>
            </Card>
          </div>
        )}
      </ModuleSection>

      <ModuleSection
        index={2}
        type="history"
        title="学习历史"
        description="查看关键学习统计与历史报告。"
      >
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          {quickStats.map((stat, i) => (
            <div
              key={stat.label}
              className="analysis-item bg-card border border-border/50 rounded-xl !rounded-l-none p-4 text-center"
              style={{ '--item-color': statColors[i] } as React.CSSProperties}
            >
              <stat.icon className="h-5 w-5 mx-auto mb-2" style={{ color: statColors[i] }} />
              <p className="text-2xl font-bold text-foreground">{stat.value}{stat.suffix || ''}</p>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
            </div>
          ))}
        </div>

        <Card className="mb-4">
          <div className="analysis-card-header">
            <BookOpen className="h-5 w-5 text-primary-500" />
            <h3 className="font-bold">最近闪卡会话</h3>
          </div>
          {flashcardSessionSummary ? (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3 text-xs">
                <span className="rounded-lg border border-border/60 bg-muted/30 px-2.5 py-1.5 text-muted-foreground">
                  提词数 <span className="font-semibold text-foreground">{flashcardSessionSummary.extractedCount}</span>
                </span>
                <span className="rounded-lg border border-border/60 bg-muted/30 px-2.5 py-1.5 text-muted-foreground">
                  学习量 <span className="font-semibold text-foreground">{flashcardSessionSummary.studiedCount}</span>
                </span>
                <span className="rounded-lg border border-border/60 bg-muted/30 px-2.5 py-1.5 text-muted-foreground">
                  正确率 <span className="font-semibold text-foreground">{flashcardSessionSummary.accuracy}%</span>
                </span>
                <span className="rounded-lg border border-border/60 bg-muted/30 px-2.5 py-1.5 text-muted-foreground">
                  待复习 <span className="font-semibold text-foreground">{flashcardSessionSummary.dueCount}</span>
                </span>
              </div>
              <p className="typo-body-sm text-muted-foreground">
                开始于 {formatDateTime(flashcardSessionSummary.startedAt)}，最近更新 {formatDateTime(flashcardSessionSummary.updatedAt)}。
              </p>
            </>
          ) : (
            <p className="typo-body-sm text-muted-foreground">暂无闪卡会话统计，先在闪卡模块完成一轮学习。</p>
          )}
        </Card>

        <Card className="mb-4">
          <div className="analysis-card-header">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            <h3 className="font-bold">错题重练</h3>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs mb-3">
            <span className="rounded-lg border border-border/60 bg-muted/30 px-2.5 py-1.5 text-muted-foreground">
              阅读错题 <span className="font-semibold text-foreground">{readingWrongCount}</span>
            </span>
            <span className="rounded-lg border border-border/60 bg-muted/30 px-2.5 py-1.5 text-muted-foreground">
              词汇错题 <span className="font-semibold text-foreground">{vocabularyWrongCount}</span>
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="secondary" onClick={() => retryWrongQuestions('reading')} disabled={readingWrongCount === 0}>
              重练阅读错题
            </Button>
            <Button size="sm" variant="secondary" onClick={() => retryWrongQuestions('vocabulary')} disabled={vocabularyWrongCount === 0}>
              重练词汇错题
            </Button>
          </div>
        </Card>

        <Card>
          {reportHistory.length > 0 ? (
            <div className="space-y-2">
              {reportHistory.slice(0, 6).map((item, idx) => (
                <button
                  key={`${item.title}-${idx}`}
                  onClick={() => loadHistoryReport(item)}
                  className="w-full flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-muted/30 px-3 py-2 text-left hover:border-primary-300 transition-colors"
                >
                  <span className="text-sm font-medium truncate">{item.title}</span>
                  <span className="text-xs text-muted-foreground">{item.period}</span>
                </button>
              ))}
            </div>
          ) : (
            <p className="typo-body-sm text-muted-foreground">暂无历史报告，生成后将显示在这里。</p>
          )}
        </Card>
      </ModuleSection>

      <ModuleSection
        index={3}
        type="action"
        title="报告操作"
        description="快速执行分享与重算。"
      >
        <Card>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={generateReport} disabled={loading || !hasData}>
              <BarChart3 className="h-4 w-4 mr-1.5" />
              重新生成
            </Button>
            <Button variant="secondary" size="sm" onClick={() => retryWrongQuestions('reading')} disabled={readingWrongCount === 0}>
              重练阅读错题
            </Button>
            <Button variant="secondary" size="sm" onClick={() => retryWrongQuestions('vocabulary')} disabled={vocabularyWrongCount === 0}>
              重练词汇错题
            </Button>
            <Button variant="secondary" size="sm" onClick={() => setShowShare(true)} disabled={!report}>
              <Share2 className="h-4 w-4 mr-1.5" />
              分享学习成就
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setReport(null)} disabled={!report}>
              清空当前报告
            </Button>
          </div>
        </Card>
      </ModuleSection>
    </div>

    {/* Share dialog — outside all animated containers */}
    {showShare && report && (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 modal-backdrop" onClick={() => setShowShare(false)}>
        <div className="bg-card p-6 rounded-xl shadow-2xl max-w-md w-full mx-4 modal-content" onClick={e => e.stopPropagation()}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold">分享学习成就</h3>
            <button onClick={() => setShowShare(false)} className="tap-target p-1 rounded-full hover:bg-muted transition">
              <X className="h-5 w-5" />
            </button>
          </div>
          <p className="text-muted-foreground text-sm mb-3">
            以下内容包含标题、摘要、关键指标与行动项，可直接复制后粘贴到外部平台。
          </p>
          <textarea
            readOnly
            value={shareContent}
            className="w-full min-h-[220px] rounded-lg border border-border bg-muted/20 p-3 text-xs leading-relaxed mb-4"
          />
          <div className="flex flex-wrap gap-2 mb-4">
            <Button size="sm" onClick={copyShareContent}>
              <Share2 className="h-4 w-4 mr-1.5" />
              复制结构化内容
            </Button>
            <Button size="sm" variant="secondary" onClick={() => setShowShare(false)}>
              关闭
            </Button>
          </div>
          <div className="bg-muted rounded-lg p-3 text-sm">
            <p className="font-medium mb-1">{report.title}</p>
            <p className="text-muted-foreground text-xs line-clamp-2">{report.summary}</p>
          </div>
        </div>
      </div>
    )}
    </>
  );
}
