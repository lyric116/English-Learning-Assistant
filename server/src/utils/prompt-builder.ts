// Prompt templates — preserved from original ai-service.js

type UnknownRecord = Record<string, unknown>;

function normalizePromptSourceText(text: string): string {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

function asRecord(value: unknown): UnknownRecord | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as UnknownRecord;
}

function asRecordArray(value: unknown): UnknownRecord[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is UnknownRecord => !!item && typeof item === 'object' && !Array.isArray(item));
}

function readNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  return null;
}

function readString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 10) / 10;
}

function topEntries(counter: Record<string, number>, limit: number): string[] {
  return Object.entries(counter)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([key]) => key);
}

function isSummarizedLearningData(value: unknown): value is Record<string, unknown> {
  const root = asRecord(value);
  if (!root) return false;

  const flashcards = asRecord(root.flashcards);
  const reading = asRecord(root.reading);
  const tests = asRecord(root.tests);
  return !!flashcards && !!reading && !!tests
    && typeof flashcards.total === 'number'
    && typeof reading.total === 'number'
    && typeof tests.total === 'number';
}

export function summarizeLearningDataForReport(learningData: unknown): Record<string, unknown> {
  const root = asRecord(learningData) || {};
  const flashcards = asRecordArray(root.flashcards).slice(-600);
  const readingHistory = asRecordArray(root.readingHistory).slice(-120);
  const testHistory = asRecordArray(root.testHistory).slice(-200);
  const flashcardSessionSummary = asRecord(root.flashcardSessionSummary);
  const now = Date.now();

  const flashcardStatusCounts = { new: 0, reviewing: 0, mastered: 0 };
  const flashcardAccuracies: number[] = [];
  const flashcardReviewCounts: number[] = [];
  let dueCount = 0;

  const weakestWords = flashcards
    .map(item => {
      const word = readString(item.word);
      const learningStatus = readString(item.learningStatus) || 'new';
      const accuracy = readNumber(item.accuracy) ?? 0;
      const reviewCount = readNumber(item.reviewCount) ?? 0;
      const nextReviewAt = readNumber(item.nextReviewAt);
      if (learningStatus === 'new') flashcardStatusCounts.new += 1;
      if (learningStatus === 'reviewing') flashcardStatusCounts.reviewing += 1;
      if (learningStatus === 'mastered') flashcardStatusCounts.mastered += 1;
      if (typeof nextReviewAt === 'number' && nextReviewAt <= now && learningStatus !== 'mastered') {
        dueCount += 1;
      }
      flashcardAccuracies.push(accuracy);
      flashcardReviewCounts.push(reviewCount);
      return { word, learningStatus, accuracy, reviewCount };
    })
    .filter(item => item.word)
    .sort((a, b) => a.accuracy - b.accuracy || b.reviewCount - a.reviewCount)
    .slice(0, 8);

  const readingTopicCounter: Record<string, number> = {};
  const readingDifficultyCounter: Record<string, number> = {};
  const readingLengths: number[] = [];
  const readingVocabularyCounts: number[] = [];
  const recentReadingTitles = readingHistory
    .slice(-5)
    .reverse()
    .map(item => {
      const title = readString(item.title);
      if (title) return title;
      return readString(item.english).slice(0, 60);
    })
    .filter(Boolean);

  readingHistory.forEach(item => {
    const generationConfig = asRecord(item.generationConfig);
    const topic = readString(generationConfig?.topic);
    const difficulty = readString(generationConfig?.difficulty);
    const english = readString(item.english);
    const vocabulary = Array.isArray(item.vocabulary) ? item.vocabulary : [];

    if (topic) readingTopicCounter[topic] = (readingTopicCounter[topic] || 0) + 1;
    if (difficulty) readingDifficultyCounter[difficulty] = (readingDifficultyCounter[difficulty] || 0) + 1;
    if (english) readingLengths.push(english.length);
    readingVocabularyCounts.push(vocabulary.length);
  });

  const testScores: number[] = [];
  const testByType: Record<string, number> = { reading: 0, vocabulary: 0 };
  const recentScores: Array<{ type: string; score: number; date: string }> = [];
  testHistory.forEach(item => {
    const score = readNumber(item.score);
    const type = readString(item.type) || 'unknown';
    const date = readString(item.date);
    if (score !== null) {
      testScores.push(score);
      recentScores.push({ type, score, date });
    }
    testByType[type] = (testByType[type] || 0) + 1;
  });

  return {
    dataFootprint: {
      flashcards: flashcards.length,
      readingHistory: readingHistory.length,
      testHistory: testHistory.length,
    },
    flashcards: {
      total: flashcards.length,
      statuses: flashcardStatusCounts,
      dueCount,
      averageAccuracy: average(flashcardAccuracies),
      averageReviewCount: average(flashcardReviewCounts),
      sampleWords: flashcards
        .slice(0, 12)
        .map(item => readString(item.word))
        .filter(Boolean),
      weakestWords,
    },
    flashcardSessionSummary: flashcardSessionSummary
      ? {
          extractedCount: readNumber(flashcardSessionSummary.extractedCount) ?? 0,
          studiedCount: readNumber(flashcardSessionSummary.studiedCount) ?? 0,
          correctCount: readNumber(flashcardSessionSummary.correctCount) ?? 0,
          incorrectCount: readNumber(flashcardSessionSummary.incorrectCount) ?? 0,
          accuracy: readNumber(flashcardSessionSummary.accuracy) ?? 0,
          dueCount: readNumber(flashcardSessionSummary.dueCount) ?? 0,
          updatedAt: readString(flashcardSessionSummary.updatedAt),
        }
      : null,
    reading: {
      total: readingHistory.length,
      topTopics: topEntries(readingTopicCounter, 5),
      difficultyDistribution: readingDifficultyCounter,
      averageEnglishLength: average(readingLengths),
      averageVocabularyCount: average(readingVocabularyCounts),
      recentTitles: recentReadingTitles,
    },
    tests: {
      total: testHistory.length,
      byType: testByType,
      averageScore: average(testScores),
      bestScore: testScores.length > 0 ? Math.max(...testScores) : 0,
      lowestScore: testScores.length > 0 ? Math.min(...testScores) : 0,
      recentScores: recentScores.slice(-8),
    },
  };
}

