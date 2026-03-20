// Prompt templates — preserved from original ai-service.js

export function buildExtractWordsPrompt(text: string, maxWords: number, level: string, options?: { compact?: boolean }): string {
  let levelPrompt = '';
  switch (level) {
    case 'cet4':
      levelPrompt = '优先 CET-4 及以上难度词汇';
      break;
    case 'cet6':
      levelPrompt = '优先 CET-6 及以上难度词汇';
      break;
    case 'advanced':
      levelPrompt = '优先高级、专业或学术场景词汇';
      break;
    default:
      levelPrompt = '提取真正值得学习的词汇';
  }

  if (options?.compact) {
    return `你是英语词汇学习助手。请从文本中筛选最值得学习的 ${maxWords} 个单词或短语，${levelPrompt}。

硬性限制：
- 宁缺毋滥；如果有效词汇不足，可以少于 ${maxWords} 个
- 忽略基础词、重复词、纯专有名词
- 只保留真正影响理解或值得积累的词/短语
- definition 尽量不超过 14 个字
- etymology 尽量不超过 10 个字
- example 尽量不超过 10 个英文词
- exampleTranslation 尽量不超过 16 个字
- phonetic 可为空字符串
- 只返回合法 JSON，不要 Markdown，不要额外解释

返回格式：
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

文本：
${text}`;
  }

  return `你是英语词汇学习助手。请从文本中筛选最值得学习的 ${maxWords} 个单词或短语，${levelPrompt}。

要求：
- 宁缺毋滥；如果有效词汇不足，可以少于 ${maxWords} 个
- 忽略明显基础词、重复词、纯专有名词
- definition 用简洁中文，尽量不超过 20 个字
- etymology 用一句短说明，尽量不超过 18 个字
- example 使用贴近原文语境的短句，尽量不超过 16 个英文词
- exampleTranslation 用简洁中文，尽量不超过 24 个字
- 只返回合法 JSON，不要 Markdown，不要额外解释

返回格式：
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

文本：
${text}`;
}

export function buildAnalyzeSentencePrompt(sentence: string, options?: { compact?: boolean }): string {
  if (options?.compact) {
    return `你是英语语法分析助手。请快速输出核心分析，只返回合法 JSON。

硬性限制：
- clauses 最多 4 条
- tense 最多 2 条
- components 最多 5 条
- words 最多 8 条，只保留最关键的实词/语法词
- phrases 最多 4 条
- grammarPoints 最多 3 条，tags 每项最多 2 个
- 所有 explanation / meaning / role / function 都尽量短，避免重复原句
- 没有内容就返回空数组
- 不要 Markdown，不要额外说明

返回格式：
{
  "structure": {
    "type": "句型",
    "explanation": "结构说明",
    "pattern": "句型公式"
  },
  "clauses": [
    {
      "text": "片段",
      "type": "类型",
      "function": "功能",
      "connector": "连接词"
    }
  ],
  "tense": [
    {
      "name": "时态",
      "explanation": "说明"
    }
  ],
  "components": [
    {
      "text": "成分",
      "type": "类型",
      "explanation": "说明"
    }
  ],
  "words": [
    {
      "text": "词",
      "lemma": "原形",
      "partOfSpeech": "词性",
      "meaning": "含义",
      "role": "作用"
    }
  ],
  "phrases": [
    {
      "text": "短语",
      "category": "类别",
      "function": "作用",
      "explanation": "说明"
    }
  ],
  "grammarPoints": [
    {
      "title": "语法点",
      "explanation": "说明",
      "tags": ["标签1", "标签2"]
    }
  ]
}

句子：
${sentence}`;
  }

  return `你是英语语法分析助手。请对下面句子做准确、精炼的语法分析，并只返回合法 JSON。

分析要求：
- 结构说明要准确，但避免长段落重复
- clauses 最多 6 条
- tense 最多 3 条
- components 最多 8 条，只保留关键成分
- words 最多 18 条，覆盖主要实词和关键语法词，不必穷举全部虚词
- phrases 最多 6 条
- grammarPoints 最多 5 条
- 每个 explanation 尽量控制在 1 句话内
- 不要输出 Markdown、前后说明或额外字段

返回格式：
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

句子：
${sentence}`;
}

interface ReadingPromptOptions {
  language: 'en' | 'zh';
  topic: 'general' | 'work' | 'travel' | 'technology' | 'culture' | 'education';
  difficulty: 'easy' | 'medium' | 'hard';
  length: 'short' | 'medium' | 'long';
}

export function buildReadingContentPrompt(text: string, options: ReadingPromptOptions): string {
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
    return `你是中英双语阅读助手。请把英文原文翻译成自然中文，并提取少量重点词汇。

风格偏好（仅用于同义表达取舍，不允许改变原文信息量）：
- 主题：${topicPrompt}
- 难度：${difficultyPrompt}
- 篇幅：${lengthPrompt}

要求：
- english 字段必须原样保留英文原文，不可改写
- chinese 字段只做忠实、自然的中文翻译，不扩写、不总结
- title 给出一个简短标题，可为空
- vocabulary 最多 8 项，meaning/example 保持简洁
- 只返回合法 JSON，不要 Markdown，不要额外解释

返回格式：
{
  "english": "原始英文文本",
  "chinese": "中文翻译",
  "title": "可选标题",
  "vocabulary": [
    {
      "word": "单词",
      "phonetic": "音标",
      "meaning": "中文释义",
      "example": "例句"
    }
  ]
}

英文原文：
${text}`;
  }

  return `你是中英双语阅读助手。请把中文原文翻译成自然英文，并提取少量重点词汇。

风格偏好（仅用于表达取舍，不允许新增或删减信息）：
- 主题：${topicPrompt}
- 难度：${difficultyPrompt}
- 篇幅：${lengthPrompt}

要求：
- chinese 字段必须原样保留中文原文
- english 字段输出忠实、自然的英文译文，不扩写、不总结
- title 给出一个简短英文标题，可为空
- vocabulary 最多 8 项，meaning/example 保持简洁
- 只返回合法 JSON，不要 Markdown，不要额外解释

返回格式：
{
  "english": "英文翻译",
  "chinese": "原始中文文本",
  "title": "可选标题",
  "vocabulary": [
    {
      "word": "单词",
      "phonetic": "音标",
      "meaning": "中文释义",
      "example": "例句"
    }
  ]
}

中文原文：
${text}`;
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
  const difficultyPrompt = QUIZ_DIFFICULTY_PROMPT_MAP[options.difficulty];
  const timingPrompt = options.timedMode
    ? `本次测试为限时模式，总时长约 ${options.timeLimitMinutes} 分钟，请控制单题阅读负担。`
    : '本次测试非限时，可适度提升解释完整度。';

  return `请根据以下英语内容，生成${options.questionCount}道多选题测试阅读理解：

内容：${reading}

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

  return `请根据以下学习数据，生成一份${reportTypeName}：

学习数据：${JSON.stringify(learningData)}

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
