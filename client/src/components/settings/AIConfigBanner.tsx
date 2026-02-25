import { useState } from 'react';
import { Settings, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { SettingsDialog } from '@/components/settings/SettingsDialog';
import { STORAGE_KEY } from '@/lib/ai-providers';

export function AIConfigBanner() {
  const [settingsOpen, setSettingsOpen] = useState(false);

  const hasConfig = (() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return false;
      const cfg = JSON.parse(raw);
      return !!cfg.apiKey;
    } catch {
      return false;
    }
  })();

  if (hasConfig) return null;

  return (
    <>
      <div className="flex items-center gap-3 p-3 mb-6 rounded-lg border border-yellow-300 dark:border-yellow-700 bg-yellow-50 dark:bg-yellow-900/20 text-sm">
        <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400 shrink-0" />
        <span className="text-yellow-800 dark:text-yellow-200">尚未配置 AI 服务，请先完成设置以使用 AI 功能。</span>
        <Button size="sm" variant="secondary" className="ml-auto shrink-0" onClick={() => setSettingsOpen(true)}>
          <Settings className="h-3.5 w-3.5" />
          去配置
        </Button>
      </div>
      <SettingsDialog open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </>
  );
}