export function buildExtractWordsPrompt(text: string, maxWords: number, level: string): string {
  const normalizedText = normalizePromptSourceText(text);
  let levelPrompt = '';
  switch (level) {
    case 'cet4':
      levelPrompt = '请提取CET-4以上难度的单词，即大学英语四级以上水平的词汇';
      break;
    case 'cet6':
      levelPrompt = '请提取CET-6以上难度的单词，即大学英语六级以上水平的词汇';
      break;
    case 'advanced':
      levelPrompt = '请提取高级词汇，即专业英语或学术英语中常见的高难度词汇';
      break;
    default:
      levelPrompt = '请提取各种难度级别的值得学习的单词';
  }

  return `请从以下英语文本中提取${maxWords}个单词或短语，${levelPrompt}，并为每个单词提供以下信息：
1. 单词本身
2. 音标
3. 中文定义
4. 词源简介
5. 英语例句
6. 例句中文翻译

输出约束：
- definition 控制在 12 个中文字符以内
- etymology 控制在 30 个中文字符以内，只保留最核心来源信息
- example 控制在 16 个英文单词以内
- exampleTranslation 控制在 20 个中文字符以内
- 每个字段只输出内容本身，不要额外解释
- 总项目数不要超过 ${maxWords}

请严格按照以下JSON格式返回，且包含以下字段，注意：输出格式为纯文本且无任何其他标识和符号：
[
  {
    "word": "单词",
    "phonetic": "音标",
    "definition": "定义",
    "etymology": "词源",
    "example": "例句",
    "exampleTranslation": "例句翻译"
  }
]

文本：${normalizedText}`;
}

