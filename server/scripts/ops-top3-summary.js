#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');

function listDailyReports(codeDir) {
  return fs.readdirSync(codeDir)
    .filter(name => /^ops_daily_report_\d{4}-\d{2}-\d{2}\.md$/.test(name))
    .sort();
}

function readMetric(lines, prefix) {
  const line = lines.find(item => item.startsWith(prefix));
  if (!line) return 0;
  const value = Number(line.replace(prefix, '').replace('%', '').trim());
  return Number.isFinite(value) ? value : 0;
}

function buildTop3(reports) {
  const conversionRates = reports.map(r => r.conversionRate);
  const avgConversion = conversionRates.length === 0
    ? 0
    : conversionRates.reduce((sum, val) => sum + val, 0) / conversionRates.length;

  const last = reports[reports.length - 1] || { shareViews: 0, shareConversions: 0 };

  return [
    {
      title: '提升分享页转化率',
      impact: `当前14日平均转化率 ${avgConversion.toFixed(2)}%`,
      owner: 'growth/frontend',
      eta: '7d',
      action: '优化分享页首屏文案和CTA，并增加来源参数埋点',
    },
    {
      title: '提升分享流量入口',
      impact: `累计分享浏览 ${last.shareViews}，转化 ${last.shareConversions}`,
      owner: 'growth/product',
      eta: '7d',
      action: '在成就页增加二次分享提醒与多渠道复制入口',
    },
    {
      title: '增强错误与超时观测',
      impact: '降低AI调用失败导致的流失',
      owner: 'backend/ops',
      eta: '5d',
      action: '为超时和上游失败日志增加按模块聚合日报字段',
    },
  ];
}

function main() {
  const rootDir = path.resolve(__dirname, '..', '..');
  const codeDir = path.join(rootDir, 'code');
  const files = listDailyReports(codeDir);

  if (files.length === 0) {
    throw new Error('no ops_daily_report files found');
  }

  const parsed = files.map(file => {
    const fullPath = path.join(codeDir, file);
    const content = fs.readFileSync(fullPath, 'utf8');
    const lines = content.split('\n').map(line => line.trim());
    return {
      file,
      shareViews: readMetric(lines, '- Share views:'),
      shareConversions: readMetric(lines, '- Share conversions:'),
      conversionRate: readMetric(lines, '- Share conversion rate:'),
    };
  });

  const top3 = buildTop3(parsed);
  const outputPath = path.join(codeDir, 'ops_top3_iteration_backlog.md');
  const today = new Date().toISOString().slice(0, 10);

  const output = [
    `# Top 3 Iteration Backlog (${today})`,
    '',
    `Source reports: ${files.length} (${files[0]} -> ${files[files.length - 1]})`,
    '',
    ...top3.map((item, idx) => [
      `## Top ${idx + 1}: ${item.title}`,
      `- Impact: ${item.impact}`,
      `- Owner: ${item.owner}`,
      `- ETA: ${item.eta}`,
      `- Action: ${item.action}`,
      '',
    ].join('\n')),
  ].join('\n');

  fs.writeFileSync(outputPath, output, 'utf8');
  console.log(`OPS_TOP3_SUMMARY_OK output=${outputPath}`);
}

try {
  main();
} catch (error) {
  console.error(`OPS_TOP3_SUMMARY_FAILED ${(error && error.message) || String(error)}`);
  process.exit(1);
}
