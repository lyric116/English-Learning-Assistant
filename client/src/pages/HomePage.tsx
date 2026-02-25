import { Link } from 'react-router-dom';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Layers, AlignLeft, BookOpen, ListChecks, Trophy, Rocket, ArrowRight, Sparkles } from 'lucide-react';

const features = [
  {
    icon: Layers,
    title: '闪卡学习',
    desc: '自动提取CET4以上单词，制作成学习闪卡。正面显示单词，反面包含释义、词根和例句。支持手机左右滑动操作。',
    to: '/flashcards',
    action: '开始学习',
    color: 'bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400',
  },
  {
    icon: AlignLeft,
    title: '句子分析',
    desc: '分析英语句子结构，标注主谓宾定状补成分，解析语法难点。帮助你理解复杂句式，提高写作和阅读能力。',
    to: '/sentence',
    action: '开始分析',
    color: 'bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400',
  },
  {
    icon: BookOpen,
    title: '双语阅读',
    desc: '将内容转换为中英双语对照，标注重点单词。通过阅读故事，在上下文中学习英语，提高理解能力。',
    to: '/reading',
    action: '开始阅读',
    color: 'bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-400',
  },
  {
    icon: ListChecks,
    title: '理解测试',
    desc: '学习完成后，系统自动生成阅读理解题目。回答问题后立即获得反馈，了解正确答案和详细解析。',
    to: '/quiz',
    action: '开始测试',
    color: 'bg-orange-100 dark:bg-orange-900/40 text-orange-600 dark:text-orange-400',
  },
  {
    icon: Trophy,
    title: '学习成就',
    desc: '完成学习和测试后，自动生成学习报告。选择四种不同风格的打卡海报，记录和分享你的学习成就。',
    to: '/achievements',
    action: '查看成就',
    color: 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-600 dark:text-yellow-400',
  },
  {
    icon: Rocket,
    title: '在路上...',
    desc: '更多实用功能正在开发中，包括AI语音对话、写作辅助和个性化学习计划。敬请期待！',
    to: '',
    action: '即将推出',
    color: 'bg-gray-100 dark:bg-gray-800/40 text-gray-500 dark:text-gray-400',
  },
];

const steps = [
  { num: '1', title: '输入文本', desc: '在文本框中输入或粘贴你想要学习的英文或中文内容。' },
  { num: '2', title: '生成学习材料', desc: '系统自动处理文本，提取单词，生成闪卡和双语阅读材料。' },
  { num: '3', title: '学习与测试', desc: '使用闪卡学习单词，阅读双语文本，然后完成理解测试。' },
  { num: '4', title: '查看成就', desc: '完成学习后查看学习报告，选择喜欢的海报样式分享你的成就。' },
];

export function HomePage() {
  return (
    <>
      {/* Hero */}
      <section className="mb-16 text-center animate-fade-in-up home-hero-shell">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary-100 dark:bg-primary-900/40 text-primary-600 dark:text-primary-300 text-sm font-medium mb-6">
          <Sparkles className="h-3.5 w-3.5" /> AI 驱动的英语学习助手
        </div>
        <h1 className="typo-display mb-4 bg-gradient-to-r from-primary-600 to-primary-400 bg-clip-text text-transparent">
          提升你的英语能力
        </h1>
        <p className="typo-body-lg text-muted-foreground max-w-2xl mx-auto">
          通过闪卡学习、双语阅读、理解测试和成就系统，让英语学习变得更加高效和有趣。
        </p>
        <div className="mt-8">
          <Link to="/flashcards">
            <Button size="lg" className="transition-shadow">
              开始学习 <ArrowRight className="h-4 w-4 ml-1.5" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Feature cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
        {features.map((f, i) => (
          <Card
            key={f.title}
            className="group home-feature-card hover:-translate-y-1 animate-fade-in-up"
            style={{ animationDelay: `${i * 80}ms` }}
          >
            <div className="flex items-center gap-3 mb-3">
              <div className={`p-2.5 rounded-lg ${f.color} group-hover:scale-110 transition-transform`}>
                <f.icon className="h-5 w-5" />
              </div>
              <h2 className="typo-h3">{f.title}</h2>
            </div>
            <p className="text-muted-foreground typo-body-sm mb-4">{f.desc}</p>
            {f.to ? (
              <Link
                to={f.to}
                className="inline-flex items-center gap-1 text-primary-600 dark:text-primary-400 hover:gap-2 transition-all font-semibold typo-body-sm"
              >
                {f.action} <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            ) : (
              <span className="text-muted-foreground font-medium text-sm opacity-60">
                {f.action} ⏳
              </span>
            )}
          </Card>
        ))}
      </div>

      {/* How to use */}
      <section className="ds-glass-panel p-8 md:p-10 mb-12 animate-fade-in-up" style={{ animationDelay: '400ms' }}>
        <h2 className="typo-h2 mb-8 text-center">如何使用</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {steps.map((s, i) => (
            <div key={s.num} className="relative bg-card p-5 home-step-card">
              <div className="flex justify-center items-center h-10 w-10 rounded-full bg-primary-500 text-white mb-4 mx-auto font-bold">
                {s.num}
              </div>
              <h3 className="typo-h3 text-center mb-2">{s.title}</h3>
              <p className="text-muted-foreground text-center typo-body-sm">{s.desc}</p>
              {i < steps.length - 1 && (
                <ArrowRight className="hidden lg:block absolute -right-5 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground/30" />
              )}
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
