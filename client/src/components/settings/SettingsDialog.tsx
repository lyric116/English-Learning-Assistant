import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X, Eye, EyeOff, Zap, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
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

interface FieldErrors {
  apiKey?: string;
  baseUrl?: string;
  model?: string;
}

function isReasoningModel(modelName: string): boolean {
  const normalized = modelName.trim().toLowerCase();
  if (!normalized) return false;

  return normalized.includes('reasoner')
    || normalized.includes('reasoning')
    || normalized === 'o1'
    || normalized.startsWith('o1-')
    || normalized === 'o3'
    || normalized.startsWith('o3-')
    || normalized.includes('r1');
}

export function SettingsDialog({ open, onClose }: Props) {
  const { toast } = useToast();
  const [providerId, setProviderId] = useState('deepseek');
  const [apiKey, setApiKey] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [model, setModel] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [testing, setTesting] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const usage = getDailyAiUsage();

  // Load saved config
  useEffect(() => {
    if (!open) return;
    setErrors({});
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
      setErrors(prev => ({ ...prev, baseUrl: undefined, model: undefined }));
    }
  }, []);

  const clearFieldError = useCallback((field: keyof FieldErrors) => {
    setErrors(prev => (prev[field] ? { ...prev, [field]: undefined } : prev));
  }, []);

  const currentProvider = AI_PROVIDERS.find(p => p.id === providerId);
  const showReasoningWarning = isReasoningModel(model);

  const validateForm = () => {
    const nextErrors: FieldErrors = {};
    const apiKeyTrimmed = apiKey.trim();
    const baseUrlTrimmed = baseUrl.trim();
    const modelTrimmed = model.trim();

    if (!apiKeyTrimmed) nextErrors.apiKey = '请输入 API Key。';
    if (!baseUrlTrimmed) nextErrors.baseUrl = '请输入 Base URL。';
    if (!modelTrimmed) nextErrors.model = '请输入模型名称。';

    let normalizedBaseUrl = '';
    if (baseUrlTrimmed) {
      const baseUrlValidation = validateBaseUrl(baseUrlTrimmed);
      if (!baseUrlValidation.ok) {
        nextErrors.baseUrl = baseUrlValidation.error;
      } else {
        normalizedBaseUrl = baseUrlValidation.normalized;
      }
    }

    setErrors(nextErrors);
    const hasErrors = Object.values(nextErrors).some(Boolean);
    return {
      ok: !hasErrors,
      apiKey: apiKeyTrimmed,
      baseUrl: normalizedBaseUrl,
      model: modelTrimmed,
    };
  };

  const handleTest = async () => {
    const validation = validateForm();
    if (!validation.ok) {
      toast('请先修正表单错误再测试连接', 'warning');
      return;
    }

    setTesting(true);
    try {
      await api.ai.test({ apiKey: validation.apiKey, baseUrl: validation.baseUrl, model: validation.model });
      toast('连接成功', 'success');
    } catch (e: unknown) {
      toast(e instanceof Error ? e.message : '连接失败', 'error');
    } finally {
      setTesting(false);
    }
  };

  const handleSave = () => {
    const validation = validateForm();
    if (!validation.ok) {
      toast('请先修正表单错误再保存', 'warning');
      return;
    }

    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        apiKey: validation.apiKey,
        baseUrl: validation.baseUrl,
        model: validation.model,
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
    setErrors({});
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
              <Input
                id="api-key-input"
                type={showKey ? 'text' : 'password'}
                value={apiKey}
                onChange={e => {
                  setApiKey(e.target.value);
                  clearFieldError('apiKey');
                }}
                placeholder="sk-..."
                className="pr-10"
                error={!!errors.apiKey}
                aria-invalid={!!errors.apiKey}
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
            {errors.apiKey && <p className="text-xs text-red-600 dark:text-red-400 mt-1.5">{errors.apiKey}</p>}
          </div>

          {/* Base URL */}
          <div>
            <label htmlFor="base-url-input" className="block text-sm font-medium mb-1.5">Base URL</label>
            <Input
              id="base-url-input"
              type="url"
              value={baseUrl}
              onChange={e => {
                setBaseUrl(e.target.value);
                clearFieldError('baseUrl');
              }}
              placeholder="https://api.example.com/v1"
              autoComplete="url"
              error={!!errors.baseUrl}
              aria-invalid={!!errors.baseUrl}
            />
            {errors.baseUrl && <p className="text-xs text-red-600 dark:text-red-400 mt-1.5">{errors.baseUrl}</p>}
          </div>

          {/* Model */}
          <div>
            <label htmlFor="model-input" className="block text-sm font-medium mb-1.5">模型</label>
            <Input
              id="model-input"
              type="text"
              value={model}
              onChange={e => {
                setModel(e.target.value);
                clearFieldError('model');
              }}
              placeholder="model-name"
              error={!!errors.model}
              aria-invalid={!!errors.model}
            />
            {errors.model && <p className="text-xs text-red-600 dark:text-red-400 mt-1.5">{errors.model}</p>}
            {!errors.model && currentProvider && currentProvider.models.length > 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                常用: {currentProvider.models.join(', ')}
              </p>
            )}
            {!errors.model && showReasoningWarning && (
              <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                当前像是推理型模型，生成结构化 JSON 时通常更慢。这个项目更适合 `deepseek-chat`、`gpt-4o-mini` 一类的非推理模型。
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
