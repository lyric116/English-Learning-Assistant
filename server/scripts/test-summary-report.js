#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const repoRoot = path.resolve(__dirname, '..', '..');
const serverRoot = path.join(repoRoot, 'server');
const clientRoot = path.join(repoRoot, 'client');
const outputCandidates = [
  process.env.TEST_SUMMARY_REPORT_PATH,
  path.join(repoRoot, 'code', 'test_summary_report.md'),
  path.join(serverRoot, 'test_summary_report.md'),
  path.join(repoRoot, 'memory_bank', 'test_summary_report.md'),
  path.join('/tmp', 'english-learning-test_summary_report.md'),
].filter(Boolean);

function run(command, args, cwd) {
  const startedAt = Date.now();
  const result = spawnSync(command, args, { cwd, encoding: 'utf8' });
  const output = `${result.stdout || ''}${result.stderr || ''}`;
  return {
    ok: result.status === 0,
    status: result.status,
    output,
    durationMs: Date.now() - startedAt,
  };
}

function walkFiles(dir, predicate, files = []) {
  if (!fs.existsSync(dir)) return files;
  for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, item.name);
    if (item.isDirectory()) {
      walkFiles(fullPath, predicate, files);
    } else if (predicate(fullPath)) {
      files.push(fullPath);
    }
  }
  return files;
}