export function buildAnalyzeSentencePrompt(sentence: string): string {
  const normalizedSentence = normalizePromptSourceText(sentence);
  return `请你作为一位专业的英语语法分析专家，对下面这个英文句子进行全面细致的语法分析。请按照以下七个部分逐一分析，并用中文准确无误的输出结果：
1. 句子结构（简单句、复合句、复杂句等）
2. 从句分析（如果有）
3. 时态分析
4. 句子成分标注（主语、谓语、宾语、定语、状语、补语、同位语等）
5. 词级信息（词形还原、词性、核心语义、句中作用）
6. 重要短语解析
7. 语法要点解释（请附上标签）

输出约束：
- structure.explanation 控制在 40 个中文字符以内
- clauses 最多 3 项；如果没有从句，返回 []
- tense 最多 2 项
- components 最多 6 项，每项 explanation 控制在 20 个中文字符以内
- words 只保留最关键的 8 个词
- phrases 最多 4 项
- grammarPoints 最多 4 项，每项 explanation 控制在 24 个中文字符以内
- 所有字段只输出必要信息，不要写额外说明文字

请严格按照以下JSON格式返回，且包含以下字段，注意：输出格式为纯文本且无任何其他标识和符号：
{
  "structure": {
    "type": "句子类型",
    "explanation": "详细的句子结构解释",
    "pattern": "结构公式或句型模板"
  },
  "clauses": [
    {
      "text": "从句文本",
      "type": "从句类型",
      "function": "在句中的功能",
      "connector": "连接词或引导词（如有）"
    }
  ],
  "tense": [{
    "name": "时态名称",
    "explanation": "时态解释"
  }],
  "components": [
    {
      "text": "成分文本",
      "type": "成分类型",
      "explanation": "成分解释"
    }
  ],
  "words": [
    {
      "text": "原词",
      "lemma": "词元/原形",
      "partOfSpeech": "词性",
      "meaning": "该词在本句中的核心含义",
      "role": "该词在句中的作用"
    }
  ],
  "phrases": [
    {
      "text": "短语文本",
      "category": "短语类别",
      "function": "短语在句中的作用",
      "explanation": "短语解释"
    }
  ],
  "grammarPoints": [
    {
      "title": "语法点标题",
      "explanation": "语法解释",
      "tags": ["标签1", "标签2"]
    }
  ]
}

句子：${normalizedSentence}`;
}

interface ReadingPromptOptions {
  language: 'en' | 'zh';
  topic: 'general' | 'work' | 'travel' | 'technology' | 'culture' | 'education';
  difficulty: 'easy' | 'medium' | 'hard';
  length: 'short' | 'medium' | 'long';
}

