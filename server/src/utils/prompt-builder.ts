// Prompt templates — preserved from original ai-service.js

export function buildExtractWordsPrompt(text: string, maxWords: number, level: string): string {
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

文本：${text}`;
}

export function buildAnalyzeSentencePrompt(sentence: string): string {
  return `请你作为一位专业的英语语法分析专家，对下面这个英文句子进行全面细致的语法分析。请按照以下七个部分逐一分析，并用中文准确无误的输出结果：
1. 句子结构（简单句、复合句、复杂句等）
2. 从句分析（如果有）
3. 时态分析
4. 句子成分标注（主语、谓语、宾语、定语、状语、补语、同位语等）
5. 词级信息（词形还原、词性、核心语义、句中作用）
6. 重要短语解析
7. 语法要点解释（请附上标签）

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

句子：${sentence}`;
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
    return `请作为一位专业的中英文翻译专家，在准确传达原文意思，语言自然流畅，符合目标语言文化习惯的要求下，将以下英文文本翻译成中文，并提取重要词汇：

英文原文：${text}

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

中文原文：${text}

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

export function buildReadingQuestionsPrompt(reading: string, questionCount: number): string {
  return `请根据以下英语内容，生成${questionCount}道多选题测试阅读理解：

内容：${reading}

请生成${questionCount}道单选题，每题4个选项，只有1个正确答案。
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

export function buildVocabularyQuestionsPrompt(vocabulary: unknown[], questionCount: number): string {
  return `请根据以下词汇列表，生成${questionCount}道单选题测试词汇掌握程度：

${JSON.stringify(vocabulary)}

请生成${questionCount}道单选题，每题4个选项，只有1个正确答案。
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
  const reportTypeName = reportType === 'weekly' ? '周报' :
                         reportType === 'monthly' ? '月报' : '学期报告';

  return `请根据以下学习数据，生成一份${reportTypeName}：

学习数据：${JSON.stringify(learningData)}

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
