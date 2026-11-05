const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { DatabaseSync } = require('node:sqlite');

const ROOT_DIR = path.resolve(__dirname, '..');
const SOURCE_DIR = process.argv[2] || 'E:\\标准规范';
const CATEGORY_NAME = process.argv[3] || '标准规范下载';
const TEMPLATE_TYPE = 'system';
const UPLOAD_DIR = path.join(ROOT_DIR, 'uploads');
const DB_PATH = path.join(ROOT_DIR, 'data', 'hengxintong.db');

const FILE_TYPES = new Map([
  ['.pdf', 'pdf'],
  ['.doc', 'word'],
  ['.docx', 'word'],
  ['.xls', 'excel'],
  ['.xlsx', 'excel']
]);

function now() {
  return new Date().toISOString();
}

function cleanName(fileName) {
  return path.basename(fileName, path.extname(fileName)).trim();
}

function storedNameFor(fileType, originalName) {
  const ext = path.extname(originalName).toLowerCase();
  const hash = crypto.createHash('sha1').update(`${originalName}-${Date.now()}-${Math.random()}`).digest('hex').slice(0, 10);
  return `${fileType}-${Date.now()}-${hash}${ext}`;
}

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...walk(fullPath));
    if (entry.isFile() && FILE_TYPES.has(path.extname(entry.name).toLowerCase())) files.push(fullPath);
  }
  return files;
}

function naturalCompare(a, b) {
  return a.localeCompare(b, 'zh-CN', { numeric: true, sensitivity: 'base' });
}

if (!fs.existsSync(SOURCE_DIR) || !fs.statSync(SOURCE_DIR).isDirectory()) {
  throw new Error(`Source folder not found: ${SOURCE_DIR}`);
}
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const db = new DatabaseSync(DB_PATH);
const timestamp = now();
let copied = 0;
let inserted = 0;
let skipped = 0;

db.exec('BEGIN;');
try {
  let category = db.prepare(`
    SELECT id FROM categories
    WHERE template_type = ? AND parent_id IS NULL AND name = ?
  `).get(TEMPLATE_TYPE, CATEGORY_NAME);

  if (!category) {
    const maxSort = db.prepare(`
      SELECT COALESCE(MAX(sort_order), 0) AS max_sort
      FROM categories
      WHERE template_type = ? AND parent_id IS NULL
    `).get(TEMPLATE_TYPE).max_sort;
    const result = db.prepare(`
      INSERT INTO categories (name, template_type, parent_id, sort_order, created_at, updated_at)
      VALUES (?, ?, NULL, ?, ?, ?)
    `).run(CATEGORY_NAME, TEMPLATE_TYPE, Number(maxSort) + 1, timestamp, timestamp);
    category = { id: Number(result.lastInsertRowid) };
  }

  const files = walk(SOURCE_DIR).sort((a, b) => naturalCompare(path.basename(a), path.basename(b)));
  for (const sourcePath of files) {
    const originalName = path.basename(sourcePath);
    const ext = path.extname(originalName).toLowerCase();
    const fileType = FILE_TYPES.get(ext);
    const reportName = cleanName(originalName);
    const existing = db.prepare(`
      SELECT id FROM reports
      WHERE active = 1 AND template_type = ? AND category_id = ? AND name = ?
    `).get(TEMPLATE_TYPE, category.id, reportName);
    if (existing) {
      skipped += 1;
      continue;
    }

    const storedName = storedNameFor(fileType, originalName);
    fs.copyFileSync(sourcePath, path.join(UPLOAD_DIR, storedName));
    copied += 1;

    const columns = {
      word_file_name: null,
      word_original_name: null,
      pdf_file_name: null,
      pdf_original_name: null,
      excel_file_name: null,
      excel_original_name: null
    };
    columns[`${fileType}_file_name`] = storedName;
    columns[`${fileType}_original_name`] = originalName;

    const result = db.prepare(`
      INSERT INTO reports (
        name, template_type, category_id, remarks,
        word_file_name, word_original_name,
        pdf_file_name, pdf_original_name,
        excel_file_name, excel_original_name,
        uploaded_by, uploaded_at, active, created_at, updated_at
      )
      VALUES (?, ?, ?, '', ?, ?, ?, ?, ?, ?, NULL, ?, 1, ?, ?)
    `).run(
      reportName,
      TEMPLATE_TYPE,
      category.id,
      columns.word_file_name,
      columns.word_original_name,
      columns.pdf_file_name,
      columns.pdf_original_name,
      columns.excel_file_name,
      columns.excel_original_name,
      timestamp,
      timestamp,
      timestamp
    );
    const reportId = Number(result.lastInsertRowid);
    db.prepare(`
      INSERT INTO upload_records (report_id, file_type, stored_name, original_name, action, uploaded_by, uploaded_at, notes)
      VALUES (?, ?, ?, ?, 'import', NULL, ?, ?)
    `).run(reportId, fileType, storedName, originalName, timestamp, `Imported from ${SOURCE_DIR}`);
    db.prepare(`
      INSERT INTO report_versions (report_id, version_no, file_type, stored_name, original_name, action, uploaded_by, uploaded_at, notes)
      VALUES (?, 1, ?, ?, ?, 'import', NULL, ?, ?)
    `).run(reportId, fileType, storedName, originalName, timestamp, `Imported from ${SOURCE_DIR}`);
    inserted += 1;
  }

  db.exec('COMMIT;');
  console.log(JSON.stringify({ sourceDir: SOURCE_DIR, categoryId: category.id, copied, inserted, skipped }, null, 2));
} catch (error) {
  try { db.exec('ROLLBACK;'); } catch (_) {}
  throw error;
} finally {
  db.close();
}
