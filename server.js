'use strict';

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawn } = require('node:child_process');
const { DatabaseSync } = require('node:sqlite');
const XLSX = require('xlsx');

const ROOT_DIR = __dirname;
const DATA_DIR = path.join(ROOT_DIR, 'data');
const UPLOAD_DIR = path.join(ROOT_DIR, 'uploads');
const STANDARD_CHECK_UPLOAD_DIR = path.join(UPLOAD_DIR, 'standard-check');
const BACKUP_DIR = path.join(ROOT_DIR, 'backup');
const PUBLIC_DIR = path.join(ROOT_DIR, 'public');
const VIDEO_DIR = process.env.HXT_VIDEO_DIR || path.join(path.dirname(ROOT_DIR), '恒信通视频');
const DB_PATH = path.join(DATA_DIR, 'hengxintong.db');
const HOST = '0.0.0.0';
const PORT = Number(process.env.PORT || 3000);
const MAX_UPLOAD_BYTES = 300 * 1024 * 1024;
const SESSION_MS = 8 * 60 * 60 * 1000;
const VIDEO_STREAM_CHUNK_BYTES = 1024 * 1024;
const TEMPLATE_TYPES = new Set(['report', 'entrust', 'auxiliary', 'system', 'video', 'project', 'instrument', 'tool']);
const USER_ROLES = new Set(['user', 'admin', 'superadmin']);
const USER_SCOPES = new Set(['all', 'report', 'entrust', 'auxiliary', 'system', 'video', 'project', 'instrument', 'tool']);

for (const dir of [DATA_DIR, UPLOAD_DIR, STANDARD_CHECK_UPLOAD_DIR, BACKUP_DIR, PUBLIC_DIR, VIDEO_DIR]) {
  fs.mkdirSync(dir, { recursive: true });
}

const db = new DatabaseSync(DB_PATH);
db.exec('PRAGMA foreign_keys = ON;');
db.exec('PRAGMA journal_mode = WAL;');

const sessions = new Map();

initDatabase();

const server = http.createServer((req, res) => {
  handleRequest(req, res).catch((error) => {
    console.error(error);
    if (res.headersSent) {
      res.destroy();
      return;
    }
    const status = error.statusCode || 500;
    sendJson(res, status, { message: error.publicMessage || '系统遇到问题，请稍后再试' });
  });
});

server.listen(PORT, HOST, () => {
  console.log(`恒信通已启动`);
  console.log(`本机访问：http://localhost:${PORT}`);
  console.log(`局域网访问：http://192.168.60.182:${PORT}`);
});

function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      salt TEXT NOT NULL,
      display_name TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('superadmin', 'admin', 'user')),
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      template_type TEXT NOT NULL DEFAULT 'report',
      parent_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      template_type TEXT NOT NULL DEFAULT 'report',
      category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
      remarks TEXT NOT NULL DEFAULT '',
      word_file_name TEXT,
      word_original_name TEXT,
      pdf_file_name TEXT,
      pdf_original_name TEXT,
      excel_file_name TEXT,
      excel_original_name TEXT,
      uploaded_by INTEGER REFERENCES users(id),
      uploaded_at TEXT,
      last_download_by INTEGER REFERENCES users(id),
      last_download_at TEXT,
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS upload_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      report_id INTEGER NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
      file_type TEXT NOT NULL CHECK (file_type IN ('word', 'pdf', 'excel')),
      stored_name TEXT NOT NULL,
      original_name TEXT NOT NULL,
      action TEXT NOT NULL,
      uploaded_by INTEGER REFERENCES users(id),
      uploaded_at TEXT NOT NULL,
      notes TEXT NOT NULL DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS report_versions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      report_id INTEGER NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
      version_no INTEGER NOT NULL,
      file_type TEXT NOT NULL CHECK (file_type IN ('word', 'pdf', 'excel')),
      stored_name TEXT NOT NULL,
      original_name TEXT NOT NULL,
      action TEXT NOT NULL,
      uploaded_by INTEGER REFERENCES users(id),
      uploaded_at TEXT NOT NULL,
      notes TEXT NOT NULL DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS download_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      report_id INTEGER NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
      file_type TEXT NOT NULL CHECK (file_type IN ('word', 'pdf', 'excel')),
      downloaded_by INTEGER REFERENCES users(id),
      downloaded_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS operation_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER REFERENCES users(id),
      action TEXT NOT NULL,
      target_type TEXT NOT NULL,
      target_id INTEGER,
      target_name TEXT NOT NULL DEFAULT '',
      detail TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS backup_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      backup_path TEXT NOT NULL,
      file_count INTEGER NOT NULL DEFAULT 0,
      created_by INTEGER REFERENCES users(id),
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS training_videos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT '',
      lecturer TEXT NOT NULL DEFAULT '',
      file_name TEXT NOT NULL,
      remarks TEXT NOT NULL DEFAULT '',
      active INTEGER NOT NULL DEFAULT 1,
      created_by INTEGER REFERENCES users(id),
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS entrust_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_name TEXT NOT NULL,
      project_name TEXT NOT NULL,
      project_code TEXT NOT NULL,
      entrust_year TEXT NOT NULL,
      entrust_serial INTEGER NOT NULL,
      entrust_no TEXT NOT NULL UNIQUE,
      task_no TEXT NOT NULL UNIQUE,
      sample_name TEXT NOT NULL,
      sample_serial INTEGER NOT NULL,
      sample_code TEXT NOT NULL DEFAULT '',
      record_no TEXT NOT NULL DEFAULT '',
      report_no TEXT NOT NULL DEFAULT '',
      entrust_date TEXT NOT NULL,
      receive_date TEXT NOT NULL,
      receiver TEXT NOT NULL DEFAULT '李晓东',
      sender TEXT NOT NULL DEFAULT '',
      send_dept TEXT NOT NULL DEFAULT '综合部',
      receive_dept TEXT NOT NULL DEFAULT '检测部',
      usage TEXT NOT NULL DEFAULT '',
      remark TEXT NOT NULL DEFAULT '',
      created_by INTEGER REFERENCES users(id),
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS funan_ledger_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      entrust_no TEXT NOT NULL DEFAULT '',
      task_no TEXT NOT NULL UNIQUE,
      sample_no TEXT NOT NULL DEFAULT '',
      quantity TEXT NOT NULL DEFAULT '',
      treatment TEXT NOT NULL DEFAULT '',
      usage TEXT NOT NULL DEFAULT '',
      entrust_date TEXT NOT NULL DEFAULT '',
      source_row INTEGER NOT NULL DEFAULT 0,
      imported_by INTEGER REFERENCES users(id),
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS funan_task_forms (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ledger_id INTEGER NOT NULL UNIQUE REFERENCES funan_ledger_records(id) ON DELETE CASCADE,
      client_name TEXT NOT NULL DEFAULT '安徽省新路建设工程集团有限责任公司',
      project_name TEXT NOT NULL DEFAULT '南阳大道（阜南段）修复养护工程许城路项目',
      sample_name TEXT NOT NULL DEFAULT '沥青混凝土',
      sample_spec TEXT NOT NULL DEFAULT 'AC-13',
      test_item TEXT NOT NULL DEFAULT '弯沉',
      execution_standard TEXT NOT NULL DEFAULT 'JTG 3450-2019',
      method TEXT NOT NULL DEFAULT 'JTG 3450-2019综合法',
      record_no TEXT NOT NULL DEFAULT '',
      report_no TEXT NOT NULL DEFAULT '',
      send_dept TEXT NOT NULL DEFAULT '综合部',
      receive_dept TEXT NOT NULL DEFAULT '检测部',
      sender TEXT NOT NULL DEFAULT '李晓东',
      status TEXT NOT NULL DEFAULT 'draft',
      confirmed_by INTEGER REFERENCES users(id),
      confirmed_at TEXT,
      printed_by INTEGER REFERENCES users(id),
      printed_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS instrument_catalog (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      code TEXT NOT NULL,
      parameters TEXT NOT NULL DEFAULT '',
      category TEXT NOT NULL DEFAULT '',
      source TEXT NOT NULL DEFAULT '',
      UNIQUE(name, code)
    );

    CREATE TABLE IF NOT EXISTS instrument_usage_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      usage_date TEXT NOT NULL,
      sample_no TEXT NOT NULL DEFAULT '',
      test_parameters TEXT NOT NULL DEFAULT '',
      instrument_name TEXT NOT NULL,
      instrument_code TEXT NOT NULL,
      start_time TEXT NOT NULL DEFAULT '',
      end_time TEXT NOT NULL DEFAULT '',
      user_name TEXT NOT NULL DEFAULT '',
      before_status TEXT NOT NULL DEFAULT '正常',
      after_status TEXT NOT NULL DEFAULT '正常',
      remark TEXT NOT NULL DEFAULT '',
      created_by INTEGER REFERENCES users(id),
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sample_origins (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sample_name TEXT NOT NULL,
      origin TEXT NOT NULL,
      created_by INTEGER REFERENCES users(id),
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE(sample_name, origin)
    );
  `);

  migrateDatabase();

  const userCount = db.prepare('SELECT COUNT(*) AS count FROM users').get().count;
  if (userCount === 0) {
    const initialAccounts = createInitialAccountsFile();
    createUser('admin', initialAccounts.adminPassword, '超级管理员', 'superadmin');
    createUser('user', initialAccounts.userPassword, '普通用户', 'user');
  }

  const categoryCount = db.prepare('SELECT COUNT(*) AS count FROM categories').get().count;
  if (categoryCount === 0) {
    const names = [
      '沥青',
      '沥青混合料',
      '水泥混凝土',
      '水泥',
      '集料',
      '钢筋',
      '土工'
    ];
    const insert = db.prepare(`
      INSERT INTO categories (name, parent_id, sort_order, created_at, updated_at)
      VALUES (?, NULL, ?, ?, ?)
    `);
    names.forEach((name, index) => insert.run(name, index + 1, now(), now()));
  }

  ensureDefaultTemplateCategories();
}

function createInitialAccountsFile() {
  const adminPassword = process.env.HXT_ADMIN_PASSWORD || crypto.randomBytes(8).toString('hex');
  const userPassword = process.env.HXT_USER_PASSWORD || crypto.randomBytes(8).toString('hex');
  const filePath = path.join(DATA_DIR, 'initial-accounts.txt');
  const content = [
    '恒信通初始账号',
    '',
    '这个文件只会保存在本机 data 文件夹里，不要上传到 GitHub。',
    '',
    `超级管理员账号：admin`,
    `超级管理员密码：${adminPassword}`,
    '',
    `普通用户账号：user`,
    `普通用户密码：${userPassword}`,
    '',
    '第一次登录后，请马上到管理后台修改账号和密码。'
  ].join('\n');
  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`初始账号密码已写入：${filePath}`);
  return { adminPassword, userPassword };
}

function migrateDatabase() {
  migrateUserRoles();
  addColumnIfMissing('reports', 'excel_file_name', 'TEXT');
  addColumnIfMissing('reports', 'excel_original_name', 'TEXT');
  addColumnIfMissing('reports', 'software_file_name', 'TEXT');
  addColumnIfMissing('reports', 'software_original_name', 'TEXT');
  addColumnIfMissing('reports', 'template_type', "TEXT NOT NULL DEFAULT 'report'");
  addColumnIfMissing('categories', 'template_type', "TEXT NOT NULL DEFAULT 'report'");
  addColumnIfMissing('users', 'scope', "TEXT NOT NULL DEFAULT 'all'");
  addColumnIfMissing('entrust_records', 'sample_code', "TEXT NOT NULL DEFAULT ''");
  addColumnIfMissing('entrust_records', 'record_no', "TEXT NOT NULL DEFAULT ''");
  addColumnIfMissing('entrust_records', 'report_no', "TEXT NOT NULL DEFAULT ''");
  mergeTaskTemplateTypes();
  migrateTrainingVideoCategory();
  migrateRecordTableForExcel('upload_records', `
    CREATE TABLE upload_records_new (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      report_id INTEGER NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
      file_type TEXT NOT NULL CHECK (file_type IN ('word', 'pdf', 'excel')),
      stored_name TEXT NOT NULL,
      original_name TEXT NOT NULL,
      action TEXT NOT NULL,
      uploaded_by INTEGER REFERENCES users(id),
      uploaded_at TEXT NOT NULL,
      notes TEXT NOT NULL DEFAULT ''
    );
  `, `
    INSERT INTO upload_records_new (
      id, report_id, file_type, stored_name, original_name, action, uploaded_by, uploaded_at, notes
    )
    SELECT id, report_id, file_type, stored_name, original_name, action, uploaded_by, uploaded_at, notes
    FROM upload_records;
  `);
  migrateRecordTableForExcel('download_records', `
    CREATE TABLE download_records_new (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      report_id INTEGER NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
      file_type TEXT NOT NULL CHECK (file_type IN ('word', 'pdf', 'excel')),
      downloaded_by INTEGER REFERENCES users(id),
      downloaded_at TEXT NOT NULL
    );
  `, `
    INSERT INTO download_records_new (id, report_id, file_type, downloaded_by, downloaded_at)
    SELECT id, report_id, file_type, downloaded_by, downloaded_at
    FROM download_records;
  `);
  seedReportVersions();
}

function mergeTaskTemplateTypes() {
  db.prepare("UPDATE reports SET template_type = 'entrust' WHERE template_type = 'task'").run();
  db.prepare("UPDATE categories SET template_type = 'entrust' WHERE template_type = 'task'").run();
}

function migrateTrainingVideoCategory() {
  const existingVideoRoot = db.prepare(`
    SELECT id FROM categories
    WHERE template_type = 'video' AND parent_id IS NULL AND name = '检测视频'
  `).get();
  const systemVideo = db.prepare(`
    SELECT id FROM categories
    WHERE template_type = 'system' AND name = '检测视频'
    ORDER BY parent_id IS NULL DESC, id
    LIMIT 1
  `).get();

  if (existingVideoRoot) {
    if (systemVideo) {
      db.prepare('DELETE FROM categories WHERE id = ? AND NOT EXISTS (SELECT 1 FROM reports WHERE category_id = ?) AND NOT EXISTS (SELECT 1 FROM categories WHERE parent_id = ?)')
        .run(systemVideo.id, systemVideo.id, systemVideo.id);
    }
    return;
  }

  if (systemVideo) {
    db.prepare("UPDATE categories SET template_type = 'video', parent_id = NULL, name = '检测视频', updated_at = ? WHERE id = ?")
      .run(now(), systemVideo.id);
  }
}

function migrateUserRoles() {
  const row = db.prepare("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'users'").get();
  if (!row || String(row.sql).includes("'superadmin'")) return;

  db.exec('PRAGMA foreign_keys = OFF;');
  try {
    db.exec('BEGIN;');
    db.exec('DROP TABLE IF EXISTS users_new;');
    db.exec(`
      CREATE TABLE users_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        salt TEXT NOT NULL,
        display_name TEXT NOT NULL,
        role TEXT NOT NULL CHECK (role IN ('superadmin', 'admin', 'user')),
        active INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);
    db.exec(`
      INSERT INTO users_new (
        id, username, password_hash, salt, display_name, role, active, created_at, updated_at
      )
      SELECT id, username, password_hash, salt, display_name,
        CASE WHEN role = 'admin' THEN 'superadmin' ELSE role END,
        active, created_at, updated_at
      FROM users;
    `);
    db.exec('DROP TABLE users;');
    db.exec('ALTER TABLE users_new RENAME TO users;');
    db.exec('COMMIT;');
  } catch (error) {
    try {
      db.exec('ROLLBACK;');
    } catch (_) {
      // Ignore rollback errors when no transaction is open.
    }
    throw error;
  } finally {
    db.exec('PRAGMA foreign_keys = ON;');
  }
}

