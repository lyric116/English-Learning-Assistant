import type { QuizQuestion } from '@/types';

export interface QuizMetrics {
  total: number;
  answered: number;
  unanswered: number;
  correct: number;
  incorrect: number;
  accuracy: number;
  score: number;
}

export function calculateQuizMetrics(questions: QuizQuestion[], userAnswers: Array<number | null>): QuizMetrics {
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

