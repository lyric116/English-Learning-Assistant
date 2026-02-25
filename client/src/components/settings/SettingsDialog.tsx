import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X, Eye, EyeOff, Zap, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { useToast } from '@/components/ui/toast-context';
import { AI_PROVIDERS, STORAGE_KEY } from '@/lib/ai-providers';
import { api } from '@/lib/api';
import { validateBaseUrl } from '@/lib/base-url';
import { getDailyAiUsage } from '@/lib/ai-usage';
import type { AIConfig } from '@/types';

interface Props {
  open: boolean;
  onClose: () => void;
}

const inputClass = 'w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500';

export function SettingsDialog({ open, onClose }: Props) {
  const { toast } = useToast();
  const [providerId, setProviderId] = useState('deepseek');
  const [apiKey, setApiKey] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [model, setModel] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [testing, setTesting] = useState(false);
  const usage = getDailyAiUsage();

  // Load saved config
  useEffect(() => {
    if (!open) return;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const cfg = JSON.parse(raw) as AIConfig & { providerId?: string };
        setApiKey(cfg.apiKey || '');
        setBaseUrl(cfg.baseUrl || '');
        setModel(cfg.model || '');
        const matched = AI_PROVIDERS.find(p => p.baseUrl === cfg.baseUrl);
        setProviderId(matched?.id || 'custom');
      }
    } catch { /* ignore */ }
  }, [open]);

  const handleProviderChange = useCallback((id: string) => {
    setProviderId(id);
    const preset = AI_PROVIDERS.find(p => p.id === id);
    if (preset && id !== 'custom') {
      setBaseUrl(preset.baseUrl);
      setModel(preset.models[0] || '');
    }
  }, []);

  const currentProvider = AI_PROVIDERS.find(p => p.id === providerId);

  const handleTest = async () => {
    if (!apiKey || !baseUrl || !model) {
      toast('请填写完整配置', 'warning');
      return;
    }

    const baseUrlValidation = validateBaseUrl(baseUrl);
    if (!baseUrlValidation.ok) {
      toast(baseUrlValidation.error, 'warning');
      return;
    }

    setTesting(true);
    try {
      await api.ai.test({ apiKey: apiKey.trim(), baseUrl: baseUrlValidation.normalized, model: model.trim() });
      toast('连接成功', 'success');
    } catch (e: unknown) {
      toast(e instanceof Error ? e.message : '连接失败', 'error');
    } finally {
      setTesting(false);
    }
  };

  const handleSave = () => {
    if (!apiKey || !baseUrl || !model) {
      toast('请填写完整配置', 'warning');
      return;
    }

    const baseUrlValidation = validateBaseUrl(baseUrl);
    if (!baseUrlValidation.ok) {
      toast(baseUrlValidation.error, 'warning');
      return;
    }

    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        apiKey: apiKey.trim(),
        baseUrl: baseUrlValidation.normalized,
        model: model.trim(),
      }),
    );
    toast('配置已保存', 'success');
    onClose();
  };

  const handleClear = () => {
    localStorage.removeItem(STORAGE_KEY);
    setApiKey('');
    setBaseUrl('');
    setModel('');
    setProviderId('deepseek');
    toast('已清除配置，将使用服务端默认设置', 'info');
  };

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[90] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold">AI 设置</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-muted transition-colors" aria-label="关闭设置弹窗">
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="text-xs text-muted-foreground mb-4">
          今日 AI 调用: {usage.used}/{usage.limit}（剩余建议额度 {usage.remaining}）
        </p>

        <div className="space-y-4">
          {/* Provider */}
          <div>
            <label htmlFor="provider-select" className="block text-sm font-medium mb-1.5">服务商</label>
            <Select id="provider-select" value={providerId} onChange={e => handleProviderChange(e.target.value)} className="w-full">
              {AI_PROVIDERS.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </Select>
          </div>

          {/* API Key */}
          <div>
            <label htmlFor="api-key-input" className="block text-sm font-medium mb-1.5">API Key</label>
            <div className="relative">
              <input
                id="api-key-input"
                type={showKey ? 'text' : 'password'}
                value={apiKey}
                onChange={e => setApiKey(e.target.value)}
                placeholder="sk-..."
                className={cn(inputClass, 'pr-10')}
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground"
                aria-label={showKey ? '隐藏 API Key' : '显示 API Key'}
              >
                {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Base URL */}
          <div>
            <label htmlFor="base-url-input" className="block text-sm font-medium mb-1.5">Base URL</label>
            <input
              id="base-url-input"
              type="url"
              value={baseUrl}
              onChange={e => setBaseUrl(e.target.value)}
              placeholder="https://api.example.com/v1"
              className={inputClass}
              autoComplete="url"
            />
          </div>

          {/* Model */}
          <div>
            <label htmlFor="model-input" className="block text-sm font-medium mb-1.5">模型</label>
            <input
              id="model-input"
              type="text"
              value={model}
              onChange={e => setModel(e.target.value)}
              placeholder="model-name"
              className={inputClass}
            />
            {currentProvider && currentProvider.models.length > 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                常用: {currentProvider.models.join(', ')}
              </p>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 mt-6">
          <Button variant="secondary" size="sm" onClick={handleTest} loading={testing}>
            <Zap className="h-4 w-4" />
            测试连接
          </Button>
          <div className="flex-1" />
          <Button variant="ghost" size="sm" onClick={handleClear}>
            <Trash2 className="h-4 w-4" />
            清除
          </Button>
          <Button size="sm" onClick={handleSave}>
            保存
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
