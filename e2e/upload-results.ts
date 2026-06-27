/**
 * E2E Test Results → S3 Upload Script — Taller Mecánico
 *
 * Reads Playwright JSON report, uploads all videos + screenshots + HTML report
 * to S3, and outputs a results summary JSON with S3 links.
 *
 * Usage:
 *   npx tsx e2e/upload-results.ts --project taller-mecanico
 *
 * Required env vars:
 *   AWS_ACCESS_KEY_ID
 *   AWS_SECRET_ACCESS_KEY
 *   AWS_REGION (default: us-east-1)
 */

import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { readFileSync, readdirSync, existsSync, writeFileSync } from 'fs';
import { join, basename, extname, relative, resolve } from 'path';
import { parseArgs } from 'util';

// --- CLI args ---
const { values } = parseArgs({
  options: {
    project: { type: 'string', default: 'taller-mecanico' },
    bucket: { type: 'string', default: 'htek-dev-media' },
    region: { type: 'string', default: process.env.AWS_REGION || 'us-east-1' },
    'results-dir': { type: 'string', default: './e2e/results' },
    pr: { type: 'string', default: process.env.PR_NUMBER || '0' },
  },
});

const PROJECT = values.project!;
const BUCKET = values.bucket!;
const REGION = values.region!;
const RESULTS_DIR = values['results-dir']!;
const PR_NUMBER = values.pr!;
const TIMESTAMP = new Date().toISOString().replace(/[:.]/g, '-');
const S3_PREFIX = PR_NUMBER !== '0'
  ? `${PROJECT}/pr-${PR_NUMBER}/${TIMESTAMP}`
  : `${PROJECT}/${TIMESTAMP}`;

// --- S3 client ---
const s3 = new S3Client({ region: REGION });

async function uploadFile(localPath: string, s3Key: string, contentType: string): Promise<string> {
  const body = readFileSync(localPath);
  await s3.send(new PutObjectCommand({
    Bucket: BUCKET,
    Key: s3Key,
    Body: body,
    ContentType: contentType,
    // No ACL — bucket has Object Ownership = "Bucket owner enforced" (ACLs disabled).
    // Public access is handled by the bucket's PublicReadGetObject policy.
  }));
  return `s3://${BUCKET}/${s3Key}`;
}

function getContentType(filePath: string): string {
  const ext = extname(filePath).toLowerCase();
  const types: Record<string, string> = {
    '.webm': 'video/webm',
    '.mp4': 'video/mp4',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.html': 'text/html',
    '.json': 'application/json',
    '.js': 'application/javascript',
    '.css': 'text/css',
  };
  return types[ext] || 'application/octet-stream';
}

/**
 * Recursively find all files matching given extensions
 */
