import { Link, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useTheme } from '@/hooks/use-theme';
import { Sun, Moon, GraduationCap, Menu, X, Layers, AlignLeft, BookOpen, ListChecks, Trophy, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SettingsDialog } from '@/components/settings/SettingsDialog';

const navLinks = [
  { to: '/flashcards', label: '闪卡学习', icon: Layers },
  { to: '/sentence', label: '句子分析', icon: AlignLeft },
  { to: '/reading', label: '双语阅读', icon: BookOpen },
  { to: '/quiz', label: '理解测试', icon: ListChecks },
  { to: '/achievements', label: '学习成就', icon: Trophy },
];

interface NavbarContentProps {
  pathname: string;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  onOpenSettings: () => void;
}

function NavbarContent({ pathname, theme, onToggleTheme, onOpenSettings }: NavbarContentProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileOpen]);

  return (
    <>
      {mobileOpen && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-black/25 backdrop-blur-[1px] md:hidden"
          onClick={() => setMobileOpen(false)}
          aria-label="关闭菜单遮罩"
        />
      )}

      <nav className="app-navbar app-navbar-shell sticky top-0 z-50 border-b border-border/60 bg-card/85 backdrop-blur-lg">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-3">
          <Link to="/" className="flex items-center gap-2 group min-w-0">
            <GraduationCap className="h-7 w-7 shrink-0 text-primary-600 dark:text-primary-400 transition-transform group-hover:scale-110" />
            <span className="truncate text-xl font-bold bg-gradient-to-r from-primary-700 to-primary-500 dark:from-primary-400 dark:to-primary-300 bg-clip-text text-transparent">
              英语学习助手
            </span>
          </Link>

          <div className="flex items-center gap-1.5 md:gap-2">
            <button
              onClick={onToggleTheme}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full hover:bg-muted transition-all duration-300"
              aria-label={theme === 'dark' ? '切换到亮色模式' : '切换到暗色模式'}
            >
              <div className="relative h-5 w-5">
                <Sun className={cn(
                  'absolute inset-0 h-5 w-5 text-yellow-500 transition-all duration-300',
                  theme === 'dark' ? 'opacity-0 rotate-90 scale-0' : 'opacity-100 rotate-0 scale-100',
                )} />
                <Moon className={cn(
                  'absolute inset-0 h-5 w-5 text-blue-300 transition-all duration-300',
                  theme === 'dark' ? 'opacity-100 rotate-0 scale-100' : 'opacity-0 -rotate-90 scale-0',
                )} />
              </div>
            </button>

            <div className="hidden md:flex items-center gap-1 ml-2">
              {navLinks.map(link => {
                const active = pathname === link.to;
                return (
                  <Link
                    key={link.to}
                    to={link.to}
                    className={cn(
                      'relative rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200',
                      active
                        ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/40 dark:text-primary-300'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                    )}
                  >
                    {link.label}
                    {active && (
                      <span className="absolute bottom-0 left-1/2 h-0.5 w-4/5 -translate-x-1/2 rounded-full bg-primary-500" />
                    )}
                  </Link>
                );
              })}
            </div>

            <button
              onClick={onOpenSettings}
              className="hidden md:inline-flex h-9 w-9 items-center justify-center rounded-full hover:bg-muted transition-all duration-300"
              aria-label="AI 设置"
            >
              <Settings className="h-5 w-5 text-muted-foreground" />
            </button>

            <button
              className="md:hidden inline-flex h-9 w-9 items-center justify-center rounded-lg hover:bg-muted transition-colors"
              onClick={() => setMobileOpen(prev => !prev)}
              aria-label="菜单"
              aria-expanded={mobileOpen}
            >
              <div className="relative h-5 w-5">
                <Menu className={cn(
                  'absolute inset-0 h-5 w-5 transition-all duration-200',
                  mobileOpen ? 'opacity-0 rotate-90' : 'opacity-100 rotate-0',
                )} />
                <X className={cn(
                  'absolute inset-0 h-5 w-5 transition-all duration-200',
                  mobileOpen ? 'opacity-100 rotate-0' : 'opacity-0 -rotate-90',
                )} />
              </div>
            </button>
          </div>
        </div>

        <div className={cn(
          'mx-auto w-full max-w-6xl px-4 md:hidden overflow-hidden transition-all duration-300 ease-in-out',
          mobileOpen ? 'max-h-[520px] opacity-100 pb-3' : 'max-h-0 opacity-0',
        )}>
          <div className="rounded-xl border border-border/60 bg-card/95 p-2 shadow-md backdrop-blur-sm">
            {navLinks.map(link => {
              const active = pathname === link.to;
              const Icon = link.icon;
              return (
                <Link
                  key={link.to}
                  to={link.to}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200',
                    active
                      ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/40 dark:text-primary-300'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {link.label}
                </Link>
              );
            })}

            <button
              type="button"
              onClick={() => { setMobileOpen(false); onOpenSettings(); }}
              className="mt-1 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <Settings className="h-4 w-4" />
              AI 设置
            </button>
          </div>
        </div>
      </nav>
    </>
  );
}

export function Navbar() {
  const { theme, toggle } = useTheme();
  const location = useLocation();
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <>
      <NavbarContent
        key={location.pathname}
        pathname={location.pathname}
        theme={theme}
        onToggleTheme={toggle}
        onOpenSettings={() => setSettingsOpen(true)}
      />
      <SettingsDialog open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </>
  );
}
