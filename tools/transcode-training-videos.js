const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { DatabaseSync } = require('node:sqlite');

const ROOT_DIR = path.resolve(__dirname, '..');
const VIDEO_DIR = process.env.HXT_VIDEO_DIR || path.join(path.dirname(ROOT_DIR), '\u6052\u4fe1\u901a\u89c6\u9891');
const DB_PATH = path.join(ROOT_DIR, 'data', 'hengxintong.db');
const FFMPEG = path.join(ROOT_DIR, 'node_modules', 'ffmpeg-static', 'ffmpeg.exe');
const SMOOTH_SUFFIX = '-\u6d41\u7545\u7248';

function resolveVideoPath(fileName) {
  const normalized = String(fileName || '').replace(/\\/g, '/').replace(/^\/+/, '');
  const resolved = path.resolve(VIDEO_DIR, normalized);
  const root = path.resolve(VIDEO_DIR);
  if (resolved !== root && !resolved.startsWith(root + path.sep)) {
    throw new Error(`Unsafe video path: ${fileName}`);
  }
  return resolved;
}

function smoothRelativePath(fileName) {
  const normalized = String(fileName || '').replace(/\\/g, '/').replace(/^\/+/, '');
  const parts = normalized.split('/');
  const baseName = parts.pop();
  const folder = parts.join('/');
  if (!folder || folder.endsWith(SMOOTH_SUFFIX) || folder.endsWith('-smooth')) {
    return normalized;
  }
  return `${folder}${SMOOTH_SUFFIX}/${baseName}`;
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

  if (result.status !== 0) {
    throw new Error(`ffmpeg failed: ${inputPath}`);
  }
}

if (!fs.existsSync(FFMPEG)) {
  throw new Error(`ffmpeg not found: ${FFMPEG}`);
}

const db = new DatabaseSync(DB_PATH);
const videos = db.prepare(`
  SELECT id, title, category, file_name
  FROM training_videos
  WHERE active = 1
  ORDER BY category, title, file_name, id
`).all();

let converted = 0;
let skipped = 0;
let updated = 0;

for (const video of videos) {
  const currentRel = video.file_name;
  const targetRel = smoothRelativePath(currentRel);
  const sourcePath = resolveVideoPath(currentRel);
  const targetPath = resolveVideoPath(targetRel);

  console.log(`\n[${video.id}] ${video.category} - ${video.title}`);
  console.log(`source: ${sourcePath}`);
  console.log(`target: ${targetPath}`);

  if (!fs.existsSync(sourcePath)) {
    throw new Error(`Source video missing: ${sourcePath}`);
  }

  if (sourcePath !== targetPath && !fs.existsSync(targetPath)) {
    transcode(sourcePath, targetPath);
    converted += 1;
  } else {
    skipped += 1;
    console.log('skip: smooth file already exists');
  }

  if (currentRel !== targetRel) {
    db.prepare('UPDATE training_videos SET file_name = ?, updated_at = ? WHERE id = ?')
      .run(targetRel, new Date().toISOString(), video.id);
    updated += 1;
    console.log('database updated');
  }
}

db.close();
console.log(`\nDone. converted=${converted}, skipped=${skipped}, updated=${updated}`);
