'use strict';

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawn } = require('node:child_process');
const { DatabaseSync } = require('node:sqlite');

const ROOT_DIR = __dirname;
const DATA_DIR = path.join(ROOT_DIR, 'data');
const UPLOAD_DIR = path.join(ROOT_DIR, 'uploads');
const BACKUP_DIR = path.join(ROOT_DIR, 'backup');
const PUBLIC_DIR = path.join(ROOT_DIR, 'public');
const DB_PATH = path.join(DATA_DIR, 'hengxintong.db');
const HOST = '0.0.0.0';
const PORT = Number(process.env.PORT || 3000);
const MAX_UPLOAD_BYTES = 80 * 1024 * 1024;
const SESSION_MS = 8 * 60 * 60 * 1000;
const TEMPLATE_TYPES = new Set(['report', 'entrust', 'auxiliary', 'system']);
const USER_ROLES = new Set(['user', 'admin', 'superadmin']);
const USER_SCOPES = new Set(['all', 'report', 'entrust', 'auxiliary', 'system']);

for (const dir of [DATA_DIR, UPLOAD_DIR, BACKUP_DIR, PUBLIC_DIR]) {
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
  addColumnIfMissing('reports', 'template_type', "TEXT NOT NULL DEFAULT 'report'");
  addColumnIfMissing('categories', 'template_type', "TEXT NOT NULL DEFAULT 'report'");
  addColumnIfMissing('users', 'scope', "TEXT NOT NULL DEFAULT 'all'");
  mergeTaskTemplateTypes();
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

  if (req.method === 'GET' && pathname === '/api/dashboard') {
    sendJson(res, 200, getDashboardStats(user));
    return;
  }

  if (req.method === 'GET' && pathname === '/api/export/templates') {
    await handleTemplateExport(req, res, user);
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
  return db.prepare(`
    SELECT c.*,
      (SELECT COUNT(*) FROM reports r WHERE r.category_id = c.id AND r.active = 1 AND r.template_type = c.template_type) AS report_count
    FROM categories c
    WHERE c.template_type IN (${visibleTypes.map(() => '?').join(',')})
    ORDER BY c.template_type, COALESCE(c.parent_id, 0), c.sort_order, c.id
  `).all(...visibleTypes);
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
    active: Boolean(row.active),
    wordOriginalName: row.word_original_name || '',
    pdfOriginalName: row.pdf_original_name || '',
    excelOriginalName: row.excel_original_name || '',
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

  const match = pathname.match(/^\/download\/(\d+)\/(word|pdf|excel)$/);
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
    excel: ['excel_file_name', 'excel_original_name']
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
  db.prepare('INSERT INTO download_records (report_id, file_type, downloaded_by, downloaded_at) VALUES (?, ?, ?, ?)')
    .run(reportId, fileType, user.id, downloadedAt);
  logOperation(user, '下载模板', 'report', reportId, row.name, `${fileTypeNameForStoredFile(fileType)}：${originalName || storedName}`);

  res.writeHead(200, {
    'Content-Type': contentTypeForFile(fileType),
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

  db.prepare('DELETE FROM categories WHERE id = ?').run(id);
  logOperation(user, '删除分类', 'category', id, existing.name, `模板类型：${existing.template_type}`);
}

function categoryHasContent(id) {
  const childCount = db.prepare('SELECT COUNT(*) AS count FROM categories WHERE parent_id = ?').get(id).count;
  const reportCount = db.prepare('SELECT COUNT(*) AS count FROM reports WHERE category_id = ?').get(id).count;
  return childCount > 0 || reportCount > 0;
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
    const chunks = [];
    let total = 0;

    req.on('data', (chunk) => {
      total += chunk.length;
      if (total > limit) {
        reject(publicError(413, '文件太大，单次上传最多 80MB'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });

    req.on('end', () => resolve(Buffer.concat(chunks)));
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
  const allTypes = ['entrust', 'report', 'auxiliary', 'system'];
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
