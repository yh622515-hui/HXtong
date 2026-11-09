const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT_DIR = path.resolve(__dirname, '..');
const VIDEO_DIR = process.env.HXT_VIDEO_DIR || path.join(path.dirname(ROOT_DIR), '\u6052\u4fe1\u901a\u89c6\u9891');
const FFMPEG = path.join(ROOT_DIR, 'node_modules', 'ffmpeg-static', 'ffmpeg.exe');
const VIDEO_EXTS = new Set(['.mp4', '.m4v', '.mov', '.webm', '.ogg']);

const sourceFolder = path.resolve(process.argv[2] || '');
const outputFolder = path.resolve(process.argv[3] || '');
const minSequence = Number(process.argv[4]);
const maxSequence = Number(process.argv[5]);

if (!sourceFolder || !outputFolder || !Number.isInteger(minSequence) || !Number.isInteger(maxSequence)) {
  console.error('Usage: node tools/transcode-video-range-qsv.js <source> <output> <min> <max>');
  process.exit(1);
}
if (!fs.existsSync(sourceFolder)) throw new Error(`Source folder not found: ${sourceFolder}`);
if (!fs.existsSync(FFMPEG)) throw new Error(`ffmpeg not found: ${FFMPEG}`);

function walk(folder) {
  const files = [];
  for (const entry of fs.readdirSync(folder, { withFileTypes: true })) {
    const fullPath = path.join(folder, entry.name);
    if (entry.isDirectory()) files.push(...walk(fullPath));
    else if (entry.isFile() && VIDEO_EXTS.has(path.extname(entry.name).toLowerCase())) files.push(fullPath);
  }
  return files;
}

function sequenceOf(filePath) {
  const match = path.basename(filePath).match(/^(\d+)/);
  return match ? Number(match[1]) : -1;
}

const files = walk(sourceFolder)
  .filter((filePath) => sequenceOf(filePath) >= minSequence && sequenceOf(filePath) <= maxSequence)
  .sort((a, b) => sequenceOf(a) - sequenceOf(b));

fs.mkdirSync(outputFolder, { recursive: true });
let converted = 0;
let skipped = 0;

for (const inputPath of files) {
  const outputPath = path.join(outputFolder, `${path.basename(inputPath, path.extname(inputPath)).trim()}.mp4`);
  if (fs.existsSync(outputPath) && fs.statSync(outputPath).size > 0) {
    skipped += 1;
    continue;
  }
  console.log(`[${converted + skipped + 1}/${files.length}] ${path.basename(inputPath)}`);
  const result = spawnSync(FFMPEG, [
    '-hide_banner', '-y',
    '-hwaccel', 'qsv', '-hwaccel_output_format', 'qsv',
    '-i', inputPath,
    '-vf', 'vpp_qsv=w=1280:h=720:framerate=25',
    '-c:v', 'h264_qsv', '-global_quality', '24', '-look_ahead', '0',
    '-c:a', 'aac', '-b:a', '128k',
    '-movflags', '+faststart',
    outputPath
  ], { stdio: 'inherit' });
  if (result.status !== 0) throw new Error(`ffmpeg failed: ${inputPath}`);
  converted += 1;
}

console.log(`Done. files=${files.length}, converted=${converted}, skipped=${skipped}`);
