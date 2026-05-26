#!/usr/bin/env node

const { randomUUID } = require('crypto');
const path = require('path');
const { spawnSync } = require('child_process');

const dbPath = process.env.SQLITE_DB_PATH || `/tmp/english-learning-e2e-ai-mock-${randomUUID()}.db`;

function run(cmd, args, options = {}) {
  const result = spawnSync(cmd, args, { encoding: 'utf8', ...options });
  if (result.status !== 0) {
    throw new Error((result.stderr || result.stdout || `${cmd} failed`).trim());
  }
  return (result.stdout || '').trim();
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function runStep(name, action) {
  try {
    const result = action();
    if (result && typeof result.then === 'function') {
      return result.then(value => {
        console.log(`STEP_OK ${name}`);
        return value;
      }).catch(error => {
        throw new Error(`STEP_FAILED ${name}: ${error.message}`);
      });
    }
    console.log(`STEP_OK ${name}`);
    return result;
  } catch (error) {
    throw new Error(`STEP_FAILED ${name}: ${error.message}`);
  }
}

function installMockAiFetch() {
  global.fetch = async (_url, init = {}) => {
    const body = JSON.parse(String(init.body || '{}'));
    const prompt = String(body.messages?.[0]?.content || '');
    let content;

    if (prompt.includes('测试阅读理解')) {
      content = JSON.stringify([
        {
          question: 'What helps the city save energy?',
          options: ['Smart sensors', 'More traffic', 'Paper maps', 'Longer meetings'],
          correctIndex: 0,
          explanation: 'The reading says smart sensors save energy.',
        },
      ]);
    } else if (prompt.includes('学习数据摘要')) {
      content = JSON.stringify({
        title: 'AI Mock Flow Report',
        period: 'E2E Mock',
        summary: 'Reading, quiz, and report generation completed with mock AI.',
        timeStats: { totalHours: 1, averageDaily: 1, trend: '稳定' },
        vocabulary: { learned: 1, mastered: 0, needReview: 1 },
        reading: { articles: 1, topTopics: ['technology'], averageDifficulty: 'medium' },
        tests: { completed: 1, averageScore: 100, improvement: '稳定' },
        strengths: ['reading detail'],
        weaknesses: ['energy vocabulary'],
        suggestions: ['Review key words after each quiz.'],
      });
    } else {
      content = JSON.stringify({
        title: 'Smart Energy City',
        english: 'A smart city uses sensors to save energy and guide buses.',
        chinese: '一座智慧城市使用传感器节省能源并引导公交车。',
        vocabulary: [{ word: 'sensor', meaning: '传感器', example: 'A sensor measures traffic.' }],
      });
    }

    return new Response(JSON.stringify({ choices: [{ message: { content }, finish_reason: 'stop' }] }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  };
}

async function main() {
  const serverRoot = path.resolve(__dirname, '..');
  const owner = 'e2e-owner-ai-mock-flow';
  const aiConfig = {
    apiKey: 'sk-e2e-mock',
    baseUrl: 'https://mock-ai.example/v1',
    model: 'mock-chat',
  };

  runStep('db-migrate', () => {
    run('npm', ['run', 'db:migrate'], {
      cwd: serverRoot,
      env: { ...process.env, SQLITE_DB_PATH: dbPath },
    });
  });

  process.env.SQLITE_DB_PATH = dbPath;
  installMockAiFetch();

  const {
    generateLearningReport,
    generateReadingContent,
    generateReadingQuestions,
  } = require(path.join(serverRoot, 'dist', 'services', 'ai-service.js'));
  const { learningDataRepository } = require(path.join(serverRoot, 'dist', 'repositories', 'learning-data-repository.js'));

  const reading = await runStep('mock-ai-generate-reading', async () => {
    const result = await generateReadingContent('', {
      generationMode: 'auto',
      topic: 'technology',
      difficulty: 'medium',
      length: 'short',
    }, aiConfig);
    assert(result.title === 'Smart Energy City', 'reading title should come from mock AI');
    assert(result.vocabulary.length === 1, 'reading vocabulary should be normalized');
    return result;
  });

  await runStep('persist-reading', async () => {
    learningDataRepository.persistReadingContent(owner, {
      language: 'en',
      topic: 'technology',
      difficulty: 'medium',
      length: 'short',
      title: reading.title,
      english: reading.english,
      chinese: reading.chinese,
      vocabulary: reading.vocabulary,
    });
  });

  const questions = await runStep('mock-ai-generate-reading-quiz', async () => {
    const result = await generateReadingQuestions(reading.english, {
      questionCount: 1,
      difficulty: 'medium',
      timedMode: false,
      timeLimitMinutes: 15,
    }, aiConfig);
    assert(Array.isArray(result) && result.length === 1, 'quiz should contain one question');
    assert(result[0].correctIndex === 0, 'quiz answer should be normalized from mock AI');
    return result;
  });

  await runStep('persist-quiz-result', async () => {
    learningDataRepository.persistQuizResult(owner, {
      type: 'reading',
      score: 100,
      date: new Date().toISOString(),
      readingTitle: reading.title,
      questionCount: questions.length,
      difficulty: 'medium',
      timedMode: false,
      timeLimitMinutes: 15,
      timeSpentSeconds: 90,
    });
  });

  const report = await runStep('mock-ai-generate-report', async () => {
    const result = await generateLearningReport('weekly', {
      readingHistory: learningDataRepository.getReadingHistory(owner, 5),
      testHistory: learningDataRepository.getQuizHistory(owner, 5),
      flashcards: [],
    }, aiConfig);
    assert(result.tests.averageScore === 100, 'report should include average score');
    assert(result.reading.articles === 1, 'report should include reading count');
    assert(result.weaknesses.length > 0, 'report should include weaknesses');
    return result;
  });

  await runStep('persist-report', async () => {
    learningDataRepository.persistLearningReport(owner, 'weekly', report);
  });

  await runStep('verify-history', async () => {
    assert(learningDataRepository.getReadingHistory(owner, 5).length === 1, 'reading history missing');
    assert(learningDataRepository.getQuizHistory(owner, 5).length === 1, 'quiz history missing');
    assert(learningDataRepository.getReportHistory(owner, 5).length === 1, 'report history missing');
  });

  console.log(`E2E_AI_MOCK_FLOW_OK db=${dbPath} reading=1 quiz=1 report=1 averageScore=${report.tests.averageScore}`);
}

main().catch(err => {
  console.error(`E2E_AI_MOCK_FLOW_FAILED ${err.message}`);
  process.exit(1);
});

