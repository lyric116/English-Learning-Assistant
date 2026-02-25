/**
 * 从 LLM 响应中提取并解析 JSON，容错处理 markdown 代码块包裹
 */
export function parseJsonResponse<T>(content: string): T {
  let cleaned = content.trim();

  // Strip markdown code block wrappers
  const codeBlockMatch = cleaned.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/);
  if (codeBlockMatch) {
    cleaned = codeBlockMatch[1].trim();
  }

  // Remove BOM and zero-width characters
  cleaned = cleaned.replace(/^\uFEFF/, '').replace(/[\u200B-\u200D\uFEFF]/g, '');

  try {
    return JSON.parse(cleaned);
  } catch {
    // Try to find JSON array or object boundaries
    const jsonStart = cleaned.search(/[\[{]/);
    const lastBracket = cleaned.lastIndexOf(']');
    const lastBrace = cleaned.lastIndexOf('}');
    const jsonEnd = Math.max(lastBracket, lastBrace);

    if (jsonStart !== -1 && jsonEnd > jsonStart) {
      const extracted = cleaned.substring(jsonStart, jsonEnd + 1);
      try {
        return JSON.parse(extracted);
      } catch {
        throw new Error('无法解析 AI 返回的 JSON 数据');
      }
    }

    throw new Error('无法解析 AI 返回的 JSON 数据');
  }
}
