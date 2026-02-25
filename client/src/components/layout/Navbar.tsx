import { Link, useLocation } from 'react-router-dom';
import { useState } from 'react';
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

  return (
    <nav className="app-navbar bg-card/80 backdrop-blur-lg border-b border-border/50 sticky top-0 z-50">
      <div className="container mx-auto px-4 py-3">
        <div className="flex justify-between items-center">
          <Link to="/" className="flex items-center gap-2 group">
            <GraduationCap className="h-7 w-7 text-primary-600 dark:text-primary-400 transition-transform group-hover:scale-110" />
            <span className="text-xl font-bold bg-gradient-to-r from-primary-700 to-primary-500 dark:from-primary-400 dark:to-primary-300 bg-clip-text text-transparent">
              英语学习助手
            </span>
          </Link>

          <div className="flex items-center gap-2">
            {/* Theme toggle */}
            <button
              onClick={onToggleTheme}
              className="p-2 rounded-full hover:bg-muted transition-all duration-300"
              aria-label={theme === 'dark' ? '切换到亮色模式' : '切换到暗色模式'}
            >
              <div className="relative h-5 w-5">
                <Sun className={cn(
                  'h-5 w-5 text-yellow-500 absolute inset-0 transition-all duration-300',
                  theme === 'dark' ? 'opacity-0 rotate-90 scale-0' : 'opacity-100 rotate-0 scale-100',
                )} />
                <Moon className={cn(
                  'h-5 w-5 text-blue-300 absolute inset-0 transition-all duration-300',
                  theme === 'dark' ? 'opacity-100 rotate-0 scale-100' : 'opacity-0 -rotate-90 scale-0',
                )} />
              </div>
            </button>

            {/* Desktop nav */}
            <div className="hidden md:flex items-center gap-1 ml-2">
              {navLinks.map(link => {
                const active = pathname === link.to;
                return (
                  <Link
                    key={link.to}
                    to={link.to}
                    className={cn(
                      'relative px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200',
                      active
                        ? 'text-primary-700 dark:text-primary-300 bg-primary-50 dark:bg-primary-900/40'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted',
                    )}
                  >
                    {link.label}
                    {active && (
                      <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4/5 h-0.5 bg-primary-500 rounded-full" />
                    )}
                  </Link>
                );
              })}
            </div>

            {/* Mobile menu button */}
            <button
              className="md:hidden p-2 rounded-lg hover:bg-muted transition-colors"
              onClick={() => setMobileOpen(prev => !prev)}
              aria-label="菜单"
              aria-expanded={mobileOpen}
            >
              <div className="relative h-5 w-5">
                <Menu className={cn(
                  'h-5 w-5 absolute inset-0 transition-all duration-200',
                  mobileOpen ? 'opacity-0 rotate-90' : 'opacity-100 rotate-0',
                )} />
                <X className={cn(
                  'h-5 w-5 absolute inset-0 transition-all duration-200',
                  mobileOpen ? 'opacity-100 rotate-0' : 'opacity-0 -rotate-90',
                )} />
              </div>
            </button>

            {/* Settings */}
            <button
              onClick={onOpenSettings}
              className="p-2 rounded-full hover:bg-muted transition-all duration-300"
              aria-label="AI 设置"
            >
              <Settings className="h-5 w-5 text-muted-foreground" />
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        <div className={cn(
          'md:hidden overflow-hidden transition-all duration-300 ease-in-out',
          mobileOpen ? 'max-h-80 opacity-100 pt-4 pb-2' : 'max-h-0 opacity-0',
        )}>
          <div className="flex flex-col gap-1">
            {navLinks.map(link => {
              const active = pathname === link.to;
              const Icon = link.icon;
              return (
                <Link
                  key={link.to}
                  to={link.to}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200',
                    active
                      ? 'bg-primary-50 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted',
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {link.label}
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </nav>
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