export function buildReadingContentPrompt(text: string, options: ReadingPromptOptions): string {
  const normalizedText = normalizePromptSourceText(text);
  const topicPromptMap: Record<ReadingPromptOptions['topic'], string> = {
    general: '综合日常学习',
    work: '职场沟通与商务场景',
    travel: '旅行出行与跨文化交流',
    technology: '科技与互联网',
    culture: '文化艺术与社会话题',
    education: '学习方法与教育主题',
  };
  const difficultyPromptMap: Record<ReadingPromptOptions['difficulty'], string> = {
    easy: '基础难度（优先高频词、短句、清晰表达）',
    medium: '中等难度（兼顾表达丰富度与可读性）',
    hard: '较高难度（可包含复合句与进阶词汇）',
  };
  const lengthPromptMap: Record<ReadingPromptOptions['length'], string> = {
    short: '短篇（约 120-180 词）',
    medium: '中篇（约 220-320 词）',
    long: '长篇（约 380-520 词）',
  };

  const topicPrompt = topicPromptMap[options.topic];
  const difficultyPrompt = difficultyPromptMap[options.difficulty];
  const lengthPrompt = lengthPromptMap[options.length];

  if (options.language === 'en') {
    return `请作为一位专业的中英文翻译专家，在准确传达原文意思，语言自然流畅，符合目标语言文化习惯的要求下，将以下英文文本翻译成中文，并提取重要词汇：

英文原文：${normalizedText}

生成要求：
- 主题导向：${topicPrompt}
- 难度要求：${difficultyPrompt}
- 篇幅控制：${lengthPrompt}

请提供以下内容：
1. 保持原始英文文本不变
2. 高质量的中文翻译
3. 保持原文意境与情感
4. 如遇文化差异、习语或专有名词，请合理本地化处理，并保持专业性
5. 从文本中提取10个以内高频词汇，包含：英文单词、音标、中文释义、例句

请严格按照以下JSON格式返回，且包含以下字段，注意：输出格式为纯文本且无任何其他标识和符号：
{
  "english": "原始英文文本",
  "chinese": "中文翻译",
  "vocabulary": [
    {
      "word": "单词",
      "phonetic": "音标",
      "meaning": "中文释义",
      "example": "例句"
    }
  ]
}`;
  }

  return `请作为一位专业的中英文翻译专家，在准确传达原文意思，语言自然流畅，符合目标语言文化习惯的要求下，请将以下中文文本翻译成英文，并提取重要词汇：

中文原文：${normalizedText}

生成要求：
- 主题导向：${topicPrompt}
- 难度要求：${difficultyPrompt}
- 篇幅控制：${lengthPrompt}

请提供以下内容：
1. 保持原始中文文本不变
2. 高质量的英文翻译
3. 保持原文意境与情感
4. 如遇文化差异、习语或专有名词，请合理本地化处理，并保持专业性
5. 从英文翻译中提取10个以内高频词汇，包含：英文单词、音标、中文释义、例句

请严格按照以下JSON格式返回，且包含以下字段，注意：输出格式为纯文本且无任何其他标识和符号：
{
  "english": "英文翻译",
  "chinese": "原始中文文本",
  "vocabulary": [
    {
      "word": "单词",
      "phonetic": "音标",
      "meaning": "中文释义",
      "example": "例句"
    }
  ]
}`;
}

interface QuizPromptOptions {
  questionCount: number;
  difficulty: 'easy' | 'medium' | 'hard';
  timedMode: boolean;
  timeLimitMinutes: number;
}

const QUIZ_DIFFICULTY_PROMPT_MAP: Record<QuizPromptOptions['difficulty'], string> = {
  easy: '基础难度（信息点明确，干扰项简单）',
  medium: '中等难度（包含推理与细节定位）',
  hard: '高难度（强调深层理解与逻辑判断）',
};

export function buildReadingQuestionsPrompt(reading: string, options: QuizPromptOptions): string {
  const normalizedReading = normalizePromptSourceText(reading);
  const difficultyPrompt = QUIZ_DIFFICULTY_PROMPT_MAP[options.difficulty];
  const timingPrompt = options.timedMode
    ? `本次测试为限时模式，总时长约 ${options.timeLimitMinutes} 分钟，请控制单题阅读负担。`
    : '本次测试非限时，可适度提升解释完整度。';

  return `请根据以下英语内容，生成${options.questionCount}道多选题测试阅读理解：

内容：${normalizedReading}

出题要求：
- 难度：${difficultyPrompt}
- 限时策略：${timingPrompt}

请生成${options.questionCount}道单选题，每题4个选项，只有1个正确答案。
每道题目应包含：问题、4个选项、正确答案索引（0-3）、解释。

请严格按照以下JSON格式返回，且包含以下字段，注意：输出格式为纯文本且无任何其他标识（Markdown、HTML等）和符号：
[
  {
    "question": "问题内容",
    "options": ["选项A", "选项B", "选项C", "选项D"],
    "correctIndex": 0,
    "explanation": "为什么这是正确答案的解释"
  }
]`;
}

