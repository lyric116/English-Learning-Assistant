import { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { ToastProvider } from '@/components/ui/Toast';
import { HomePage } from '@/pages/HomePage';
import { FlashcardsPage } from '@/pages/FlashcardsPage';
import { SentenceAnalysisPage } from '@/pages/SentenceAnalysisPage';
import { ReadingPage } from '@/pages/ReadingPage';
import { QuizPage } from '@/pages/QuizPage';
import { AchievementsPage } from '@/pages/AchievementsPage';
import { SharedReportPage } from '@/pages/SharedReportPage';
import { NotFoundPage } from '@/pages/NotFoundPage';
import { api } from '@/lib/api';
import { BACKFILL_MARK_KEY, collectBackfillPayload, hasBackfillData } from '@/lib/local-storage-migration';

export default function App() {
  useEffect(() => {
    const mark = localStorage.getItem(BACKFILL_MARK_KEY);
    if (mark === 'done' || mark === 'running') return;

    const backfillPayload = collectBackfillPayload(localStorage);

    if (!hasBackfillData(backfillPayload)) {
      localStorage.setItem(BACKFILL_MARK_KEY, 'done');
      return;
    }

    localStorage.setItem(BACKFILL_MARK_KEY, 'running');
    void api.migration.status()
      .then(status => {
        const total = Object.values(status).reduce((sum, value) => sum + (typeof value === 'number' ? value : 0), 0);
        if (total > 0) {
          localStorage.setItem(BACKFILL_MARK_KEY, 'done');
          return null;
        }
        return api.migration.backfill(backfillPayload);
      })
      .then(() => {
        localStorage.setItem(BACKFILL_MARK_KEY, 'done');
      })
      .catch(() => {
        localStorage.setItem(BACKFILL_MARK_KEY, 'pending');
      });
  }, []);

  return (
    <BrowserRouter>
      <ToastProvider>
        <Routes>
          <Route path="/share/:shareId" element={<SharedReportPage />} />
          <Route element={<Layout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/flashcards" element={<FlashcardsPage />} />
            <Route path="/sentence" element={<SentenceAnalysisPage />} />
            <Route path="/reading" element={<ReadingPage />} />
            <Route path="/quiz" element={<QuizPage />} />
            <Route path="/achievements" element={<AchievementsPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </ToastProvider>
    </BrowserRouter>
  );
}
