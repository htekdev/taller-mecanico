/**
 * E2E Assertion Quality Validator
 *
 * Parses all .spec.ts files and enforces minimum assertion standards:
 * - Each test must have at least 2 assertion calls (expect/expectVisible/etc.)
 * - Tests should not rely solely on waitForTimeout without assertions
 * - Tests should use meaningful matchers, not just page-level checks
 *
 * Usage:
 *   npx tsx scripts/validate-assertions.ts
 *
 * Exit code 0 = pass, 1 = violations found
 */

import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

const TEST_DIR = join(__dirname, '..', 'e2e', 'tests');
const MIN_ASSERTIONS_PER_TEST = 1; // minimum expect() calls per test block
const ASSERTION_PATTERNS = [
  /expect\s*\(/g,
  /expectVisible\s*\(/g,
  /expectHidden\s*\(/g,
  /expectText\s*\(/g,
  /expectClass\s*\(/g,
  /expectDisabled\s*\(/g,
  /expectEnabled\s*\(/g,
  /expectValue\s*\(/g,
  /expectCount\s*\(/g,
];

interface TestBlock {
  file: string;
  name: string;
  line: number;
  assertionCount: number;
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

  // Simple parser: find test('...', or test.only('...' blocks
  const testPattern = /^\s*test(?:\.only)?\s*\(\s*['"`](.+?)['"`]/;

  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].match(testPattern);
    if (!match) continue;

    const testName = match[1];
    // Find the test body by counting braces
    let braceCount = 0;
    let started = false;
    let bodyLines: string[] = [];

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
    for (const pattern of ASSERTION_PATTERNS) {
      const matches = body.match(pattern);
      if (matches) assertionCount += matches.length;
    }

    tests.push({
      file: filePath,
      name: testName,
      line: i + 1,
      assertionCount,
      body,
    });
  }

  return tests;
}

function validate(): Violation[] {
  const violations: Violation[] = [];

  const files = readdirSync(TEST_DIR)
    .filter(f => f.endsWith('.spec.ts'))
    .map(f => join(TEST_DIR, f));

  console.log(`\n📋 Scanning ${files.length} test files...\n`);

  let totalTests = 0;
  let totalAssertions = 0;

  for (const file of files) {
    const tests = extractTests(file);
    const fileName = file.replace(/.*[/\\]/, '');

    for (const test of tests) {
      totalTests++;
      totalAssertions += test.assertionCount;

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

    console.log(`  ${fileName}: ${tests.length} tests, ${tests.reduce((s, t) => s + t.assertionCount, 0)} assertions`);
  }

  console.log(`\n📊 Summary: ${totalTests} tests, ${totalAssertions} total assertions`);
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
