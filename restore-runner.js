'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');

const jobPath = process.argv[2];

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function safeRemove(targetPath, rootPath) {
  const resolved = path.resolve(targetPath);
  const root = path.resolve(rootPath);
  if (resolved !== root && !resolved.startsWith(`${root}${path.sep}`)) {
    throw new Error(`拒绝删除非工作目录内容：${resolved}`);
  }
  fs.rmSync(resolved, { recursive: true, force: true });
}

async function main() {
  if (!jobPath || !fs.existsSync(jobPath)) throw new Error('没有找到恢复任务文件');
  const job = JSON.parse(fs.readFileSync(jobPath, 'utf8'));
  const rootDir = path.resolve(job.rootDir);
  const backupPath = path.resolve(job.backupPath);
  const backupRoot = path.resolve(rootDir, 'backup');
  const dataDir = path.resolve(job.dataDir);
  const uploadDir = path.resolve(job.uploadDir);
  const dbPath = path.resolve(job.dbPath);

  if (!backupPath.startsWith(`${backupRoot}${path.sep}`)) throw new Error('备份目录不在允许范围内');
  if (!fs.existsSync(path.join(backupPath, 'hengxintong.db'))) throw new Error('备份缺少数据库');
  if (!fs.existsSync(path.join(backupPath, 'uploads'))) throw new Error('备份缺少 uploads 文件夹');

  await sleep(1600);
  try {
    process.kill(Number(job.serverPid));
  } catch (_) {
    // The server may have already stopped.
  }
  await sleep(1800);

  fs.mkdirSync(dataDir, { recursive: true });
  safeRemove(uploadDir, rootDir);
  fs.mkdirSync(uploadDir, { recursive: true });

  for (const suffix of ['', '-wal', '-shm']) {
    const target = `${dbPath}${suffix}`;
    if (fs.existsSync(target)) fs.rmSync(target, { force: true });
    const source = path.join(backupPath, `hengxintong.db${suffix}`);
    if (fs.existsSync(source)) fs.copyFileSync(source, target);
  }

  fs.cpSync(path.join(backupPath, 'uploads'), uploadDir, { recursive: true });

  try {
    fs.rmSync(jobPath, { force: true });
  } catch (_) {
    // Best effort cleanup.
  }

  const child = spawn(process.execPath, ['server.js'], {
    cwd: rootDir,
    detached: true,
    stdio: 'ignore',
    windowsHide: true
  });
  child.unref();
}

main().catch((error) => {
  try {
    const logPath = path.join(path.dirname(jobPath || __filename), 'restore-error.txt');
    fs.writeFileSync(logPath, `${new Date().toISOString()}\n${error.stack || error.message}\n`, 'utf8');
  } catch (_) {
    // Ignore logging failures.
  }
  process.exit(1);
});
