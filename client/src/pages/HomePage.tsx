import { Link } from 'react-router-dom';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import {
  Layers, AlignLeft, BookOpen, ListChecks, Trophy,
  ArrowRight, Sparkles, CheckCircle2, Clock3, Target,
} from 'lucide-react';

const modules = [
  {
    icon: Layers,
    title: '闪卡学习',
    desc: '自动提取高价值词汇，正反面联动记忆，支持翻转与朗读。',
    to: '/flashcards',
    action: '进入闪卡',
    color: 'bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400',
  },
  {
    icon: AlignLeft,
    title: '句子分析',
    desc: '拆解主谓宾与从句结构，快速定位长难句的语法难点。',
    to: '/sentence',
    action: '分析句子',
    color: 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400',
  },
  {
    icon: BookOpen,
    title: '双语阅读',
    desc: '生成中英对照阅读内容并提取词汇，形成上下文记忆。',
    to: '/reading',
    action: '开始阅读',
    color: 'bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400',
  },
  {
    icon: ListChecks,
    title: '理解测试',
    desc: '一键生成阅读/词汇题，立即反馈分数与解释，闭环验证学习效果。',
    to: '/quiz',
    action: '开始测试',
    color: 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400',
  },
  {
    icon: Trophy,
    title: '学习成就',
    desc: '汇总词汇、阅读、测试表现，生成可分享的学习报告。',
    to: '/achievements',
    action: '查看报告',
    color: 'bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400',
  },
];

const journey = [
  { num: '1', title: '输入文本', desc: '粘贴你正在学的内容，或直接输入目标句子。' },
  { num: '2', title: '生成材料', desc: '系统自动提词、翻译、结构化分析。' },
  { num: '3', title: '学习测试', desc: '先记忆再测验，快速看到掌握盲区。' },
  { num: '4', title: '复盘沉淀', desc: '通过学习报告记录进步并计划下一轮。' },
];

const quickSignals = [
  { icon: Clock3, label: '首轮上手', value: '约 3 分钟' },
  { icon: Target, label: '学习闭环', value: '输入→学习→测试→报告' },
  { icon: CheckCircle2, label: '模块可独立用', value: '按需进入任一模块' },
];

export function HomePage() {
  return (
    <>
      <section className="mb-14 animate-fade-in-up home-hero-shell text-center">
        <div className="mb-5 inline-flex items-center gap-1.5 rounded-full bg-primary-100 px-3 py-1 text-sm font-medium text-primary-700 dark:bg-primary-900/40 dark:text-primary-300">
          <Sparkles className="h-3.5 w-3.5" />
          AI 驱动的英语学习闭环
        </div>
        <h1 className="typo-display mb-4 bg-gradient-to-r from-primary-700 to-primary-500 dark:from-primary-300 dark:to-primary-500 bg-clip-text text-transparent">
          从任意文本开始，快速完成一轮高质量英语学习
        </h1>
        <p className="typo-body-lg mx-auto max-w-3xl text-muted-foreground">
          把输入内容自动转成词汇、语法、阅读和测试任务。你只需要选择一个入口，系统会把学习链路完整接上。
        </p>

        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link to="/flashcards">
            <Button size="lg">
              从闪卡开始
              <ArrowRight className="ml-1.5 h-4 w-4" />
            </Button>
          </Link>
          <Link to="/reading">
            <Button size="lg" variant="secondary">
              先做双语阅读
            </Button>
          </Link>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {quickSignals.map(item => (
            <div key={item.label} className="rounded-lg border border-border/60 bg-card/75 p-3 text-left">
              <div className="mb-2 flex items-center gap-2 text-primary-600 dark:text-primary-400">
                <item.icon className="h-4 w-4" />
                <p className="typo-label text-[11px]">{item.label}</p>
              </div>
              <p className="typo-body-sm font-semibold">{item.value}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mb-16">
        <div className="mb-6 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <h2 className="typo-h2">五大模块入口</h2>
          <p className="typo-body-sm text-muted-foreground">
            按当前学习目标直接进入对应模块，或按推荐路径依次完成。
          </p>
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {modules.map((module, i) => (
            <Card
              key={module.title}
              className="group home-feature-card hover:-translate-y-1 animate-fade-in-up"
              style={{ animationDelay: `${i * 70}ms` }}
            >
              <div className="mb-3 flex items-center gap-3">
                <div className={`rounded-lg p-2.5 ${module.color} transition-transform group-hover:scale-110`}>
                  <module.icon className="h-5 w-5" />
                </div>
                <h3 className="typo-h3">{module.title}</h3>
              </div>
              <p className="typo-body-sm mb-4 text-muted-foreground">{module.desc}</p>
              <Link
                to={module.to}
                className="inline-flex items-center gap-1 text-sm font-semibold text-primary-600 transition-all hover:gap-2 dark:text-primary-400"
              >
                {module.action}
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Card>
          ))}
        </div>
      </section>

      <section className="ds-glass-panel mb-14 animate-fade-in-up p-8 md:p-10" style={{ animationDelay: '280ms' }}>
        <h2 className="typo-h2 mb-7 text-center">推荐学习路径</h2>
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-4">
          {journey.map((step, i) => (
            <div key={step.num} className="home-step-card bg-card p-5 relative">
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-primary-500 text-sm font-bold text-white">
                {step.num}
              </div>
              <h3 className="typo-h3 mb-2">{step.title}</h3>
              <p className="typo-body-sm text-muted-foreground">{step.desc}</p>
              {i < journey.length - 1 && (
                <ArrowRight className="absolute -right-4 top-1/2 hidden h-4 w-4 -translate-y-1/2 text-muted-foreground/60 lg:block" />
              )}
            </div>
          ))}
        </div>
      </section>

      <section className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <Card>
          <h3 className="typo-h3 mb-2">新用户建议起点</h3>
          <p className="typo-body-sm mb-4 text-muted-foreground">
            先用闪卡建立词汇基础，再进入双语阅读和测验，路径最稳定。
          </p>
          <Link to="/flashcards">
            <Button>按推荐路径开始</Button>
          </Link>
        </Card>

        <Card>
          <h3 className="typo-h3 mb-2">已有文章/句子素材</h3>
          <p className="typo-body-sm mb-4 text-muted-foreground">
            如果你已准备好学习材料，优先进入双语阅读或句子分析更高效。
          </p>
          <div className="flex flex-wrap gap-2">
            <Link to="/reading">
              <Button variant="secondary">进入双语阅读</Button>
            </Link>
            <Link to="/sentence">
              <Button variant="secondary">进入句子分析</Button>
            </Link>
          </div>
        </Card>
      </section>
    </>
  );
}
