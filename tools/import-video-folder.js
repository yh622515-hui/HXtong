const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { DatabaseSync } = require('node:sqlite');

const ROOT_DIR = path.resolve(__dirname, '..');
const VIDEO_DIR = process.env.HXT_VIDEO_DIR || path.join(path.dirname(ROOT_DIR), '\u6052\u4fe1\u901a\u89c6\u9891');
const DB_PATH = path.join(ROOT_DIR, 'data', 'hengxintong.db');
const FFMPEG = path.join(ROOT_DIR, 'node_modules', 'ffmpeg-static', 'ffmpeg.exe');
const SMOOTH_SUFFIX = '-\u6d41\u7545\u7248';
const VIDEO_EXTS = new Set(['.mp4', '.m4v', '.mov', '.webm', '.ogg']);

const sourceFolder = process.argv[2];
const category = process.argv[3];
const lecturer = process.argv[4] || '';

if (!sourceFolder || !category) {
  console.error('Usage: node tools/import-video-folder.js <folder> <category> [lecturer]');
  process.exit(1);
}
if (!fs.existsSync(FFMPEG)) throw new Error(`ffmpeg not found: ${FFMPEG}`);

const resolvedSource = path.resolve(sourceFolder);
if (!fs.existsSync(resolvedSource) || !fs.statSync(resolvedSource).isDirectory()) {
  throw new Error(`Source folder not found: ${resolvedSource}`);
}

function titleFromFile(fileName) {
  return path.basename(fileName, path.extname(fileName)).trim();
}

function relativeToVideoDir(filePath) {
  const relative = path.relative(VIDEO_DIR, filePath).replace(/\\/g, '/');
  if (relative.startsWith('../') || path.isAbsolute(relative)) {
    throw new Error(`File is outside video dir: ${filePath}`);
  }
  return relative;
}

function transcode(inputPath, outputPath) {
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  const result = spawnSync(FFMPEG, [
    '-hide_banner',
    '-y',
    '-i',
    inputPath,
    '-vf',
    "scale='min(1280,iw)':-2,fps=25",
    '-c:v',
    'libx264',
    '-preset',
    'veryfast',
    '-crf',
    '24',
    '-pix_fmt',
    'yuv420p',
    '-c:a',
    'aac',
    '-b:a',
    '128k',
    '-movflags',
    '+faststart',
    outputPath
  ], { stdio: 'inherit' });
  if (result.status !== 0) throw new Error(`ffmpeg failed: ${inputPath}`);
}

function naturalCompare(a, b) {
  return a.localeCompare(b, 'zh-CN', { numeric: true, sensitivity: 'base' });
}

const folderName = path.basename(resolvedSource);
// The website can only serve files below VIDEO_DIR. Keep the old sibling
// location for folders already inside VIDEO_DIR, and place external imports
// under the selected video category so desktop folders work too.
const sourceInsideVideoDir = path.relative(VIDEO_DIR, resolvedSource);
const isInsideVideoDir = sourceInsideVideoDir !== ''
  && !sourceInsideVideoDir.startsWith('..')
  && !path.isAbsolute(sourceInsideVideoDir);
const smoothFolder = isInsideVideoDir
  ? path.join(path.dirname(resolvedSource), `${folderName}${SMOOTH_SUFFIX}`)
  : path.join(VIDEO_DIR, category, `${folderName}${SMOOTH_SUFFIX}`);
const files = fs.readdirSync(resolvedSource)
  .filter((name) => VIDEO_EXTS.has(path.extname(name).toLowerCase()))
  .sort(naturalCompare);

const db = new DatabaseSync(DB_PATH);
const timestamp = new Date().toISOString();
let converted = 0;
let inserted = 0;
let skipped = 0;

db.exec('BEGIN;');
try {
  db.prepare(`
    INSERT INTO categories (name, template_type, parent_id, sort_order, created_at, updated_at)
    SELECT ?, 'video', NULL, 0, ?, ?
    WHERE NOT EXISTS (
      SELECT 1 FROM categories WHERE template_type = 'video' AND parent_id IS NULL AND name = ?
    )
  `).run(category, timestamp, timestamp, category);

  for (const fileName of files) {
    const inputPath = path.join(resolvedSource, fileName);
    const outputPath = path.join(smoothFolder, `${titleFromFile(fileName)}.mp4`);
    if (!fs.existsSync(outputPath)) {
      db.exec('COMMIT;');
      transcode(inputPath, outputPath);
      converted += 1;
      db.exec('BEGIN;');
    }

    const rel = relativeToVideoDir(outputPath);
    const title = titleFromFile(fileName);
    const exists = db.prepare(`
      SELECT id FROM training_videos
      WHERE active = 1 AND (file_name = ? OR (category = ? AND title = ?))
    `).get(rel, category, title);
    if (exists) {
      skipped += 1;
      continue;
    }

    db.prepare(`
      INSERT INTO training_videos (title, category, lecturer, file_name, remarks, active, created_by, created_at, updated_at)
      VALUES (?, ?, ?, ?, '', 1, NULL, ?, ?)
    `).run(title, category, lecturer, rel, timestamp, timestamp);
    inserted += 1;
  }
  db.exec('COMMIT;');
} catch (error) {
  try { db.exec('ROLLBACK;'); } catch (_) {}
  throw error;
} finally {
  db.close();
}

console.log(`Done. files=${files.length}, converted=${converted}, inserted=${inserted}, skipped=${skipped}`);
