import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { api } from '@/lib/api';
import { Trophy, TrendingUp, Target } from 'lucide-react';

interface SharedReportPayload {
  shareId: string;
  title: string;
  summary: string;
  report: Record<string, unknown>;
  viewCount: number;
  conversionCount: number;
  createdAt: string;
}

function asText(value: unknown, fallback = ''): string {
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return typeof value === 'string' && value.trim() ? value : fallback;
}

export function SharedReportPage() {
  const { shareId } = useParams<{ shareId: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(Boolean(shareId));
  const [error, setError] = useState(shareId ? '' : '分享链接无效');
  const [payload, setPayload] = useState<SharedReportPayload | null>(null);

  useEffect(() => {
    if (!shareId) return;

    let active = true;
    void api.report.getShared(shareId)
      .then(data => {
        if (!active) return;
        setPayload(data);
        setError('');
        void api.report.trackShareEvent(shareId, 'visit').catch(() => undefined);
      })
      .catch(err => {
        if (!active) return;
        setError(err instanceof Error ? err.message : '分享内容加载失败');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [shareId]);

  const reportTitle = useMemo(() => {
    return payload?.title || asText(payload?.report?.title, '学习报告');
  }, [payload]);

  const period = asText(payload?.report?.period, '近期学习');
  const summary = payload?.summary || asText(payload?.report?.summary, '保持学习节奏，持续进步。');
  const averageScore = asText((payload?.report?.tests as { averageScore?: string | number } | undefined)?.averageScore, '-');
  const readingCount = asText((payload?.report?.reading as { articles?: string | number } | undefined)?.articles, '-');

  const onStart = () => {
    if (shareId) {
      void api.report.trackShareEvent(shareId, 'convert').catch(() => undefined);
    }
    navigate('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50 px-4">
        <LoadingSpinner text="正在加载分享内容..." />
      </div>
    );
  }

  if (error || !payload) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50 px-4">
        <Card className="w-full max-w-xl p-8 text-center">
          <h1 className="text-2xl font-bold mb-3">分享页不可用</h1>
          <p className="text-muted-foreground mb-6">{error || '内容不存在或已过期'}</p>
          <Link to="/">
            <Button>返回首页</Button>
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#dbeafe,_#f8fafc_38%,_#f1f5f9_100%)] px-4 py-10">
      <div className="max-w-3xl mx-auto space-y-5">
        <Card className="p-8 border border-blue-100 shadow-lg">
          <div className="flex items-center gap-2 mb-4 text-blue-600">
            <Trophy className="h-5 w-5" />
            <span className="font-semibold text-sm">学习成就分享</span>
          </div>
          <h1 className="text-3xl font-bold mb-2">{reportTitle}</h1>
          <p className="text-muted-foreground mb-4">{period} · 发布于 {new Date(payload.createdAt).toLocaleDateString()}</p>
          <p className="leading-relaxed text-base">{summary}</p>
        </Card>

        <div className="grid sm:grid-cols-2 gap-4">
          <Card className="p-5">
            <div className="flex items-center gap-2 text-blue-600 mb-2"><TrendingUp className="h-4 w-4" />平均分</div>
            <p className="text-3xl font-bold">{averageScore}</p>
          </Card>
          <Card className="p-5">
            <div className="flex items-center gap-2 text-blue-600 mb-2"><Target className="h-4 w-4" />阅读完成</div>
            <p className="text-3xl font-bold">{readingCount}</p>
          </Card>
        </div>

        <Card className="p-6">
          <p className="text-sm text-muted-foreground mb-4">
            浏览 {payload.viewCount} 次 · 转化 {payload.conversionCount} 次
          </p>
          <div className="flex flex-wrap gap-3">
            <Button onClick={onStart}>我也开始学习</Button>
            <Link to="/">
              <Button variant="secondary">返回首页</Button>
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}
