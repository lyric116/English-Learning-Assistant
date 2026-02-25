import { Link } from 'react-router-dom';
import { GraduationCap } from 'lucide-react';

const footerLinks = [
  { to: '/flashcards', label: '闪卡学习' },
  { to: '/sentence', label: '句子分析' },
  { to: '/reading', label: '双语阅读' },
  { to: '/quiz', label: '理解测试' },
  { to: '/achievements', label: '学习成就' },
];

export function Footer() {
  return (
    <footer className="mt-auto border-t border-border/60 bg-card/70 backdrop-blur-sm">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 md:flex-row md:items-start md:justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-primary-600 dark:text-primary-400" />
            <span className="text-lg font-bold">英语学习助手</span>
          </div>
          <p className="text-sm text-muted-foreground">让英语学习更高效、更有趣</p>
        </div>

        <div className="grid grid-cols-2 gap-x-5 gap-y-2 text-sm">
          {footerLinks.map(link => (
            <Link
              key={link.to}
              to={link.to}
              className="text-muted-foreground transition-colors hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
        </div>

        <p className="text-sm text-muted-foreground md:text-right">
          &copy; {new Date().getFullYear()} 英语学习助手
        </p>
      </div>
    </footer>
  );
}