function findFiles(dir: string, extensions: string[]): string[] {
  if (!existsSync(dir)) return [];
  const results: string[] = [];
  const absDir = resolve(dir);

  function walk(currentDir: string) {
    for (const entry of readdirSync(currentDir, { withFileTypes: true })) {
      const fullPath = join(currentDir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (extensions.includes(extname(entry.name).toLowerCase())) {
        results.push(fullPath);
      }
    }
  }

  walk(absDir);
  return results;
}

interface TestResult {
  name: string;
  status: 'passed' | 'failed' | 'skipped' | 'timedOut';
  duration: number;
  error?: string;
  video?: string;
  screenshot?: string;
}

async function main() {
  console.log(`📦 Uploading E2E results for ${PROJECT}...`);
  console.log(`   Bucket: ${BUCKET}`);
  console.log(`   Prefix: ${S3_PREFIX}`);
  console.log(`   PR: ${PR_NUMBER !== '0' ? `#${PR_NUMBER}` : '(none)'}`);
  console.log(`   Results dir: ${RESULTS_DIR}`);

  // --- Read Playwright JSON report ---
  const reportPath = join(RESULTS_DIR, 'report.json');
  if (!existsSync(reportPath)) {
    console.error(`❌ No report.json found at ${reportPath}. Did tests run?`);
    process.exit(1);
  }

  const report = JSON.parse(readFileSync(reportPath, 'utf-8'));

  // --- Upload videos ---
  const videoFiles = findFiles(RESULTS_DIR, ['.webm', '.mp4']);
  const videoMap = new Map<string, string>();
  const usedVideoKeys = new Set<string>();

  for (const videoPath of videoFiles) {
    const relPath = relative(RESULTS_DIR, videoPath).replace(/\\/g, '/');
    const dirName = basename(join(videoPath, '..'));
    const ext = extname(videoPath);
    const slug = dirName
      .replace(/-chromium$/, '')
      .replace(/[^a-zA-Z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .substring(0, 80);
    let namedFile = PR_NUMBER !== '0'
      ? `${PROJECT}-pr${PR_NUMBER}-${slug}${ext}`
      : `${PROJECT}-${slug}${ext}`;

    let dedupeIndex = 1;
    while (usedVideoKeys.has(namedFile)) {
      dedupeIndex++;
      namedFile = PR_NUMBER !== '0'
        ? `${PROJECT}-pr${PR_NUMBER}-${slug}-${dedupeIndex}${ext}`
        : `${PROJECT}-${slug}-${dedupeIndex}${ext}`;
    }
    usedVideoKeys.add(namedFile);

    const key = `${S3_PREFIX}/videos/${namedFile}`;
    const s3Url = await uploadFile(videoPath, key, getContentType(videoPath));
    videoMap.set(videoPath, s3Url);
    console.log(`   📹 ${relPath} → ${namedFile}`);
  }

  // --- Upload screenshots ---
  const screenshotFiles = findFiles(RESULTS_DIR, ['.png', '.jpg', '.jpeg']);
  const screenshotMap = new Map<string, string>();

  for (const ssPath of screenshotFiles) {
    const relPath = relative(RESULTS_DIR, ssPath).replace(/\\/g, '/');
    const key = `${S3_PREFIX}/screenshots/${relPath}`;
    const s3Url = await uploadFile(ssPath, key, getContentType(ssPath));
    screenshotMap.set(ssPath, s3Url);
    console.log(`   📸 ${relPath} → ${s3Url}`);
  }

  // --- Upload HTML report ---
  const htmlReportDir = 'playwright-report';
  if (existsSync(htmlReportDir)) {
    const htmlFiles = findFiles(htmlReportDir, ['.html', '.js', '.css', '.png']);
    for (const htmlFile of htmlFiles) {
      const relPath = htmlFile.replace(htmlReportDir, '').replace(/\\/g, '/');
      const key = `${S3_PREFIX}/report${relPath}`;
      await uploadFile(htmlFile, key, getContentType(htmlFile));
    }
    console.log(`   📊 HTML report uploaded`);
  } else {
    console.warn(`   ⚠️  HTML report dir not found at ./${htmlReportDir}`);
  }

  // --- Build results summary ---
  const tests: TestResult[] = [];
  let passed = 0, failed = 0, skipped = 0;

  interface PlaywrightAttachment { name: string; path?: string; contentType?: string; }
  interface PlaywrightResult {
    status: string;
    duration: number;
    error?: unknown;
    attachments?: PlaywrightAttachment[];
  }
  interface PlaywrightTest { results?: PlaywrightResult[]; projectName?: string; }
  interface PlaywrightSpec { title: string; tests?: PlaywrightTest[]; }
  interface PlaywrightSuite { title: string; specs?: PlaywrightSpec[]; suites?: PlaywrightSuite[]; }

  function collectSpecs(suite: PlaywrightSuite, suitePath: string): void {
    for (const spec of suite.specs || []) {
      for (const test of spec.tests || []) {
        const result = test.results?.[test.results.length - 1];
        if (!result) continue;

        const status = result.status as TestResult['status'];
        if (status === 'passed') passed++;
        else if (status === 'failed' || status === 'timedOut') failed++;
        else skipped++;

        const videoAttachment = result.attachments?.find(
          (a: PlaywrightAttachment) => a.name === 'video' && a.path
        );
        const ssAttachment = result.attachments?.find(
          (a: PlaywrightAttachment) => a.name === 'screenshot' && a.path
        );

        let videoUrl: string | undefined;
        let screenshotUrl: string | undefined;

        if (videoAttachment?.path) {
          const resolved = resolve(videoAttachment.path);
          if (videoMap.has(resolved)) {
            videoUrl = videoMap.get(resolved);
          } else {
            const resolvedFromResults = resolve(RESULTS_DIR, videoAttachment.path);
            if (videoMap.has(resolvedFromResults)) {
              videoUrl = videoMap.get(resolvedFromResults);
            } else {
              const attachDir = basename(join(videoAttachment.path, '..'));
              for (const [mapPath, mapUrl] of videoMap.entries()) {
                if (mapPath.includes(attachDir)) {
                  videoUrl = mapUrl;
                  break;
                }
              }
            }
          }
        }

        if (!videoUrl && videoMap.size > 0) {
          const testSlug = (suitePath ? `${suitePath} > ${spec.title}` : spec.title)
            .replace(/[^a-zA-Z0-9]/g, '-')
            .replace(/-+/g, '-')
            .substring(0, 50);
          for (const [mapPath, mapUrl] of videoMap.entries()) {
            const normalizedPath = mapPath.replace(/[\\/]/g, '/').toLowerCase();
            const slugPrefix = testSlug.substring(0, 20).toLowerCase();
            if (normalizedPath.includes(slugPrefix)) {
              videoUrl = mapUrl;
              break;
            }
          }
        }

        if (ssAttachment?.path) {
          const resolved = resolve(ssAttachment.path);
          if (screenshotMap.has(resolved)) {
            screenshotUrl = screenshotMap.get(resolved);
          } else {
            const resolvedFromResults = resolve(RESULTS_DIR, ssAttachment.path);
            if (screenshotMap.has(resolvedFromResults)) {
              screenshotUrl = screenshotMap.get(resolvedFromResults);
            } else {
              const attachDir = basename(join(ssAttachment.path, '..'));
              for (const [mapPath, mapUrl] of screenshotMap.entries()) {
                if (mapPath.includes(attachDir)) {
                  screenshotUrl = mapUrl;
                  break;
                }
              }
            }
          }
        }

        const errorVal = result.error as { message?: string } | string | undefined;
        tests.push({
          name: suitePath ? `${suitePath} > ${spec.title}` : spec.title,
          status,
          duration: result.duration || 0,
          ...(errorVal && { error: typeof errorVal === 'string' ? errorVal : (errorVal as { message?: string }).message }),
          ...(videoUrl && { video: videoUrl }),
          ...(screenshotUrl && { screenshot: screenshotUrl }),
        });
      }
    }
    for (const nested of suite.suites || []) {
      const nestedPath = suitePath ? `${suitePath} > ${nested.title}` : nested.title;
      collectSpecs(nested, nestedPath);
    }
  }

  for (const suite of report.suites || []) {
    collectSpecs(suite, suite.title);
  }

  const testsWithVideo = tests.filter(t => t.video).length;
  console.log(`   🔍 Video matching: ${testsWithVideo}/${tests.length} tests have video URLs`);
  if (testsWithVideo === 0 && videoMap.size > 0) {
    console.log(`   ⚠️  WARNING: ${videoMap.size} videos uploaded but 0 matched to tests!`);
  }

  const summary = {
    suite: PROJECT,
    pr: PR_NUMBER !== '0' ? Number(PR_NUMBER) : null,
    timestamp: new Date().toISOString(),
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    duration: report.stats?.duration || 0,
    summary: { total: passed + failed + skipped, passed, failed, skipped },
    report: `s3://${BUCKET}/${S3_PREFIX}/report/index.html`,
    tests,
  };

  // --- Upload results JSON ---
  const summaryJson = JSON.stringify(summary, null, 2);
  const summaryKey = `${S3_PREFIX}/results.json`;
  const summaryBuffer = Buffer.from(summaryJson, 'utf-8');
  await s3.send(new PutObjectCommand({
    Bucket: BUCKET,
    Key: summaryKey,
    Body: summaryBuffer,
    ContentType: 'application/json',
  }));

  // --- Also write locally for CI to read ---
  writeFileSync(join(RESULTS_DIR, 'results.json'), summaryJson);

  // --- Output summary ---
  console.log(`\n✅ Upload complete!`);
  console.log(`   Tests: ${passed} passed, ${failed} failed, ${skipped} skipped`);
  console.log(`   Report: s3://${BUCKET}/${S3_PREFIX}/report/index.html`);
  console.log(`   Results: s3://${BUCKET}/${S3_PREFIX}/results.json`);

  console.log('\n--- RESULTS JSON ---');
  console.log(summaryJson);
}

main().catch((err) => {
  console.error('❌ Upload failed:', err);
  process.exit(1);
});