function addColumnIfMissing(tableName, columnName, columnType) {
  const columns = db.prepare(`PRAGMA table_info(${tableName})`).all();
  if (!columns.some((column) => column.name === columnName)) {
    db.exec(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnType};`);
  }
}

function migrateRecordTableForExcel(tableName, createSql, copySql) {
  const row = db.prepare("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = ?").get(tableName);
  if (!row || String(row.sql).includes("'excel'")) return;

  db.exec('PRAGMA foreign_keys = OFF;');
  try {
    db.exec('BEGIN;');
    db.exec(`DROP TABLE IF EXISTS ${tableName}_new;`);
    db.exec(createSql);
    db.exec(copySql);
    db.exec(`DROP TABLE ${tableName};`);
    db.exec(`ALTER TABLE ${tableName}_new RENAME TO ${tableName};`);
    db.exec('COMMIT;');
  } catch (error) {
    try {
      db.exec('ROLLBACK;');
    } catch (_) {
      // Ignore rollback errors when no transaction is open.
    }
    throw error;
  } finally {
    db.exec('PRAGMA foreign_keys = ON;');
  }
}

function seedReportVersions() {
  const versionCount = db.prepare('SELECT COUNT(*) AS count FROM report_versions').get().count;
  if (versionCount > 0) return;

  const rows = db.prepare(`
    SELECT report_id, file_type, stored_name, original_name, action, uploaded_by, uploaded_at, notes
    FROM upload_records
    ORDER BY uploaded_at, id
  `).all();
  if (!rows.length) return;

  const insert = db.prepare(`
    INSERT INTO report_versions (
      report_id, version_no, file_type, stored_name, original_name, action, uploaded_by, uploaded_at, notes
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const counters = new Map();
  db.exec('BEGIN;');
  try {
    for (const row of rows) {
      const key = `${row.report_id}:${row.file_type}`;
      const nextVersion = (counters.get(key) || 0) + 1;
      counters.set(key, nextVersion);
      insert.run(
        row.report_id,
        nextVersion,
        row.file_type,
        row.stored_name,
        row.original_name,
        row.action,
        row.uploaded_by,
        row.uploaded_at,
        row.notes || ''
      );
    }
    db.exec('COMMIT;');
  } catch (error) {
    try {
      db.exec('ROLLBACK;');
    } catch (_) {
      // Ignore rollback errors.
    }
    throw error;
  }
}

function ensureDefaultTemplateCategories() {
  ensureRootCategory('entrust', '委托单/任务单模板');
  ensureRootCategory('auxiliary', '辅助检测');
  ensureRootCategory('system', '管理体系');
  ensureRootCategory('video', '道路工程');
  ensureRootCategory('video', '桥梁隧道');
  ensureRootCategory('project', '阜南南阳大道');
  ensureRootCategory('instrument', '仪器使用记录');
  migrateToolCategories();
  ensureRootCategory('tool', '离线PDF工具箱-7项功能');
  ensureRootCategory('tool', '离线PDF工具箱-拆分书籍对开页');
  ensureRootCategory('tool', '离线PDF工具箱-交替合并');
  seedInstrumentCatalog();
  [
    '质量手册',
    '程序文件',
    '作业指导书',
    '仪器设备',
    '人员档案',
    '内审资料',
    '资质证书'
  ].forEach((name) => ensureRootCategory('system', name));
}

function migrateToolCategories() {
  const legacyRoot = db.prepare(`
    SELECT id FROM categories
    WHERE template_type = 'tool' AND parent_id IS NULL AND name = '常用工具'
  `).get();
  if (!legacyRoot) return;

  const toolNames = [
    '离线PDF工具箱-7项功能',
    '离线PDF工具箱-拆分书籍对开页',
    '离线PDF工具箱-交替合并'
  ];
  const childCount = db.prepare(`
    SELECT COUNT(*) AS count FROM categories
    WHERE template_type = 'tool' AND parent_id = ?
  `).get(legacyRoot.id).count;
  if (!childCount) {
    db.prepare('DELETE FROM categories WHERE id = ?').run(legacyRoot.id);
    return;
  }

  db.exec('BEGIN');
  try {
    db.prepare(`
      UPDATE categories
      SET parent_id = NULL, sort_order = CASE name
        WHEN ? THEN 1
        WHEN ? THEN 2
        WHEN ? THEN 3
        ELSE sort_order
      END, updated_at = ?
      WHERE template_type = 'tool' AND parent_id = ?
    `).run(...toolNames, now(), legacyRoot.id);
    db.prepare('DELETE FROM categories WHERE id = ?').run(legacyRoot.id);
    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}

function ensureChildCategory(templateType, parentName, name, sortOrder) {
  const parent = db.prepare(`
    SELECT id FROM categories
    WHERE template_type = ? AND parent_id IS NULL AND name = ?
  `).get(templateType, parentName);
  if (!parent) return;
  const existing = db.prepare(`
    SELECT id FROM categories
    WHERE template_type = ? AND parent_id = ? AND name = ?
  `).get(templateType, parent.id, name);
  if (existing) return;
  const timestamp = now();
  db.prepare(`
    INSERT INTO categories (name, template_type, parent_id, sort_order, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(name, templateType, parent.id, sortOrder, timestamp, timestamp);
}

function ensureRootCategory(templateType, name) {
  const existing = db.prepare(`
    SELECT id FROM categories
    WHERE template_type = ? AND parent_id IS NULL AND name = ?
  `).get(templateType, name);
  if (existing) return;

  const maxOrder = db.prepare(`
    SELECT COALESCE(MAX(sort_order), 0) AS maxOrder
    FROM categories
    WHERE template_type = ? AND parent_id IS NULL
  `).get(templateType).maxOrder;
  const timestamp = now();
  db.prepare(`
    INSERT INTO categories (name, template_type, parent_id, sort_order, created_at, updated_at)
    VALUES (?, ?, NULL, ?, ?, ?)
  `).run(name, templateType, maxOrder + 1, timestamp, timestamp);
}

async function handleRequest(req, res) {
  const requestUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = decodeURIComponent(requestUrl.pathname);

  if (pathname.startsWith('/api/')) {
    await handleApi(req, res, requestUrl);
    return;
  }

  if (pathname.startsWith('/download/')) {
    await handleDownload(req, res, pathname);
    return;
  }

  if (pathname.startsWith('/preview/')) {
    await handlePreview(req, res, pathname);
    return;
  }

  if (pathname.startsWith('/videos/')) {
    await handleVideoStream(req, res, pathname);
    return;
  }

  if (pathname === '/vendor/xlsx.full.min.js') {
    serveAbsoluteFile(res, path.join(ROOT_DIR, 'node_modules', 'xlsx', 'dist', 'xlsx.full.min.js'));
    return;
  }

  serveStaticFile(res, pathname);
}

async function handleApi(req, res, requestUrl) {
  const pathname = requestUrl.pathname;

  if (req.method === 'POST' && pathname === '/api/login') {
    const body = await readJson(req);
    const username = String(body.username || '').trim();
    const password = String(body.password || '');
    const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);

    if (!user || !user.active || !verifyPassword(password, user.salt, user.password_hash)) {
      sendJson(res, 401, { message: '账号或密码不对' });
      return;
    }

    const sessionId = crypto.randomBytes(32).toString('hex');
    sessions.set(sessionId, { userId: user.id, expiresAt: Date.now() + SESSION_MS });
    res.setHeader('Set-Cookie', makeSessionCookie(sessionId));
    sendJson(res, 200, { user: publicUser(user) });
    return;
  }

  if (req.method === 'POST' && pathname === '/api/register') {
    const body = await readJson(req);
    const created = createUserFromBody({
      username: body.username,
      displayName: body.displayName,
      password: body.password,
      role: 'user'
    });
    const sessionId = crypto.randomBytes(32).toString('hex');
    sessions.set(sessionId, { userId: created.id, expiresAt: Date.now() + SESSION_MS });
    res.setHeader('Set-Cookie', makeSessionCookie(sessionId));
    sendJson(res, 201, { user: publicUser(created) });
    return;
  }

  if (req.method === 'POST' && pathname === '/api/logout') {
    const sessionId = parseCookies(req).hxt_sid;
    if (sessionId) sessions.delete(sessionId);
    res.setHeader('Set-Cookie', 'hxt_sid=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0');
    sendJson(res, 200, { ok: true });
    return;
  }

  const user = requireUser(req, res);
  if (!user) return;

  if (req.method === 'GET' && pathname === '/api/me') {
    sendJson(res, 200, { user: publicUser(user) });
    return;
  }

  if (req.method === 'GET' && pathname === '/api/categories') {
    sendJson(res, 200, { categories: listCategories(user) });
    return;
  }

  if (req.method === 'GET' && pathname === '/api/standard-library') {
    if (!canSeeTemplateType(user, 'system')) {
      sendJson(res, 200, { standards: [] });
      return;
    }
    sendJson(res, 200, { standards: listStandardLibrary() });
    return;
  }

  if (req.method === 'GET' && pathname === '/api/standard-check/uploads') {
    const files = fs.readdirSync(STANDARD_CHECK_UPLOAD_DIR, { withFileTypes: true })
      .filter((entry) => entry.isFile())
      .map((entry) => {
        const filePath = path.join(STANDARD_CHECK_UPLOAD_DIR, entry.name);
        const stat = fs.statSync(filePath);
        return { name: entry.name, size: stat.size, uploadedAt: stat.mtime.toISOString() };
      })
      .sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt));
    sendJson(res, 200, { files });
    return;
  }

  if (req.method === 'POST' && pathname === '/api/standard-check/uploads') {
    const admin = requireAdmin(user, res);
    if (!admin) return;
    const buffer = await readRequestBody(req, MAX_UPLOAD_BYTES);
    const form = parseMultipart(req, buffer);
    const file = form.files.file;
    if (!file) throw publicError(400, '请选择要上传的查新文件');
    if (!/\.(xls|xlsx|xlsm)$/i.test(file.filename || '')) {
      throw publicError(400, '这里只能上传 Excel 查新文件（xls、xlsx、xlsm）');
    }
    const originalName = path.basename(file.filename);
    const ext = path.extname(originalName).toLowerCase();
    const base = cleanText(path.basename(originalName, ext)).replace(/[\\/:*?"<>|]/g, '_') || '查新表';
    let storedName = `${base}${ext}`;
    let index = 2;
    while (fs.existsSync(path.join(STANDARD_CHECK_UPLOAD_DIR, storedName))) {
      storedName = `${base}-${index}${ext}`;
      index += 1;
    }
    fs.writeFileSync(path.join(STANDARD_CHECK_UPLOAD_DIR, storedName), file.data);
    logOperation(admin, '上传标准查新表', 'standard_check', null, storedName, originalName);
    sendJson(res, 200, { file: { name: storedName, size: file.data.length, uploadedAt: new Date().toISOString() } });
    return;
  }

  if (req.method === 'GET' && pathname === '/api/dashboard') {
    sendJson(res, 200, getDashboardStats(user));
    return;
  }

  if (req.method === 'GET' && pathname === '/api/export/templates') {
    await handleTemplateExport(req, res, user);
    return;
  }

  if (req.method === 'GET' && pathname === '/api/export/entrust-records') {
    await handleEntrustRecordsExport(req, res, user);
    return;
  }

  if (req.method === 'GET' && pathname === '/api/entrust-records') {
    sendJson(res, 200, { records: listEntrustRecords(requestUrl.searchParams) });
    return;
  }

  if (req.method === 'GET' && pathname === '/api/funan-project') {
    if (!canSeeTemplateType(user, 'project')) {
      sendJson(res, 200, { records: [] });
      return;
    }
    sendJson(res, 200, { records: listFunanLedgerRecords() });
    return;
  }

  if (req.method === 'GET' && pathname === '/api/instrument-usage') {
    sendJson(res, 200, { records: listInstrumentUsageRecords(), catalog: listInstrumentCatalog() });
    return;
  }

  if (req.method === 'GET' && pathname === '/api/sample-origins') {
    const rows = db.prepare('SELECT sample_name AS sampleName, origin FROM sample_origins ORDER BY sample_name, origin').all();
    sendJson(res, 200, { origins: rows });
    return;
  }

  if (req.method === 'POST' && pathname === '/api/sample-origins') {
    const body = await readJson(req);
    const sampleName = cleanText(body.sampleName);
    const origin = cleanText(body.origin);
    if (!sampleName || !origin) {
      sendJson(res, 400, { message: '样品名称和产地不能为空' });
      return;
    }
    const timestamp = now();
    db.prepare(`
      INSERT INTO sample_origins (sample_name, origin, created_by, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(sample_name, origin) DO UPDATE SET updated_at = excluded.updated_at
    `).run(sampleName, origin, user.id, timestamp, timestamp);
    sendJson(res, 200, { ok: true, sampleName, origin });
    return;
  }

  if (req.method === 'POST' && pathname === '/api/instrument-usage/match') {
    const body = await readJson(req);
    sendJson(res, 200, { instruments: matchInstruments(body.parameters || '') });
    return;
  }

  if (req.method === 'POST' && pathname === '/api/instrument-usage') {
    const admin = requireAdmin(user, res);
    if (!admin) return;
    const body = await readJson(req);
    const records = saveInstrumentUsageRecords(body, admin);
    sendJson(res, 201, { records });
    return;
  }

  if (req.method === 'POST' && pathname === '/api/funan-project/import') {
    const admin = requireAdmin(user, res);
    if (!admin) return;
    await handleFunanLedgerImport(req, res, admin);
    return;
  }

  if (req.method === 'POST' && pathname === '/api/funan-project/paste') {
    const admin = requireAdmin(user, res);
    if (!admin) return;
    const body = await readJson(req);
    const result = importFunanPastedText(body.text, admin);
    sendJson(res, 200, result);
    return;
  }

  const funanTaskMatch = pathname.match(/^\/api\/funan-project\/tasks\/(\d+)$/);
  if (req.method === 'POST' && funanTaskMatch) {
    const admin = requireAdmin(user, res);
    if (!admin) return;
    const body = await readJson(req);
    const task = saveFunanTaskForm(Number(funanTaskMatch[1]), body, admin);
    sendJson(res, 200, { task });
    return;
  }

  const funanPrintedMatch = pathname.match(/^\/api\/funan-project\/tasks\/(\d+)\/printed$/);
  if (req.method === 'POST' && funanPrintedMatch) {
    const admin = requireAdmin(user, res);
    if (!admin) return;
    markFunanTaskPrinted(Number(funanPrintedMatch[1]), admin);
    sendJson(res, 200, { ok: true });
    return;
  }

  if (req.method === 'GET' && pathname === '/api/training-videos') {
    if (!canSeeTemplateType(user, 'video')) {
      sendJson(res, 200, { videos: [], videoDir: VIDEO_DIR });
      return;
    }
    sendJson(res, 200, { videos: listTrainingVideos(), videoDir: VIDEO_DIR });
    return;
  }

  if (req.method === 'POST' && pathname === '/api/training-videos') {
    const admin = requireAdmin(user, res);
    if (!admin) return;
    const body = await readJson(req);
    const video = createTrainingVideo(body, admin);
    sendJson(res, 201, { video });
    return;
  }

  const videoPatchMatch = pathname.match(/^\/api\/training-videos\/(\d+)$/);
  if (req.method === 'PATCH' && videoPatchMatch) {
    const admin = requireAdmin(user, res);
    if (!admin) return;
    const body = await readJson(req);
    const video = updateTrainingVideo(Number(videoPatchMatch[1]), body, admin);
    sendJson(res, 200, { video });
    return;
  }

  if (req.method === 'POST' && pathname === '/api/entrust-records') {
    const body = await readJson(req);
    const record = createEntrustRecord(body, user);
    sendJson(res, 201, { record });
    return;
  }

  if (req.method === 'GET' && pathname === '/api/reports') {
    const categoryId = nullableInt(requestUrl.searchParams.get('categoryId'));
    const templateType = normalizeTemplateType(requestUrl.searchParams.get('templateType'));
    const includeInactive = requestUrl.searchParams.get('includeInactive') === '1';
    if (includeInactive && !requireAdmin(user, res)) return;
    if (!canSeeTemplateType(user, templateType)) {
      sendJson(res, 200, { reports: [] });
      return;
    }
    sendJson(res, 200, { reports: listReports(categoryId, templateType, includeInactive, user) });
    return;
  }

  const reportLogsMatch = pathname.match(/^\/api\/reports\/(\d+)\/logs$/);
  if (req.method === 'GET' && reportLogsMatch) {
    sendJson(res, 200, getReportLogs(Number(reportLogsMatch[1]), user));
    return;
  }

  const reportVersionsMatch = pathname.match(/^\/api\/reports\/(\d+)\/versions$/);
  if (req.method === 'GET' && reportVersionsMatch) {
    sendJson(res, 200, { versions: listReportVersions(Number(reportVersionsMatch[1]), user) });
    return;
  }

  const reportVersionRestoreMatch = pathname.match(/^\/api\/reports\/(\d+)\/versions\/(\d+)\/restore$/);
  if (req.method === 'POST' && reportVersionRestoreMatch) {
    const admin = requireAdmin(user, res);
    if (!admin) return;
    const report = restoreReportVersion(Number(reportVersionRestoreMatch[1]), Number(reportVersionRestoreMatch[2]), admin);
    sendJson(res, 200, { report });
    return;
  }

  if (req.method === 'POST' && pathname === '/api/reports') {
    const admin = requireAdmin(user, res);
    if (!admin) return;
    await handleReportSave(req, res, admin);
    return;
  }

  if (req.method === 'POST' && pathname === '/api/reports/bulk') {
    const admin = requireAdmin(user, res);
    if (!admin) return;
    await handleBulkReportImport(req, res, admin);
    return;
  }

  const reportPdfUploadMatch = pathname.match(/^\/api\/reports\/(\d+)\/pdf$/);
  if (req.method === 'POST' && reportPdfUploadMatch) {
    const admin = requireAdmin(user, res);
    if (!admin) return;
    await handleReportPdfUpload(req, res, Number(reportPdfUploadMatch[1]), admin);
    return;
  }

  if (req.method === 'POST' && pathname === '/api/software-upload') {
    const admin = requireAdmin(user, res);
    if (!admin) return;
    await handleSoftwareUpload(req, res, admin);
    return;
  }

  if (req.method === 'POST' && pathname === '/api/reports/pdf-auto-match') {
    const admin = requireAdmin(user, res);
    if (!admin) return;
    await handleReportPdfAutoMatch(req, res, admin);
    return;
  }

  const reportPatchMatch = pathname.match(/^\/api\/reports\/(\d+)$/);
  if (req.method === 'PATCH' && reportPatchMatch) {
    const admin = requireAdmin(user, res);
    if (!admin) return;
    const body = await readJson(req);
    updateReportMeta(Number(reportPatchMatch[1]), body, admin);
    sendJson(res, 200, { report: getReport(Number(reportPatchMatch[1])) });
    return;
  }

  const reportStatusMatch = pathname.match(/^\/api\/reports\/(\d+)\/status$/);
  if (req.method === 'PATCH' && reportStatusMatch) {
    const admin = requireAdmin(user, res);
    if (!admin) return;
    const body = await readJson(req);
    const report = updateReportStatus(Number(reportStatusMatch[1]), body, admin);
    sendJson(res, 200, { report });
    return;
  }

  if (req.method === 'POST' && pathname === '/api/categories') {
    const admin = requireAdmin(user, res);
    if (!admin) return;
    const body = await readJson(req);
    const category = createCategory(body, admin);
    sendJson(res, 201, { category });
    return;
  }

  const categoryPatchMatch = pathname.match(/^\/api\/categories\/(\d+)$/);
  if (req.method === 'PATCH' && categoryPatchMatch) {
    const admin = requireAdmin(user, res);
    if (!admin) return;
    const body = await readJson(req);
    const category = updateCategory(Number(categoryPatchMatch[1]), body, admin);
    sendJson(res, 200, { category });
    return;
  }

  if (req.method === 'DELETE' && categoryPatchMatch) {
    const admin = requireAdmin(user, res);
    if (!admin) return;
    deleteCategory(Number(categoryPatchMatch[1]), admin);
    sendJson(res, 200, { ok: true });
    return;
  }

  if (req.method === 'GET' && pathname === '/api/users') {
    const superAdmin = requireSuperAdmin(user, res);
    if (!superAdmin) return;
    sendJson(res, 200, { users: listUsers() });
    return;
  }

  if (req.method === 'POST' && pathname === '/api/users') {
    const superAdmin = requireSuperAdmin(user, res);
    if (!superAdmin) return;
    const body = await readJson(req);
    const created = createUserFromBody(body, superAdmin);
    sendJson(res, 201, { user: publicUser(created) });
    return;
  }

  const userPatchMatch = pathname.match(/^\/api\/users\/(\d+)$/);
  if (req.method === 'PATCH' && userPatchMatch) {
    const superAdmin = requireSuperAdmin(user, res);
    if (!superAdmin) return;
    const body = await readJson(req);
    const updated = updateUser(Number(userPatchMatch[1]), body, superAdmin);
    sendJson(res, 200, { user: publicUser(updated) });
    return;
  }

  if (req.method === 'POST' && pathname === '/api/backup') {
    const admin = requireAdmin(user, res);
    if (!admin) return;
    const backup = createBackup(admin);
    sendJson(res, 200, { message: '完整备份完成', ...backup });
    return;
  }

  if (req.method === 'GET' && pathname === '/api/backups') {
    const admin = requireAdmin(user, res);
    if (!admin) return;
    sendJson(res, 200, { backups: listBackups() });
    return;
  }

  const backupRestoreMatch = pathname.match(/^\/api\/backups\/([^/]+)\/restore$/);
  if (req.method === 'POST' && backupRestoreMatch) {
    const admin = requireAdmin(user, res);
    if (!admin) return;
    const result = scheduleBackupRestore(backupRestoreMatch[1], admin);
    sendJson(res, 200, { message: '恢复任务已启动，网站会自动重启，请稍等 10 秒后重新登录', ...result });
    return;
  }

  if (req.method === 'GET' && pathname === '/api/operation-logs') {
    const admin = requireAdmin(user, res);
    if (!admin) return;
    sendJson(res, 200, { logs: listOperationLogs() });
    return;
  }

  sendJson(res, 404, { message: '没有找到这个功能' });
}

function requireUser(req, res) {
  const sessionId = parseCookies(req).hxt_sid;
  const session = sessionId ? sessions.get(sessionId) : null;
  if (!session || session.expiresAt < Date.now()) {
    if (sessionId) sessions.delete(sessionId);
    sendJson(res, 401, { message: '请先登录' });
    return null;
  }

  const user = db.prepare(`
    SELECT id, username, display_name, role, scope, active, created_at, updated_at
    FROM users
    WHERE id = ? AND active = 1
  `).get(session.userId);

  if (!user) {
    sessions.delete(sessionId);
    sendJson(res, 401, { message: '请先登录' });
    return null;
  }

  session.expiresAt = Date.now() + SESSION_MS;
  return user;
}

function requireAdmin(user, res) {
  if (!isAdminRole(user.role)) {
    sendJson(res, 403, { message: '只有管理员或超级管理员可以操作' });
    return null;
  }
  return user;
}

function requireSuperAdmin(user, res) {
  if (user.role !== 'superadmin') {
    sendJson(res, 403, { message: '只有超级管理员可以操作人员账号' });
    return null;
  }
  return user;
}

function listCategories(user) {
  const visibleTypes = visibleTemplateTypes(user);
  const categories = db.prepare(`
    SELECT c.*,
      (SELECT COUNT(*) FROM reports r WHERE r.category_id = c.id AND r.active = 1 AND r.template_type = c.template_type) AS report_count
    FROM categories c
    WHERE c.template_type IN (${visibleTypes.map(() => '?').join(',')})
    ORDER BY c.template_type, COALESCE(c.parent_id, 0), c.sort_order, c.id
  `).all(...visibleTypes);
  const videoCounts = new Map(db.prepare(`
    SELECT category, COUNT(*) AS count
    FROM training_videos
    WHERE active = 1
    GROUP BY category
  `).all().map((row) => [row.category || '', row.count]));
  return categories.map((category) => {
    if (category.template_type === 'video') {
      return { ...category, report_count: videoCounts.get(category.name) || 0 };
    }
    if (category.template_type === 'project' && category.name === '阜南南阳大道') {
      return { ...category, report_count: db.prepare('SELECT COUNT(*) AS count FROM funan_ledger_records').get().count };
    }
    return category;
  });
}

function listStandardLibrary() {
  return db.prepare(`
    SELECT r.name, r.pdf_original_name, r.word_original_name, r.excel_original_name
    FROM reports r
    JOIN categories c ON c.id = r.category_id
    WHERE r.active = 1
      AND r.template_type = 'system'
      AND c.template_type = 'system'
      AND c.name = '标准规范下载'
    ORDER BY r.name COLLATE NOCASE
  `).all().map((row) => ({
    name: row.name,
    fileName: row.pdf_original_name || row.word_original_name || row.excel_original_name || ''
  }));
}

function listFunanLedgerRecords() {
  return db.prepare(`
    SELECT l.*, f.id AS form_id, f.client_name, f.project_name, f.sample_name, f.sample_spec,
      f.test_item, f.execution_standard, f.method, f.record_no, f.report_no, f.send_dept,
      f.receive_dept, f.sender, f.status, f.confirmed_at, f.printed_at,
      confirmer.display_name AS confirmed_by_name, printer.display_name AS printed_by_name
    FROM funan_ledger_records l
    LEFT JOIN funan_task_forms f ON f.ledger_id = l.id
    LEFT JOIN users confirmer ON confirmer.id = f.confirmed_by
    LEFT JOIN users printer ON printer.id = f.printed_by
    ORDER BY l.entrust_date DESC, l.id DESC
  `).all().map((row) => ({
    id: row.id,
    entrustNo: row.entrust_no,
    taskNo: row.task_no,
    sampleNo: row.sample_no,
    quantity: row.quantity,
    treatment: row.treatment,
    usage: row.usage,
    entrustDate: row.entrust_date,
    sourceRow: row.source_row,
    task: row.form_id ? {
      id: row.form_id,
      clientName: row.client_name,
      projectName: row.project_name,
      sampleName: row.sample_name,
      sampleSpec: row.sample_spec,
      testItem: row.test_item,
      executionStandard: row.execution_standard,
      method: row.method,
      recordNo: row.record_no,
      reportNo: row.report_no,
      sendDept: row.send_dept,
      receiveDept: row.receive_dept,
      sender: row.sender,
      status: row.status,
      confirmedAt: row.confirmed_at,
      confirmedByName: row.confirmed_by_name || '',
      printedAt: row.printed_at,
      printedByName: row.printed_by_name || ''
    } : null
  }));
}

function listInstrumentCatalog() {
  return db.prepare('SELECT id, name, code, parameters, category FROM instrument_catalog ORDER BY id').all();
}

function listInstrumentUsageRecords() {
  return db.prepare(`SELECT id, usage_date AS usageDate, sample_no AS sampleNo,
    test_parameters AS testParameters, instrument_name AS instrumentName,
    instrument_code AS instrumentCode, start_time AS startTime, end_time AS endTime,
    user_name AS userName, before_status AS beforeStatus, after_status AS afterStatus,
    remark, created_at AS createdAt FROM instrument_usage_records ORDER BY id DESC LIMIT 300`).all();
}

function matchInstruments(parameters) {
  const input = cleanText(parameters).toLowerCase();
  if (!input) return [];
  const tokens = input.split(/[，,、;；\n\r]+/).map((item) => item.trim()).filter(Boolean);
  const rows = db.prepare('SELECT id, name, code, parameters, category FROM instrument_catalog ORDER BY id').all();
  return rows.filter((row) => {
    const haystack = `${row.name} ${row.code} ${row.parameters} ${row.category}`.toLowerCase();
    return tokens.some((token) => haystack.includes(token)) || haystack.includes(input);
  }).map((row) => ({ ...row, match: row.parameters || row.category }));
}

function saveInstrumentUsageRecords(body, user) {
  const selected = Array.isArray(body.instruments) ? body.instruments : [];
  if (!selected.length) throw publicError(400, '请先根据试验参数匹配并选择仪器');
  const usageDate = cleanText(body.usageDate) || now().slice(0, 10);
  const timestamp = now();
  const insert = db.prepare(`INSERT INTO instrument_usage_records
    (usage_date, sample_no, test_parameters, instrument_name, instrument_code,
     start_time, end_time, user_name, before_status, after_status, remark, created_by, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  db.exec('BEGIN;');
  try {
    for (const item of selected) {
      insert.run(usageDate, cleanText(body.sampleNo), cleanText(body.parameters), cleanText(item.name), cleanText(item.code),
        cleanText(body.startTime), cleanText(body.endTime), cleanText(body.userName),
        cleanText(body.beforeStatus) || '正常', cleanText(body.afterStatus) || '正常', cleanText(body.remark), user.id, timestamp);
    }
    db.exec('COMMIT;');
  } catch (error) {
    try { db.exec('ROLLBACK;'); } catch (_) {}
    throw error;
  }
  logOperation(user, '新增仪器使用记录', 'instrument_usage', null, cleanText(body.sampleNo), `仪器 ${selected.length} 台`);
  return listInstrumentUsageRecords();
}

function seedInstrumentCatalog() {
  const source = 'C:\\Users\\Public\\仪器使用记录\\仪器名称及编号(1).xlsx';
  if (!fs.existsSync(source)) return;
  const current = db.prepare('SELECT COUNT(*) AS count FROM instrument_catalog').get().count;
  if (current > 0) return;
  try {
    const workbook = XLSX.readFile(source, { cellFormula: false, cellStyles: false });
    const insert = db.prepare('INSERT OR IGNORE INTO instrument_catalog (name, code, parameters, category, source) VALUES (?, ?, ?, ?, ?)');
    const first = workbook.Sheets[workbook.SheetNames[0]];
    XLSX.utils.sheet_to_json(first, { header: 1, defval: '', raw: false }).forEach((row) => {
      const label = cleanText(row[0]);
      const match = label.match(/^(.*)\(([^()]+(?:\([^()]+\))?)\)$/);
      if (match) insert.run(match[1], match[2], cleanText(row[1]), cleanText(row[2]), source);
    });
    const second = workbook.Sheets[workbook.SheetNames[1]];
    XLSX.utils.sheet_to_json(second, { header: 1, defval: '', raw: false }).forEach((row) => {
      const parameter = cleanText(row[0]);
      if (!parameter) return;
      String(row[1] || '').split(/[、,，]/).forEach((item) => {
        const label = cleanText(item);
        const match = label.match(/^(.*)\(([^()]+(?:\([^()]+\))?)\)$/);
        if (match) insert.run(match[1], match[2], parameter, '', source);
      });
    });
  } catch (error) {
    console.error('仪器一览表导入失败', error.message);
  }
}

async function handleFunanLedgerImport(req, res, user) {
  const buffer = await readRequestBody(req, MAX_UPLOAD_BYTES);
  const form = parseMultipart(req, buffer);
  const file = form.files.ledgerFile;
  if (!file) throw publicError(400, '请选择台账 Excel 文件');
  const ext = path.extname(file.filename || '').toLowerCase();
  if (!['.xls', '.xlsx'].includes(ext)) throw publicError(400, '台账只支持 .xls 或 .xlsx 文件');

  let rows;
  try {
    const workbook = XLSX.read(file.data, { type: 'buffer', cellDates: false });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '', raw: false });
  } catch (_) {
    throw publicError(400, '台账 Excel 无法读取，请确认文件没有损坏或加密');
  }
  if (rows.length < 2) throw publicError(400, '台账中没有可导入的数据');

  const header = rows[0].map((value) => cleanText(value));
  const indexOf = (name) => header.indexOf(name);
  const required = ['委托编号', '任务编号：', '样品编号', '取样数量', '工程部位/用途', '日期'];
  const missing = required.filter((name) => indexOf(name) === -1);
  if (missing.length) throw publicError(400, `台账表头缺少：${missing.join('、')}`);

  const fields = {
    entrustNo: indexOf('委托编号'),
    taskNo: indexOf('任务编号：'),
    sampleNo: indexOf('样品编号'),
    quantity: indexOf('取样数量'),
    treatment: indexOf('取样数量') + 1,
    usage: indexOf('工程部位/用途'),
    entrustDate: indexOf('日期')
  };
  let inserted = 0;
  let updated = 0;
  const timestamp = now();
  db.exec('BEGIN;');
  try {
    for (let rowIndex = 1; rowIndex < rows.length; rowIndex += 1) {
      const row = rows[rowIndex];
      const taskNo = cleanText(row[fields.taskNo]);
      if (!taskNo) continue;
      const values = [
        cleanText(row[fields.entrustNo]), taskNo, cleanText(row[fields.sampleNo]),
        cleanText(row[fields.quantity]), cleanText(row[fields.treatment]), cleanText(row[fields.usage]),
        cleanText(row[fields.entrustDate]), rowIndex + 1, user.id, timestamp
      ];
      const existing = db.prepare('SELECT id FROM funan_ledger_records WHERE task_no = ?').get(taskNo);
      if (existing) {
        db.prepare(`UPDATE funan_ledger_records SET entrust_no=?, sample_no=?, quantity=?, treatment=?, usage=?, entrust_date=?, source_row=?, imported_by=?, updated_at=? WHERE id=?`)
          .run(values[0], values[2], values[3], values[4], values[5], values[6], values[7], values[8], values[9], existing.id);
        updated += 1;
      } else {
        db.prepare(`INSERT INTO funan_ledger_records (entrust_no, task_no, sample_no, quantity, treatment, usage, entrust_date, source_row, imported_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
          .run(...values, timestamp);
        inserted += 1;
      }
    }
    db.exec('COMMIT;');
  } catch (error) {
    try { db.exec('ROLLBACK;'); } catch (_) {}
    throw error;
  }
  logOperation(user, '导入阜南弯沉台账', 'funan_ledger', null, file.filename, `新增 ${inserted} 条，更新 ${updated} 条`);
  sendJson(res, 200, { inserted, updated, total: inserted + updated });
}

function importFunanPastedText(text, user) {
  const rows = parseExcelClipboardText(text);
  if (!rows.length) throw publicError(400, '请先从 Excel 复制一行或多行台账信息');
  const start = /委托编号|任务编号/.test(rows[0].join(' ')) ? 1 : 0;
  const dataRows = rows.slice(start).filter((row) => cleanText(row[1]));
  if (!dataRows.length) throw publicError(400, '没有识别到任务编号，请复制 Excel 中完整的一行');

  const timestamp = now();
  let inserted = 0;
  let updated = 0;
  const taskNos = [];
  db.exec('BEGIN;');
  try {
    for (let index = 0; index < dataRows.length; index += 1) {
      const row = dataRows[index];
      const values = [
        cleanText(row[0]), cleanText(row[1]), cleanText(row[2]), cleanText(row[3]),
        cleanText(row[4]), cleanText(row[6]), cleanText(row[8]), index + 1, user.id, timestamp
      ];
      const existing = db.prepare('SELECT id FROM funan_ledger_records WHERE task_no = ?').get(values[1]);
      if (existing) {
        db.prepare(`UPDATE funan_ledger_records SET entrust_no=?, sample_no=?, quantity=?, treatment=?, usage=?, entrust_date=?, source_row=?, imported_by=?, updated_at=? WHERE id=?`)
          .run(values[0], values[2], values[3], values[4], values[5], values[6], values[7], values[8], values[9], existing.id);
        updated += 1;
      } else {
        db.prepare(`INSERT INTO funan_ledger_records (entrust_no, task_no, sample_no, quantity, treatment, usage, entrust_date, source_row, imported_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
          .run(...values, timestamp);
        inserted += 1;
      }
      taskNos.push(values[1]);
    }
    db.exec('COMMIT;');
  } catch (error) {
    try { db.exec('ROLLBACK;'); } catch (_) {}
    throw error;
  }
  logOperation(user, '粘贴导入阜南弯沉台账', 'funan_ledger', null, 'Excel 粘贴内容', `新增 ${inserted} 条，更新 ${updated} 条`);
  return { inserted, updated, total: inserted + updated, taskNos };
}

function parseExcelClipboardText(text) {
  const rows = [];
  let row = [];
  let cell = '';
  let quoted = false;
  const source = String(text || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    if (char === '"') {
      if (quoted && source[index + 1] === '"') {
        cell += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
      continue;
    }
    if (char === '\t' && !quoted) {
      row.push(cell);
      cell = '';
      continue;
    }
    if (char === '\n' && !quoted) {
      row.push(cell);
      if (row.some((value) => cleanText(value))) rows.push(row);
      row = [];
      cell = '';
      continue;
    }
    cell += char;
  }
  row.push(cell);
  if (row.some((value) => cleanText(value))) rows.push(row);
  return rows;
}

function taskCodeFromSample(sampleNo, prefix) {
  const value = cleanText(sampleNo);
  return value.startsWith('YP-') ? `${prefix}-${value.slice(3)}` : value ? `${prefix}-${value}` : '';
}

function saveFunanTaskForm(ledgerId, body, user) {
  const ledger = db.prepare('SELECT * FROM funan_ledger_records WHERE id = ?').get(ledgerId);
  if (!ledger) throw publicError(404, '没有找到这条台账');
  const existing = db.prepare('SELECT * FROM funan_task_forms WHERE ledger_id = ?').get(ledgerId);
  const value = (name, fallback) => cleanText(body[name]) || fallback;
  const timestamp = now();
  const fields = {
    clientName: value('clientName', existing?.client_name || '安徽省新路建设工程集团有限责任公司'),
    projectName: value('projectName', existing?.project_name || '南阳大道（阜南段）修复养护工程许城路项目'),
    sampleName: value('sampleName', existing?.sample_name || '沥青混凝土'),
    sampleSpec: value('sampleSpec', existing?.sample_spec || 'AC-13'),
    testItem: value('testItem', existing?.test_item || '弯沉'),
    executionStandard: value('executionStandard', existing?.execution_standard || 'JTG 3450-2019'),
    method: value('method', existing?.method || 'JTG 3450-2019综合法'),
    recordNo: value('recordNo', existing?.record_no || taskCodeFromSample(ledger.sample_no, 'JL')),
    reportNo: value('reportNo', existing?.report_no || taskCodeFromSample(ledger.sample_no, 'BG')),
    sendDept: value('sendDept', existing?.send_dept || '综合部'),
    receiveDept: value('receiveDept', existing?.receive_dept || '检测部'),
    sender: value('sender', existing?.sender || '李晓东')
  };
  if (existing) {
    db.prepare(`UPDATE funan_task_forms SET client_name=?, project_name=?, sample_name=?, sample_spec=?, test_item=?, execution_standard=?, method=?, record_no=?, report_no=?, send_dept=?, receive_dept=?, sender=?, status='confirmed', confirmed_by=?, confirmed_at=?, updated_at=? WHERE ledger_id=?`)
      .run(fields.clientName, fields.projectName, fields.sampleName, fields.sampleSpec, fields.testItem, fields.executionStandard, fields.method, fields.recordNo, fields.reportNo, fields.sendDept, fields.receiveDept, fields.sender, user.id, timestamp, timestamp, ledgerId);
  } else {
    db.prepare(`INSERT INTO funan_task_forms (ledger_id, client_name, project_name, sample_name, sample_spec, test_item, execution_standard, method, record_no, report_no, send_dept, receive_dept, sender, status, confirmed_by, confirmed_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'confirmed', ?, ?, ?, ?)`)
      .run(ledgerId, fields.clientName, fields.projectName, fields.sampleName, fields.sampleSpec, fields.testItem, fields.executionStandard, fields.method, fields.recordNo, fields.reportNo, fields.sendDept, fields.receiveDept, fields.sender, user.id, timestamp, timestamp, timestamp);
  }
  logOperation(user, '确认阜南弯沉任务单', 'funan_task', ledgerId, ledger.task_no, fields.recordNo);
  return listFunanLedgerRecords().find((item) => item.id === ledgerId)?.task;
}

function markFunanTaskPrinted(ledgerId, user) {
  const task = db.prepare('SELECT id FROM funan_task_forms WHERE ledger_id = ?').get(ledgerId);
  if (!task) throw publicError(400, '请先确认任务单，再打印');
  db.prepare('UPDATE funan_task_forms SET printed_by = ?, printed_at = ?, updated_at = ? WHERE ledger_id = ?')
    .run(user.id, now(), now(), ledgerId);
  logOperation(user, '打印阜南弯沉任务单', 'funan_task', ledgerId, String(ledgerId), '已打印');
}

function listReports(categoryId, templateType, includeInactive = false, user = null) {
  if (user && !canSeeTemplateType(user, templateType)) return [];
  let sql = `
    SELECT r.*,
      c.name AS category_name,
      up.display_name AS uploaded_by_name,
      down.display_name AS last_download_by_name,
      ${user ? '(SELECT COUNT(*) FROM download_records d WHERE d.report_id = r.id AND d.downloaded_by = ?) AS downloaded_by_me' : '0 AS downloaded_by_me'}
    FROM reports r
    LEFT JOIN categories c ON c.id = r.category_id
    LEFT JOIN users up ON up.id = r.uploaded_by
    LEFT JOIN users down ON down.id = r.last_download_by
    WHERE r.template_type = ?
  `;
  const params = user ? [user.id, templateType] : [templateType];

  if (!includeInactive) {
    sql += ' AND r.active = 1';
  }

  if (categoryId) {
    sql += `
      AND r.category_id IN (
        WITH RECURSIVE tree(id) AS (
          SELECT id FROM categories WHERE id = ? AND template_type = ?
          UNION ALL
          SELECT c.id FROM categories c JOIN tree t ON c.parent_id = t.id
          WHERE c.template_type = ?
        )
        SELECT id FROM tree
      )
    `;
    params.push(categoryId, templateType, templateType);
  }

  sql += ' ORDER BY r.active DESC, c.sort_order, c.id, r.updated_at DESC, r.id DESC';
  return db.prepare(sql).all(...params).map(shapeReport);
}

function getReport(id, user = null) {
  const row = db.prepare(`
    SELECT r.*,
      c.name AS category_name,
      up.display_name AS uploaded_by_name,
      down.display_name AS last_download_by_name
    FROM reports r
    LEFT JOIN categories c ON c.id = r.category_id
    LEFT JOIN users up ON up.id = r.uploaded_by
    LEFT JOIN users down ON down.id = r.last_download_by
    WHERE r.id = ? AND r.active = 1
  `).get(id);
  if (!row) throw publicError(404, '没有找到这个报告');
  if (user && !canSeeTemplateType(user, row.template_type)) {
    throw publicError(403, '你没有权限查看这个模板');
  }
  return shapeReport(row);
}

function shapeReport(row) {
  return {
    id: row.id,
    name: row.name,
    templateType: row.template_type || 'report',
    categoryId: row.category_id,
    categoryName: row.category_name || '未分类',
    remarks: row.remarks || '',
    hasWord: Boolean(row.word_file_name),
    hasPdf: Boolean(row.pdf_file_name),
    hasExcel: Boolean(row.excel_file_name),
    hasSoftware: Boolean(row.software_file_name),
    active: Boolean(row.active),
    wordOriginalName: row.word_original_name || '',
    pdfOriginalName: row.pdf_original_name || '',
    excelOriginalName: row.excel_original_name || '',
    softwareOriginalName: row.software_original_name || '',
    uploadedByName: row.uploaded_by_name || '',
    uploadedAt: row.uploaded_at || '',
    lastDownloadByName: row.last_download_by_name || '',
    lastDownloadAt: row.last_download_at || '',
    downloadedByMe: Boolean(row.downloaded_by_me),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function getDashboardStats(user) {
  const visibleTypes = visibleTemplateTypes(user);
  const placeholders = visibleTypes.map(() => '?').join(',');
  const totals = db.prepare(`
    SELECT
      COUNT(*) AS total,
      SUM(CASE WHEN active = 1 THEN 1 ELSE 0 END) AS activeTotal,
      SUM(CASE WHEN active = 0 THEN 1 ELSE 0 END) AS inactiveTotal,
      SUM(CASE WHEN active = 1 AND pdf_file_name IS NULL THEN 1 ELSE 0 END) AS missingPdf,
      SUM(CASE WHEN active = 1 AND last_download_at IS NULL THEN 1 ELSE 0 END) AS neverDownloaded,
      SUM(CASE WHEN active = 1 AND julianday(updated_at) < julianday('now', '-60 days') THEN 1 ELSE 0 END) AS stale
    FROM reports
    WHERE template_type IN (${placeholders})
  `).get(...visibleTypes);

  totals.myDownloaded = db.prepare(`
    SELECT COUNT(DISTINCT r.id) AS count
    FROM reports r
    JOIN download_records d ON d.report_id = r.id
    WHERE r.active = 1 AND d.downloaded_by = ? AND r.template_type IN (${placeholders})
  `).get(user.id, ...visibleTypes).count;

  const recentUploads = db.prepare(`
    SELECT r.name, r.updated_at AS updatedAt, r.uploaded_at AS uploadedAt, c.name AS categoryName
    FROM reports r
    LEFT JOIN categories c ON c.id = r.category_id
    WHERE r.active = 1 AND r.template_type IN (${placeholders})
    ORDER BY COALESCE(r.uploaded_at, r.updated_at) DESC, r.id DESC
    LIMIT 5
  `).all(...visibleTypes);

  const byType = db.prepare(`
    SELECT template_type AS templateType, COUNT(*) AS count
    FROM reports
    WHERE active = 1 AND template_type IN (${placeholders})
    GROUP BY template_type
  `).all(...visibleTypes);

  return { totals, recentUploads, byType };
}

async function handleTemplateExport(req, res, user) {
  const visibleTypes = visibleTemplateTypes(user);
  const placeholders = visibleTypes.map(() => '?').join(',');
  const rows = db.prepare(`
    SELECT r.id, r.name, r.template_type AS templateType, c.name AS categoryName, r.remarks,
      CASE WHEN r.word_file_name IS NOT NULL THEN '有' ELSE '无' END AS hasWord,
      CASE WHEN r.pdf_file_name IS NOT NULL THEN '有' ELSE '无' END AS hasPdf,
      CASE WHEN r.excel_file_name IS NOT NULL THEN '有' ELSE '无' END AS hasExcel,
      up.display_name AS uploadedByName, r.uploaded_at AS uploadedAt,
      down.display_name AS lastDownloadByName, r.last_download_at AS lastDownloadAt,
      CASE WHEN r.active = 1 THEN '正常' ELSE '已停用' END AS status
    FROM reports r
    LEFT JOIN categories c ON c.id = r.category_id
    LEFT JOIN users up ON up.id = r.uploaded_by
    LEFT JOIN users down ON down.id = r.last_download_by
    WHERE r.template_type IN (${placeholders})
    ORDER BY r.active DESC, r.template_type, c.sort_order, r.id
  `).all(...visibleTypes);

  const header = ['编号', '模板名称', '模板类型', '分类', 'Word', 'PDF', 'Excel', '上传人', '上传时间', '最后下载人', '最后下载时间', '状态', '备注'];
  const lines = [header, ...rows.map((row) => [
    row.id,
    row.name,
    templateTypeLabel(row.templateType),
    row.categoryName || '未分类',
    row.hasWord,
    row.hasPdf,
    row.hasExcel,
    row.uploadedByName || '',
    formatChinaTime(row.uploadedAt),
    row.lastDownloadByName || '',
    formatChinaTime(row.lastDownloadAt),
    row.status,
    row.remarks || ''
  ])].map((line) => line.map(csvCell).join(','));

  const csv = `\uFEFF${lines.join('\r\n')}`;
  logOperation(user, '导出模板清单', 'export', null, '模板清单', `共 ${rows.length} 条`);
  res.writeHead(200, {
    'Content-Type': 'text/csv; charset=utf-8',
    'Content-Disposition': contentDisposition(`恒信通模板清单-${formatFileTime(new Date())}.csv`),
    'Cache-Control': 'no-cache'
  });
  res.end(csv);
}

async function handleEntrustRecordsExport(req, res, user) {
  const records = listEntrustRecords(new URLSearchParams());
  const header = ['登记ID', '委托编号', '任务编号', '委托单位', '工程名称', '工程代码', '样品名称', '样品流水号', '样品编号', '记录编号', '报告编号', '委托日期', '接样日期', '接样人', '委托人', '下达部门', '接受部门', '工程部位/用途', '备注', '登记人', '登记时间'];
  const lines = [header, ...records.map((record) => [
    record.id,
    record.entrustNo,
    record.taskNo,
    record.clientName,
    record.projectName,
    record.projectCode,
    record.sampleName,
    record.sampleSerial,
    record.sampleCode,
    record.recordNo,
    record.reportNo,
    record.entrustDate,
    record.receiveDate,
    record.receiver,
    record.sender,
    record.sendDept,
    record.receiveDept,
    record.usage,
    record.remark,
    record.createdByName,
    formatChinaTime(record.createdAt)
  ])].map((line) => line.map(csvCell).join(','));

  const csv = `\uFEFF${lines.join('\r\n')}`;
  logOperation(user, '导出委托台账', 'export', null, '委托台账', `共 ${records.length} 条`);
  res.writeHead(200, {
    'Content-Type': 'text/csv; charset=utf-8',
    'Content-Disposition': contentDisposition(`恒信通委托台账-${formatFileTime(new Date())}.csv`),
    'Cache-Control': 'no-cache'
  });
  res.end(csv);
}

function listEntrustRecords(searchParams) {
  const keyword = cleanText(searchParams.get('keyword'));
  const params = [];
  let where = '';
  if (keyword) {
    where = `
      WHERE er.entrust_no LIKE ? OR er.task_no LIKE ? OR er.client_name LIKE ?
        OR er.project_name LIKE ? OR er.sample_name LIKE ? OR er.receiver LIKE ?
    `;
    const like = `%${keyword}%`;
    params.push(like, like, like, like, like, like);
  }

  return db.prepare(`
    SELECT er.*, u.display_name AS created_by_name
    FROM entrust_records er
    LEFT JOIN users u ON u.id = er.created_by
    ${where}
    ORDER BY er.entrust_date DESC, er.id DESC
    LIMIT 500
  `).all(...params).map(publicEntrustRecord);
}

function createEntrustRecord(body, user) {
  const clientName = cleanRequiredText(body.clientName, '请填写委托单位');
  const projectName = cleanRequiredText(body.projectName, '请填写工程名称');
  const projectCode = normalizeProjectCode(body.projectCode);
  const sampleName = cleanRequiredText(body.sampleName, '请选择样品名称');
  const entrustDate = normalizeDate(body.entrustDate, '请填写委托日期');
  const receiveDate = normalizeDate(body.receiveDate || body.entrustDate, '请填写接样日期');
  const entrustYear = entrustDate.slice(0, 4);
  const receiver = cleanText(body.receiver) || '李晓东';
  const sender = cleanText(body.sender);
  const sendDept = cleanText(body.sendDept) || '综合部';
  const receiveDept = cleanText(body.receiveDept) || '检测部';
  const usage = cleanText(body.usage);
  const remark = cleanText(body.remark);
  const timestamp = now();

  db.exec('BEGIN IMMEDIATE;');
  try {
    const entrustSerial = nextEntrustSerial(entrustYear, projectCode);
    const sampleSerial = nextSampleSerial(entrustYear, projectCode, sampleName);
    const entrustNo = buildBusinessNo('WT', entrustYear, entrustSerial, projectCode);
    const taskNo = buildBusinessNo('RW', entrustYear, entrustSerial, projectCode);
    const samplePrefix = cleanText(body.samplePrefix);
    const sampleSuffix = cleanText(body.sampleSuffix);
    const sampleCode = samplePrefix && sampleSuffix ? buildSampleBusinessNo('YP', entrustYear, samplePrefix, sampleSerial, sampleSuffix) : cleanText(body.sampleCode);
    const recordNo = samplePrefix && sampleSuffix ? buildSampleBusinessNo('JL', entrustYear, samplePrefix, sampleSerial, sampleSuffix) : cleanText(body.recordNo);
    const reportNo = samplePrefix && sampleSuffix ? buildSampleBusinessNo('BG', entrustYear, samplePrefix, sampleSerial, sampleSuffix) : cleanText(body.reportNo);

    const result = db.prepare(`
      INSERT INTO entrust_records (
        client_name, project_name, project_code, entrust_year, entrust_serial,
        entrust_no, task_no, sample_name, sample_serial, sample_code, record_no, report_no,
        entrust_date, receive_date, receiver, sender, send_dept, receive_dept, usage, remark,
        created_by, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      clientName, projectName, projectCode, entrustYear, entrustSerial,
      entrustNo, taskNo, sampleName, sampleSerial, sampleCode, recordNo, reportNo,
      entrustDate, receiveDate, receiver, sender, sendDept, receiveDept, usage, remark,
      user.id, timestamp, timestamp
    );

    db.exec('COMMIT;');
    const record = getEntrustRecord(Number(result.lastInsertRowid));
    logOperation(user, '登记委托台账', 'entrust_record', record.id, record.entrustNo, `${record.clientName} / ${record.sampleName}`);
    return record;
  } catch (error) {
    db.exec('ROLLBACK;');
    if (String(error.message || '').includes('UNIQUE')) {
      throw publicError(409, '编号已存在，请刷新后重新登记');
    }
    throw error;
  }
}

function getEntrustRecord(id) {
  const row = db.prepare(`
    SELECT er.*, u.display_name AS created_by_name
    FROM entrust_records er
    LEFT JOIN users u ON u.id = er.created_by
    WHERE er.id = ?
  `).get(id);
  if (!row) throw publicError(404, '没有找到这条委托台账');
  return publicEntrustRecord(row);
}

function nextEntrustSerial(entrustYear, projectCode) {
  const row = db.prepare(`
    SELECT COALESCE(MAX(entrust_serial), 0) + 1 AS nextSerial
    FROM entrust_records
    WHERE entrust_year = ? AND project_code = ?
  `).get(entrustYear, projectCode);
  return row.nextSerial;
}

function nextSampleSerial(entrustYear, projectCode, sampleName) {
  const row = db.prepare(`
    SELECT COALESCE(MAX(sample_serial), 0) + 1 AS nextSerial
    FROM entrust_records
    WHERE entrust_year = ? AND project_code = ? AND sample_name = ?
  `).get(entrustYear, projectCode, sampleName);
  return row.nextSerial;
}

function buildBusinessNo(prefix, year, serial, projectCode) {
  return `${prefix}-${year}-${String(serial).padStart(4, '0')}-${projectCode}`;
}

function buildSampleBusinessNo(prefix, year, samplePrefix, serial, sampleSuffix) {
  return `${prefix}-${year}-${samplePrefix}${String(serial).padStart(4, '0')}-${sampleSuffix}`;
}

function cleanRequiredText(value, message) {
  const text = cleanText(value);
  if (!text) throw publicError(400, message);
  return text;
}

function normalizeProjectCode(value) {
  const code = cleanText(value).toUpperCase();
  if (!/^[A-Z]\d{2}$/.test(code)) throw publicError(400, '工程代码格式不正确，例如 A06');
  return code;
}

function normalizeDate(value, message) {
  const text = cleanText(value);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) throw publicError(400, message);
  return text;
}

function publicEntrustRecord(row) {
  return {
    id: row.id,
    clientName: row.client_name,
    projectName: row.project_name,
    projectCode: row.project_code,
    entrustYear: row.entrust_year,
    entrustSerial: String(row.entrust_serial).padStart(4, '0'),
    entrustNo: row.entrust_no,
    taskNo: row.task_no,
    sampleName: row.sample_name,
    sampleSerial: String(row.sample_serial).padStart(4, '0'),
    sampleCode: row.sample_code || '',
    recordNo: row.record_no || '',
    reportNo: row.report_no || '',
    entrustDate: row.entrust_date,
    receiveDate: row.receive_date,
    receiver: row.receiver,
    sender: row.sender || '',
    sendDept: row.send_dept,
    receiveDept: row.receive_dept,
    usage: row.usage || '',
    remark: row.remark || '',
    createdByName: row.created_by_name || '',
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function csvCell(value) {
  const text = String(value ?? '');
  return `"${text.replace(/"/g, '""')}"`;
}

function templateTypeLabel(type) {
  if (type === 'entrust') return '委托单/任务单模板';
  if (type === 'auxiliary') return '辅助检测';
  if (type === 'system') return '管理体系';
  return '检测报告模板';
}

function formatChinaTime(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('zh-CN', { hour12: false });
}

async function handleReportSave(req, res, user) {
  const buffer = await readRequestBody(req, MAX_UPLOAD_BYTES);
  const form = parseMultipart(req, buffer);
  const reportId = nullableInt(form.fields.reportId);
  const name = cleanText(form.fields.name);
  const templateType = normalizeTemplateType(form.fields.templateType);
  const categoryId = nullableInt(form.fields.categoryId);
  const remarks = cleanText(form.fields.remarks);
  const wordFile = form.files.wordFile;
  const pdfFile = form.files.pdfFile;
  const excelFile = form.files.excelFile;
  const actionTime = now();
  const action = reportId ? 'replace' : 'create';

  if (!reportId && !name) throw publicError(400, '请填写报告名称');
  if (!reportId && !categoryId) throw publicError(400, '请选择分类');
  validateCategoryForTemplate(categoryId, templateType);
  if (!reportId && !wordFile && !pdfFile && !excelFile) {
    throw publicError(400, '请至少上传 Word、PDF 或 Excel');
  }

  const existing = reportId
    ? db.prepare('SELECT * FROM reports WHERE id = ? AND active = 1').get(reportId)
    : null;
  if (reportId && !existing) throw publicError(404, '没有找到要替换的报告');

  const next = {
    id: reportId,
    name: name || existing?.name,
    templateType: templateType || existing?.template_type || 'report',
    categoryId: categoryId || existing?.category_id,
    remarks: remarks || existing?.remarks || '',
    wordFileName: existing?.word_file_name || null,
    wordOriginalName: existing?.word_original_name || null,
    pdfFileName: existing?.pdf_file_name || null,
    pdfOriginalName: existing?.pdf_original_name || null,
    excelFileName: existing?.excel_file_name || null,
    excelOriginalName: existing?.excel_original_name || null,
    uploadedBy: existing?.uploaded_by || null,
    uploadedAt: existing?.uploaded_at || null
  };

  const savedFiles = [];
  const uploadLogs = [];

  try {
    if (wordFile) {
      const saved = saveUploadedFile(wordFile, 'word', next.name);
      savedFiles.push(saved.fullPath);
      next.wordFileName = saved.storedName;
      next.wordOriginalName = saved.originalName;
      next.uploadedBy = user.id;
      next.uploadedAt = actionTime;
      uploadLogs.push(saved);
    }

    if (pdfFile) {
      const saved = saveUploadedFile(pdfFile, 'pdf', next.name);
      savedFiles.push(saved.fullPath);
      next.pdfFileName = saved.storedName;
      next.pdfOriginalName = saved.originalName;
      next.uploadedBy = user.id;
      next.uploadedAt = actionTime;
      uploadLogs.push(saved);
    }

    if (excelFile) {
      const saved = saveUploadedFile(excelFile, 'excel', next.name);
      savedFiles.push(saved.fullPath);
      next.excelFileName = saved.storedName;
      next.excelOriginalName = saved.originalName;
      next.uploadedBy = user.id;
      next.uploadedAt = actionTime;
      uploadLogs.push(saved);
    }

    db.exec('BEGIN');
    if (reportId) {
      db.prepare(`
        UPDATE reports
        SET name = ?, template_type = ?, category_id = ?, remarks = ?, word_file_name = ?, word_original_name = ?,
            pdf_file_name = ?, pdf_original_name = ?, excel_file_name = ?, excel_original_name = ?,
            uploaded_by = ?, uploaded_at = ?, updated_at = ?
        WHERE id = ?
      `).run(
        next.name,
        next.templateType,
        next.categoryId,
        next.remarks,
        next.wordFileName,
        next.wordOriginalName,
        next.pdfFileName,
        next.pdfOriginalName,
        next.excelFileName,
        next.excelOriginalName,
        next.uploadedBy,
        next.uploadedAt,
        actionTime,
        reportId
      );
    } else {
      const result = db.prepare(`
        INSERT INTO reports (
          name, template_type, category_id, remarks, word_file_name, word_original_name,
          pdf_file_name, pdf_original_name, excel_file_name, excel_original_name,
          uploaded_by, uploaded_at, created_at, updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        next.name,
        next.templateType,
        next.categoryId,
        next.remarks,
        next.wordFileName,
        next.wordOriginalName,
        next.pdfFileName,
        next.pdfOriginalName,
        next.excelFileName,
        next.excelOriginalName,
        user.id,
        actionTime,
        actionTime,
        actionTime
      );
      next.id = Number(result.lastInsertRowid);
    }

    const insertLog = db.prepare(`
      INSERT INTO upload_records (
        report_id, file_type, stored_name, original_name, action, uploaded_by, uploaded_at, notes
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    for (const item of uploadLogs) {
      insertLog.run(next.id, item.fileType, item.storedName, item.originalName, action, user.id, actionTime, '');
      insertReportVersion(next.id, item.fileType, item.storedName, item.originalName, action, user.id, actionTime, '');
    }

    logOperation(user, action === 'create' ? '新增模板' : '替换模板', 'report', next.id, next.name, uploadLogs.map((item) => `${fileTypeNameForStoredFile(item.fileType)}：${item.originalName}`).join('；'));

    db.exec('COMMIT');
    sendJson(res, 200, { report: getReport(next.id) });
  } catch (error) {
    try {
      db.exec('ROLLBACK');
    } catch (_) {
      // Ignore rollback errors when no transaction was opened.
    }
    for (const file of savedFiles) {
      try {
        fs.unlinkSync(file);
      } catch (_) {
        // Best effort cleanup.
      }
    }
    throw error;
  }
}

async function handleReportPdfUpload(req, res, reportId, user) {
  const buffer = await readRequestBody(req, MAX_UPLOAD_BYTES);
  const form = parseMultipart(req, buffer);
  const pdfFile = form.files.pdfFile;
  const report = db.prepare('SELECT * FROM reports WHERE id = ? AND active = 1').get(reportId);
  if (!report) throw publicError(404, '没有找到这条资料');
  if (!pdfFile) throw publicError(400, '请选择要上传的 PDF 文件');

  const uploadedAt = now();
  let saved = null;
  try {
    saved = saveUploadedFile(pdfFile, 'pdf', report.name);
    db.exec('BEGIN;');
    db.prepare(`
      UPDATE reports
      SET pdf_file_name = ?, pdf_original_name = ?, uploaded_by = ?, uploaded_at = ?, updated_at = ?
      WHERE id = ?
    `).run(saved.storedName, saved.originalName, user.id, uploadedAt, uploadedAt, reportId);
    db.prepare(`
      INSERT INTO upload_records (report_id, file_type, stored_name, original_name, action, uploaded_by, uploaded_at, notes)
      VALUES (?, 'pdf', ?, ?, 'replace', ?, ?, ?)
    `).run(reportId, saved.storedName, saved.originalName, user.id, uploadedAt, '列表内上传 PDF');
    insertReportVersion(reportId, 'pdf', saved.storedName, saved.originalName, 'replace', user.id, uploadedAt, '列表内上传 PDF');
    logOperation(user, '上传 PDF', 'report', reportId, report.name, saved.originalName);
    db.exec('COMMIT;');
    sendJson(res, 200, { report: getReport(reportId) });
  } catch (error) {
    try { db.exec('ROLLBACK;'); } catch (_) {}
    if (saved?.fullPath) {
      try { fs.unlinkSync(saved.fullPath); } catch (_) {}
    }
    throw error;
  }
}

async function handleReportPdfAutoMatch(req, res, user) {
  const buffer = await readRequestBody(req, MAX_UPLOAD_BYTES);
  const form = parseMultipart(req, buffer);
  const pdfFile = form.files.pdfFile;
  const categoryId = nullableInt(form.fields.categoryId);

  if (!categoryId) throw publicError(400, '请先打开标准规范下载分类后再上传 PDF');
  if (!pdfFile) throw publicError(400, '请选择要上传的 PDF 文件');

  const category = db.prepare("SELECT * FROM categories WHERE id = ? AND template_type = 'system' AND name = '标准规范下载'").get(categoryId);
  if (!category) throw publicError(400, '只能在管理体系的标准规范下载栏目上传 PDF');

  const reportName = cleanText(path.basename(pdfFile.filename, path.extname(pdfFile.filename))) || '未命名标准规范';

  const uploadedAt = now();
  let saved = null;
  try {
    saved = saveUploadedFile(pdfFile, 'pdf', reportName);
    db.exec('BEGIN;');
    db.prepare(`
      INSERT INTO reports (
        name, template_type, category_id, remarks, pdf_file_name, pdf_original_name,
        uploaded_by, uploaded_at, created_at, updated_at
      )
      VALUES (?, 'system', ?, '', ?, ?, ?, ?, ?, ?)
    `).run(reportName, categoryId, saved.storedName, saved.originalName, user.id, uploadedAt, uploadedAt, uploadedAt);
    const reportId = Number(db.prepare('SELECT last_insert_rowid() AS id').get().id);
    db.prepare(`
      INSERT INTO upload_records (report_id, file_type, stored_name, original_name, action, uploaded_by, uploaded_at, notes)
      VALUES (?, 'pdf', ?, ?, 'replace', ?, ?, ?)
    `).run(reportId, saved.storedName, saved.originalName, user.id, uploadedAt, '标准规范表头上传 PDF');
    insertReportVersion(reportId, 'pdf', saved.storedName, saved.originalName, 'create', user.id, uploadedAt, '标准规范表头上传 PDF');
    logOperation(user, '上传标准规范 PDF', 'report', reportId, reportName, saved.originalName);
    db.exec('COMMIT;');
    sendJson(res, 200, { report: getReport(reportId) });
  } catch (error) {
    try { db.exec('ROLLBACK;'); } catch (_) {}
    if (saved?.fullPath) {
      try { fs.unlinkSync(saved.fullPath); } catch (_) {}
    }
    throw error;
  }
}

async function handleSoftwareUpload(req, res, user) {
  const buffer = await readRequestBody(req, MAX_UPLOAD_BYTES);
  const form = parseMultipart(req, buffer);
  const file = form.files.softwareFile;
  const categoryId = nullableInt(form.fields.categoryId);
  if (!categoryId) throw publicError(400, '请先打开软件下载分类');
  if (!file) throw publicError(400, '请选择要上传的软件文件');

  const category = db.prepare("SELECT * FROM categories WHERE id = ? AND template_type = 'auxiliary' AND name = '软件下载'").get(categoryId);
  if (!category) throw publicError(400, '只能在辅助检测的软件下载栏目上传');

  const originalName = path.basename(file.filename);
  const softwareName = cleanText(path.basename(originalName, path.extname(originalName))) || '未命名软件';
  let saved = null;
  const uploadedAt = now();
  try {
    saved = saveUploadedFile(file, 'software', softwareName);
    db.exec('BEGIN;');
    const result = db.prepare(`
      INSERT INTO reports (name, template_type, category_id, remarks, software_file_name, software_original_name,
        uploaded_by, uploaded_at, created_at, updated_at)
      VALUES (?, 'auxiliary', ?, '', ?, ?, ?, ?, ?, ?)
    `).run(softwareName, categoryId, saved.storedName, saved.originalName, user.id, uploadedAt, uploadedAt, uploadedAt);
    const reportId = Number(result.lastInsertRowid);
    logOperation(user, '上传软件下载', 'report', reportId, softwareName, saved.originalName);
    db.exec('COMMIT;');
    sendJson(res, 200, { report: getReport(reportId) });
  } catch (error) {
    try { db.exec('ROLLBACK;'); } catch (_) {}
    if (saved?.fullPath) { try { fs.unlinkSync(saved.fullPath); } catch (_) {} }
    throw error;
  }
}

async function handleBulkReportImport(req, res, user) {
  const buffer = await readRequestBody(req, MAX_UPLOAD_BYTES);
  const form = parseMultipart(req, buffer);
  const templateType = normalizeTemplateType(form.fields.templateType);
  const categoryId = nullableInt(form.fields.categoryId);
  const remarks = cleanText(form.fields.remarks);
  const actionTime = now();
  const files = filesFromField(form.files.bulkFiles);

  if (!categoryId) throw publicError(400, '请选择分类');
  validateCategoryForTemplate(categoryId, templateType);
  if (!files.length) throw publicError(400, '请选择要批量导入的文件');

  const groups = new Map();
  for (const file of files) {
    const fileType = detectUploadFileType(file.filename);
    const ext = path.extname(file.filename || '');
    const baseName = cleanText(path.basename(file.filename || '未命名', ext));
    const key = baseName || '未命名';
    if (!groups.has(key)) groups.set(key, { name: key, files: {} });
    const group = groups.get(key);
    if (group.files[fileType]) {
      const duplicateKey = `${key}-${fileTypeNameForStoredFile(fileType)}`;
      groups.set(duplicateKey, { name: duplicateKey, files: { [fileType]: file } });
    } else {
      group.files[fileType] = file;
    }
  }

  const savedFiles = [];
  const createdReports = [];

  try {
    db.exec('BEGIN');
    for (const group of groups.values()) {
      const next = {
        name: group.name,
        wordFileName: null,
        wordOriginalName: null,
        pdfFileName: null,
        pdfOriginalName: null,
        excelFileName: null,
        excelOriginalName: null,
        uploadLogs: []
      };

      for (const [fileType, file] of Object.entries(group.files)) {
        const saved = saveUploadedFile(file, fileType, next.name);
        savedFiles.push(saved.fullPath);
        next.uploadLogs.push(saved);
        if (fileType === 'word') {
          next.wordFileName = saved.storedName;
          next.wordOriginalName = saved.originalName;
        } else if (fileType === 'pdf') {
          next.pdfFileName = saved.storedName;
          next.pdfOriginalName = saved.originalName;
        } else if (fileType === 'excel') {
          next.excelFileName = saved.storedName;
          next.excelOriginalName = saved.originalName;
        }
      }

      const result = db.prepare(`
        INSERT INTO reports (
          name, template_type, category_id, remarks, word_file_name, word_original_name,
          pdf_file_name, pdf_original_name, excel_file_name, excel_original_name,
          uploaded_by, uploaded_at, created_at, updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        next.name,
        templateType,
        categoryId,
        remarks,
        next.wordFileName,
        next.wordOriginalName,
        next.pdfFileName,
        next.pdfOriginalName,
        next.excelFileName,
        next.excelOriginalName,
        user.id,
        actionTime,
        actionTime,
        actionTime
      );

      const reportId = Number(result.lastInsertRowid);
      const insertLog = db.prepare(`
        INSERT INTO upload_records (
          report_id, file_type, stored_name, original_name, action, uploaded_by, uploaded_at, notes
        )
        VALUES (?, ?, ?, ?, 'bulk-create', ?, ?, ?)
      `);
      for (const item of next.uploadLogs) {
        insertLog.run(reportId, item.fileType, item.storedName, item.originalName, user.id, actionTime, '批量导入');
        insertReportVersion(reportId, item.fileType, item.storedName, item.originalName, 'bulk-create', user.id, actionTime, '批量导入');
      }
      createdReports.push(reportId);
    }

    logOperation(user, '批量导入模板', 'report', null, templateTypeLabel(templateType), `新增 ${createdReports.length} 份模板`);
    db.exec('COMMIT');
    sendJson(res, 200, { count: createdReports.length });
  } catch (error) {
    try {
      db.exec('ROLLBACK');
    } catch (_) {
      // Ignore rollback errors when no transaction was opened.
    }
    for (const file of savedFiles) {
      try {
        fs.unlinkSync(file);
      } catch (_) {
        // Best effort cleanup.
      }
    }
    throw error;
  }
}

function updateReportMeta(id, body, user) {
  const existing = db.prepare('SELECT * FROM reports WHERE id = ? AND active = 1').get(id);
  if (!existing) throw publicError(404, '没有找到这个报告');

  const name = cleanText(body.name) || existing.name;
  const templateType = normalizeTemplateType(body.templateType || existing.template_type);
  const categoryId = nullableInt(body.categoryId) || existing.category_id;
  validateCategoryForTemplate(categoryId, templateType);
  const remarks = body.remarks === undefined ? existing.remarks : cleanText(body.remarks);

  db.prepare(`
    UPDATE reports
    SET name = ?, template_type = ?, category_id = ?, remarks = ?, updated_at = ?
    WHERE id = ?
  `).run(name, templateType, categoryId, remarks, now(), id);
  logOperation(user, '修改模板信息', 'report', id, name, `原名称：${existing.name}`);
}

function updateReportStatus(id, body, user) {
  const existing = db.prepare(`
    SELECT r.*, c.name AS category_name,
      up.display_name AS uploaded_by_name,
      down.display_name AS last_download_by_name
    FROM reports r
    LEFT JOIN categories c ON c.id = r.category_id
    LEFT JOIN users up ON up.id = r.uploaded_by
    LEFT JOIN users down ON down.id = r.last_download_by
    WHERE r.id = ?
  `).get(id);
  if (!existing) throw publicError(404, '没有找到这个模板');

  const active = body.active === true || body.active === 1 || body.active === '1' ? 1 : 0;
  db.prepare('UPDATE reports SET active = ?, updated_at = ? WHERE id = ?').run(active, now(), id);
  logOperation(user, active ? '恢复模板' : '停用模板', 'report', id, existing.name, active ? '已恢复显示' : '已从普通列表隐藏，文件未删除');

  return shapeReport({ ...existing, active });
}

function insertReportVersion(reportId, fileType, storedName, originalName, action, uploadedBy, uploadedAt, notes = '') {
  const maxVersion = db.prepare(`
    SELECT COALESCE(MAX(version_no), 0) AS maxVersion
    FROM report_versions
    WHERE report_id = ? AND file_type = ?
  `).get(reportId, fileType).maxVersion;

  db.prepare(`
    INSERT INTO report_versions (
      report_id, version_no, file_type, stored_name, original_name, action, uploaded_by, uploaded_at, notes
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(reportId, maxVersion + 1, fileType, storedName, originalName, action, uploadedBy, uploadedAt, notes);
}

function listReportVersions(reportId, user = null) {
  getReport(reportId, user);
  return db.prepare(`
    SELECT v.id, v.version_no AS versionNo, v.file_type AS fileType, v.stored_name AS storedName,
      v.original_name AS originalName, v.action, v.uploaded_at AS uploadedAt, v.notes,
      u.display_name AS uploadedByName
    FROM report_versions v
    LEFT JOIN users u ON u.id = v.uploaded_by
    WHERE v.report_id = ?
    ORDER BY v.file_type, v.version_no DESC, v.id DESC
  `).all(reportId);
}

function restoreReportVersion(reportId, versionId, user) {
  const report = db.prepare('SELECT * FROM reports WHERE id = ? AND active = 1').get(reportId);
  if (!report) throw publicError(404, '没有找到这个模板');

  const version = db.prepare('SELECT * FROM report_versions WHERE id = ? AND report_id = ?').get(versionId, reportId);
  if (!version) throw publicError(404, '没有找到这个版本');

  const filePath = path.join(UPLOAD_DIR, version.stored_name);
  if (!fs.existsSync(filePath)) {
    throw publicError(404, '这个版本的文件不在电脑里，不能恢复');
  }

  const columns = {
    word: ['word_file_name', 'word_original_name'],
    pdf: ['pdf_file_name', 'pdf_original_name'],
    excel: ['excel_file_name', 'excel_original_name']
  };
  const pair = columns[version.file_type];
  if (!pair) throw publicError(400, '这个版本类型不正确');

  const restoredAt = now();
  db.exec('BEGIN;');
  try {
    db.prepare(`
      UPDATE reports
      SET ${pair[0]} = ?, ${pair[1]} = ?, uploaded_by = ?, uploaded_at = ?, updated_at = ?
      WHERE id = ?
    `).run(version.stored_name, version.original_name, user.id, restoredAt, restoredAt, reportId);

    db.prepare(`
      INSERT INTO upload_records (report_id, file_type, stored_name, original_name, action, uploaded_by, uploaded_at, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(reportId, version.file_type, version.stored_name, version.original_name, 'restore', user.id, restoredAt, `恢复第 ${version.version_no} 版`);

    insertReportVersion(reportId, version.file_type, version.stored_name, version.original_name, 'restore', user.id, restoredAt, `由第 ${version.version_no} 版恢复`);
    logOperation(user, '恢复历史版本', 'report', reportId, report.name, `${fileTypeNameForStoredFile(version.file_type)} 第 ${version.version_no} 版：${version.original_name}`);
    db.exec('COMMIT;');
  } catch (error) {
    try {
      db.exec('ROLLBACK;');
    } catch (_) {
      // Ignore rollback errors.
    }
    throw error;
  }

  return getReport(reportId);
}

function getReportLogs(reportId, user = null) {
  getReport(reportId, user);
  const uploads = db.prepare(`
    SELECT u.file_type AS fileType, u.original_name AS originalName, u.action,
      u.uploaded_at AS uploadedAt, users.display_name AS uploadedByName
    FROM upload_records u
    LEFT JOIN users ON users.id = u.uploaded_by
    WHERE u.report_id = ?
    ORDER BY u.uploaded_at DESC, u.id DESC
  `).all(reportId);

  const downloads = db.prepare(`
    SELECT d.file_type AS fileType, d.downloaded_at AS downloadedAt,
      users.display_name AS downloadedByName
    FROM download_records d
    LEFT JOIN users ON users.id = d.downloaded_by
    WHERE d.report_id = ?
    ORDER BY d.downloaded_at DESC, d.id DESC
    LIMIT 50
  `).all(reportId);

  return { uploads, downloads };
}

async function handleDownload(req, res, pathname) {
  const user = requireUser(req, res);
  if (!user) return;

  const match = pathname.match(/^\/download\/(\d+)\/(word|pdf|excel|software)$/);
  if (!match) {
    sendJson(res, 404, { message: '没有找到下载文件' });
    return;
  }

  const reportId = Number(match[1]);
  const fileType = match[2];
  const row = db.prepare('SELECT * FROM reports WHERE id = ? AND active = 1').get(reportId);
  if (!row) {
    sendJson(res, 404, { message: '没有找到这个报告' });
    return;
  }
  if (!canSeeTemplateType(user, row.template_type)) {
    sendJson(res, 403, { message: '你没有权限下载这个模板' });
    return;
  }

  const fileColumns = {
    word: ['word_file_name', 'word_original_name'],
    pdf: ['pdf_file_name', 'pdf_original_name'],
    excel: ['excel_file_name', 'excel_original_name'],
    software: ['software_file_name', 'software_original_name']
  };
  const [storedColumn, originalColumn] = fileColumns[fileType];
  const storedName = row[storedColumn];
  const originalName = row[originalColumn];
  if (!storedName) {
    sendJson(res, 404, { message: '这个报告没有上传对应文件' });
    return;
  }

  const filePath = path.join(UPLOAD_DIR, storedName);
  if (!fs.existsSync(filePath)) {
    sendJson(res, 404, { message: '文件不在电脑里，请联系管理员重新上传' });
    return;
  }

  const downloadedAt = now();
  db.prepare('UPDATE reports SET last_download_by = ?, last_download_at = ?, updated_at = ? WHERE id = ?')
    .run(user.id, downloadedAt, downloadedAt, reportId);
  if (fileType !== 'software') {
    db.prepare('INSERT INTO download_records (report_id, file_type, downloaded_by, downloaded_at) VALUES (?, ?, ?, ?)')
      .run(reportId, fileType, user.id, downloadedAt);
  }
  logOperation(user, '下载模板', 'report', reportId, row.name, `${fileTypeNameForStoredFile(fileType)}：${originalName || storedName}`);

  res.writeHead(200, {
    'Content-Type': fileType === 'software' ? mimeType(filePath) : contentTypeForFile(fileType),
    'Content-Length': fs.statSync(filePath).size,
    'Content-Disposition': contentDisposition(originalName || storedName)
  });
  fs.createReadStream(filePath).pipe(res);
}

async function handlePreview(req, res, pathname) {
  const user = requireUser(req, res);
  if (!user) return;

  const match = pathname.match(/^\/preview\/(\d+)\/pdf$/);
  if (!match) {
    sendJson(res, 404, { message: '暂时只支持 PDF 预览' });
    return;
  }

  const reportId = Number(match[1]);
  const row = db.prepare('SELECT * FROM reports WHERE id = ? AND active = 1').get(reportId);
  if (!row) {
    sendJson(res, 404, { message: '没有找到这个报告' });
    return;
  }
  if (!canSeeTemplateType(user, row.template_type)) {
    sendJson(res, 403, { message: '你没有权限预览这个模板' });
    return;
  }

  if (!row.pdf_file_name) {
    sendJson(res, 404, { message: '这个报告没有 PDF，不能直接预览' });
    return;
  }

  const filePath = path.join(UPLOAD_DIR, row.pdf_file_name);
  if (!fs.existsSync(filePath)) {
    sendJson(res, 404, { message: 'PDF 文件不在电脑里，请联系管理员重新上传' });
    return;
  }

  res.writeHead(200, {
    'Content-Type': 'application/pdf',
    'Content-Length': fs.statSync(filePath).size,
    'Content-Disposition': inlineDisposition(row.pdf_original_name || row.pdf_file_name),
    'Cache-Control': 'no-cache'
  });
  fs.createReadStream(filePath).pipe(res);
}

async function handleVideoStream(req, res, pathname) {
  const user = requireUser(req, res);
  if (!user) return;
  if (!canSeeTemplateType(user, 'video')) {
    sendJson(res, 403, { message: '你没有权限观看检测视频' });
    return;
  }

  const match = pathname.match(/^\/videos\/(\d+)(?:\/download)?$/);
  if (!match) {
    sendJson(res, 404, { message: '没有找到这个视频' });
    return;
  }
  const isDownload = pathname.endsWith('/download');

  const video = db.prepare('SELECT * FROM training_videos WHERE id = ? AND active = 1').get(Number(match[1]));
  if (!video) {
    sendJson(res, 404, { message: '没有找到这个视频' });
    return;
  }

  const filePath = resolveVideoPath(video.file_name);
  if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
    sendJson(res, 404, { message: '视频文件不在电脑里，请联系管理员检查视频目录' });
    return;
  }

  const stat = fs.statSync(filePath);
  const range = req.headers.range;
  const contentType = videoMimeType(filePath);
  const originalName = path.basename(video.file_name);
  if (isDownload) {
    res.writeHead(200, {
      'Content-Type': contentType,
      'Content-Length': stat.size,
      'Content-Disposition': contentDisposition(originalName),
      'Cache-Control': 'no-cache'
    });
    fs.createReadStream(filePath, { highWaterMark: VIDEO_STREAM_CHUNK_BYTES }).pipe(res);
    return;
  }

  if (!range) {
    res.writeHead(200, {
      'Content-Type': contentType,
      'Content-Length': stat.size,
      'Accept-Ranges': 'bytes',
      'Content-Disposition': inlineDisposition(originalName),
      'Cache-Control': 'no-cache'
    });
    fs.createReadStream(filePath, { highWaterMark: VIDEO_STREAM_CHUNK_BYTES }).pipe(res);
    return;
  }

  const rangeMatch = String(range).match(/bytes=(\d*)-(\d*)/);
  if (!rangeMatch) {
    res.writeHead(416, { 'Content-Range': `bytes */${stat.size}` });
    res.end();
    return;
  }

  const start = rangeMatch[1] ? Number(rangeMatch[1]) : 0;
  const end = rangeMatch[2] ? Number(rangeMatch[2]) : stat.size - 1;
  if (!Number.isInteger(start) || !Number.isInteger(end) || start > end || end >= stat.size) {
    res.writeHead(416, { 'Content-Range': `bytes */${stat.size}` });
    res.end();
    return;
  }

  res.writeHead(206, {
    'Content-Type': contentType,
    'Content-Length': end - start + 1,
    'Content-Range': `bytes ${start}-${end}/${stat.size}`,
    'Accept-Ranges': 'bytes',
    'Cache-Control': 'no-cache'
  });
  fs.createReadStream(filePath, { start, end, highWaterMark: VIDEO_STREAM_CHUNK_BYTES }).pipe(res);
}

function listTrainingVideos() {
  return db.prepare(`
    SELECT v.*, u.display_name AS created_by_name
    FROM training_videos v
    LEFT JOIN users u ON u.id = v.created_by
    WHERE v.active = 1
  `).all()
    .map(publicTrainingVideo)
    .sort(compareTrainingVideos);
}

function compareTrainingVideos(a, b) {
  return String(a.category || '').localeCompare(String(b.category || ''), 'zh-CN', { numeric: true })
    || String(a.title || '').localeCompare(String(b.title || ''), 'zh-CN', { numeric: true })
    || String(a.fileName || '').localeCompare(String(b.fileName || ''), 'zh-CN', { numeric: true })
    || Number(a.id || 0) - Number(b.id || 0);
}

function createTrainingVideo(body, user) {
  const next = normalizeTrainingVideoInput(body);
  const timestamp = now();
  const result = db.prepare(`
    INSERT INTO training_videos (title, category, lecturer, file_name, remarks, active, created_by, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, 1, ?, ?, ?)
  `).run(next.title, next.category, next.lecturer, next.fileName, next.remarks, user.id, timestamp, timestamp);
  const video = getTrainingVideo(Number(result.lastInsertRowid));
  logOperation(user, '新增检测视频', 'training_video', video.id, video.title, video.fileName);
  return video;
}

function updateTrainingVideo(id, body, user) {
  const existing = db.prepare('SELECT * FROM training_videos WHERE id = ?').get(id);
  if (!existing) throw publicError(404, '没有找到这个视频');
  const next = normalizeTrainingVideoInput({ ...existing, ...body }, existing);
  const active = body.active === undefined ? existing.active : (body.active ? 1 : 0);
  db.prepare(`
    UPDATE training_videos
    SET title = ?, category = ?, lecturer = ?, file_name = ?, remarks = ?, active = ?, updated_at = ?
    WHERE id = ?
  `).run(next.title, next.category, next.lecturer, next.fileName, next.remarks, active, now(), id);
  const video = getTrainingVideo(id, true);
  logOperation(user, active ? '修改检测视频' : '停用检测视频', 'training_video', id, video.title, video.fileName);
  return video;
}

function getTrainingVideo(id, includeInactive = false) {
  const row = db.prepare(`
    SELECT v.*, u.display_name AS created_by_name
    FROM training_videos v
    LEFT JOIN users u ON u.id = v.created_by
    WHERE v.id = ? ${includeInactive ? '' : 'AND v.active = 1'}
  `).get(id);
  if (!row) throw publicError(404, '没有找到这个视频');
  return publicTrainingVideo(row);
}

function normalizeTrainingVideoInput(body, existing = null) {
  const title = cleanText(body.title || existing?.title);
  const category = cleanText(body.category || existing?.category || '检测培训');
  const lecturer = cleanText(body.lecturer || existing?.lecturer || '');
  const fileName = preferSmoothVideoFileName(normalizeVideoFileName(body.fileName || body.file_name || existing?.file_name));
  const remarks = cleanText(body.remarks || existing?.remarks || '');
  if (!title) throw publicError(400, '请填写课程名称');
  if (!fileName) throw publicError(400, '请填写视频文件名');
  const filePath = resolveVideoPath(fileName);
  if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
    throw publicError(400, `视频文件不存在，请先放到：${VIDEO_DIR}`);
  }
  return { title, category, lecturer, fileName, remarks };
}

function publicTrainingVideo(row) {
  return {
    id: row.id,
    title: row.title,
    category: row.category || '',
    lecturer: row.lecturer || '',
    fileName: row.file_name,
    remarks: row.remarks || '',
    active: Boolean(row.active),
    createdByName: row.created_by_name || '',
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function normalizeVideoFileName(value) {
  const raw = cleanText(value).replace(/\\/g, '/');
  if (!raw || raw.includes('\0') || path.isAbsolute(raw)) return '';
  const normalized = path.posix.normalize(raw);
  if (normalized === '.' || normalized.startsWith('../') || normalized === '..') return '';
  const ext = path.extname(normalized).toLowerCase();
  if (!['.mp4', '.webm', '.ogg', '.m4v', '.mov'].includes(ext)) {
    throw publicError(400, '视频格式建议使用 mp4，当前仅支持 mp4、webm、ogg、m4v、mov');
  }
  return normalized;
}

function preferSmoothVideoFileName(fileName) {
  if (!fileName) return '';
  const parts = fileName.split('/');
  const baseName = parts.pop();
  const folder = parts.join('/');
  if (!folder || folder.endsWith('-\u6d41\u7545\u7248') || folder.endsWith('-smooth')) return fileName;
  const smoothFileName = `${folder}-\u6d41\u7545\u7248/${baseName}`;
  try {
    if (fs.existsSync(resolveVideoPath(smoothFileName))) return smoothFileName;
  } catch (_) {
    // Keep the original path if the smooth candidate is not a valid video path.
  }
  return fileName;
}

function resolveVideoPath(fileName) {
  const normalized = normalizeVideoFileName(fileName);
  const filePath = path.normalize(path.join(VIDEO_DIR, normalized));
  const relative = path.relative(VIDEO_DIR, filePath);
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    throw publicError(400, '视频文件路径不正确');
  }
  return filePath;
}

function videoMimeType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return {
    '.mp4': 'video/mp4',
    '.m4v': 'video/mp4',
    '.webm': 'video/webm',
    '.ogg': 'video/ogg',
    '.mov': 'video/quicktime'
  }[ext] || 'application/octet-stream';
}

function createCategory(body, user) {
  const name = cleanText(body.name);
  const templateType = normalizeTemplateType(body.templateType);
  const parentId = nullableInt(body.parentId);
  if (!name) throw publicError(400, '请填写分类名称');
  if (parentId) {
    const parent = db.prepare('SELECT id, template_type FROM categories WHERE id = ?').get(parentId);
    if (!parent) throw publicError(400, '上级分类不存在');
    if (parent.template_type !== templateType) throw publicError(400, '上级分类必须属于同一种模板');
  }

  const maxOrder = db.prepare(`
    SELECT COALESCE(MAX(sort_order), 0) AS maxOrder
    FROM categories
    WHERE parent_id IS ? AND template_type = ?
  `).get(parentId, templateType).maxOrder;
  const timestamp = now();
  const result = db.prepare(`
    INSERT INTO categories (name, template_type, parent_id, sort_order, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(name, templateType, parentId, maxOrder + 1, timestamp, timestamp);
  const category = db.prepare('SELECT * FROM categories WHERE id = ?').get(Number(result.lastInsertRowid));
  logOperation(user, '新增分类', 'category', category.id, category.name, `模板类型：${templateType}`);
  return category;
}

function updateCategory(id, body, user) {
  const existing = db.prepare('SELECT * FROM categories WHERE id = ?').get(id);
  if (!existing) throw publicError(404, '没有找到这个分类');

  const name = cleanText(body.name) || existing.name;
  const templateType = normalizeTemplateType(body.templateType || existing.template_type);
  const parentId = nullableInt(body.parentId);
  if (parentId === id) throw publicError(400, '上级分类不能选自己');
  if (templateType !== existing.template_type && categoryHasContent(id)) {
    throw publicError(400, '这个分类下面已有模板或下级分类，不能改所属模板');
  }
  if (parentId) {
    const parent = db.prepare('SELECT id, template_type FROM categories WHERE id = ?').get(parentId);
    if (!parent) throw publicError(400, '上级分类不存在');
    if (parent.template_type !== templateType) throw publicError(400, '上级分类必须属于同一种模板');
  }

  db.prepare('UPDATE categories SET name = ?, template_type = ?, parent_id = ?, updated_at = ? WHERE id = ?')
    .run(name, templateType, parentId, now(), id);
  const category = db.prepare('SELECT * FROM categories WHERE id = ?').get(id);
  logOperation(user, '修改分类', 'category', id, category.name, `原名称：${existing.name}`);
  return category;
}

function deleteCategory(id, user) {
  const existing = db.prepare('SELECT * FROM categories WHERE id = ?').get(id);
  if (!existing) throw publicError(404, '没有找到这个分类');

  const childCount = db.prepare('SELECT COUNT(*) AS count FROM categories WHERE parent_id = ?').get(id).count;
  if (childCount > 0) throw publicError(400, '这个分类下面还有下级分类，不能删除');

  const reportCount = db.prepare('SELECT COUNT(*) AS count FROM reports WHERE category_id = ?').get(id).count;
  if (reportCount > 0) throw publicError(400, '这个分类下面已有模板，不能删除');
  if (existing.template_type === 'video' && existing.name === '检测视频') {
    const videoCount = db.prepare('SELECT COUNT(*) AS count FROM training_videos WHERE active = 1').get().count;
    if (videoCount > 0) throw publicError(400, '检测视频分类下面已有视频，不能删除');
  }

  db.prepare('DELETE FROM categories WHERE id = ?').run(id);
  logOperation(user, '删除分类', 'category', id, existing.name, `模板类型：${existing.template_type}`);
}

function categoryHasContent(id) {
  const category = db.prepare('SELECT template_type, name FROM categories WHERE id = ?').get(id);
  const childCount = db.prepare('SELECT COUNT(*) AS count FROM categories WHERE parent_id = ?').get(id).count;
  const reportCount = db.prepare('SELECT COUNT(*) AS count FROM reports WHERE category_id = ?').get(id).count;
  const videoCount = category?.template_type === 'video' && category.name === '检测视频'
    ? db.prepare('SELECT COUNT(*) AS count FROM training_videos WHERE active = 1').get().count
    : 0;
  return childCount > 0 || reportCount > 0 || videoCount > 0;
}

function validateCategoryForTemplate(categoryId, templateType) {
  if (!categoryId) return;
  const category = db.prepare('SELECT id, template_type FROM categories WHERE id = ?').get(categoryId);
  if (!category) throw publicError(400, '请选择正确的分类');
  if (category.template_type !== templateType) throw publicError(400, '请选择对应模板类型下的分类');
}

function listUsers() {
  return db.prepare(`
    SELECT id, username, display_name, role, scope, active, created_at, updated_at
    FROM users
    ORDER BY id
  `).all().map(publicUser);
}

function createUserFromBody(body, operator) {
  const username = String(body.username || '').trim();
  const displayName = cleanText(body.displayName) || username;
  const password = String(body.password || '');
  const role = normalizeUserRole(body.role);
  const scope = normalizeUserScope(body.scope);

  validateUsername(username);
  if (password.length < 6) throw publicError(400, '密码至少 6 位');

  try {
    createUser(username, password, displayName, role, scope);
  } catch (error) {
    if (String(error.message).includes('UNIQUE')) throw publicError(400, '这个登录账号已经存在');
    throw error;
  }
  const created = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
  if (operator) logOperation(operator, '新增用户', 'user', created.id, created.display_name, `账号：${created.username}，权限：${created.role}，可见范围：${created.scope || 'all'}`);
  return created;
}

function updateUser(id, body, currentSuperAdmin) {
  const existing = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
  if (!existing) throw publicError(404, '没有找到这个用户');

  const username = String(body.username || existing.username).trim();
  const displayName = cleanText(body.displayName) || existing.display_name;
  const role = normalizeUserRole(body.role || existing.role);
  const scope = normalizeUserScope(body.scope || existing.scope);
  const active = body.active === false || body.active === 0 || body.active === '0' ? 0 : 1;
  validateUsername(username);

  if (id === currentSuperAdmin.id && (!active || role !== 'superadmin')) {
    throw publicError(400, '不能把自己改成非超级管理员或停用');
  }

  if ((!active || role !== 'superadmin') && countActiveSuperAdminsExcept(id) === 0) {
    throw publicError(400, '系统里至少要保留一个可用超级管理员');
  }

  let salt = existing.salt;
  let passwordHash = existing.password_hash;
  if (body.password) {
    if (String(body.password).length < 6) throw publicError(400, '密码至少 6 位');
    salt = crypto.randomBytes(16).toString('hex');
    passwordHash = hashPassword(String(body.password), salt);
  }

  try {
    db.prepare(`
      UPDATE users
      SET username = ?, display_name = ?, role = ?, scope = ?, active = ?, salt = ?, password_hash = ?, updated_at = ?
      WHERE id = ?
    `).run(username, displayName, role, scope, active, salt, passwordHash, now(), id);
  } catch (error) {
    if (String(error.message).includes('UNIQUE')) throw publicError(400, '这个登录账号已经存在');
    throw error;
  }

  const updated = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
  logOperation(currentSuperAdmin, '修改用户', 'user', id, updated.display_name, `账号：${updated.username}，权限：${updated.role}，可见范围：${updated.scope || 'all'}，启用：${updated.active ? '是' : '否'}${body.password ? '，已改密码' : ''}`);
  return updated;
}

function countActiveSuperAdminsExcept(userId) {
  return db.prepare(`
    SELECT COUNT(*) AS count FROM users
    WHERE role = 'superadmin' AND active = 1 AND id <> ?
  `).get(userId).count;
}

function createUser(username, password, displayName, role, scope = 'all') {
  const salt = crypto.randomBytes(16).toString('hex');
  const passwordHash = hashPassword(password, salt);
  const timestamp = now();
  db.prepare(`
    INSERT INTO users (username, password_hash, salt, display_name, role, scope, active, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)
  `).run(username, passwordHash, salt, displayName, role, normalizeUserScope(scope), timestamp, timestamp);
}

function createBackup(user, prefix = '') {
  const stamp = `${prefix ? `${prefix}-` : ''}${formatFileTime(new Date())}`;
  const targetDir = uniqueBackupDir(stamp);
  fs.mkdirSync(targetDir, { recursive: true });
  db.exec('PRAGMA wal_checkpoint(FULL);');
  fs.copyFileSync(DB_PATH, path.join(targetDir, 'hengxintong.db'));

  for (const suffix of ['-wal', '-shm']) {
    const extraPath = DB_PATH + suffix;
    if (fs.existsSync(extraPath)) {
      fs.copyFileSync(extraPath, path.join(targetDir, `hengxintong.db${suffix}`));
    }
  }

  fs.cpSync(UPLOAD_DIR, path.join(targetDir, 'uploads'), { recursive: true });
  const fileCount = countFiles(targetDir);
  fs.writeFileSync(
    path.join(targetDir, '说明.txt'),
    `恒信通完整备份\n备份时间：${new Date().toLocaleString('zh-CN')}\n包含内容：数据库、上传文件夹 uploads\n文件数量：${fileCount}\n`,
    'utf8'
  );
  const createdAt = now();
  db.prepare('INSERT INTO backup_records (backup_path, file_count, created_by, created_at) VALUES (?, ?, ?, ?)')
    .run(targetDir, fileCount, user.id, createdAt);
  logOperation(user, '完整备份', 'backup', null, path.basename(targetDir), `备份位置：${targetDir}`);
  return { backupPath: targetDir, fileCount, createdAt };
}

function uniqueBackupDir(baseName) {
  let targetDir = path.join(BACKUP_DIR, baseName);
  let index = 2;
  while (fs.existsSync(targetDir)) {
    targetDir = path.join(BACKUP_DIR, `${baseName}-${index}`);
    index += 1;
  }
  return targetDir;
}

function listBackups() {
  const records = new Map();
  const dbRows = db.prepare(`
    SELECT b.id, b.backup_path AS backupPath, b.file_count AS fileCount,
      b.created_at AS createdAt, u.display_name AS createdByName
    FROM backup_records b
    LEFT JOIN users u ON u.id = b.created_by
    ORDER BY b.created_at DESC, b.id DESC
  `).all();

  for (const row of dbRows) {
    const info = backupInfoFromPath(row.backupPath);
    if (info) {
      records.set(info.name, {
        ...info,
        id: row.id,
        fileCount: row.fileCount || info.fileCount,
        createdAt: row.createdAt || info.createdAt,
        createdByName: row.createdByName || ''
      });
    }
  }

  if (fs.existsSync(BACKUP_DIR)) {
    for (const item of fs.readdirSync(BACKUP_DIR, { withFileTypes: true })) {
      if (!item.isDirectory()) continue;
      const info = backupInfoFromPath(path.join(BACKUP_DIR, item.name));
      if (info && !records.has(info.name)) records.set(info.name, info);
    }
  }

  return Array.from(records.values()).sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
}

function backupInfoFromPath(backupPath) {
  const resolved = path.resolve(backupPath);
  const backupRoot = path.resolve(BACKUP_DIR);
  if (resolved !== backupRoot && !resolved.startsWith(`${backupRoot}${path.sep}`)) return null;
  if (!fs.existsSync(resolved) || !fs.statSync(resolved).isDirectory()) return null;

  const dbFile = path.join(resolved, 'hengxintong.db');
  const uploadsDir = path.join(resolved, 'uploads');
  if (!fs.existsSync(dbFile) || !fs.existsSync(uploadsDir)) return null;

  const stat = fs.statSync(resolved);
  return {
    name: path.basename(resolved),
    backupPath: resolved,
    fileCount: countFiles(resolved),
    createdAt: stat.mtime.toISOString(),
    createdByName: ''
  };
}

function scheduleBackupRestore(backupName, user) {
  const safeName = path.basename(String(backupName || ''));
  if (!safeName || safeName !== String(backupName || '')) {
    throw publicError(400, '备份名称不正确');
  }

  const backupPath = path.join(BACKUP_DIR, safeName);
  const info = backupInfoFromPath(backupPath);
  if (!info) throw publicError(404, '没有找到可恢复的备份，或备份不完整');

  const beforeRestore = createBackup(user, 'restore-before');
  const jobPath = path.join(BACKUP_DIR, 'restore-job.json');
  const job = {
    rootDir: ROOT_DIR,
    dataDir: DATA_DIR,
    uploadDir: UPLOAD_DIR,
    dbPath: DB_PATH,
    backupPath: info.backupPath,
    serverPid: process.pid,
    port: PORT,
    createdAt: now()
  };
  fs.writeFileSync(jobPath, JSON.stringify(job, null, 2), 'utf8');
  logOperation(user, '恢复备份', 'backup', null, info.name, `恢复前自动备份：${beforeRestore.backupPath}`);

  const child = spawn(process.execPath, ['restore-runner.js', jobPath], {
    cwd: ROOT_DIR,
    detached: true,
    stdio: 'ignore',
    windowsHide: true
  });
  child.unref();
  return { backupName: info.name, beforeRestorePath: beforeRestore.backupPath };
}

function countFiles(dir) {
  let count = 0;
  if (!fs.existsSync(dir)) return count;
  for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, item.name);
    if (item.isDirectory()) count += countFiles(fullPath);
    else count += 1;
  }
  return count;
}

function logOperation(user, action, targetType, targetId, targetName, detail = '') {
  db.prepare(`
    INSERT INTO operation_logs (user_id, action, target_type, target_id, target_name, detail, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(user?.id || null, action, targetType, targetId || null, cleanText(targetName || ''), cleanText(detail || ''), now());
}

function listOperationLogs() {
  return db.prepare(`
    SELECT l.id, l.action, l.target_type AS targetType, l.target_id AS targetId,
      l.target_name AS targetName, l.detail, l.created_at AS createdAt,
      u.display_name AS userName
    FROM operation_logs l
    LEFT JOIN users u ON u.id = l.user_id
    ORDER BY l.created_at DESC, l.id DESC
    LIMIT 100
  `).all();
}

function saveUploadedFile(file, expectedType, reportName) {
  if (!file || !file.filename || !file.data || file.data.length === 0) {
    throw publicError(400, '上传的文件是空的');
  }

  const originalName = path.basename(file.filename);
  const ext = path.extname(originalName).toLowerCase();
  if (expectedType === 'word' && !['.doc', '.docx'].includes(ext)) {
    throw publicError(400, 'Word 文件只支持 .doc 或 .docx');
  }
  if (expectedType === 'pdf' && ext !== '.pdf') {
    throw publicError(400, 'PDF 文件只支持 .pdf');
  }
  if (expectedType === 'excel' && !['.xls', '.xlsx'].includes(ext)) {
    throw publicError(400, 'Excel 文件只支持 .xls 或 .xlsx');
  }

  const baseName = sanitizeFileBase(reportName || path.basename(originalName, ext));
  const storedName = uniqueUploadName(`${baseName}-${fileTypeNameForStoredFile(expectedType)}`, ext);
  const fullPath = path.join(UPLOAD_DIR, storedName);
  fs.writeFileSync(fullPath, file.data);
  return { fileType: expectedType, storedName, originalName, fullPath };
}

function filesFromField(value) {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function detectUploadFileType(filename) {
  const ext = path.extname(String(filename || '')).toLowerCase();
  if (['.doc', '.docx'].includes(ext)) return 'word';
  if (ext === '.pdf') return 'pdf';
  if (['.xls', '.xlsx'].includes(ext)) return 'excel';
  throw publicError(400, `不支持这个文件：${filename || '未命名文件'}，只能导入 Word、PDF 或 Excel`);
}

function fileTypeNameForStoredFile(fileType) {
  if (fileType === 'word') return 'Word';
  if (fileType === 'pdf') return 'PDF';
  if (fileType === 'excel') return 'Excel';
  return '文件';
}

function sanitizeFileBase(value) {
  const cleaned = String(value || '未命名')
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[. ]+$/g, '');
  const safe = cleaned || '未命名';
  return safe.slice(0, 80);
}

function uniqueUploadName(baseName, ext) {
  let storedName = `${baseName}${ext}`;
  let index = 2;
  while (fs.existsSync(path.join(UPLOAD_DIR, storedName))) {
    storedName = `${baseName}-${index}${ext}`;
    index += 1;
  }
  return storedName;
}

function parseMultipart(req, buffer) {
  const contentType = req.headers['content-type'] || '';
  const match = contentType.match(/boundary=(?:"([^"]+)"|([^;]+))/i);
  if (!match) throw publicError(400, '上传格式不正确');

  const boundary = Buffer.from(`--${match[1] || match[2]}`);
  const fields = {};
  const files = {};
  let position = buffer.indexOf(boundary);

  while (position !== -1) {
    position += boundary.length;
    if (buffer.slice(position, position + 2).toString() === '--') break;
    if (buffer.slice(position, position + 2).toString() === '\r\n') position += 2;

    const headerEnd = buffer.indexOf('\r\n\r\n', position, 'utf8');
    if (headerEnd === -1) break;

    const headerText = buffer.slice(position, headerEnd).toString('utf8');
    const dataStart = headerEnd + 4;
    const nextBoundary = buffer.indexOf(Buffer.concat([Buffer.from('\r\n'), boundary]), dataStart);
    if (nextBoundary === -1) break;

    const data = buffer.slice(dataStart, nextBoundary);
    const headers = parsePartHeaders(headerText);
    const disposition = headers['content-disposition'] || '';
    const nameMatch = disposition.match(/name="([^"]+)"/i);
    const fileMatch = disposition.match(/filename="([^"]*)"/i);

    if (nameMatch) {
      const fieldName = nameMatch[1];
      if (fileMatch && fileMatch[1]) {
        const fileItem = {
          filename: fileMatch[1],
          contentType: headers['content-type'] || 'application/octet-stream',
          data
        };
        if (files[fieldName]) {
          if (Array.isArray(files[fieldName])) files[fieldName].push(fileItem);
          else files[fieldName] = [files[fieldName], fileItem];
        } else {
          files[fieldName] = fileItem;
        }
      } else {
        fields[fieldName] = data.toString('utf8');
      }
    }

    position = nextBoundary + 2;
  }

  return { fields, files };
}

function parsePartHeaders(headerText) {
  const headers = {};
  for (const line of headerText.split('\r\n')) {
    const index = line.indexOf(':');
    if (index === -1) continue;
    headers[line.slice(0, index).trim().toLowerCase()] = line.slice(index + 1).trim();
  }
  return headers;
}

function serveStaticFile(res, pathname) {
  const safePathname = pathname === '/' ? '/index.html' : pathname;
  const filePath = path.normalize(path.join(PUBLIC_DIR, safePathname));
  const relative = path.relative(PUBLIC_DIR, filePath);

  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
    res.writeHead(404);
    res.end('Not found');
    return;
  }

  serveAbsoluteFile(res, filePath);
}

function serveAbsoluteFile(res, filePath) {
  if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
    res.writeHead(404);
    res.end('Not found');
    return;
  }
  res.writeHead(200, {
    'Content-Type': mimeType(filePath),
    'Cache-Control': 'no-cache'
  });
  fs.createReadStream(filePath).pipe(res);
}

function mimeType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.xls': 'application/vnd.ms-excel',
    '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.svg': 'image/svg+xml'
  }[ext] || 'application/octet-stream';
}

function contentTypeForFile(fileType) {
  if (fileType === 'pdf') return 'application/pdf';
  if (fileType === 'excel') return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
}

function readJson(req) {
  return readRequestBody(req, 1024 * 1024).then((buffer) => {
    if (!buffer.length) return {};
    try {
      return JSON.parse(buffer.toString('utf8'));
    } catch (_) {
      throw publicError(400, '提交内容格式不正确');
    }
  });
}

function readRequestBody(req, limit) {
  return new Promise((resolve, reject) => {
    const declaredLength = Number(req.headers['content-length'] || 0);
    if (Number.isFinite(declaredLength) && declaredLength > limit) {
      req.resume();
      reject(publicError(413, `文件太大，单次上传最多 ${Math.floor(limit / 1024 / 1024)}MB`));
      return;
    }

    const chunks = [];
    let total = 0;
    let exceeded = false;

    req.on('data', (chunk) => {
      if (exceeded) return;
      total += chunk.length;
      if (total > limit) {
        exceeded = true;
        reject(publicError(413, `文件太大，单次上传最多 ${Math.floor(limit / 1024 / 1024)}MB`));
        return;
      }
      chunks.push(chunk);
    });

    req.on('end', () => {
      if (!exceeded) resolve(Buffer.concat(chunks));
    });
    req.on('error', reject);
  });
}

function sendJson(res, status, data) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-cache'
  });
  res.end(JSON.stringify(data));
}

function parseCookies(req) {
  const cookies = {};
  const header = req.headers.cookie || '';
  for (const item of header.split(';')) {
    const index = item.indexOf('=');
    if (index === -1) continue;
    cookies[item.slice(0, index).trim()] = decodeURIComponent(item.slice(index + 1).trim());
  }
  return cookies;
}

function makeSessionCookie(sessionId) {
  return `hxt_sid=${encodeURIComponent(sessionId)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_MS / 1000}`;
}

function hashPassword(password, salt) {
  return crypto.pbkdf2Sync(password, salt, 100000, 32, 'sha256').toString('hex');
}

function verifyPassword(password, salt, expectedHash) {
  const actualHash = hashPassword(password, salt);
  return crypto.timingSafeEqual(Buffer.from(actualHash, 'hex'), Buffer.from(expectedHash, 'hex'));
}

function publicUser(user) {
  return {
    id: user.id,
    username: user.username,
    displayName: user.display_name,
    role: user.role,
    scope: normalizeUserScope(user.scope),
    active: Boolean(user.active),
    createdAt: user.created_at,
    updatedAt: user.updated_at
  };
}

function nullableInt(value) {
  if (value === undefined || value === null || value === '' || value === 'null') return null;
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : null;
}

function normalizeTemplateType(value) {
  const type = String(value || 'report').trim();
  if (type === 'task') return 'entrust';
  return TEMPLATE_TYPES.has(type) ? type : 'report';
}

function normalizeUserRole(value) {
  const role = String(value || 'user').trim();
  return USER_ROLES.has(role) ? role : 'user';
}

function normalizeUserScope(value) {
  const scope = String(value || 'all').trim();
  return USER_SCOPES.has(scope) ? scope : 'all';
}

function isAdminRole(role) {
  return role === 'admin' || role === 'superadmin';
}

function visibleTemplateTypes(user) {
  const allTypes = ['entrust', 'report', 'auxiliary', 'system', 'video', 'project', 'instrument', 'tool'];
  if (!user || isAdminRole(user.role)) return allTypes;
  const scope = normalizeUserScope(user.scope);
  return scope === 'all' ? allTypes : [scope];
}

function canSeeTemplateType(user, templateType) {
  return visibleTemplateTypes(user).includes(normalizeTemplateType(templateType));
}

function validateUsername(username) {
  if (!/^[\u4e00-\u9fa5A-Za-z0-9_.-]{2,30}$/.test(username)) {
    throw publicError(400, '登录账号只能用中文、字母、数字、点、横线或下划线，长度 2 到 30 位');
  }
}

function cleanText(value) {
  return String(value ?? '').trim();
}

function now() {
  return new Date().toISOString();
}

function formatFileTime(date) {
  const pad = (value) => String(value).padStart(2, '0');
  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
    '-',
    pad(date.getHours()),
    pad(date.getMinutes()),
    pad(date.getSeconds())
  ].join('');
}

function contentDisposition(filename) {
  const fallback = filename.replace(/[^\x20-\x7E]/g, '_').replace(/"/g, '') || 'download';
  const encoded = encodeURIComponent(filename).replace(/[()']/g, (char) =>
    `%${char.charCodeAt(0).toString(16).toUpperCase()}`
  );
  return `attachment; filename="${fallback}"; filename*=UTF-8''${encoded}`;
}

function inlineDisposition(filename) {
  const fallback = filename.replace(/[^\x20-\x7E]/g, '_').replace(/"/g, '') || 'preview.pdf';
  const encoded = encodeURIComponent(filename).replace(/[()']/g, (char) =>
    `%${char.charCodeAt(0).toString(16).toUpperCase()}`
  );
  return `inline; filename="${fallback}"; filename*=UTF-8''${encoded}`;
}

function publicError(statusCode, publicMessage) {
  const error = new Error(publicMessage);
  error.statusCode = statusCode;
  error.publicMessage = publicMessage;
  return error;
}
