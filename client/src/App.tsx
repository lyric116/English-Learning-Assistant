import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { ToastProvider } from '@/components/ui/Toast';
import { HomePage } from '@/pages/HomePage';
import { FlashcardsPage } from '@/pages/FlashcardsPage';
import { SentenceAnalysisPage } from '@/pages/SentenceAnalysisPage';
import { ReadingPage } from '@/pages/ReadingPage';
import { QuizPage } from '@/pages/QuizPage';
import { AchievementsPage } from '@/pages/AchievementsPage';
import { NotFoundPage } from '@/pages/NotFoundPage';

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <Routes>
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
