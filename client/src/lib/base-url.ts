function isPrivateOrLocalhost(hostname: string): boolean {
  const host = hostname.toLowerCase();

  if (host === 'localhost' || host === '::1' || host.endsWith('.local')) {
    return true;
  }

  if (/^\d+\.\d+\.\d+\.\d+$/.test(host)) {
    const [a, b] = host.split('.').map(Number);
    if (a === 10 || a === 127 || a === 0) return true;
    if (a === 169 && b === 254) return true;
    if (a === 192 && b === 168) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
  }

  if (host.startsWith('fc') || host.startsWith('fd') || host.startsWith('fe80')) {
    return true;
  }

  return false;
}

export function validateBaseUrl(baseUrl: string): { ok: true; normalized: string } | { ok: false; error: string } {
  const trimmed = baseUrl.trim();
  if (!trimmed) {
    return { ok: false, error: 'Base URL 不能为空' };
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return { ok: false, error: 'Base URL 格式无效' };
  }

  if (parsed.username || parsed.password) {
    return { ok: false, error: 'Base URL 不允许包含账号或密码信息' };
  }

  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    return { ok: false, error: 'Base URL 仅支持 HTTP/HTTPS 协议' };
  }

  if (isPrivateOrLocalhost(parsed.hostname)) {
    return { ok: false, error: 'Base URL 不允许使用 localhost 或内网地址' };
  }

  return { ok: true, normalized: trimmed.replace(/\/+$/, '') };
}