function countTestCases(root) {
  const files = walkFiles(path.join(root, 'tests'), file => file.endsWith('.test.ts'));
  return files.reduce((sum, file) => {
    const content = fs.readFileSync(file, 'utf8');
    return sum + (content.match(/(^|\s)test\(/g) || []).length;
  }, 0);
}

function parseTap(output) {
  const read = name => {
    const match = output.match(new RegExp(`# ${name} (\\d+)`));
    return match ? Number(match[1]) : 0;
  };
  return {
    files: read('tests'),
    pass: read('pass'),
    fail: read('fail'),
    skipped: read('skipped'),
    todo: read('todo'),
  };
}

function parseCoverage(output) {
  const line = output
    .split(/\r?\n/)
    .find(item => item.includes('all files') && item.includes('|'));

  if (!line) return '未解析到覆盖率输出';

  const cells = line
    .replace(/^#\s*/, '')
    .split('|')
    .map(cell => cell.trim())
    .filter(Boolean);

  if (cells.length < 4) return '未解析到覆盖率输出';
  return `lines ${cells[1]}%, branches ${cells[2]}%, functions ${cells[3]}%`;
}

function collectApiCoverage() {
  const indexPath = path.join(serverRoot, 'src', 'index.ts');
  const indexContent = fs.readFileSync(indexPath, 'utf8');
  const endpoints = Array.from(indexContent.matchAll(/'(GET|POST) (\/api\/v1[^']+)'/g))
    .map(match => `${match[1]} ${match[2]}`);

  const routeTestFiles = walkFiles(path.join(serverRoot, 'tests', 'routes'), file => file.endsWith('.test.ts'));
  const routeTestContent = routeTestFiles.map(file => fs.readFileSync(file, 'utf8')).join('\n');
  const testedEntries = Array.from(routeTestContent.matchAll(/['"]((?:GET|POST) \/api\/v1[^'"]+|\/api\/v1[^'"]+)['"]/g))
    .map(match => match[1])
    .map(value => {
      const methodMatch = value.match(/^(GET|POST) (\/api\/v1\S+)/);
      if (methodMatch) {
        return {
          method: methodMatch[1],
          path: methodMatch[2].replace(/\?.*$/, ''),
        };
      }

      const pathMatch = value.match(/^(\/api\/v1\S+)/);
      return pathMatch ? { method: '', path: pathMatch[1].replace(/\?.*$/, '') } : null;
    })
    .filter(Boolean);

  function routePattern(pathPattern) {
    const escaped = pathPattern
      .split('/')
      .map(part => part.startsWith(':') ? '[^/]+' : part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
      .join('/');
    return new RegExp(`^${escaped}$`);
  }

  const tested = endpoints.filter(endpoint => {
    const method = endpoint.split(' ')[0];
    const pathOnly = endpoint.replace(/^(GET|POST) /, '');
    const pattern = routePattern(pathOnly);
    return testedEntries.some(entry => {
      if (entry.method && entry.method !== method) return false;
      return pattern.test(entry.path);
    });
  });

  return {
    total: endpoints.length,
    tested: tested.length,
    percent: endpoints.length === 0 ? 0 : Math.round((tested.length / endpoints.length) * 100),
  };
}

function flowStatus(result, okMarker) {
  if (!result.ok) return '失败';
  return result.output.includes(okMarker) ? '通过' : '通过（未找到标记）';
}

function durationText(ms) {
  return `${(ms / 1000).toFixed(1)}s`;
}

function writeReport(markdown) {
  const errors = [];

  for (const outputPath of outputCandidates) {
    try {
      fs.mkdirSync(path.dirname(outputPath), { recursive: true });
      fs.writeFileSync(outputPath, markdown);
      return outputPath;
    } catch (error) {
      errors.push(`${outputPath}: ${(error && error.message) || String(error)}`);
    }
  }

  throw new Error(`无法写入测试报告：${errors.join('; ')}`);
}

function main() {
  const serverCases = countTestCases(serverRoot);
  const clientCases = countTestCases(clientRoot);

  const serverCoverage = run('npm', ['run', 'test:coverage'], serverRoot);
  const clientCoverage = run('npm', ['run', 'test:coverage'], clientRoot);
  const mainFlow = run('npm', ['run', 'test:e2e-flow'], serverRoot);
  const aiMockFlow = run('npm', ['run', 'test:e2e-ai-mock-flow'], serverRoot);
  const shareFlow = run('npm', ['run', 'test:e2e-share-flow'], serverRoot);
  const rollback = run('npm', ['run', 'drill:rollback'], serverRoot);

  const serverTap = parseTap(serverCoverage.output);
  const clientTap = parseTap(clientCoverage.output);
  const apiCoverage = collectApiCoverage();
  const totalCases = serverCases + clientCases;
  const allQualityChecks = [serverCoverage, clientCoverage, mainFlow, aiMockFlow, shareFlow, rollback];
  const passedQualityChecks = allQualityChecks.filter(item => item.ok).length;
  const passRate = allQualityChecks.every(item => item.ok) ? '100%' : `${Math.round((passedQualityChecks / allQualityChecks.length) * 100)}%`;

  const markdown = `# 测试分析报告

生成时间：${new Date().toISOString()}

## 如何运行

| 范围 | 命令 |
| --- | --- |
| 后端单元/接口/数据测试 | \`cd server && npm run test\` |
| 后端覆盖率 | \`cd server && npm run test:coverage\` |
| 前端逻辑测试 | \`cd client && npm run test\` |
| 前端覆盖率 | \`cd client && npm run test:coverage\` |
| 主流程回归 | \`cd server && npm run test:e2e-flow\` |
| AI Mock 主流程 | \`cd server && npm run test:e2e-ai-mock-flow\` |
| 分享主流程 | \`cd server && npm run test:e2e-share-flow\` |
| 回滚演练 | \`cd server && npm run drill:rollback\` |
| 生成本报告 | \`cd server && npm run test:summary\` |

## 测试总结

| 指标 | 数值 |
| --- | ---: |
| Server 测试用例数 | ${serverCases} |
| Client 测试用例数 | ${clientCases} |
| 总测试用例数 | ${totalCases} |
| 测试通过率 | ${passRate} |
| Server 覆盖率 | ${parseCoverage(serverCoverage.output)} |
| Client 覆盖率 | ${parseCoverage(clientCoverage.output)} |
| API 覆盖率 | ${apiCoverage.tested} / ${apiCoverage.total} = ${apiCoverage.percent}% |
| Server 测试用例通过 | ${serverTap.pass} / ${serverTap.files} |
| Client 测试用例通过 | ${clientTap.pass} / ${clientTap.files} |
| 主流程测试结果 | ${flowStatus(mainFlow, 'E2E_SIM_OK')} |
| AI Mock 主流程结果 | ${flowStatus(aiMockFlow, 'E2E_AI_MOCK_FLOW_OK')} |
| 分享主流程结果 | ${flowStatus(shareFlow, 'E2E_SHARE_FLOW_OK')} |
| 回滚演练结果 | ${flowStatus(rollback, 'ROLLBACK_DRILL_OK')} |
| CI 检查项数量 | build / lint / test / coverage / e2e / rollback |

## 测试范围

| 测试层级 | 覆盖内容 | 脚本 |
| --- | --- | --- |
| 后端单元测试 | 参数校验、Prompt 汇总、JSON 解析、AI 服务 mock、provider fallback/base URL 策略 | \`server/tests/**/*.test.ts\` |
| 后端接口测试 | health、reading、quiz、report、migration、404 统一错误结构 | \`server/tests/routes/*.test.ts\` |
| 数据库测试 | migration 表结构、reading/quiz/report repository、匿名 session 隔离、share view/convert 计数 | \`server/tests/db/*.test.ts\`、\`server/tests/repositories/*.test.ts\` |
| 主流程集成测试 | 基础 reading/quiz/report 持久化链路、AI mock 学习链路、报告分享链路、回滚恢复 | \`server/scripts/e2e-*.js\`、\`server/scripts/rollback-drill.js\` |
| 前端逻辑测试 | API client、localStorage 容错、session、provider 配置、Base URL 校验、quiz 计分、报告展示格式、迁移 payload | \`client/tests/*.test.ts\` |

## 执行耗时

| 检查项 | 结果 | 耗时 |
| --- | --- | ---: |
| Server coverage | ${serverCoverage.ok ? '通过' : '失败'} | ${durationText(serverCoverage.durationMs)} |
| Client coverage | ${clientCoverage.ok ? '通过' : '失败'} | ${durationText(clientCoverage.durationMs)} |
| Main flow | ${flowStatus(mainFlow, 'E2E_SIM_OK')} | ${durationText(mainFlow.durationMs)} |
| AI mock flow | ${flowStatus(aiMockFlow, 'E2E_AI_MOCK_FLOW_OK')} | ${durationText(aiMockFlow.durationMs)} |
| Share flow | ${flowStatus(shareFlow, 'E2E_SHARE_FLOW_OK')} | ${durationText(shareFlow.durationMs)} |
| Rollback drill | ${flowStatus(rollback, 'ROLLBACK_DRILL_OK')} | ${durationText(rollback.durationMs)} |
`;

  const actualOutputPath = writeReport(markdown);
  console.log(`TEST_SUMMARY_REPORT_OK ${actualOutputPath}`);
}

main();
