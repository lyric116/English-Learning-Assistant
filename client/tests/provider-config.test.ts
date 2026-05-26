import test from 'node:test';
import assert from 'node:assert/strict';

import { AI_PROVIDERS, STORAGE_KEY } from '../src/lib/ai-providers.ts';

test('AI provider presets include DeepSeek, OpenAI, and custom provider options', () => {
  const deepseek = AI_PROVIDERS.find(provider => provider.id === 'deepseek');
  const openai = AI_PROVIDERS.find(provider => provider.id === 'openai');
  const custom = AI_PROVIDERS.find(provider => provider.id === 'custom');

  assert.equal(deepseek?.baseUrl, 'https://api.deepseek.com/v1');
  assert.ok(openai?.models.includes('gpt-4o-mini'));
  assert.equal(custom?.baseUrl, '');
  assert.deepEqual(custom?.models, []);
});

test('AI config storage key remains stable for settings persistence', () => {
  assert.equal(STORAGE_KEY, 'ai-config');
});

