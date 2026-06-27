/**
 * E2E Assertion Quality Validator
 *
 * Parses all .spec.ts files and enforces minimum assertion standards:
 * - Each test must have at least 1 assertion call (expect/expectVisible/etc.)
 * - Tests must import from visual-assert.ts (no silent assertions)
 * - Tests should not rely solely on waitForTimeout without assertions
 *
 * Usage:
 *   npx tsx scripts/validate-assertions.ts
 *
 * Exit code 0 = pass, 1 = violations found
 */

import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

const TEST_DIR = join(__dirname, '..', 'e2e', 'tests');
const MIN_ASSERTIONS_PER_TEST = 1;

// Visual assertion function names from visual-assert.ts
const VISUAL_ASSERTION_NAMES = [
  'expectVisible',
  'expectHidden',
  'expectText',
  'expectClass',
  'expectDisabled',
  'expectEnabled',
  'expectValue',
  'expectCount',
  'showPhaseLabel',
];

const ASSERTION_PATTERNS = [
  /expect\s*\(/g,
  ...VISUAL_ASSERTION_NAMES.map(name => new RegExp(`${name}\\s*\\(`, 'g')),
];

// Files exempt from visual-assert import requirement (helpers, utilities)
const EXEMPT_FILES = ['helpers.ts', 'visual-assert.ts'];

interface TestBlock {
  file: string;
  name: string;
  line: number;
  assertionCount: number;
  visualAssertionCount: number;
  body: string;
}

interface Violation {
  file: string;
  test: string;
  line: number;
  reason: string;
}

function extractTests(filePath: string): TestBlock[] {
  const content = readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const tests: TestBlock[] = [];

  const testPattern = /^\s*test(?:\.only)?\s*\(\s*['"`](.+?)['"`]/;

  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].match(testPattern);
    if (!match) continue;

    const testName = match[1];
    let braceCount = 0;
    let started = false;
    const bodyLines: string[] = [];

    for (let j = i; j < lines.length; j++) {
      const line = lines[j];
      for (const char of line) {
        if (char === '{') { braceCount++; started = true; }
        if (char === '}') braceCount--;
      }
      bodyLines.push(line);
      if (started && braceCount === 0) break;
    }

    const body = bodyLines.join('\n');
    let assertionCount = 0;
    let visualAssertionCount = 0;

    for (const pattern of ASSERTION_PATTERNS) {
      const matches = body.match(pattern);
      if (matches) assertionCount += matches.length;
    }

    // Count visual-assert specific calls
    for (const name of VISUAL_ASSERTION_NAMES) {
      const pattern = new RegExp(`${name}\\s*\\(`, 'g');
      const matches = body.match(pattern);
      if (matches) visualAssertionCount += matches.length;
    }

    tests.push({
      file: filePath,
      name: testName,
      line: i + 1,
      assertionCount,
      visualAssertionCount,
      body,
    });
  }

  return tests;
}

function checkFileImports(filePath: string): boolean {
  const content = readFileSync(filePath, 'utf-8');
  // Check if file imports from visual-assert
  return content.includes('./visual-assert') || content.includes('../visual-assert');
}

function validate(): Violation[] {
  const violations: Violation[] = [];

  const files = readdirSync(TEST_DIR)
    .filter(f => f.endsWith('.spec.ts'))
    .map(f => join(TEST_DIR, f));

  console.log(`\n📋 Scanning ${files.length} test files...\n`);

  let totalTests = 0;
  let totalAssertions = 0;
  let totalVisualAssertions = 0;

  for (const file of files) {
    const tests = extractTests(file);
    const fileName = file.replace(/.*[/\\]/, '');
    const isExempt = EXEMPT_FILES.includes(fileName);
    const hasVisualImport = checkFileImports(file);

    // Rule 3: Spec files must import from visual-assert.ts
    if (!isExempt && !hasVisualImport) {
      violations.push({
        file: fileName,
        test: '(file-level)',
        line: 1,
        reason: 'Missing import from ./visual-assert — all spec files must use visual assertion wrappers',
      });
    }

    for (const test of tests) {
      totalTests++;
      totalAssertions += test.assertionCount;
      totalVisualAssertions += test.visualAssertionCount;

      // Rule 1: Minimum assertions per test
      if (test.assertionCount < MIN_ASSERTIONS_PER_TEST) {
        violations.push({
          file: fileName,
          test: test.name,
          line: test.line,
          reason: `Only ${test.assertionCount} assertion(s) — minimum is ${MIN_ASSERTIONS_PER_TEST}`,
        });
      }

      // Rule 2: Tests that only use waitForTimeout without any assertion
      if (test.assertionCount === 0 && test.body.includes('waitForTimeout')) {
        violations.push({
          file: fileName,
          test: test.name,
          line: test.line,
          reason: 'Uses waitForTimeout but has NO assertions — test proves nothing',
        });
      }
    }

    const fileAssertions = tests.reduce((s, t) => s + t.assertionCount, 0);
    const fileVisual = tests.reduce((s, t) => s + t.visualAssertionCount, 0);
    const visualPct = fileAssertions > 0 ? Math.round((fileVisual / fileAssertions) * 100) : 0;
    const importIcon = hasVisualImport ? '✓' : '✗';
    console.log(`  ${importIcon} ${fileName}: ${tests.length} tests, ${fileAssertions} assertions (${visualPct}% visual)`);
  }

  console.log(`\n📊 Summary: ${totalTests} tests, ${totalAssertions} total assertions`);
  console.log(`   Visual assertions: ${totalVisualAssertions}/${totalAssertions} (${Math.round((totalVisualAssertions / totalAssertions) * 100)}%)`);
  console.log(`   Average: ${(totalAssertions / totalTests).toFixed(1)} assertions/test\n`);

  return violations;
}

// --- Run ---
const violations = validate();

if (violations.length === 0) {
  console.log('✅ All tests meet assertion quality standards.\n');
  process.exit(0);
} else {
  console.log(`❌ ${violations.length} violation(s) found:\n`);
  for (const v of violations) {
    console.log(`  ${v.file}:${v.line} — "${v.test}"`);
    console.log(`    → ${v.reason}\n`);
  }
  process.exit(1);
}