export function buildVocabularyQuestionsPrompt(vocabulary: unknown[], options: QuizPromptOptions): string {
  const difficultyPrompt = QUIZ_DIFFICULTY_PROMPT_MAP[options.difficulty];
  const timingPrompt = options.timedMode
    ? `本次测试为限时模式，总时长约 ${options.timeLimitMinutes} 分钟，请提高题干直达性。`
    : '本次测试非限时，可包含适度干扰项。';

  return `请根据以下词汇列表，生成${options.questionCount}道单选题测试词汇掌握程度：

${JSON.stringify(vocabulary)}

出题要求：
- 难度：${difficultyPrompt}
- 限时策略：${timingPrompt}

请生成${options.questionCount}道单选题，每题4个选项，只有1个正确答案。
题目类型可以包括：选择正确释义、选择正确用法、选择近义词、选择反义词等。
每道题目应包含：问题、4个选项、正确答案索引（0-3）、解释。

请严格按照以下JSON格式返回，且包含以下字段，注意：输出格式为纯文本且无任何其他标识和符号：
[
  {
    "question": "问题内容",
    "options": ["选项A", "选项B", "选项C", "选项D"],
    "correctIndex": 0,
    "explanation": "为什么这是正确答案的解释"
  }
]`;
}

export function buildLearningReportPrompt(reportType: string, learningData: unknown): string {
  const reportTemplateMap: Record<string, { name: string; focus: string; suggestionStyle: string }> = {
    weekly: {
      name: '周报',
      focus: '强调近 7 天学习节奏、知识吸收速度与下周微调策略。',
      suggestionStyle: '建议偏短周期，可执行到“本周/明天”级别。',
    },
    exam_sprint: {
      name: '考试冲刺',
      focus: '强调提分效率、错题突破顺序、薄弱题型优先级与冲刺节奏。',
      suggestionStyle: '建议偏应试导向，给出明确训练频次和题型优先级。',
    },
    workplace_boost: {
      name: '职场提升',
      focus: '强调工作场景沟通、商务阅读、表达准确性与跨文化语境。',
      suggestionStyle: '建议偏应用导向，突出会议、邮件、汇报等真实场景。',
    },
    monthly: {
      name: '月报',
      focus: '强调 30 天阶段趋势、能力迁移与稳态提升。',
      suggestionStyle: '建议偏阶段性目标与里程碑。',
    },
    term: {
      name: '学期报告',
      focus: '强调长期成长曲线、优势固化与弱项系统修复。',
      suggestionStyle: '建议偏长期规划与周期复盘。',
    },
  };
  const template = reportTemplateMap[reportType] || reportTemplateMap.weekly;
  const reportTypeName = template.name;
  const summarizedLearningData = isSummarizedLearningData(learningData)
    ? learningData
    : summarizeLearningDataForReport(learningData);

  return `请根据以下学习数据，生成一份${reportTypeName}：

学习数据摘要（已由系统预聚合，不是原始明细）：${JSON.stringify(summarizedLearningData)}

模板重点：${template.focus}
建议风格：${template.suggestionStyle}

请分析以下内容：
1. 学习时间统计和趋势
2. 单词学习情况（数量、记忆效果）
3. 阅读学习情况（数量、难度、主题分布）
4. 测试成绩分析（平均分、进步情况）
5. 学习优势和弱点
6. 针对性的学习建议

请以JSON格式返回，格式为：
{
  "title": "报告标题",
  "period": "报告周期",
  "summary": "总体学习情况概述",
  "timeStats": {
    "totalHours": 0,
    "averageDaily": 0,
    "trend": "上升/下降/稳定"
  },
  "vocabulary": {
    "learned": 0,
    "mastered": 0,
    "needReview": 0
  },
  "reading": {
    "articles": 0,
    "topTopics": ["常见主题1", "常见主题2"],
    "averageDifficulty": "难度评价"
  },
  "tests": {
    "completed": 0,
    "averageScore": 0,
    "improvement": "进步情况"
  },
  "strengths": ["优势1", "优势2"],
  "weaknesses": ["弱点1", "弱点2"],
  "suggestions": ["建议1", "建议2", "建议3"]
}`;
}
