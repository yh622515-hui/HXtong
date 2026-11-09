const TEMPLATE_TYPES = [
  { id: 'entrust', label: '委托单/任务单模板' },
  { id: 'report', label: '检测报告模板' },
  { id: 'auxiliary', label: '辅助检测' },
  { id: 'system', label: '管理体系' },
  { id: 'video', label: '检测视频' },
  { id: 'project', label: '阜南南阳大道' },
  { id: 'instrument', label: '仪器使用记录' },
  { id: 'tool', label: '常用工具' }
];

const ENTRUST_CLIENTS = [
  {
    name: '安徽省新路建设工程集团有限责任公司',
    project: '南阳大道（阜南段）修复养护工程许城路项目',
    code: 'A13'
  },
  {
    name: '安徽典筑建筑工程有限责任公司',
    project: '临泉县2025年农村公路(联网路)建设项目八标段（高塘镇）',
    code: 'A10'
  },
  {
    name: '阜阳路友公路养护有限责任公司',
    project: '临泉县2025年农村公路(联网路)建设项目三标段',
    code: 'A05'
  }
];

const ENTRUST_SAMPLES = [
  {
    name: '砂',
    spec: '(0-5)mm',
    quantity: '150kg',
    model: '/',
    origin: '河南罗山',
    category: '委托检测',
    usage: '路基',
    appearance: '浅黄色、潮湿、洁净、无杂质',
    params: '颗粒级配、堆积密度及空隙率、密度、含泥量及泥块含量',
    standard: 'JTG 3432-2024',
    judge: '设计文件',
    samplePrefix: 'XJL-',
    suffix: 'A03'
  },
  {
    name: '碎石',
    spec: '(5-31.5)mm',
    quantity: '150kg',
    model: '/',
    origin: '河南乐润',
    category: '委托检测',
    usage: '路基',
    appearance: '青灰色、干燥、无杂物',
    params: '颗粒级配、密度及吸水率、堆积密度及空隙率、含泥量及泥块含量、针片状颗粒含量',
    standard: 'JTG 3432-2024',
    judge: '设计文件',
    samplePrefix: 'CJL-',
    suffix: 'D01'
  },
  {
    name: '砂、碎石、水泥、粉煤灰、外加剂',
    spec: '4.5MPa',
    quantity: '砂150kg，碎石150kg，水泥50kg，粉煤灰30kg，外加剂10kg',
    model: '4.5MPa',
    origin: '砂:河南罗山；碎石:河南乐润；水泥:颍上上峰；粉煤灰:阜阳华润；外加剂:安徽鑫石',
    category: '委托检测',
    usage: '路基',
    appearance: '砂浅黄色、潮湿、洁净、无杂质；碎石青灰色、干燥、无杂物；水泥浅灰色、干燥、无结块',
    params: '细集料、粗集料、水泥、粉煤灰、外加剂及水泥混凝土配合比相关参数',
    standard: 'JTG 3432-2024；JTG 3420-2020',
    judge: '设计文件',
    samplePrefix: 'XJL-',
    suffix: 'A03'
  }
];

const ENTRUST_DEFAULT_RECEIVER = '李晓东';
const ENTRUST_SEQUENCE_STORAGE_KEY = 'hxtEntrustSequences';
const FUNAN_MANUAL_FORM_STORAGE_KEY = 'hxtFunanManualFieldForms';
const FUNAN_TEST_ITEM_OPTIONS = [
  '压实度 (表干法)',
  '压实度 (灌砂法)',
  '厚度（取芯法）',
  '弯沉（落锤法）',
  '渗水',
  '摩擦系数（摆式仪法）',
  '平整度（连续式平整度仪 ）',
  '抗滑构造深度（铺砂法 ）'
];
const FUNAN_SAMPLE_SPEC_OPTIONS = ['AC-13C', 'AC-20C', '4%', '5%', '10%'];

const state = {
  user: null,
  categories: [],
  reports: [],
  videos: [],
  videoDir: '',
  funanProject: null,
  funanTaskLedgerId: null,
  instrumentUsage: null,
  instrumentMatches: [],
  dashboard: null,
  selectedTemplateType: 'entrust',
  selectedCategoryId: null,
  expandedTemplateTypes: new Set(),
  expanded: new Set(),
  search: '',
  searchDraft: '',
  fileFilter: 'all',
  quickFilter: 'all',
  formReportId: null,
  quickEntrustBatch: null,
  sampleOrigins: {},
  trialDetails: {}
};

const els = {};

window.hxtLoaded = true;

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', startApp);
} else {
  startApp();
}

function startApp() {
  cacheElements();
  bindEvents();
  checkLogin();
  setTimeout(cleanLoginIfVisible, 500);
  setTimeout(cleanLoginIfVisible, 1500);
}

function cacheElements() {
  Object.assign(els, {
    loginView: document.getElementById('loginView'),
    appView: document.getElementById('appView'),
    showLoginBtn: document.getElementById('showLoginBtn'),
    showRegisterBtn: document.getElementById('showRegisterBtn'),
    loginForm: document.getElementById('loginForm'),
    registerForm: document.getElementById('registerForm'),
    loginUsername: document.getElementById('loginUsername'),
    loginPassword: document.getElementById('loginPassword'),
    registerUsername: document.getElementById('registerUsername'),
    registerDisplayName: document.getElementById('registerDisplayName'),
    registerPassword: document.getElementById('registerPassword'),
    loginMessage: document.getElementById('loginMessage'),
    registerMessage: document.getElementById('registerMessage'),
    currentUser: document.getElementById('currentUser'),
    logoutBtn: document.getElementById('logoutBtn'),
    adminBtn: document.getElementById('adminBtn'),
    operationLogBtn: document.getElementById('operationLogBtn'),
    backupBtn: document.getElementById('backupBtn'),
    exportBtn: document.getElementById('exportBtn'),
    backupList: document.getElementById('backupList'),
    refreshBtn: document.getElementById('refreshBtn'),
    categoryTree: document.getElementById('categoryTree'),
    dashboardCards: document.getElementById('dashboardCards'),
    contentTitle: document.getElementById('contentTitle'),
    reportCount: document.getElementById('reportCount'),
    searchInput: document.getElementById('searchInput'),
    searchBtn: document.getElementById('searchBtn'),
    clearSearchBtn: document.getElementById('clearSearchBtn'),
    fileFilter: document.getElementById('fileFilter'),
    quickFilter: document.getElementById('quickFilter'),
    reportList: document.getElementById('reportList'),
    previewModal: document.getElementById('previewModal'),
    closePreviewBtn: document.getElementById('closePreviewBtn'),
    previewTitle: document.getElementById('previewTitle'),
    previewBody: document.getElementById('previewBody'),
    versionModal: document.getElementById('versionModal'),
    closeVersionBtn: document.getElementById('closeVersionBtn'),
    versionTitle: document.getElementById('versionTitle'),
    versionBody: document.getElementById('versionBody'),
    formModal: document.getElementById('formModal'),
    closeFormBtn: document.getElementById('closeFormBtn'),
    printFormBtn: document.getElementById('printFormBtn'),
    formTitle: document.getElementById('formTitle'),
    formControls: document.getElementById('formControls'),
    formPrintArea: document.getElementById('formPrintArea'),
    projectTaskModal: document.getElementById('projectTaskModal'),
    projectTaskTitle: document.getElementById('projectTaskTitle'),
    projectTaskControls: document.getElementById('projectTaskControls'),
    projectTaskPrintArea: document.getElementById('projectTaskPrintArea'),
    confirmProjectTaskBtn: document.getElementById('confirmProjectTaskBtn'),
    closeProjectTaskBtn: document.getElementById('closeProjectTaskBtn'),
    videoModal: document.getElementById('videoModal'),
    closeVideoBtn: document.getElementById('closeVideoBtn'),
    videoTitle: document.getElementById('videoTitle'),
    trainingVideoPlayer: document.getElementById('trainingVideoPlayer'),
    adminModal: document.getElementById('adminModal'),
    closeAdminBtn: document.getElementById('closeAdminBtn'),
    adminTabs: Array.from(document.querySelectorAll('[data-admin-tab]')),
    adminPages: Array.from(document.querySelectorAll('[data-admin-page]')),
    reportForm: document.getElementById('reportForm'),
    reportSelect: document.getElementById('reportSelect'),
    reportNameInput: document.getElementById('reportNameInput'),
    reportTemplateTypeSelect: document.getElementById('reportTemplateTypeSelect'),
    reportCategorySelect: document.getElementById('reportCategorySelect'),
    reportRemarksInput: document.getElementById('reportRemarksInput'),
    bulkForm: document.getElementById('bulkForm'),
    bulkTemplateTypeSelect: document.getElementById('bulkTemplateTypeSelect'),
    bulkCategorySelect: document.getElementById('bulkCategorySelect'),
    bulkFilesInput: document.getElementById('bulkFilesInput'),
    bulkRemarksInput: document.getElementById('bulkRemarksInput'),
    categoryForm: document.getElementById('categoryForm'),
    categoryTemplateTypeSelect: document.getElementById('categoryTemplateTypeSelect'),
    categoryParentSelect: document.getElementById('categoryParentSelect'),
    categoryList: document.getElementById('categoryList'),
    videoForm: document.getElementById('videoForm'),
    videoIdInput: document.getElementById('videoIdInput'),
    videoTitleInput: document.getElementById('videoTitleInput'),
    videoCategoryInput: document.getElementById('videoCategoryInput'),
    videoCategorySuggestions: document.getElementById('videoCategorySuggestions'),
    videoLecturerInput: document.getElementById('videoLecturerInput'),
    videoFileNameInput: document.getElementById('videoFileNameInput'),
    videoRemarksInput: document.getElementById('videoRemarksInput'),
    resetVideoFormBtn: document.getElementById('resetVideoFormBtn'),
    videoAdminList: document.getElementById('videoAdminList'),
    userForm: document.getElementById('userForm'),
    userList: document.getElementById('userList'),
    inactiveReportList: document.getElementById('inactiveReportList'),
    toast: document.getElementById('toast')
  });
}

function bindEvents() {
  els.loginForm.addEventListener('submit', handleLogin);
  els.registerForm.addEventListener('submit', handleRegister);
  els.showLoginBtn.addEventListener('click', () => setAuthMode('login'));
  els.showRegisterBtn.addEventListener('click', () => setAuthMode('register'));
  els.logoutBtn.addEventListener('click', handleLogout);
  els.refreshBtn.addEventListener('click', loadData);
  els.searchInput.addEventListener('input', () => {
    state.searchDraft = els.searchInput.value.trim();
  });
  els.searchInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') applySearch();
  });
  els.searchBtn.addEventListener('click', applySearch);
  els.clearSearchBtn.addEventListener('click', () => {
    state.search = '';
    state.searchDraft = '';
    state.fileFilter = 'all';
    state.quickFilter = 'all';
    els.searchInput.value = '';
    els.fileFilter.value = 'all';
    els.quickFilter.value = 'all';
    renderReports();
  });
  els.fileFilter.addEventListener('change', () => {
    state.fileFilter = els.fileFilter.value;
    renderReports();
  });
  els.quickFilter.addEventListener('change', () => {
    state.quickFilter = els.quickFilter.value;
    renderReports();
  });

  els.adminBtn.addEventListener('click', openAdmin);
  els.operationLogBtn.addEventListener('click', showOperationLogs);
  els.exportBtn.addEventListener('click', handleExport);
  els.closePreviewBtn.addEventListener('click', closePreview);
  bindBackdropClose(els.previewModal, closePreview);
  els.previewBody.addEventListener('input', handleRoundingCalculatorInput);
  els.previewBody.addEventListener('change', handleRoundingCalculatorInput);
  els.previewBody.addEventListener('click', handleRoundingCalculatorClick);
  els.closeVersionBtn.addEventListener('click', closeVersions);
  bindBackdropClose(els.versionModal, closeVersions);
  els.versionBody.addEventListener('click', handleVersionBodyClick);
  els.closeFormBtn.addEventListener('click', closeForm);
  els.closeProjectTaskBtn.addEventListener('click', closeProjectTask);
  els.confirmProjectTaskBtn.addEventListener('click', confirmAndPrintProjectTask);
  bindBackdropClose(els.projectTaskModal, closeProjectTask);
  els.projectTaskControls.addEventListener('input', saveAndRenderProjectTaskDraft);
  els.projectTaskControls.addEventListener('change', saveAndRenderProjectTaskDraft);
  els.projectTaskControls.addEventListener('click', handleProjectTaskControlClick);
  els.printFormBtn.addEventListener('click', printFormsOnly);
  bindBackdropClose(els.formModal, closeForm);
  els.formControls.addEventListener('input', handleEntrustControlChange);
  els.formControls.addEventListener('change', handleEntrustControlChange);
  els.formControls.addEventListener('click', handleEntrustControlClick);
  els.formPrintArea.addEventListener('click', handlePrintCheckClick);
  els.formPrintArea.addEventListener('change', handleTrialTypeChange);
  els.closeVideoBtn.addEventListener('click', closeVideo);
  bindBackdropClose(els.videoModal, closeVideo);
  els.videoModal.addEventListener('click', handleVideoSpeedClick);
  els.closeAdminBtn.addEventListener('click', closeAdmin);
  bindBackdropClose(els.adminModal, closeAdmin);
  els.adminTabs.forEach((button) => {
    button.addEventListener('click', () => setAdminTab(button.dataset.adminTab));
  });
  els.backupBtn.addEventListener('click', handleBackup);
  els.backupList.addEventListener('click', handleBackupListClick);

  els.reportForm.addEventListener('submit', handleReportSubmit);
  els.reportSelect.addEventListener('change', fillReportFormFromSelection);
  els.reportTemplateTypeSelect.addEventListener('change', () => updateReportCategoryOptions());
  els.bulkForm.addEventListener('submit', handleBulkSubmit);
  els.bulkTemplateTypeSelect.addEventListener('change', () => updateBulkCategoryOptions());
  els.categoryForm.addEventListener('submit', handleCategorySubmit);
  els.categoryTemplateTypeSelect.addEventListener('change', () => updateCategoryParentOptions());
  els.videoForm.addEventListener('submit', handleVideoSubmit);
  els.resetVideoFormBtn.addEventListener('click', resetVideoForm);
  els.videoAdminList.addEventListener('click', handleVideoAdminClick);
  els.userForm.addEventListener('submit', handleUserSubmit);
  els.categoryList.addEventListener('click', handleCategoryListClick);
  els.categoryList.addEventListener('change', handleCategoryListChange);
  els.userList.addEventListener('click', handleUserListClick);
  els.inactiveReportList.addEventListener('click', handleInactiveReportListClick);
  els.reportList.addEventListener('click', handleReportListClick);
  els.reportList.addEventListener('click', handleInstrumentAction);
  els.reportList.addEventListener('change', handleAutoPdfFileChange);
  els.reportList.addEventListener('change', handleSoftwareFileChange);
  els.reportList.addEventListener('change', handleFunanLedgerFileChange);
}

function bindBackdropClose(modal, close) {
  let startedOnBackdrop = false;
  modal.addEventListener('pointerdown', (event) => {
    startedOnBackdrop = event.isPrimary && event.button === 0 && event.target === modal;
  });
  modal.addEventListener('pointerup', (event) => {
    if (event.target !== modal) startedOnBackdrop = false;
  });
  modal.addEventListener('pointercancel', () => {
    startedOnBackdrop = false;
  });
  modal.addEventListener('click', (event) => {
    if (startedOnBackdrop && event.target === modal) close();
    startedOnBackdrop = false;
  });
}

async function checkLogin() {
  try {
    const data = await api('/api/me');
    state.user = data.user;
    showApp();
    await loadData();
  } catch (_) {
    showLogin();
  }
}

async function handleLogin(event) {
  event.preventDefault();
  els.loginMessage.textContent = '';
  try {
    const data = await api('/api/login', {
      method: 'POST',
      body: {
        username: els.loginUsername.value.trim(),
        password: els.loginPassword.value
      }
    });
    state.user = data.user;
    els.loginPassword.value = '';
    showApp();
    await loadData();
  } catch (error) {
    els.loginMessage.textContent = error.message;
  }
}

async function handleRegister(event) {
  event.preventDefault();
  els.registerMessage.textContent = '';
  try {
    const data = await api('/api/register', {
      method: 'POST',
      body: {
        username: els.registerUsername.value.trim(),
        displayName: els.registerDisplayName.value.trim(),
        password: els.registerPassword.value
      }
    });
    state.user = data.user;
    els.registerForm.reset();
    showApp();
    await loadData();
    notice('注册成功，已自动登录');
  } catch (error) {
    els.registerMessage.textContent = error.message;
  }
}

async function handleLogout() {
  await api('/api/logout', { method: 'POST' }).catch(() => {});
  state.user = null;
  state.categories = [];
  state.reports = [];
  state.videos = [];
  state.dashboard = null;
  showLogin();
}

function showLogin() {
  document.body.removeAttribute('data-role');
  resetBlockingOverlays();
  els.loginView.hidden = false;
  els.appView.hidden = true;
  setAuthMode('login');
  setTimeout(() => els.loginUsername.focus(), 0);
}

function resetBlockingOverlays() {
  [els.previewModal, els.versionModal, els.formModal, els.projectTaskModal, els.videoModal, els.adminModal].forEach((modal) => {
    if (!modal) return;
    modal.hidden = true;
    modal.setAttribute('hidden', '');
  });
  state.formReportId = null;
  state.funanTaskLedgerId = null;
  if (els.previewBody) els.previewBody.innerHTML = '';
  if (els.versionBody) els.versionBody.innerHTML = '';
  if (els.formControls) els.formControls.innerHTML = '';
  if (els.formPrintArea) els.formPrintArea.innerHTML = '';
  if (els.projectTaskPrintArea) els.projectTaskPrintArea.innerHTML = '';
  if (els.trainingVideoPlayer) {
    els.trainingVideoPlayer.pause();
    els.trainingVideoPlayer.removeAttribute('src');
  }
  document.body.classList.remove('is-printing', 'modal-open');
}

function cleanLoginIfVisible() {
  if (!els.loginView || els.loginView.hidden) return;
  resetBlockingOverlays();
}

function showApp() {
  document.body.dataset.role = state.user.role;
  if (state.user.scope && state.user.scope !== 'all' && state.user.role === 'user') {
    state.selectedTemplateType = normalizeTemplateType(state.user.scope);
    state.expandedTemplateTypes = new Set([state.selectedTemplateType]);
  }
  els.currentUser.textContent = `${state.user.displayName}（${roleLabel(state.user.role)}）`;
  els.loginView.hidden = true;
  els.appView.hidden = false;
}

function setAuthMode(mode) {
  const isLogin = mode === 'login';
  els.loginForm.hidden = !isLogin;
  els.registerForm.hidden = isLogin;
  els.showLoginBtn.classList.toggle('active', isLogin);
  els.showRegisterBtn.classList.toggle('active', !isLogin);
  els.loginMessage.textContent = '';
  els.registerMessage.textContent = '';
  setTimeout(() => {
    if (isLogin) els.loginUsername.focus();
    else els.registerUsername.focus();
  }, 0);
}

async function loadData() {
  const [categoryData, reportData, dashboardData, videoData, funanProject, instrumentUsage] = await Promise.all([
    api('/api/categories'),
    api(`/api/reports?templateType=${encodeURIComponent(state.selectedTemplateType)}${state.selectedCategoryId ? `&categoryId=${state.selectedCategoryId}` : ''}`),
    api('/api/dashboard'),
    api('/api/training-videos'),
    state.selectedTemplateType === 'project' ? api('/api/funan-project') : Promise.resolve(null),
    state.selectedTemplateType === 'instrument' ? api('/api/instrument-usage') : Promise.resolve(null)
  ]);

  state.categories = categoryData.categories.map((item) => ({
    id: item.id,
    name: item.name,
    templateType: normalizeTemplateType(item.template_type),
    parentId: item.parent_id,
    sortOrder: item.sort_order,
    count: item.report_count || 0,
    counts: {
      [normalizeTemplateType(item.template_type)]: item.report_count || 0
    }
  }));
  state.reports = reportData.reports;
  state.videos = videoData.videos || [];
  state.videoDir = videoData.videoDir || '';
  state.funanProject = funanProject;
  state.instrumentUsage = instrumentUsage;
  state.dashboard = dashboardData;
  renderCategories();
  renderDashboard();
  renderReports();
  renderVideoAdminList();
  refreshAdminOptions();
}

function applySearch() {
  state.search = state.searchDraft;
  renderReports();
}

function selectTemplateType(templateType) {
  state.selectedTemplateType = templateType;
  state.selectedCategoryId = null;
  loadData().catch(showError);
}

function selectCategory(templateType, categoryId) {
  state.selectedTemplateType = templateType;
  state.selectedCategoryId = categoryId;
  loadData().catch(showError);
}

function renderCategories() {
  const childrenMap = new Map();
  for (const category of state.categories) {
    const key = `${category.templateType}:${category.parentId || 0}`;
    if (!childrenMap.has(key)) childrenMap.set(key, []);
    childrenMap.get(key).push(category);
  }

  const renderLevel = (parentId, depth, templateType) => {
    return (childrenMap.get(`${templateType}:${parentId}`) || []).map((category) => {
      const hasChildren = (childrenMap.get(`${templateType}:${category.id}`) || []).length > 0;
      const opened = state.expanded.has(category.id);
      const selected = state.selectedTemplateType === templateType && state.selectedCategoryId === category.id;
      const childHtml = hasChildren && opened ? renderLevel(category.id, depth + 1, templateType) : '';
      const count = category.count || 0;
      return `
        <button class="tree-row ${selected ? 'selected' : ''}" data-template-type="${templateType}" data-category-id="${category.id}" style="padding-left:${24 + depth * 18}px" type="button">
          <span class="plus" data-toggle-id="${category.id}">${hasChildren ? (opened ? '-' : '+') : ''}</span>
          <span>${escapeHtml(category.name)}</span>
          <span class="count">${count}</span>
        </button>
        ${childHtml}
      `;
    }).join('');
  };

  els.categoryTree.innerHTML = TEMPLATE_TYPES.map((type) => {
    if (!state.categories.some((category) => category.templateType === type.id)) return '';
    const opened = state.expandedTemplateTypes.has(type.id);
    const selected = state.selectedTemplateType === type.id && state.selectedCategoryId === null;
    const total = state.categories
      .filter((category) => category.templateType === type.id)
      .reduce((sum, category) => sum + Number(category.count || 0), 0);
    return `
      <button class="tree-row template-root ${selected ? 'selected' : ''}" data-template-root="${type.id}" type="button">
        <span class="plus" data-template-toggle="${type.id}">${opened ? '-' : '+'}</span>
        <span>${escapeHtml(type.label)}</span>
        <span class="count">${total}</span>
      </button>
      ${opened ? renderLevel(0, 0, type.id) : ''}
    `;
  }).join('');

  els.categoryTree.querySelectorAll('.tree-row').forEach((button) => {
    button.addEventListener('click', (event) => {
      const templateToggle = event.target.dataset.templateToggle;
      if (templateToggle) {
        if (state.expandedTemplateTypes.has(templateToggle)) state.expandedTemplateTypes.delete(templateToggle);
        else state.expandedTemplateTypes.add(templateToggle);
        renderCategories();
        return;
      }

      const templateRoot = button.dataset.templateRoot;
      if (templateRoot) {
        selectTemplateType(templateRoot);
        return;
      }

      const toggleId = event.target.dataset.toggleId;
      const categoryId = Number(button.dataset.categoryId);
      const templateType = button.dataset.templateType || state.selectedTemplateType;
      if (toggleId) {
        if (state.expanded.has(categoryId)) state.expanded.delete(categoryId);
        else state.expanded.add(categoryId);
        renderCategories();
        return;
      }
      selectCategory(templateType, categoryId);
    });
  });
}

function renderDashboard() {
  if (!els.dashboardCards) return;
  els.dashboardCards.innerHTML = '';
  els.dashboardCards.hidden = true;
}

function renderReports() {
  if (state.selectedTemplateType === 'tool') {
    renderCommonTools();
    return;
  }
  if (state.selectedTemplateType === 'instrument') {
    renderInstrumentUsage();
    return;
  }
  if (state.selectedTemplateType === 'project') {
    renderFunanProject();
    return;
  }

  if (isVideoCategorySelected()) {
    renderVideos();
    return;
  }

  const selectedCategory = state.categories.find((item) => item.id === state.selectedCategoryId);
  if (selectedCategory?.templateType === 'system' && selectedCategory.name === '标准/一单一库') {
    renderStandardLibraryTool(selectedCategory);
    return;
  }

  const keyword = state.search.toLowerCase();
  const filtered = state.reports.filter((report) => {
    const text = `${report.name} ${report.categoryName} ${report.remarks}`.toLowerCase();
    if (keyword && !text.includes(keyword)) return false;
    if (state.fileFilter === 'word' && !report.hasWord) return false;
    if (state.fileFilter === 'pdf' && !report.hasPdf) return false;
    if (state.fileFilter === 'excel' && !report.hasExcel) return false;
    if (state.fileFilter === 'missingPdf' && report.hasPdf) return false;
    if (state.quickFilter === 'neverDownloaded' && report.lastDownloadAt) return false;
    if (state.quickFilter === 'downloadedByMe' && !report.downloadedByMe) return false;
    if (state.quickFilter === 'stale' && !isStale(report.updatedAt, 60)) return false;
    if (state.quickFilter === 'recentUpload' && !isRecent(report.uploadedAt || report.updatedAt, 30)) return false;
    return true;
  });

  const selectedType = TEMPLATE_TYPES.find((item) => item.id === state.selectedTemplateType) || TEMPLATE_TYPES[0];
  els.contentTitle.textContent = selectedCategory ? `${selectedType.label} - ${selectedCategory.name}` : selectedType.label;
  const searchText = state.search ? `，关键词：${state.search}` : '';
  els.reportCount.textContent = `共 ${filtered.length} 份模板${searchText}`;

  if (filtered.length === 0) {
    els.reportList.innerHTML = `
      ${isSoftwareDownloadCategory(selectedCategory) && canManageTemplates() ? `
        <div class="software-upload-empty">
          <input data-auto-software-file type="file" hidden>
          <button class="header-upload-btn" data-action="auto-upload-software" title="选择软件后自动上传" type="button">上传软件</button>
          <span class="muted">点击上传常用软件</span>
        </div>
      ` : ''}
      <div class="empty">暂无报告</div>
    `;
    return;
  }

  els.reportList.innerHTML = `
    <table class="report-table">
      <thead>
        <tr>
          <th>${isStandardDownloadCategory(selectedCategory) ? '标准规范名称' : '报告名称'}</th>
          <th>分类</th>
          <th>下载</th>
          <th>
            <span class="upload-header-control">上传信息
              ${isStandardDownloadCategory(selectedCategory) && canManageTemplates() ? `
                <input data-auto-pdf-file type="file" accept="application/pdf,.pdf" hidden>
                <button class="header-upload-btn" data-action="auto-upload-pdf" title="选择 PDF 后自动上传" type="button">上传</button>
              ` : isSoftwareDownloadCategory(selectedCategory) && canManageTemplates() ? `
                <input data-auto-software-file type="file" hidden>
                <button class="header-upload-btn" data-action="auto-upload-software" title="选择软件后自动上传" type="button">上传</button>
              ` : ''}
            </span>
          </th>
          <th>最后下载</th>
          <th>备注</th>
          <th>操作</th>
        </tr>
      </thead>
      <tbody>
        ${filtered.map(renderReportRow).join('')}
      </tbody>
    </table>
  `;
}

const COMMON_TOOL_FILES = {
  '离线PDF工具箱-7项功能': '离线PDF工具箱-7项功能.html',
  '离线PDF工具箱-拆分书籍对开页': '离线PDF工具箱-拆分书籍对开页.html',
  '离线PDF工具箱-交替合并': '离线PDF工具箱-交替合并.html'
};

const COMMON_TOOL_LINKS = [
  ...Object.entries(COMMON_TOOL_FILES).map(([name, file]) => ({
    name,
    href: `/tools/${encodeURIComponent(file)}`,
    description: '局域网离线使用，不依赖外网。',
    external: false
  })),
  {
    name: '检验检测机构资质认定能力项目库',
    href: 'https://cma.caqit.org.cn/',
    description: '打开官方平台人工查询标准和能力项目。',
    external: true
  }
];

function renderCommonTools() {
  const selectedCategory = state.categories.find((item) => item.id === state.selectedCategoryId);
  const visibleLinks = selectedCategory?.name && COMMON_TOOL_FILES[selectedCategory.name]
    ? COMMON_TOOL_LINKS.filter((item) => item.name === selectedCategory.name)
    : COMMON_TOOL_LINKS;
  els.contentTitle.textContent = selectedCategory ? `常用工具 - ${selectedCategory.name}` : '常用工具';
  els.reportCount.textContent = `共 ${visibleLinks.length} 个工具入口`;
  els.reportList.innerHTML = visibleLinks.length ? `
    <div class="tool-grid">
      ${visibleLinks.map((tool) => {
        const target = tool.external ? ' target="_blank" rel="noopener"' : ' target="_blank" rel="noopener"';
        return `<article class="tool-card">
          <div class="tool-card-icon">PDF</div>
          <h3>${escapeHtml(tool.name)}</h3>
          <p>${escapeHtml(tool.description)}</p>
          <a class="primary tool-open-btn" href="${tool.href}"${target}>${tool.external ? '打开官方平台' : '打开工具'}</a>
        </article>`;
      }).join('')}
    </div>
  ` : '<div class="empty">暂无在线工具</div>';
}

function renderStandardLibraryTool(category) {
  els.contentTitle.textContent = `管理体系 - ${category.name}`;
  els.reportCount.textContent = '按标准规范下载库自动查新';
  els.reportList.innerHTML = `
    <section class="standard-tool-entry">
      <div>
        <h3>一单一库标准查新</h3>
        <p>上传查新表后，系统读取 C 列标准名称和编号，在标准规范下载库中比对，并导出带 √ / × 结果的新表。</p>
      </div>
      <a class="primary standard-tool-open" href="/standard-library-check.html">打开查新工具</a>
    </section>
  `;
}

function renderReportRow(report) {
  const isCalculator = isOnlineTool(report);
  const softwareButton = report.hasSoftware ? `<a class="file-btn" href="/download/${report.id}/software">下载</a>` : '';
  const fileButtons = [
    report.hasWord ? `<a class="file-btn" href="/download/${report.id}/word">Word</a>` : '',
    report.hasPdf ? `<a class="file-btn" href="/download/${report.id}/pdf">PDF</a>` : '',
    report.hasExcel ? `<a class="file-btn excel" href="/download/${report.id}/excel">Excel</a>` : '',
    softwareButton
  ].filter(Boolean).join('');

  return `
    <tr>
      <td data-label="${report.categoryName === '标准规范下载' ? '标准规范名称' : '报告名称'}">
        <div class="report-name">${escapeHtml(report.name)}</div>
        <div class="muted">编号：${report.id}</div>
      </td>
      <td data-label="分类">${escapeHtml(report.categoryName)}</td>
      <td data-label="下载">
        <div class="file-actions">
          ${isCalculator ? '<span class="tool-badge">在线工具</span>' : (fileButtons || '<span class="muted">暂无文件</span>')}
        </div>
      </td>
      <td data-label="上传信息">
        <div>${escapeHtml(report.uploadedByName || '暂无')}</div>
        <div class="muted">${formatTime(report.uploadedAt)}</div>
      </td>
      <td data-label="最后下载">
        <div>${escapeHtml(report.lastDownloadByName || '暂无')}</div>
        <div class="muted">${formatTime(report.lastDownloadAt)}</div>
      </td>
      <td data-label="备注">${escapeHtml(report.remarks || '')}</td>
      <td data-label="操作">
        <div class="row-actions">
          <button class="mini icon-action" data-action="preview" data-report-id="${report.id}" title="预览" type="button">
            <span class="eye-icon" aria-hidden="true"></span>
            <span>${isCalculator ? '打开' : '预览'}</span>
          </button>
          ${report.templateType === 'entrust' ? `<button class="mini fill-btn" data-action="fill" data-report-id="${report.id}" onclick="window.openEntrustFormDirect && window.openEntrustFormDirect(this.dataset.reportId)" type="button">填写</button>` : ''}
          <button class="mini" data-action="logs" data-report-id="${report.id}" type="button">记录</button>
          <button class="mini" data-action="versions" data-report-id="${report.id}" type="button">版本</button>
          ${canManageTemplates() ? `<button class="mini" data-action="edit" data-report-id="${report.id}" type="button">编辑</button>` : ''}
          ${canManageTemplates() ? `<button class="mini danger-btn" data-action="deactivate" data-report-id="${report.id}" type="button">停用</button>` : ''}
        </div>
      </td>
    </tr>
  `;
}

function isStandardDownloadCategory(category) {
  return category?.templateType === 'system' && category.name === '标准规范下载';
}

function renderFunanProject() {
  els.contentTitle.textContent = '阜南南阳大道 - 现场单据';
  els.reportCount.textContent = '手工填写后自动保留上次内容';
  els.reportList.innerHTML = `
    <section class="field-form-entry">
      <div>
        <h3>现场检测任务单和现场取样单</h3>
        <p>填写一次后，下次会自动带出上一次内容；两张单据的关联信息会同步填写。</p>
      </div>
      <button class="primary" data-action="open-funan-manual-forms" type="button">填写现场单据</button>
    </section>
  `;
}

function renderInstrumentUsage() {
  const records = state.instrumentUsage?.records || [];
  els.contentTitle.textContent = '仪器使用记录';
  els.reportCount.textContent = `最近 ${records.length} 条使用记录`;
  els.reportList.innerHTML = `
    <section class="instrument-tool">
      <div class="instrument-tool-head"><strong>根据试验参数确定仪器</strong><span class="muted">可粘贴试验参数，系统先匹配仪器编号，再确认使用记录。</span></div>
      <div class="instrument-input-grid">
        <label>使用日期<input id="instrumentDate" type="date" value="${new Date().toISOString().slice(0, 10)}"></label>
        <label>样品编号<input id="instrumentSampleNo" placeholder="例如：YP-2026-WJL-0001-A13"></label>
        <label class="instrument-wide">试验参数<textarea id="instrumentParameters" rows="3" placeholder="例如：颗粒级配、含泥量及泥块含量、压实度"></textarea></label>
        <label>开始时间<input id="instrumentStartTime" placeholder="例如：08:30"></label>
        <label>结束时间<input id="instrumentEndTime" placeholder="例如：10:30"></label>
        <label>使用人<input id="instrumentUserName" placeholder="检测人员姓名"></label>
      </div>
      <div class="instrument-actions"><button class="primary" data-action="match-instruments" type="button">匹配仪器</button><button class="mini" data-action="save-instruments" type="button">保存使用记录</button></div>
      <div id="instrumentMatches" class="instrument-matches"><div class="empty compact">输入试验参数后点击“匹配仪器”。</div></div>
    </section>
    <section class="instrument-history"><h3>使用记录</h3>${records.length ? `<table class="report-table"><thead><tr><th>日期</th><th>样品编号</th><th>仪器</th><th>使用时间</th><th>使用人</th><th>状态</th></tr></thead><tbody>${records.map((r) => `<tr><td>${escapeHtml(r.usageDate)}</td><td>${escapeHtml(r.sampleNo)}</td><td>${escapeHtml(r.instrumentName)}<div class="muted">${escapeHtml(r.instrumentCode)}</div></td><td>${escapeHtml(r.startTime)}-${escapeHtml(r.endTime)}</td><td>${escapeHtml(r.userName)}</td><td>${escapeHtml(r.beforeStatus)} / ${escapeHtml(r.afterStatus)}</td></tr>`).join('')}</tbody></table>` : '<div class="empty">暂无使用记录</div>'}</section>
  `;
}

async function handleInstrumentAction(event) {
  const button = event.target.closest('button[data-action]');
  if (!button) return;
  const parameters = document.getElementById('instrumentParameters')?.value || '';
  if (button.dataset.action === 'match-instruments') {
    if (!parameters.trim()) { showError(new Error('请先填写试验参数')); return; }
    try {
      const data = await api('/api/instrument-usage/match', { method: 'POST', body: { parameters } });
      state.instrumentMatches = data.instruments || [];
      const box = document.getElementById('instrumentMatches');
      box.innerHTML = state.instrumentMatches.length ? state.instrumentMatches.map((item, index) => `<label class="instrument-match"><input type="checkbox" data-instrument-index="${index}" checked><span><strong>${escapeHtml(item.name)}</strong><b>${escapeHtml(item.code)}</b><small>${escapeHtml(item.match || '按名称匹配')}</small></span></label>`).join('') : '<div class="empty compact">没有匹配到仪器，请检查参数文字或手工调整参数。</div>';
    } catch (error) { showError(error); }
  }
  if (button.dataset.action === 'save-instruments') {
    const selected = Array.from(document.querySelectorAll('[data-instrument-index]:checked')).map((input) => state.instrumentMatches[Number(input.dataset.instrumentIndex)]).filter(Boolean);
    try {
      await api('/api/instrument-usage', { method: 'POST', body: { usageDate: document.getElementById('instrumentDate').value, sampleNo: document.getElementById('instrumentSampleNo').value, parameters, startTime: document.getElementById('instrumentStartTime').value, endTime: document.getElementById('instrumentEndTime').value, userName: document.getElementById('instrumentUserName').value, instruments: selected } });
      notice('仪器使用记录已保存');
      await loadData();
    } catch (error) { showError(error); }
  }
}

function renderFunanLedgerRow(record) {
  const task = record.task;
  const status = !task ? '未生成' : task.printedAt ? '已打印' : '已确认';
  const statusClass = !task ? 'draft' : task.printedAt ? 'printed' : 'confirmed';
  const quantity = String(record.quantity || '');
  const displayQuantity = quantity && !/[处点组个]$/.test(quantity) ? `${quantity}处` : quantity;
  return `
    <tr>
      <td><div class="report-name">${escapeHtml(record.taskNo)}</div><div class="muted">${escapeHtml(record.entrustNo)}</div></td>
      <td>${escapeHtml(record.sampleNo)}</td>
      <td>${escapeHtml(displayQuantity)}</td>
      <td class="project-usage">${escapeHtml(record.usage)}</td>
      <td>${escapeHtml(record.entrustDate)}</td>
      <td><span class="project-status ${statusClass}">${status}</span>${task?.printedAt ? `<div class="muted">${formatTime(task.printedAt)}</div>` : ''}</td>
      <td><button class="mini primary-mini" data-action="open-funan-task" data-ledger-id="${record.id}" type="button">${task ? '查看/补打' : '生成任务单'}</button></td>
    </tr>
  `;
}

async function handleFunanLedgerFileChange(event) {
  const input = event.target.closest('[data-funan-ledger-file]');
  const file = input?.files?.[0];
  if (!file) return;
  if (!/\.xlsx?$/i.test(file.name)) {
    showError(new Error('台账只支持 .xls 或 .xlsx 文件'));
    input.value = '';
    return;
  }
  try {
    const formData = new FormData();
    formData.append('ledgerFile', file);
    const response = await fetch('/api/funan-project/import', { method: 'POST', body: formData, credentials: 'same-origin' });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.message || '台账导入失败');
    notice(`台账已导入：新增 ${data.inserted} 条，更新 ${data.updated} 条`);
    await loadData();
  } catch (error) {
    showError(error);
  } finally {
    input.value = '';
  }
}

function defaultFunanTask() {
  let saved = {};
  try {
    saved = JSON.parse(localStorage.getItem(FUNAN_MANUAL_FORM_STORAGE_KEY) || '{}');
  } catch (_) {
    saved = {};
  }
  return {
    clientName: '安徽省新路建设工程集团有限责任公司',
    projectName: '南阳大道（阜南段）修复养护工程许城路项目',
    taskNo: '',
    entrustNo: '',
    sampleNo: '',
    sampleName: '沥青混凝土',
    sampleSpec: 'AC-13C',
    quantity: '',
    usage: '',
    entrustDate: new Date().toLocaleDateString('zh-CN'),
    testItem: '弯沉',
    executionStandard: 'JTG 3450-2019',
    method: 'JTG 3450-2019综合法',
    recordNo: '',
    reportNo: '',
    sendDept: '综合部',
    receiveDept: '检测部',
    sender: '李晓东',
    samplingLocation: '现场',
    samplerWitness: '',
    ...saved,
    samplingLocation: String(saved.samplingLocation || '').trim() || '现场'
  };
}

function openProjectTask() {
  state.funanTaskLedgerId = null;
  const task = defaultFunanTask();
  els.projectTaskTitle.textContent = '现场检测任务单和现场取样单';
  els.projectTaskControls.classList.add('funan-manual-controls');
  els.projectTaskControls.innerHTML = `
    <fieldset class="form-group funan-manual-form">
      <legend>任务单内容</legend>
      ${projectTaskInput('clientName', '委托单位', task.clientName)}
      ${projectTaskInput('projectName', '工程名称', task.projectName)}
      ${projectTaskInput('usage', '工程部位/用途', task.usage)}
      ${projectTaskInput('taskNo', '任务编号', task.taskNo)}
      ${projectTaskInput('sampleNo', '样品编号', task.sampleNo)}
      ${projectTaskInput('quantity', '取样数量（处）', normalizeFunanQuantity(task.quantity), false, 'number')}
      ${projectTaskInput('entrustDate', '日期', task.entrustDate)}
      ${projectTaskInput('sampleName', '样品名称', task.sampleName)}
      ${renderFunanSampleSpecOptions(task.sampleSpec)}
      ${projectTaskInput('testItem', '试验项目', task.testItem)}
      ${projectTaskInput('executionStandard', '执行标准', task.executionStandard)}
      ${projectTaskInput('method', '取样依据/方法', task.method)}
      ${renderFunanTestItemOptions(task.testItem)}
    </fieldset>
    <div class="form-tip">委托编号、记录编号和报告编号会跟随编号自动生成；部门、下达人和取样信息使用默认值，无需填写。</div>
  `;
  renderProjectTaskPrintArea();
  els.projectTaskModal.hidden = false;
}

function projectTaskInput(name, label, value, wide = false, type = 'text') {
  const numeric = type === 'number' ? ' min="0" step="1" inputmode="numeric"' : '';
  return `<label class="${wide ? 'form-wide' : ''}">${label}<input data-project-task-field="${name}" type="${type}"${numeric} value="${escapeAttribute(value)}"></label>`;
}

function renderFunanTestItemOptions(selected) {
  return `<div class="form-wide project-test-options" aria-label="常用试验项目">
    ${FUNAN_TEST_ITEM_OPTIONS.map((item) => `<button class="test-option ${item === selected ? 'active' : ''}" data-project-test-item="${escapeAttribute(item)}" type="button">${escapeHtml(item)}</button>`).join('')}
  </div>`;
}

function renderFunanSampleSpecOptions(selected) {
  const values = FUNAN_SAMPLE_SPEC_OPTIONS.includes(selected) ? FUNAN_SAMPLE_SPEC_OPTIONS : [selected, ...FUNAN_SAMPLE_SPEC_OPTIONS].filter(Boolean);
  return `<div class="project-option-picker">
    <span>样品规格/型号</span>
    <input data-project-task-field="sampleSpec" type="hidden" value="${escapeAttribute(selected)}">
    <div class="project-spec-options">
      ${values.map((item) => `<button class="spec-option ${item === selected ? 'active' : ''}" data-project-sample-spec="${escapeAttribute(item)}" type="button">${escapeHtml(item)}</button>`).join('')}
    </div>
  </div>`;
}

function handleProjectTaskControlClick(event) {
  const button = event.target.closest('[data-project-test-item], [data-project-sample-spec]');
  if (!button) return;
  const isSpec = Boolean(button.dataset.projectSampleSpec);
  const field = isSpec ? 'sampleSpec' : 'testItem';
  const value = isSpec ? button.dataset.projectSampleSpec : button.dataset.projectTestItem;
  const input = els.projectTaskControls.querySelector(`[data-project-task-field="${field}"]`);
  if (!input) return;
  input.value = value;
  els.projectTaskControls.querySelectorAll(isSpec ? '[data-project-sample-spec]' : '[data-project-test-item]').forEach((item) => {
    item.classList.toggle('active', item === button);
  });
  saveAndRenderProjectTaskDraft();
}

function getProjectTaskValues() {
  const task = defaultFunanTask();
  els.projectTaskControls.querySelectorAll('[data-project-task-field]').forEach((input) => {
    task[input.dataset.projectTaskField] = input.value.trim();
  });
  task.quantity = normalizeFunanQuantity(task.quantity);
  task.entrustNo = replaceFunanPrefix(task.taskNo, 'WT');
  task.recordNo = replaceFunanPrefix(task.sampleNo, 'JL');
  task.reportNo = replaceFunanPrefix(task.sampleNo, 'BG');
  return task;
}

function replaceFunanPrefix(value, prefix) {
  const text = String(value || '').trim();
  if (!text) return '';
  return text.length > 2 ? `${prefix}${text.slice(2)}` : prefix;
}

function normalizeFunanQuantity(value) {
  return String(value || '').replace(/[^\d.]/g, '');
}

function renderProjectTaskPrintArea() {
  const data = getProjectTaskValues();
  if (!data) return;
  els.projectTaskPrintArea.innerHTML = `${renderFunanTaskSheet(data)}${renderFunanSamplingSheet(data)}`;
}

function saveAndRenderProjectTaskDraft() {
  const values = getProjectTaskValues();
  if (values) localStorage.setItem(FUNAN_MANUAL_FORM_STORAGE_KEY, JSON.stringify(values));
  renderProjectTaskPrintArea();
}

function renderFunanTaskSheet(data) {
  const quantity = data.quantity ? `${normalizeFunanQuantity(data.quantity)}处` : '';
  return `
    <section class="print-page landscape-page task-sheet-page funan-task-page">
      <div class="paper-code">LQHXZ-CX/06-07-0</div>
      <h2>现 场 检 测 任 务 单</h2>
      <div class="paper-meta task-meta"><span class="paper-number">任务编号：${escapeHtml(data.taskNo)}</span><span>第 1 页，共 1 页</span></div>
      <table class="paper-table task-paper">
        <colgroup><col class="funan-c1"><col class="funan-c2"><col class="funan-c3"><col class="funan-c4"><col class="funan-c5"><col class="funan-c6"><col class="funan-c7"><col class="funan-c8"></colgroup>
        <tbody>
          <tr><th>委托单位</th><td colspan="7">${escapeHtml(data.clientName)}</td></tr>
          <tr><th>工程名称</th><td colspan="7">${escapeHtml(data.projectName)}</td></tr>
          <tr><th>工程部位/用途</th><td colspan="3" class="multiline">${escapeHtml(data.usage)}</td><th>委托编号</th><td colspan="3">${escapeHtml(data.entrustNo)}</td></tr>
          <tr><th>样品名称</th><td colspan="3">${escapeHtml(data.sampleName)}</td><th>取样数量</th><td colspan="3">${escapeHtml(quantity)}</td></tr>
          <tr><th>样品规格/型号</th><td colspan="3">${escapeHtml(data.sampleSpec)}</td><th>样品编号</th><td colspan="3">${escapeHtml(data.sampleNo)}</td></tr>
          <tr><th>委托日期</th><td colspan="3">${escapeHtml(data.entrustDate)}</td><th>记录编号</th><td colspan="3">${escapeHtml(data.recordNo)}</td></tr>
          <tr><th>试验项目</th><td colspan="3">${escapeHtml(data.testItem)}</td><th>报告编号</th><td colspan="3">${escapeHtml(data.reportNo)}</td></tr>
          <tr><th>执行标准</th><td colspan="3">${escapeHtml(data.executionStandard)}</td><th>完成日期</th><td colspan="3">${escapeHtml(data.entrustDate)}</td></tr>
          <tr><th>下达部门</th><td colspan="3">${escapeHtml(data.sendDept)}</td><th>接受部门</th><td colspan="3">${escapeHtml(data.receiveDept)}</td></tr>
          <tr><th>下达人</th><td>${escapeHtml(data.sender)}</td><th>日期</th><td>${escapeHtml(data.entrustDate)}</td><th>接受人</th><td></td><th>日期</th><td></td></tr>
          <tr class="task-param-row"><th>取样依据/方法</th><td colspan="7">${escapeHtml(data.method)}</td></tr>
          <tr class="task-param-row"><th>备注</th><td colspan="7"></td></tr>
        </tbody>
      </table>
    </section>
  `;
}

function renderFunanSamplingSheet(data) {
  const sampleLabel = data.sampleSpec || data.sampleName;
  const sampleDate = data.entrustDate || '';
  const copy = () => `
    <table class="paper-table sampling-paper">
      <tbody>
        <tr><th>样品名称</th><td>${escapeHtml(sampleLabel)}</td></tr>
        <tr><th>工程部位/用途</th><td>${escapeHtml(data.usage)}</td></tr>
        <tr><th>取样地点</th><td>${escapeHtml(data.samplingLocation)}</td></tr>
        <tr><th>取样日期</th><td>${escapeHtml(sampleDate)}</td></tr>
        <tr><th>取样人/见证人</th><td>${escapeHtml(data.samplerWitness)}</td></tr>
        <tr><th>备 注</th><td>取样方法：${escapeHtml(data.method)}</td></tr>
      </tbody>
    </table>`;
  return `
    <section class="print-page portrait-page sampling-sheet-page">
      <div class="paper-code">LQHXZ-CX/34-02-0</div>
      <h2>现 场 取 样 单</h2>
      ${copy()}
      ${copy()}
      <div class="sampling-note">注：如采为共同取样，各方都应在取样单上签字，并分别留存一份。</div>
    </section>
  `;
}

function closeProjectTask() {
  state.funanTaskLedgerId = null;
  els.projectTaskModal.hidden = true;
  els.projectTaskControls.classList.remove('funan-manual-controls');
  els.projectTaskControls.innerHTML = '';
  els.projectTaskPrintArea.innerHTML = '';
}

async function confirmAndPrintProjectTask() {
  const values = getProjectTaskValues();
  if (!values) return;
  try {
    els.confirmProjectTaskBtn.disabled = true;
    els.confirmProjectTaskBtn.textContent = '确认中...';
    localStorage.setItem(FUNAN_MANUAL_FORM_STORAGE_KEY, JSON.stringify(values));
    printProjectTask();
    notice('已保存本次内容，并打开两张现场单据的打印窗口');
  } catch (error) {
    showError(error);
  } finally {
    els.confirmProjectTaskBtn.disabled = false;
    els.confirmProjectTaskBtn.textContent = '确认并打印';
  }
}

function printProjectTask() {
  const html = els.projectTaskPrintArea.innerHTML;
  const frame = document.createElement('iframe');
  frame.style.cssText = 'position:fixed;right:0;bottom:0;width:1px;height:1px;border:0;opacity:0;pointer-events:none';
  document.body.appendChild(frame);
  const doc = frame.contentDocument || frame.contentWindow.document;
  doc.open();
  doc.write(`<!doctype html><html><head><meta charset="utf-8"><title>现场检测任务单和现场取样单</title><style>html,body{margin:0;background:#fff}body.print-standalone>#formModal{display:block!important;visibility:visible!important}</style><link id="projectPrintStyles" rel="stylesheet" href="/styles.css?v=${Date.now()}"></head><body class="print-standalone"><div id="formModal"><div class="form-panel"><div class="form-print-area">${html}</div></div></div></body></html>`);
  doc.close();
  let didStartPrint = false;
  const printWhenReady = () => {
    if (didStartPrint) return;
    didStartPrint = true;
    frame.contentWindow.focus();
    frame.contentWindow.print();
    setTimeout(() => frame.remove(), 2000);
  };
  const styleLink = doc.getElementById('projectPrintStyles');
  if (styleLink) {
    styleLink.addEventListener('load', () => setTimeout(printWhenReady, 150), { once: true });
    styleLink.addEventListener('error', printWhenReady, { once: true });
    setTimeout(printWhenReady, 1500);
  } else {
    setTimeout(printWhenReady, 150);
  }
}

function isSoftwareDownloadCategory(category) {
  return category?.templateType === 'auxiliary' && category.name === '软件下载';
}

async function handleSoftwareFileChange(event) {
  const input = event.target.closest('[data-auto-software-file]');
  const file = input?.files?.[0];
  if (!file) return;
  try {
    const formData = new FormData();
    formData.append('softwareFile', file);
    formData.append('categoryId', String(state.selectedCategoryId));
    const response = await fetch('/api/software-upload', { method: 'POST', body: formData, credentials: 'same-origin' });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.message || '软件上传失败');
    notice(`软件已上传：${data.report?.name || file.name}`);
    await loadData();
  } catch (error) {
    showError(error);
  } finally {
    input.value = '';
  }
}

async function handleAutoPdfFileChange(event) {
  const input = event.target.closest('[data-auto-pdf-file]');
  const file = input?.files?.[0];
  if (!file) return;

  if (!/\.pdf$/i.test(file.name)) {
    showError(new Error('只能上传 PDF 文件'));
    input.value = '';
    return;
  }

  if (!state.selectedCategoryId) {
    showError(new Error('请先打开标准规范下载分类后再上传 PDF'));
    input.value = '';
    return;
  }

  try {
    const formData = new FormData();
    formData.append('pdfFile', file);
    formData.append('categoryId', String(state.selectedCategoryId));
    const response = await fetch('/api/reports/pdf-auto-match', {
      method: 'POST',
      body: formData,
      credentials: 'same-origin'
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.message || 'PDF 上传失败');
    notice(`PDF 已上传：${data.report?.name || '标准规范文件'}`);
    await loadData();
  } catch (error) {
    showError(error);
  } finally {
    input.value = '';
  }
}

function isVideoCategorySelected() {
  const selectedCategory = state.categories.find((item) => item.id === state.selectedCategoryId);
  return state.selectedTemplateType === 'video' || selectedCategory?.templateType === 'video';
}

function renderVideos() {
  const keyword = state.search.toLowerCase();
  const selectedCategory = state.categories.find((item) => item.id === state.selectedCategoryId);
  const selectedVideoCategory = selectedCategory?.templateType === 'video' ? selectedCategory.name : '';
  const filtered = state.videos.filter((video) => {
    const text = `${video.title} ${video.category} ${video.lecturer} ${video.fileName} ${video.remarks}`.toLowerCase();
    if (selectedVideoCategory && video.category !== selectedVideoCategory) return false;
    return !keyword || text.includes(keyword);
  });

  els.contentTitle.textContent = selectedVideoCategory ? `检测视频 - ${selectedVideoCategory}` : '检测视频';
  const searchText = state.search ? `，关键词：${state.search}` : '';
  els.reportCount.textContent = `共 ${filtered.length} 个视频${searchText}`;

  if (filtered.length === 0) {
    els.reportList.innerHTML = `
      <div class="empty video-empty">
        暂无检测视频。管理员请先把 mp4 视频放到 ${escapeHtml(state.videoDir || 'E:\\恒信通视频')}，再到管理后台登记。
      </div>
    `;
    return;
  }

  els.reportList.innerHTML = `
    <div class="video-library-list">
      ${filtered.map((video, index) => renderVideoRow(video, index)).join('')}
    </div>
  `;
}

function renderVideoRow(video, index) {
  const teacher = video.lecturer || '暂无讲师';
  const updated = formatTime(video.updatedAt || video.createdAt);
  const titleSequence = String(video.title || '').match(/^\d+/)?.[0];
  const displaySequence = titleSequence || String(index + 1).padStart(2, '0');
  const detailParts = [`讲师：${teacher}`, updated ? `更新：${updated}` : '', video.remarks || ''].filter(Boolean);
  return `
    <article class="video-course-row">
      <div class="video-course-index" aria-hidden="true">${escapeHtml(displaySequence)}</div>
      <div class="video-course-main">
        <h3>${escapeHtml(video.title)}</h3>
        <div class="video-course-meta">${detailParts.map((item) => `<span>${escapeHtml(item)}</span>`).join('')}</div>
      </div>
      <div class="video-course-actions">
        ${canManageTemplates() ? `<button class="video-edit-button" data-action="edit-video" data-video-id="${video.id}" type="button">编辑</button>` : ''}
        <a class="video-download-button" href="/videos/${video.id}/download" title="下载课程" aria-label="下载 ${escapeAttribute(video.title)}">
          <span class="video-download-icon" aria-hidden="true"></span><span>下载</span>
        </a>
        <button class="video-play-button" data-action="play-video" data-video-id="${video.id}" type="button" title="播放课程" aria-label="播放 ${escapeAttribute(video.title)}">
          <span class="video-play-icon" aria-hidden="true"></span><span>播放</span>
        </button>
      </div>
    </article>
  `;
}

async function handleReportListClick(event) {
  const button = event.target.closest('button[data-action]');
  if (!button) return;
  const videoId = Number(button.dataset.videoId);
  const reportId = Number(button.dataset.reportId);
  const action = button.dataset.action;

  if (action === 'open-funan-manual-forms') {
    openProjectTask();
    return;
  }

  if (action === 'open-funan-task') {
    openProjectTask(Number(button.dataset.ledgerId));
    return;
  }

  if (action === 'import-funan-ledger') {
    els.reportList.querySelector('[data-funan-ledger-file]')?.click();
    return;
  }

  if (action === 'paste-funan') {
    await handleFunanPaste();
    return;
  }

  if (action === 'auto-upload-pdf') {
    els.reportList.querySelector('[data-auto-pdf-file]')?.click();
    return;
  }

  if (action === 'auto-upload-software') {
    els.reportList.querySelector('[data-auto-software-file]')?.click();
    return;
  }

  if (action === 'play-video') {
    openVideo(videoId);
    return;
  }

  if (action === 'edit-video') {
    openAdmin();
    setAdminTab('videos');
    fillVideoForm(videoId);
    return;
  }

  if (action === 'preview') {
    openPreview(reportId);
    return;
  }

  if (action === 'upload-pdf') {
    const uploadBox = button.closest('.row-pdf-upload');
    const input = uploadBox?.querySelector('[data-pdf-file]');
    const file = input?.files?.[0];
    if (!file) {
      showError(new Error('请先选择 PDF 文件'));
      return;
    }
    if (!/\.pdf$/i.test(file.name)) {
      showError(new Error('只能上传 PDF 文件'));
      return;
    }
    try {
      button.disabled = true;
      button.textContent = '上传中...';
      const formData = new FormData();
      formData.append('pdfFile', file);
      const response = await fetch(`/api/reports/${reportId}/pdf`, {
        method: 'POST',
        body: formData,
        credentials: 'same-origin'
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || 'PDF 上传失败');
      notice('PDF 已上传，旧版本已保留在版本记录中');
      await loadData();
    } catch (error) {
      showError(error);
    } finally {
      button.disabled = false;
      button.textContent = '上传 PDF';
    }
    return;
  }

  if (action === 'fill') {
    openEntrustForm(reportId);
    return;
  }

  if (action === 'logs') {
    await showLogs(reportId);
    return;
  }

  if (action === 'versions') {
    await openVersions(reportId);
    return;
  }

  if (action === 'edit') {
    openAdmin();
    setAdminTab('upload');
    els.reportSelect.value = String(reportId);
    fillReportFormFromSelection();
    return;
  }

  if (action === 'deactivate') {
    await updateReportActive(reportId, false);
  }
}

async function handleFunanPaste() {
  const input = document.getElementById('funanPasteInput');
  const text = input?.value || '';
  if (!text.trim()) {
    showError(new Error('请先从 Excel 复制一行台账，再粘贴到输入框'));
    return;
  }
  try {
    const data = await api('/api/funan-project/paste', { method: 'POST', body: { text } });
    notice(`已识别 ${data.total} 条台账，正在打开第一条任务单`);
    await loadData();
    const first = (state.funanProject?.records || []).find((record) => data.taskNos.includes(record.taskNo));
    if (first) openProjectTask(first.id);
  } catch (error) {
    showError(error);
  }
}

function openPreview(reportId) {
  const report = state.reports.find((item) => item.id === reportId);
  if (!report) {
    showError(new Error('没有找到这个报告'));
    return;
  }

  const isCalculator = isOnlineTool(report);
  els.previewTitle.textContent = `${isCalculator ? '在线工具' : '预览'}：${report.name}`;
  const previewSubline = document.querySelector('#previewModal .subline');
  if (previewSubline) {
    previewSubline.textContent = isCalculator
      ? '输入数字后自动计算，也可以复制结果。'
      : '优先预览 PDF；Word 和 Excel 可下载查看';
  }
  els.previewBody.innerHTML = renderPreviewBody(report);
  els.previewModal.hidden = false;
}

function closePreview() {
  els.previewModal.hidden = true;
  els.previewBody.innerHTML = '';
}

function openVideo(videoId) {
  const video = state.videos.find((item) => item.id === videoId);
  if (!video) {
    showError(new Error('没有找到这个视频'));
    return;
  }
  els.videoTitle.textContent = video.title;
  els.trainingVideoPlayer.src = `/videos/${video.id}`;
  els.trainingVideoPlayer.playbackRate = 1;
  els.videoModal.querySelectorAll('[data-speed]').forEach((button) => {
    button.classList.toggle('active', button.dataset.speed === '1');
  });
  els.videoModal.hidden = false;
}

function closeVideo() {
  els.trainingVideoPlayer.pause();
  els.trainingVideoPlayer.removeAttribute('src');
  els.trainingVideoPlayer.load();
  els.videoModal.hidden = true;
}

function handleVideoSpeedClick(event) {
  const button = event.target.closest('button[data-speed]');
  if (!button) return;
  const speed = Number(button.dataset.speed);
  if (!speed) return;
  els.trainingVideoPlayer.playbackRate = speed;
  els.videoModal.querySelectorAll('[data-speed]').forEach((item) => {
    item.classList.toggle('active', item === button);
  });
}

function openEntrustForm(reportId) {
  const report = state.reports.find((item) => item.id === reportId);
  if (!report || report.templateType !== 'entrust') {
    showError(new Error('这个按钮只用于委托单/任务单模板'));
    return;
  }

  state.formReportId = reportId;
  els.formTitle.textContent = `正式填写：${report.name}`;
  renderEntrustControls();
  renderEntrustPrintArea();
  els.formModal.hidden = false;
}

window.openEntrustFormDirect = (reportId) => openEntrustForm(Number(reportId));

function closeForm() {
  state.formReportId = null;
  els.formModal.hidden = true;
  els.formControls.innerHTML = '';
  els.formPrintArea.innerHTML = '';
}

function renderEntrustControls() {
  state.quickEntrustBatch = null;
  const today = new Date().toISOString().slice(0, 10);
  els.formControls.innerHTML = `
    <fieldset class="form-group">
      <legend>基础信息</legend>
      <label>
        委托单位
        <select id="formClient">
          ${ENTRUST_CLIENTS.map((item, index) => `<option value="${index}">${escapeHtml(item.name)}</option>`).join('')}
        </select>
      </label>
      <label>
        样品名称
        <select id="formSample">
          ${ENTRUST_SAMPLES.map((item, index) => `<option value="${index}">${escapeHtml(item.name)}</option>`).join('')}
        </select>
      </label>
      <label>
        工程名称
        <input id="formProject" placeholder="自动带出，可修改">
      </label>
      <label>
        工程部位/用途
        <input id="formUsage" value="路基">
      </label>
      <label>
        地址
        <input id="formAddress" value="/">
      </label>
      <label>
        邮编
        <input id="formPostcode" value="/">
      </label>
    </fieldset>

    <fieldset class="form-group">
      <legend>编号和日期</legend>
      <label>
        委托编号
        <input id="formEntrustNo" class="form-readonly" readonly>
      </label>
      <label>
        任务编号
        <input id="formTaskNo" class="form-readonly" readonly>
      </label>
      <label>
        样品流水号
        <input id="formSampleSerial">
      </label>
      <label>
        委托日期
        <input id="formEntrustDate" type="date" value="${today}">
      </label>
      <label>
        接样日期
        <input id="formReceiveDate" type="date" value="${today}">
      </label>
      <label>
        计划完成日期
        <input id="formFinishDate" type="date" value="2026-06-17">
      </label>
    </fieldset>

    <fieldset class="form-group form-group-wide quick-entrust-paste">
      <legend>快速复制任务单</legend>
      <div class="quick-paste-help">从 Excel 复制委托单或任务单的一行（带表头也可以），粘贴后自动识别并填入上方内容。</div>
      <textarea id="quickEntrustPaste" rows="3" placeholder="在 Excel 选中一行或多行后按 Ctrl+C，再粘贴到这里"></textarea>
      <button class="mini primary" data-form-action="parse-quick-entrust" type="button">识别并填表</button>
    </fieldset>

    <fieldset class="form-group" hidden>
      <legend>人员和部门</legend>
      <label>
        委托人
        <input id="formSender" placeholder="可填写姓名">
      </label>
      <label>
        接样人
        <input id="formReceiver" value="${ENTRUST_DEFAULT_RECEIVER}">
      </label>
      <label>
        见证人
        <input id="formWitness" placeholder="可不填">
      </label>
      <label>
        下达部门
        <input id="formSendDept" value="综合部">
      </label>
      <label>
        接受部门
        <input id="formReceiveDept" value="检测部">
      </label>
      <label>
        结算方式
        <select id="formPayType">
          <option value="现金">现金</option>
          <option value="转账">转账</option>
        </select>
      </label>
    </fieldset>

    <fieldset class="form-group form-group-wide" hidden>
      <legend>补充说明</legend>
      <label>
        备注
        <input id="formRemark" placeholder="可填写补充说明">
      </label>
      <div class="form-actions-line">
        <button class="mini primary" data-form-action="create-entrust-record" type="button">正式登记并生成编号</button>
        <button class="mini" data-form-action="save-draft" type="button">保存草稿</button>
        <button class="mini" data-form-action="register-sequence" type="button">登记本次编号</button>
        <button class="mini" data-form-action="load-draft" type="button">读取草稿</button>
        <button class="mini danger-btn" data-form-action="clear-form" type="button">清空重填</button>
      </div>
      <div class="form-tip">提示：下拉菜单会自动带出基础内容；表格里浅黄色格子还能直接点进去修改，适合临时改字。</div>
    </fieldset>

    <fieldset class="form-group form-group-wide" hidden>
      <legend>正式委托台账</legend>
      <div class="form-actions-line">
        <input id="entrustLedgerKeyword" placeholder="搜委托编号、单位、工程、样品">
        <button class="mini" data-form-action="load-entrust-ledger" type="button">刷新台账</button>
        <button class="mini" data-form-action="export-entrust-ledger" type="button">导出台账</button>
      </div>
      <div id="entrustLedgerList" class="ledger-list">
        <div class="empty compact">点击“刷新台账”查看最近登记</div>
      </div>
    </fieldset>
  `;
  applyEntrustDefaults({ resetProject: false, resetSerial: true });
}

function handleEntrustControlChange(event) {
  if (event.target.id === 'formClient' || event.target.id === 'formSample') {
    applyEntrustDefaults({ resetProject: event.target.id === 'formClient', resetSerial: true });
  } else if (event.target.id === 'formEntrustDate') {
    setFormValue('formReceiveDate', readFormValue('formEntrustDate'));
    applyEntrustDefaults({ resetProject: false, resetSerial: false });
  } else if (event.target.id === 'formEntrustNo') {
    syncTaskNoFromEntrustNo();
  } else if (event.target.id === 'formSampleSerial') {
    if (event.type === 'change') {
      setFormValue('formSampleSerial', normalizeSerial(readFormValue('formSampleSerial')));
      syncEntrustNumbersFromSampleSerial();
    } else if (/^\d{4}$/.test(readFormValue('formSampleSerial'))) {
      syncEntrustNumbersFromSampleSerial();
    }
  }
  renderEntrustPrintArea();
}

async function handleEntrustControlClick(event) {
  const button = event.target.closest('[data-form-action]');
  if (!button) return;
  const action = button.dataset.formAction;
  if (action === 'create-entrust-record') {
    await createEntrustRecordFromForm(button);
    return;
  }
  if (action === 'parse-quick-entrust') {
    parseQuickEntrustPaste();
    return;
  }
  if (action === 'save-draft') {
    localStorage.setItem('hxtEntrustDraft', JSON.stringify(collectEntrustDraft()));
    notice('委托单草稿已保存到本机浏览器');
    return;
  }
  if (action === 'register-sequence') {
    registerEntrustSequence();
    applyEntrustDefaults({ resetProject: false, resetSerial: true });
    renderEntrustPrintArea();
    notice('本次编号已登记，下次会自动顺延');
    return;
  }
  if (action === 'load-entrust-ledger') {
    await loadEntrustLedger();
    return;
  }
  if (action === 'export-entrust-ledger') {
    window.location.href = '/api/export/entrust-records';
    return;
  }
  if (action === 'load-draft') {
    const draft = localStorage.getItem('hxtEntrustDraft');
    if (!draft) {
      showError(new Error('本机浏览器里暂时没有草稿'));
      return;
    }
    applyEntrustDraft(JSON.parse(draft));
    applyEntrustDefaults({ resetProject: false, resetSerial: false });
    renderEntrustPrintArea();
    notice('草稿已读取');
    return;
  }
  if (action === 'clear-form') {
    if (!confirm('确定清空当前填写内容吗？只清空网页表单，不会删除模板文件。')) return;
    state.quickEntrustBatch = null;
    renderEntrustControls();
    renderEntrustPrintArea();
    notice('已清空为默认内容');
  }
}

function parseQuickEntrustPaste() {
  const input = document.getElementById('quickEntrustPaste');
  const rows = parseQuickClipboardRows(input?.value || '');
  if (!rows.length) {
    showError(new Error('请先从 Excel 复制委托单或任务单内容，再粘贴到输入框'));
    return;
  }

  const header = rows[0].map((value) => String(value).trim().replace(/[：:]/g, ''));
  const hasHeader = header.some((value) => /委托编号|任务编号|样品编号|工程部位|样品名称|收样时间/.test(value));
  const start = hasHeader ? 1 : 0;
  const column = (patterns, fallback) => {
    const index = hasHeader ? header.findIndex((value) => patterns.some((pattern) => pattern.test(value))) : fallback;
    return index < 0 ? fallback : index;
  };
  const indexes = {
    entrust: column([/委托编号/], 1), task: column([/任务编号/], 2), sampleNo: column([/样品编号/, /样品编码/], 3),
    sampleName: column([/样品名称/, /试样名称/], 5), spec: column([/规格/, /型号/], 6), usage: column([/工程部位/, /用途/], 7),
    quantity: column([/样品数量/, /取样数量/, /数量/], 8), date: column([/收样时间/, /收样日期/, /日期/], 9)
  };
  const inherited = {};
  const items = [];
  let groupEntrustNo = '';
  rows.slice(start).forEach((rawRow) => {
    const row = rawRow.slice();
    const rowEntrustNo = String(row[indexes.entrust] || '').trim();
    if (rowEntrustNo && /^WT-/i.test(rowEntrustNo)) {
      if (!groupEntrustNo) groupEntrustNo = rowEntrustNo;
      if (rowEntrustNo !== groupEntrustNo) return;
    }
    const read = (key) => {
      const value = String(row[indexes[key]] || '').trim();
      if (value) inherited[key] = value;
      return value || inherited[key] || '';
    };
    const sampleNo = read('sampleNo');
    const sampleName = read('sampleName');
    if (!sampleNo && !sampleName) return;
    const parsed = parseSampleCode(sampleNo);
    const matched = ENTRUST_SAMPLES.find((sample) => sample.name === sampleName || sampleName.includes(sample.name));
    const quantityText = read('quantity');
    const quantity = extractQuickQuantity(quantityText, items.length) || quantityText || matched?.quantity || '';
    const sample = {
      ...(matched || ENTRUST_SAMPLES[0]),
      name: sampleName || matched?.name || '样品',
      spec: read('spec') || matched?.spec || '/',
      model: read('spec') || matched?.model || '/',
      quantity,
      usage: read('usage') || matched?.usage || '路基'
    };
    const sampleCode = sampleNo || `YP-${parsed?.year || '2026'}-${parsed?.prefix || 'XJL-'}${parsed?.serial || '0001'}-${parsed?.suffix || 'A13'}`;
    items.push({
      sample, sampleCode,
      recordNo: sampleCode.replace(/^YP-/i, 'JL-'),
      reportNo: sampleCode.replace(/^YP-/i, 'BG-'),
      sampleNo,
      dateText: read('date')
    });
  });
  const firstRow = rows.slice(start).find((row) => row.some((cell) => /WT-|RW-/i.test(String(cell)))) || rows[start] || [];
  const allText = rows.map((row) => row.join(' ')).join(' ');
  const entrustNo = firstRow[indexes.entrust] || (allText.match(/WT-\d{4}-\d{4}-[A-Z]\d{2}/i) || [])[0] || '';
  const taskNo = firstRow[indexes.task] || (allText.match(/RW-\d{4}-\d{4}-[A-Z]\d{2}/i) || [])[0] || '';
  const project = inherited.project || '';
  const dateText = items[0]?.dateText || (allText.match(/20\d{2}[-年\/.]\d{1,2}[-月\/.]\d{1,2}日?/) || [])[0] || '';
  if (!items.length || (!entrustNo && !taskNo)) {
    showError(new Error('没有识别到委托编号、任务编号或样品信息，请复制 Excel 中完整的一行'));
    return;
  }

  const entrustParsed = parseEntrustNo(entrustNo) || parseEntrustNo(taskNo);
  if (entrustParsed) {
    const clientIndex = ENTRUST_CLIENTS.findIndex((client) => client.code.toUpperCase() === entrustParsed.projectCode);
    if (clientIndex >= 0) setFormValue('formClient', clientIndex);
  }
  const sampleIndex = ENTRUST_SAMPLES.findIndex((sample) => sample.name === items[0].sample.name || allText.includes(sample.name));
  if (sampleIndex >= 0) setFormValue('formSample', sampleIndex);
  if (entrustNo) setFormValue('formEntrustNo', entrustNo);
  if (taskNo) setFormValue('formTaskNo', taskNo);
  const serial = extractSampleSerial(items[0].sampleCode) || entrustParsed?.serial;
  if (serial) setFormValue('formSampleSerial', normalizeSerial(serial));
  if (project) setFormValue('formProject', project);
  if (items[0].sample.usage) setFormValue('formUsage', items[0].sample.usage);
  const date = normalizeQuickDate(dateText);
  if (date) {
    setFormValue('formEntrustDate', date);
    setFormValue('formReceiveDate', date);
  }
  state.quickEntrustBatch = {
    entrustNo,
    taskNo,
    items,
    sample: {
      ...items[0].sample,
      name: items.map((item) => item.sample.name).join('\n'),
      spec: items.map((item) => item.sample.spec).join('\n'),
      model: items.map((item) => item.sample.model).join('\n'),
      quantity: items.map((item) => item.sample.quantity).join('\n'),
      usage: items[0].sample.usage
    }
  };
  renderEntrustPrintArea();
  notice(`已识别 1 张委托单、${items.length} 张流转单，请核对后打印`);
}

function parseQuickClipboardRows(text) {
  return String(text || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n')
    .map((line) => line.split('\t').map((cell) => cell.trim()))
    .filter((row) => row.some(Boolean));
}

function findMatchingSampleText(text) {
  return ENTRUST_SAMPLES.find((sample) => String(text).includes(sample.name))?.name || '';
}

function extractSampleSerial(value) {
  const match = String(value || '').match(/-(\d{4})-[A-Z]\d{2}$/i);
  return match?.[1] || '';
}

function normalizeQuickDate(value) {
  const match = String(value || '').match(/(20\d{2})\D(\d{1,2})\D(\d{1,2})/);
  if (!match) return '';
  return `${match[1]}-${String(match[2]).padStart(2, '0')}-${String(match[3]).padStart(2, '0')}`;
}

function extractQuickQuantity(value, index) {
  const matches = String(value || '').match(/\d+(?:\.\d+)?\s*(?:kg|克|组|块)/gi) || [];
  return matches[index] || (matches.length === 1 ? matches[0] : '');
}

function parseSampleCode(value) {
  const match = String(value || '').match(/^YP-(\d{4})-(.+)-(\d{4})-([A-Z]\d{2})$/i);
  if (!match) return null;
  return { year: match[1], prefix: `${match[2]}-`, serial: match[3], suffix: match[4] };
}

async function createEntrustRecordFromForm(button) {
  const data = getEntrustValues();
  try {
    button.disabled = true;
    button.textContent = '正在登记...';
    const response = await api('/api/entrust-records', {
      method: 'POST',
      body: {
        clientName: data.client.name,
        projectName: data.project,
        projectCode: data.client.code,
        sampleName: data.sample.name,
        entrustDate: readFormValue('formEntrustDate'),
        receiveDate: readFormValue('formReceiveDate') || readFormValue('formEntrustDate'),
        receiver: data.receiver,
        sender: data.sender,
        sendDept: data.sendDept,
        receiveDept: data.receiveDept,
        usage: data.sample.usage,
        remark: data.remark,
        samplePrefix: data.sample.samplePrefix,
        sampleSuffix: data.sample.suffix,
        sampleCode: data.sampleCode,
        recordNo: data.recordNo,
        reportNo: data.reportNo
      }
    });
    applyEntrustRecord(response.record);
    renderEntrustPrintArea();
    await loadEntrustLedger();
    notice(`已正式登记：${response.record.entrustNo}`);
  } catch (error) {
    showError(error);
  } finally {
    button.disabled = false;
    button.textContent = '正式登记并生成编号';
  }
}

function applyEntrustRecord(record) {
  setFormValue('formEntrustNo', record.entrustNo);
  setFormValue('formTaskNo', record.taskNo);
  setFormValue('formSampleSerial', record.sampleSerial);
  setFormValue('formEntrustDate', record.entrustDate);
  setFormValue('formReceiveDate', record.receiveDate);
  setFormValue('formReceiver', record.receiver || ENTRUST_DEFAULT_RECEIVER);
}

async function loadEntrustLedger() {
  const list = document.getElementById('entrustLedgerList');
  if (!list) return;
  const keyword = document.getElementById('entrustLedgerKeyword')?.value.trim() || '';
  list.innerHTML = '<div class="empty compact">正在读取台账...</div>';
  try {
    const data = await api(`/api/entrust-records${keyword ? `?keyword=${encodeURIComponent(keyword)}` : ''}`);
    renderEntrustLedger(data.records || []);
  } catch (error) {
    list.innerHTML = `<div class="empty compact">${escapeHtml(error.message)}</div>`;
  }
}

function renderEntrustLedger(records) {
  const list = document.getElementById('entrustLedgerList');
  if (!list) return;
  if (!records.length) {
    list.innerHTML = '<div class="empty compact">暂无委托台账记录</div>';
    return;
  }

  list.innerHTML = `
    <table class="report-table compact-ledger">
      <thead>
        <tr>
          <th>委托编号</th>
          <th>任务编号</th>
          <th>委托单位/工程</th>
          <th>样品</th>
          <th>日期/接样人</th>
        </tr>
      </thead>
      <tbody>
        ${records.map((record) => `
          <tr>
            <td data-label="委托编号">${escapeHtml(record.entrustNo)}</td>
            <td data-label="任务编号">${escapeHtml(record.taskNo)}</td>
            <td data-label="委托单位/工程">
              <div>${escapeHtml(record.clientName)}</div>
              <div class="muted">${escapeHtml(record.projectName)}</div>
            </td>
            <td data-label="样品">
              <div>${escapeHtml(record.sampleName)}</div>
              <div class="muted">流水号：${escapeHtml(record.sampleSerial)}</div>
            </td>
            <td data-label="日期/接样人">
              <div>${escapeHtml(record.entrustDate)} / ${escapeHtml(record.receiveDate)}</div>
              <div class="muted">${escapeHtml(record.receiver)}${record.createdByName ? ` / ${escapeHtml(record.createdByName)}` : ''}</div>
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

function applyEntrustDefaults({ resetProject = false, resetSerial = false } = {}) {
  const client = ENTRUST_CLIENTS[Number(readFormValue('formClient'))] || ENTRUST_CLIENTS[0];
  const sample = ENTRUST_SAMPLES[Number(readFormValue('formSample'))] || ENTRUST_SAMPLES[0];
  const year = (readFormValue('formEntrustDate') || new Date().toISOString().slice(0, 10)).slice(0, 4) || '2026';
  const entrustSerial = getNextEntrustSerial(year, client.code);
  const sampleSerial = resetSerial ? getNextSampleSerial(year, client.code, sample.name) : normalizeSerial(readFormValue('formSampleSerial') || '1');

  setFormValue('formEntrustNo', buildEntrustNo('WT', year, entrustSerial, client.code));
  setFormValue('formTaskNo', buildEntrustNo('RW', year, entrustSerial, client.code));
  setFormValue('formSampleSerial', sampleSerial);
  syncEntrustNumbersFromSampleSerial();
  if (!readFormValue('formReceiver')) setFormValue('formReceiver', ENTRUST_DEFAULT_RECEIVER);
  if (!readFormValue('formReceiveDate')) setFormValue('formReceiveDate', readFormValue('formEntrustDate'));
  if (resetProject || !readFormValue('formProject')) setFormValue('formProject', client.project);
}

function buildEntrustNo(prefix, year, serial, projectCode) {
  return `${prefix}-${year}-${normalizeSerial(serial)}-${projectCode}`;
}

function syncTaskNoFromEntrustNo() {
  const entrustNo = parseEntrustNo(readFormValue('formEntrustNo'));
  if (!entrustNo) return;
  setFormValue('formTaskNo', buildEntrustNo('RW', entrustNo.year, entrustNo.serial, entrustNo.projectCode));
}

function syncEntrustNumbersFromSampleSerial() {
  const sampleSerial = normalizeSerial(readFormValue('formSampleSerial'));
  const entrustNo = parseEntrustNo(readFormValue('formEntrustNo'));
  const taskNo = parseEntrustNo(readFormValue('formTaskNo'));
  if (entrustNo) {
    setFormValue('formEntrustNo', buildEntrustNo('WT', entrustNo.year, sampleSerial, entrustNo.projectCode));
  }
  if (taskNo) {
    setFormValue('formTaskNo', buildEntrustNo('RW', taskNo.year, sampleSerial, taskNo.projectCode));
  }
}

function normalizeSerial(value) {
  const number = Math.max(1, Number.parseInt(String(value || '').replace(/\D/g, ''), 10) || 1);
  return String(number).padStart(4, '0');
}

function readEntrustSequences() {
  try {
    return JSON.parse(localStorage.getItem(ENTRUST_SEQUENCE_STORAGE_KEY) || '{}');
  } catch (_) {
    return {};
  }
}

function writeEntrustSequences(sequences) {
  localStorage.setItem(ENTRUST_SEQUENCE_STORAGE_KEY, JSON.stringify(sequences));
}

function getNextEntrustSerial(year, projectCode) {
  const sequences = readEntrustSequences();
  return normalizeSerial((sequences.entrust?.[`${year}:${projectCode}`] || 0) + 1);
}

function getNextSampleSerial(year, projectCode, sampleName) {
  const sequences = readEntrustSequences();
  return normalizeSerial((sequences.samples?.[`${year}:${projectCode}:${sampleName}`] || 0) + 1);
}

function registerEntrustSequence() {
  const client = ENTRUST_CLIENTS[Number(readFormValue('formClient'))] || ENTRUST_CLIENTS[0];
  const sample = ENTRUST_SAMPLES[Number(readFormValue('formSample'))] || ENTRUST_SAMPLES[0];
  const entrustNo = parseEntrustNo(readFormValue('formEntrustNo'));
  const year = entrustNo?.year || (readFormValue('formEntrustDate') || new Date().toISOString().slice(0, 10)).slice(0, 4) || '2026';
  const entrustSerial = Number.parseInt(entrustNo?.serial || '1', 10) || 1;
  const sampleSerial = Number.parseInt(normalizeSerial(readFormValue('formSampleSerial')), 10) || 1;
  const sequences = readEntrustSequences();

  sequences.entrust = sequences.entrust || {};
  sequences.samples = sequences.samples || {};
  const entrustKey = `${year}:${client.code}`;
  const sampleKey = `${year}:${client.code}:${sample.name}`;
  sequences.entrust[entrustKey] = Math.max(sequences.entrust[entrustKey] || 0, entrustSerial);
  sequences.samples[sampleKey] = Math.max(sequences.samples[sampleKey] || 0, sampleSerial);
  writeEntrustSequences(sequences);
}

function parseEntrustNo(value) {
  const match = String(value || '').match(/^(WT|RW)-(\d{4})-(\d{4})-([A-Z]\d{2})$/i);
  if (!match) return null;
  return {
    prefix: match[1].toUpperCase(),
    year: match[2],
    serial: match[3],
    projectCode: match[4].toUpperCase()
  };
}

function collectEntrustDraft() {
  const ids = [
    'formClient', 'formSample', 'formProject', 'formUsage', 'formAddress', 'formPostcode',
    'formEntrustNo', 'formTaskNo', 'formSampleSerial', 'formEntrustDate', 'formReceiveDate',
    'formFinishDate', 'formSender', 'formReceiver', 'formWitness', 'formSendDept',
    'formReceiveDept', 'formPayType', 'formRemark'
  ];
  return ids.reduce((draft, id) => {
    draft[id] = readFormValue(id);
    return draft;
  }, {});
}

function applyEntrustDraft(draft) {
  Object.entries(draft || {}).forEach(([id, value]) => setFormValue(id, value));
}

function setFormValue(id, value) {
  const input = document.getElementById(id);
  if (input) input.value = value;
}

function readFormValue(id) {
  return document.getElementById(id)?.value || '';
}

function getEntrustValues() {
  const client = ENTRUST_CLIENTS[Number(readFormValue('formClient'))] || ENTRUST_CLIENTS[0];
  const sample = ENTRUST_SAMPLES[Number(readFormValue('formSample'))] || ENTRUST_SAMPLES[0];
  const year = (readFormValue('formEntrustDate') || new Date().toISOString().slice(0, 10)).slice(0, 4) || '2026';
  const entrustSerial = getNextEntrustSerial(year, client.code);
  const entrustNo = readFormValue('formEntrustNo') || buildEntrustNo('WT', year, entrustSerial, client.code);
  const taskNo = readFormValue('formTaskNo') || buildEntrustNo('RW', year, entrustSerial, client.code);
  const serial = normalizeSerial(readFormValue('formSampleSerial') || getNextSampleSerial(year, client.code, sample.name));
  const sampleCode = `YP-${year}-${sample.samplePrefix}${serial}-${sample.suffix}`;
  const recordNo = `JL-${year}-${sample.samplePrefix}${serial}-${sample.suffix}`;
  const reportNo = `BG-${year}-${sample.samplePrefix}${serial}-${sample.suffix}`;

  const data = {
    client,
    sample: {
      ...sample,
      usage: readFormValue('formUsage') || sample.usage,
      origin: getTrialOriginSummary() || sample.origin,
      standard: getCombinedTrialStandards() || getTrialConfigValue('水泥', 'standard', sample.standard),
      params: getCombinedTrialParams() || getTrialConfigValue('水泥', 'params', sample.params)
    },
    entrustNo,
    taskNo,
    project: readFormValue('formProject') || client.project,
    address: readFormValue('formAddress') || '/',
    postcode: readFormValue('formPostcode') || '/',
    entrustDate: formatFormDate(readFormValue('formEntrustDate')),
    receiveDate: formatFormDate(readFormValue('formReceiveDate') || readFormValue('formEntrustDate')),
    finishDate: formatFormDate(readFormValue('formFinishDate')),
    sender: readFormValue('formSender'),
    receiver: readFormValue('formReceiver') || ENTRUST_DEFAULT_RECEIVER,
    witness: readFormValue('formWitness'),
    sendDept: readFormValue('formSendDept') || '综合部',
    receiveDept: readFormValue('formReceiveDept') || '检测部',
    payType: readFormValue('formPayType') || '现金',
    remark: readFormValue('formRemark'),
    sampleCode,
    recordNo,
    reportNo
  };
  if (state.quickEntrustBatch) {
    const batch = state.quickEntrustBatch;
    data.entrustNo = batch.entrustNo || data.entrustNo;
    data.taskNo = batch.taskNo || data.taskNo;
    data.sample = { ...data.sample, ...batch.sample };
    data.sampleCode = batch.items[0]?.sampleCode || data.sampleCode;
    data.recordNo = batch.items[0]?.recordNo || data.recordNo;
    data.reportNo = batch.items[0]?.reportNo || data.reportNo;
    data.taskItems = batch.items;
  }
  return data;
}

function renderEntrustPrintArea() {
  if (!els.formPrintArea) return;
  const data = getEntrustValues();
  const taskItems = data.taskItems?.length ? data.taskItems : [data];
  els.formPrintArea.innerHTML = renderEntrustSheet(data) + taskItems.map((item) => renderTaskSheet({ ...data, ...item })).join('');
}

function getCurrentPrintableFormHtml() {
  const clone = els.formPrintArea.cloneNode(true);
  const sourceInputs = Array.from(els.formPrintArea.querySelectorAll('input'));
  clone.querySelectorAll('input').forEach((input, index) => {
    const source = sourceInputs[index];
    if (!source) return;
    if (source.checked) {
      input.setAttribute('checked', 'checked');
    } else {
      input.removeAttribute('checked');
    }
    input.setAttribute('value', source.value || '');
  });
  return clone.innerHTML;
}

function printFormsOnly() {
  if (!els.formPrintArea || !els.formPrintArea.innerHTML.trim()) {
    window.print();
    return;
  }

  const iframe = document.createElement('iframe');
  iframe.setAttribute('title', 'form-print');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  iframe.style.opacity = '0';
  iframe.style.pointerEvents = 'none';
  document.body.appendChild(iframe);

  const printDocument = iframe.contentDocument || iframe.contentWindow.document;
  printDocument.open();
  printDocument.write(`<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <title>恒信通打印</title>
  <link id="printStyles" rel="stylesheet" href="/styles.css?v=${Date.now()}">
</head>
<body class="print-standalone">
  <div id="formModal">
    <div class="form-panel">
      <div class="form-print-area">
        ${getCurrentPrintableFormHtml()}
      </div>
    </div>
  </div>
</body>
</html>`);
  printDocument.close();

  const removeFrame = () => {
    setTimeout(() => iframe.remove(), 500);
  };

  let didStartPrint = false;
  const startPrint = () => {
    if (didStartPrint) return;
    didStartPrint = true;
    const printWindow = iframe.contentWindow;
    printWindow.onafterprint = removeFrame;
    setTimeout(() => {
      printWindow.focus();
      printWindow.print();
    }, 250);
  };

  const styleLink = printDocument.getElementById('printStyles');
  if (styleLink) {
    styleLink.addEventListener('load', startPrint, { once: true });
    styleLink.addEventListener('error', startPrint, { once: true });
    setTimeout(startPrint, 1200);
  } else {
    startPrint();
  }
}

function renderEntrustSheet(data) {
  return `
    <section class="print-page portrait-page">
      <div class="paper-code">LQHXZ-CX/06-03-0</div>
      <h3>临泉县恒信交通工程试验检测有限公司</h3>
      <h2>试 验 检 测 委 托 书</h2>
      <div class="paper-meta">
        <span class="paper-number">编号：${editableText(data.entrustNo)}</span>
        <span>第1页 共1页</span>
      </div>
      <div class="archive-mark">第一联:存档</div>
      <table class="paper-table entrust-paper">
        <colgroup>
          <col class="c-vertical">
          <col class="c-label">
          <col class="c-main">
          <col class="c-main">
          <col class="c-main">
          <col class="c-label">
          <col class="c-main">
        </colgroup>
        <tbody>
          <tr>
            <th class="vertical" rowspan="14">送样人填写</th>
            <th>委托单位</th>
            <td colspan="3">${editableText(data.client.name)}</td>
            <th>委托日期</th>
            <td>${editableText(data.entrustDate)}</td>
          </tr>
          <tr>
            <th>地址</th>
            <td colspan="3">${editableText(data.address)}</td>
            <th>邮编</th>
            <td>${editableText(data.postcode)}</td>
          </tr>
          <tr>
            <th>工程名称</th>
            <td colspan="5">${editableText(data.project)}</td>
          </tr>
          <tr>
            <th>样品名称</th>
            <td colspan="3"><span class="editable-print multiline sample-name-print" contenteditable="true">${escapeHtml(getTrialCategorySummary(data))}</span></td>
            <th>规格或型号</th>
            <td><span class="editable-print multiline trial-spec-print" contenteditable="true">${escapeHtml(getTrialSpecSummary(data) || data.sample.model || data.sample.spec || '')}</span></td>
          </tr>
          <tr>
            <th>来样数量/组数</th>
            <td colspan="3"><span class="editable-print sample-quantity-print" contenteditable="true">${escapeHtml(getTrialFieldSummary(data, 'quantity'))}</span></td>
            <th>备样组数</th>
            <td>${editableText('/')}</td>
          </tr>
          <tr>
            <th>样品产地</th>
            <td colspan="3"><span class="editable-print multiline trial-origin-print" contenteditable="true">${escapeHtml(data.origin || data.sample.origin || '')}</span></td>
            <th>检测类别</th>
            <td>${editableText(data.sample.category)}</td>
          </tr>
          <tr>
            <th>批号</th>
            <td colspan="3">${editableText('/')}</td>
            <th>质保书</th>
            <td><span class="check" data-check-group="warranty"></span>有 <span class="check" data-check-group="warranty"></span>无 <span class="check" data-check-group="warranty"></span>后送</td>
          </tr>
          <tr>
            <th>试样外观</th>
            <td colspan="3"><span class="editable-print multiline sample-appearance-print" contenteditable="true">${escapeHtml(getTrialFieldSummary(data, 'appearance'))}</span></td>
            <th>工程部位/用途</th>
            <td>${editableText(data.sample.usage)}</td>
          </tr>
          <tr>
            <th>委托试验参数</th>
            <td colspan="5"><span class="editable-print multiline trial-params-print" contenteditable="true">${escapeHtml(data.sample.params || '')}</span></td>
          </tr>
          <tr>
            <th>建议依据标准</th>
            <td colspan="3"><span class="editable-print multiline trial-standard-print" contenteditable="true">${escapeHtml(data.sample.standard || '')}</span></td>
            <th>判定依据</th>
            <td>${editableText(data.sample.judge)}</td>
          </tr>
          <tr>
            <th>试验类别</th>
            <td colspan="5" class="trial-cell">
              <div class="trial-types">
                ${trialCheckbox('土（TGJ）')}
                ${trialCheckbox('粗集料（CJL）')}
                ${trialCheckbox('细集料（XJL）')}
                ${trialCheckbox('填料（TLJ）')}
                ${trialCheckbox('岩石（YSJ）')}
                ${trialCheckbox('水泥（SNJ）')}
                ${trialCheckbox('水泥混凝土（TYH）')}
                ${trialCheckbox('砂浆（SYH）')}
                ${trialCheckbox('外加剂（WJJ）')}
                ${trialCheckbox('水（SYJ）')}
                ${trialCheckbox('掺和料（CHL）')}
                ${trialCheckbox('无机结合料（WJL）', true)}
                ${trialCheckbox('石灰（SHJ）')}
                ${trialCheckbox('沥青（LQT）')}
                ${trialCheckbox('沥青混合料（LQL）')}
                ${trialCheckbox('钢材与连接接头（GJJ）')}
                ${trialCheckbox('路基路面（XCJ）')}
                ${trialCheckbox('混凝土结构（JGT）')}
                ${trialCheckbox('基桩、地基与基桩（CZL）')}
                ${trialCheckbox('水泥混凝土拌合物（TBH）')}
                ${trialCheckbox('交通安全设施（JAJ）')}
                ${trialCheckbox('其它（QT）')}
                ${trialCheckbox('矿料级配合比（KPB）')}
                ${trialCheckbox('水泥混凝土配合比（TPB）')}
                ${trialCheckbox('水泥砂浆拌合物（SBH）')}
                ${trialCheckbox('水泥砂浆配合比（SPB）')}
                ${trialCheckbox('基桩完整性、地基承载力（DJJ）')}
              </div>
            </td>
          </tr>
          <tr>
            <th>其它说明</th>
            <td colspan="5">${editableText(data.remark || '/', true)}</td>
          </tr>
          <tr class="signature-row">
            <th>委托人（签字）</th>
            <td colspan="2">${editableText(data.sender)}</td>
            <th>见证人（签字）</th>
            <td colspan="2">${editableText(data.witness)}</td>
          </tr>
          <tr class="signature-row">
            <th>联系电话</th>
            <td colspan="2">${editableText('')}</td>
            <th>联系电话</th>
            <td colspan="2">${editableText('')}</td>
          </tr>
          <tr>
            <th class="vertical" rowspan="5">接样人填写</th>
            <th>样品外观检查</th>
            <td colspan="5">对送样人的样品外观描述进行确认：<span class="check" data-check-group="appearance"></span>认同 <span class="check" data-check-group="appearance"></span>不认同 <span class="paper-line"></span></td>
          </tr>
          <tr>
            <th>接样日期</th>
            <td colspan="2">${editableText('')}</td>
            <th>计划完成日期</th>
            <td colspan="2">${editableText(data.finishDate)}</td>
          </tr>
          <tr>
            <th>接样人（签字）</th>
            <td colspan="2">${editableText('')}</td>
            <th>结算方式</th>
            <td colspan="2"><span class="check" data-check-group="payment"></span>现金 <span class="check" data-check-group="payment"></span>转账</td>
          </tr>
          <tr>
            <th>费用总额（元）</th>
            <td colspan="5">${editableText('人民币（大写）：                              （￥：              元）')}</td>
          </tr>
          <tr>
            <th>备 注</th>
            <td colspan="5">${editableText('', true)}</td>
          </tr>
        </tbody>
      </table>
      <div class="paper-footer">
        <span>地址：临泉县单桥镇220国道东侧</span>
        <span>邮编：236400</span>
        <span>电话(传真）：0558-3961988</span>
      </div>
    </section>
  `;
}

function renderTaskSheet(data) {
  return `
    <section class="print-page landscape-page task-sheet-page">
      <div class="paper-code">LQHXZ-CX/06-04-0</div>
      <h2>室 内 检 测 任 务 流 转 单</h2>
      <div class="paper-meta task-meta">
        <span class="paper-number">任务编号：${editableText(data.taskNo)}</span>
      </div>
      <table class="paper-table task-paper">
        <colgroup>
          <col class="task-c-label">
          <col class="task-c-main">
          <col class="task-c-small">
          <col class="task-c-date">
          <col class="task-c-label">
          <col class="task-c-main">
          <col class="task-c-small">
          <col class="task-c-date">
        </colgroup>
        <tbody>
          <tr>
            <th>试样名称</th>
            <td colspan="3">${editableText(data.sample.name)}</td>
            <th>试样数量/组数</th>
            <td colspan="3">${editableText(data.sample.quantity)}</td>
          </tr>
          <tr>
            <th>试样规格/型号</th>
            <td colspan="3">${editableText(data.sample.spec)}</td>
            <th>样品编号</th>
            <td colspan="3">${editableText(data.sampleCode)}</td>
          </tr>
          <tr>
            <th>工程部位/用途</th>
            <td colspan="3">${editableText(data.sample.usage)}</td>
            <th>记录编号</th>
            <td colspan="3">${editableText(data.recordNo)}</td>
          </tr>
          <tr>
            <th>来样日期</th>
            <td colspan="3">${editableText(data.entrustDate)}</td>
            <th>报告编号</th>
            <td colspan="3">${editableText(data.reportNo)}</td>
          </tr>
          <tr class="task-param-row">
            <th>试验参数</th>
            <td colspan="7">${editableText(data.sample.params, true)}</td>
          </tr>
          <tr>
            <th>采用标准</th>
            <td colspan="3">${editableText(data.sample.standard, true)}</td>
            <th>完成日期</th>
            <td colspan="3">${editableText(data.finishDate)}</td>
          </tr>
          <tr>
            <th>下达部门</th>
            <td colspan="3">${editableText(data.sendDept)}</td>
            <th>接受部门</th>
            <td colspan="3">${editableText(data.receiveDept)}</td>
          </tr>
          <tr>
            <th>下达人</th>
            <td>${editableText(data.receiver)}</td>
            <th>日期</th>
            <td class="task-date-cell">${editableText(data.receiveDate)}</td>
            <th>接受人</th>
            <td>${editableText('')}</td>
            <th>日期</th>
            <td class="task-date-cell">${editableText('')}</td>
          </tr>
          <tr>
            <th>样品外观描述</th>
            <td colspan="4">${editableText(data.sample.appearance, true)}</td>
            <td colspan="3" class="task-note">注：领样人与样品管理员共同确认样品外观描述无异议后，在下一栏完成签字领样工作。</td>
          </tr>
          <tr>
            <th>领样人</th>
            <td>${editableText('')}</td>
            <th>日期</th>
            <td class="task-date-cell">${editableText('')}</td>
            <th>样品管理员</th>
            <td>${editableText('')}</td>
            <th>日期</th>
            <td class="task-date-cell">${editableText('')}</td>
          </tr>
          <tr>
            <th>备注</th>
            <td colspan="7">${editableText(data.remark || '', true)}</td>
          </tr>
        </tbody>
      </table>
    </section>
  `;
}

function trialCheckbox(label, checked = false) {
  const name = label.replace(/（[^）]*）/g, '').replace(/\([^)]*\)/g, '').trim();
  const countControl = name === '粗集料' ? `
      <select class="trial-count" data-trial-count="粗集料" aria-label="粗集料重复数量">
        ${Array.from({ length: 6 }, (_, index) => `<option value="${index + 1}">${index + 1}</option>`).join('')}
      </select>
    ` : '';
  return `
    <label class="trial-check">
      <span>${escapeHtml(label)}</span>
      <input type="checkbox" data-trial-name="${escapeHtml(name)}" ${checked ? 'checked' : ''}>
      ${countControl}
    </label>
  `;
}

function getTrialCategorySummary(data) {
  const selected = data.trialTypes?.length ? data.trialTypes : ['无机结合料'];
  const names = selected.map((name) => TRIAL_DISPLAY_NAMES[name] || name);
  return names.length === 1 ? names[0] : names.map((name, index) => `${index + 1}、${name}`).join('，');
}

const TRIAL_DISPLAY_NAMES = {
  '水泥混凝土': '水泥混凝土试件'
};

const TRIAL_FIELD_DEFAULTS = {
  '粗集料': { quantity: '150kg', appearance: '粗集料青灰色、干燥、无杂物' },
  '细集料': { quantity: '150kg', appearance: '细集料青灰色、洁净、无杂质' },
  '水泥': { quantity: '50kg', appearance: '水泥袋装、灰色、干燥无结团' },
  '水泥混凝土': { quantity: '3块/1组', appearance: '正方体、完整、无缺陷' },
  '外加剂': { quantity: '20kg', appearance: '外加剂液态，无沉淀物' },
  '掺和料': { quantity: '30kg', appearance: '' }
};

function getSelectedTrialNames() {
  return Array.from(els.formPrintArea.querySelectorAll('input[data-trial-name]:checked'))
    .flatMap((input) => {
      const name = input.dataset.trialName;
      const count = name === '粗集料'
        ? Number(els.formPrintArea.querySelector('[data-trial-count="粗集料"]')?.value || 1)
        : 1;
      return Array.from({ length: count }, () => name);
    });
}

function getTrialFieldSummary(data, field) {
  const selected = data.trialTypes?.length ? data.trialTypes : getSelectedTrialNames();
  if (!selected.length) return data.sample[field] || '';
  const values = selected.map((name) => {
    const value = state.trialDetails[name]?.[field] ?? TRIAL_FIELD_DEFAULTS[name]?.[field] ?? data.sample[field] ?? '';
    if (field !== 'quantity' || !value) return value;
    return name === '水泥混凝土' ? value : `${name}${value}`;
  });
  return values.length === 1 ? values[0] : values.map((value, index) => `${index + 1}、${value}`).join('  ');
}

function getTrialSpecSummary(data) {
  const selected = data.trialTypes?.length ? data.trialTypes : getSelectedTrialNames();
  const values = selected.map((name) => state.trialDetails[name]?.spec).filter(Boolean);
  return values.length <= 1 ? values[0] || '' : values.map((value, index) => `${index + 1}、${value}`).join('  ');
}

function getTrialConfigValue(name, field, fallback) {
  return state.trialDetails[name]?.[field] || fallback;
}

function handleTrialTypeChange(event) {
  if (!event.target.matches('input[data-trial-name], select[data-trial-count]')) return;
  if (event.target.matches('select[data-trial-count]')) {
    updateTrialTypeSummaries();
    return;
  }
  const name = event.target.dataset.trialName;
  if (event.target.checked && TRIAL_FIELD_DEFAULTS[name]) {
    if (name === '粗集料' || name === '细集料') {
      event.target.checked = false;
      openAggregateSelectionDialog(name);
      return;
    }
    const preset = TRIAL_FIELD_DEFAULTS[name];
    const quantity = window.prompt(`请输入${name}的来样数量/组数`, state.trialDetails[name]?.quantity || preset.quantity);
    if (quantity === null) {
      event.target.checked = false;
      return;
    }
    state.trialDetails[name] = { ...preset, quantity: quantity.trim() || preset.quantity };
    if (name === '水泥') {
      event.target.checked = false;
      openCementSelectionDialog();
      return;
    }
    if (ORIGIN_TRIAL_NAMES.has(name)) {
      openOriginSelectionDialog();
      return;
    }
  }
  if (event.target.checked && ORIGIN_TRIAL_NAMES.has(name)) {
    openOriginSelectionDialog();
    return;
  }
  updateTrialTypeSummaries();
}

function updateTrialTypeSummaries() {
  const selected = getSelectedTrialNames();
  const target = els.formPrintArea.querySelector('.sample-name-print');
  if (target) target.textContent = getTrialCategorySummary({ trialTypes: selected });
  const quantityTarget = els.formPrintArea.querySelector('.sample-quantity-print');
  if (quantityTarget) quantityTarget.textContent = getTrialFieldSummary({ sample: { quantity: '' }, trialTypes: selected }, 'quantity');
  const appearanceTarget = els.formPrintArea.querySelector('.sample-appearance-print');
  if (appearanceTarget) appearanceTarget.textContent = getTrialFieldSummary({ sample: { appearance: '' }, trialTypes: selected }, 'appearance');
  const specTarget = els.formPrintArea.querySelector('.trial-spec-print');
  if (specTarget) specTarget.textContent = getTrialSpecSummary({ trialTypes: selected });
  const standardTarget = els.formPrintArea.querySelector('.trial-standard-print');
  const paramsTarget = els.formPrintArea.querySelector('.trial-params-print');
  if (standardTarget && getCombinedTrialStandards()) standardTarget.textContent = getCombinedTrialStandards();
  if (paramsTarget && getCombinedTrialParams()) paramsTarget.textContent = getCombinedTrialParams();
  const originTarget = els.formPrintArea.querySelector('.trial-origin-print');
  if (originTarget) originTarget.textContent = getTrialOriginSummary();
}

const ORIGIN_TRIAL_NAMES = new Set(['细集料', '粗集料', '水泥', '外加剂', '填料', '沥青', '石灰', '钢材与连接接头']);

function getTrialOriginSummary() {
  if (!els.formPrintArea) return '';
  const names = getSelectedTrialNames().filter((name) => ORIGIN_TRIAL_NAMES.has(name));
  const values = names.map((name) => {
    const origin = state.trialDetails[name]?.origin || '';
    return origin ? `${name}：${origin}` : '';
  }).filter(Boolean);
  return values.length <= 1 ? values[0] || '' : values.map((value, index) => `${index + 1}、${value}`).join('  ');
}

async function openOriginSelectionDialog() {
  const names = [...new Set(getSelectedTrialNames())].filter((name) => ORIGIN_TRIAL_NAMES.has(name));
  if (!names.length) return;
  await loadSampleOrigins();
  document.getElementById('originSelectionDialog')?.remove();
  const dialog = document.createElement('div');
  dialog.id = 'originSelectionDialog';
  dialog.className = 'selection-dialog-backdrop';
  dialog.innerHTML = `
    <section class="selection-dialog origin-dialog" role="dialog" aria-modal="true">
      <header><strong>确认样品产地</strong><button type="button" data-origin-action="close">×</button></header>
      <div class="origin-fields">
        ${names.map((name) => `<label><strong>${escapeHtml(name)}</strong><input data-origin-name="${escapeHtml(name)}" list="origin-options-${escapeHtml(name)}" value="${escapeHtml(state.trialDetails[name]?.origin || '')}" placeholder="请输入${escapeHtml(name)}产地"><datalist id="origin-options-${escapeHtml(name)}">${(state.sampleOrigins[name] || []).map((origin) => `<option value="${escapeHtml(origin)}"></option>`).join('')}</datalist></label>`).join('')}
      </div>
      <footer><span class="muted">输入内容会自动保存到当前委托单</span><button type="button" class="mini" data-origin-action="close">完成</button></footer>
    </section>`;
  document.body.appendChild(dialog);
  dialog.addEventListener('input', (event) => {
    const input = event.target.closest('[data-origin-name]');
    if (!input) return;
    const name = input.dataset.originName;
    state.trialDetails[name] = { ...(state.trialDetails[name] || {}), origin: input.value };
    const target = els.formPrintArea.querySelector('.trial-origin-print');
    if (target) target.textContent = getTrialOriginSummary();
  });
  dialog.addEventListener('change', async (event) => {
    const input = event.target.closest('[data-origin-name]');
    if (!input || !input.value.trim()) return;
    const name = input.dataset.originName;
    state.trialDetails[name] = { ...(state.trialDetails[name] || {}), origin: input.value.trim() };
    try {
      await api('/api/sample-origins', { method: 'POST', body: { sampleName: name, origin: input.value.trim() } });
      state.sampleOrigins[name] = [...new Set([...(state.sampleOrigins[name] || []), input.value.trim()])].sort();
    } catch (error) {
      showError(error);
    }
  });
  dialog.addEventListener('click', (event) => {
    if (event.target.closest('[data-origin-action="close"]')) dialog.remove();
  });
}

async function loadSampleOrigins() {
  try {
    const data = await api('/api/sample-origins');
    state.sampleOrigins = (data.origins || []).reduce((result, item) => {
      result[item.sampleName] = result[item.sampleName] || [];
      result[item.sampleName].push(item.origin);
      return result;
    }, {});
  } catch (error) {
    // 产地历史读取失败时仍允许手工填写当前表单。
  }
}

const CEMENT_OPTIONS = [
  { standard: 'GB/T 1346-2024', title: '水泥标准稠度用水量、凝结时间、安定性试验', params: ['标准稠度用水量（基准法）', '标准稠度用水量（代用法）', '凝结时间（标准法）', '凝结时间（代用法）', '安定性（标准法）', '安定性（代用法）'], quantity: '1', unit: '组' },
  { standard: 'GB/T 17671-2021', title: '水泥胶砂强度试验（ISO法）', params: ['抗压强度', '抗折强度'], quantity: '1', unit: '组' },
  { standard: 'GB/T 176-2025', title: '水泥氯离子含量试验（硫氰酸铵容量法）', params: ['水泥氯离子含量试验（滴定法）', '水泥氯离子含量试验（电位滴定法）'], quantity: '50', unit: 'kg' },
  { standard: 'GB/T 1345-2026', title: '水泥细度试验（筛析法）', params: ['水泥细度试验（筛析法）'], quantity: '50', unit: 'kg' },
  { standard: 'JTG 3420-2020', title: '公路工程水泥及水泥混凝土试验相关项目', params: ['水泥细度试验', '水泥标准稠度用水量、凝结时间、安定性试验', '水泥胶砂强度试验（ISO法）', '碱含量试验（火焰光度法）'], quantity: '50', unit: 'kg' }
];

const AGGREGATE_OPTIONS = {
  '粗集料': [
    { standard: 'JTG 3432-2024', title: '粗集料常用试验', params: ['粗集料筛分试验（水洗法）', '粗集料密度及吸水率试验（容量瓶法）', '粗集料堆积密度及空隙率试验', '粗集料含泥量及泥块含量试验', '粗集料针、片状颗粒含量试验（规准仪法）', '粗集料针、片状颗粒含量试验（卡尺法）', '粗集料压碎值试验'], quantity: '150', unit: 'kg' },
    { standard: 'JTG 3410-2025', title: '沥青与粗集料黏附性试验（水煮法）', params: ['沥青与粗集料黏附性试验（水煮法）'], quantity: '150', unit: 'kg' }
  ],
  '细集料': [
    { standard: 'JTG 3432-2024', title: '细集料常用试验', params: ['细集料筛分试验（水洗法）', '细集料表观密度试验（容量瓶法）', '细集料堆积密度及空隙率试验', '细集料含泥量及泥块含量试验'], quantity: '150', unit: 'kg' },
    { standard: 'JTG 3432-2024', title: '细集料含水率试验', params: ['细集料含水率试验（烘干法）'], quantity: '150', unit: 'kg' }
  ]
};

const AGGREGATE_SPECS = {
  '细集料': ['(0-4.75)', '(0-5)'],
  '粗集料': ['(5-10)', '(10-20)', '(10-30)']
};

function openAggregateSelectionDialog(name) {
  const id = 'aggregateSelectionDialog';
  document.getElementById(id)?.remove();
  const options = AGGREGATE_OPTIONS[name] || [];
  const dialog = document.createElement('div');
  dialog.id = id;
  dialog.className = 'selection-dialog-backdrop';
  dialog.innerHTML = `
    <section class="selection-dialog" role="dialog" aria-modal="true">
      <header><strong>${escapeHtml(name)}标准、数量和试验参数</strong><button type="button" data-aggregate-action="close">×</button></header>
      <div class="cement-options">
        <label class="aggregate-quantity">来样数量 <input data-aggregate-quantity value="150"> 单位 <input data-aggregate-unit value="kg"></label>
        <label class="aggregate-spec">规格或型号 <select data-aggregate-spec><option value="">请选择</option>${(AGGREGATE_SPECS[name] || []).map((spec) => `<option value="${escapeHtml(spec)}" ${state.trialDetails[name]?.spec === spec ? 'selected' : ''}>${escapeHtml(spec)}</option>`).join('')}</select></label>
        ${options.map((item, index) => `<article class="cement-option">
          <h4><label><input type="checkbox" data-aggregate-standard value="${escapeHtml(item.standard)}"> ${escapeHtml(item.standard)}</label></h4>
          <div class="cement-title">${escapeHtml(item.title)}</div>
          <div class="cement-params">${item.params.map((param) => `<label><input type="checkbox" data-aggregate-param value="${escapeHtml(param)}">${escapeHtml(param)}</label>`).join('')}</div>
        </article>`).join('')}
      </div>
      <footer><button type="button" class="mini" data-aggregate-action="close">取消</button><button type="button" class="mini primary" data-aggregate-action="confirm" data-aggregate-name="${escapeHtml(name)}">确定</button></footer>
    </section>`;
  document.body.appendChild(dialog);
  dialog.addEventListener('click', (event) => {
    const action = event.target.closest('[data-aggregate-action]')?.dataset.aggregateAction;
    if (action === 'close') dialog.remove();
    if (action === 'confirm') confirmAggregateSelection(dialog, name);
  });
}

function confirmAggregateSelection(dialog, name) {
  const standards = Array.from(dialog.querySelectorAll('[data-aggregate-standard]:checked')).map((input) => input.value);
  const params = Array.from(dialog.querySelectorAll('[data-aggregate-param]:checked')).map((input) => input.value);
  const quantity = `${dialog.querySelector('[data-aggregate-quantity]')?.value.trim() || '150'}${dialog.querySelector('[data-aggregate-unit]')?.value.trim() || 'kg'}`;
  const spec = dialog.querySelector('[data-aggregate-spec]')?.value || '';
  state.trialDetails[name] = { ...TRIAL_FIELD_DEFAULTS[name], quantity, spec, standard: standards.join('、'), params: params.join('、') };
  const input = els.formPrintArea.querySelector(`input[data-trial-name="${name}"]`);
  if (input) input.checked = true;
  dialog.remove();
  updateTrialTypeSummaries();
  openOriginSelectionDialog();
  els.formPrintArea.querySelector('.trial-standard-print').textContent = getCombinedTrialStandards();
  els.formPrintArea.querySelector('.trial-params-print').textContent = getCombinedTrialParams();
}

function getCombinedTrialStandards() {
  return [...new Set(getSelectedTrialNames().map((name) => state.trialDetails[name]?.standard).filter(Boolean))][0] || '';
}

function getCombinedTrialParams() {
  const values = getSelectedTrialNames().map((name) => state.trialDetails[name]?.params).filter(Boolean);
  return values.length <= 1 ? values[0] || '' : values.map((value, index) => `${index + 1}、${value}`).join('  ');
}

function openCementSelectionDialog() {
  const existing = document.getElementById('cementSelectionDialog');
  if (existing) existing.remove();
  const dialog = document.createElement('div');
  dialog.id = 'cementSelectionDialog';
  dialog.className = 'selection-dialog-backdrop';
  dialog.innerHTML = `
    <section class="selection-dialog" role="dialog" aria-modal="true" aria-labelledby="cementDialogTitle">
      <header><strong id="cementDialogTitle">水泥标准、数量和试验参数</strong><button type="button" data-cement-action="close">×</button></header>
      <div class="cement-options">
        ${CEMENT_OPTIONS.map((item, index) => `
          <article class="cement-option">
            <h4><label><input type="checkbox" data-cement-standard value="${index}" ${index === 0 ? 'checked' : ''}> ${item.standard}</label></h4>
            <div class="cement-title">${escapeHtml(item.title)}</div>
            <label class="cement-quantity">数量 <input data-cement-quantity value="${escapeHtml(item.quantity)}"> 单位 <input data-cement-unit value="${escapeHtml(item.unit)}"></label>
            <div class="cement-params">${item.params.map((param, paramIndex) => `<label><input type="checkbox" data-cement-param value="${escapeHtml(param)}" ${paramIndex === 0 ? 'checked' : ''}>${escapeHtml(param)}</label>`).join('')}</div>
          </article>
        `).join('')}
      </div>
      <footer><button type="button" class="mini" data-cement-action="close">取消</button><button type="button" class="mini primary" data-cement-action="confirm">确定</button></footer>
    </section>`;
  document.body.appendChild(dialog);
  dialog.addEventListener('click', handleCementDialogClick);
}

function handleCementDialogClick(event) {
  const action = event.target.closest('[data-cement-action]')?.dataset.cementAction;
  if (action === 'close') {
    document.getElementById('cementSelectionDialog')?.remove();
    updateTrialTypeSummaries();
    return;
  }
  if (action !== 'confirm') return;
  const dialog = document.getElementById('cementSelectionDialog');
  const cards = Array.from(dialog?.querySelectorAll('.cement-option') || []).filter((card) => card.querySelector('[data-cement-standard]:checked'));
  if (!cards.length) return;
  const standards = cards.map((card) => CEMENT_OPTIONS[Number(card.querySelector('[data-cement-standard]').value)].standard);
  const params = cards.flatMap((card) => Array.from(card.querySelectorAll('[data-cement-param]:checked')).map((input) => input.value));
  const firstCard = cards[0];
  const quantity = `${firstCard.querySelector('[data-cement-quantity]')?.value.trim() || '50'}${firstCard.querySelector('[data-cement-unit]')?.value.trim() || 'kg'}`;
  state.trialDetails['水泥'] = { ...TRIAL_FIELD_DEFAULTS['水泥'], quantity, standard: standards.join('、'), params: [...new Set(params)].join('、') };
  const cementInput = els.formPrintArea.querySelector('input[data-trial-name="水泥"]');
  if (cementInput) cementInput.checked = true;
  dialog.remove();
  updateTrialTypeSummaries();
  openOriginSelectionDialog();
  const standardTarget = els.formPrintArea.querySelector('.trial-standard-print');
  const paramsTarget = els.formPrintArea.querySelector('.trial-params-print');
  if (standardTarget) standardTarget.textContent = standards[0];
  if (paramsTarget) paramsTarget.textContent = [...new Set(params)].join('、');
}

function handlePrintCheckClick(event) {
  const check = event.target.closest('.check[data-check-group]');
  if (!check || !els.formPrintArea.contains(check)) return;
  const group = check.dataset.checkGroup;
  els.formPrintArea.querySelectorAll(`.check[data-check-group="${group}"]`).forEach((item) => {
    item.classList.toggle('checked', item === check);
  });
}

function editableText(value, multiline = false) {
  return `<span class="editable-print ${multiline ? 'multiline' : ''}" contenteditable="true">${escapeHtml(value || '')}</span>`;
}

function formatFormDate(value) {
  if (!value) return '';
  const parts = value.split('-');
  if (parts.length !== 3) return value;
  return `${parts[0]}年${parts[1]}月${parts[2]}日`;
}

function renderPreviewBody(report) {
  if (isRoundingCalculator(report)) return renderRoundingCalculator();
  if (isSandCompactionCalculator(report)) return renderSandCompactionCalculator();
  if (isMileageSplitCalculator(report)) return renderMileageSplitCalculator();
  if (isCircledNumberDesigner(report)) return renderCircledNumberDesigner();
  if (isQuestionBankTool(report)) return renderQuestionBankTool();

  const downloadLinks = `
    <div class="preview-downloads">
      ${report.hasWord ? `<a class="file-btn" href="/download/${report.id}/word">下载 Word</a>` : ''}
      ${report.hasPdf ? `<a class="file-btn" href="/download/${report.id}/pdf">下载 PDF</a>` : ''}
      ${report.hasExcel ? `<a class="file-btn excel" href="/download/${report.id}/excel">下载 Excel</a>` : ''}
    </div>
  `;

  if (report.hasPdf) {
    return `
      <div class="preview-toolbar">
        <div>
          <strong>${escapeHtml(report.name)}</strong>
          <div class="muted">PDF 可直接预览，Word 和 Excel 可下载查看。</div>
        </div>
        ${downloadLinks}
      </div>
      <iframe class="pdf-frame" src="/preview/${report.id}/pdf#toolbar=1"></iframe>
    `;
  }

  const availableFiles = [
    report.hasWord ? 'Word' : '',
    report.hasExcel ? 'Excel' : ''
  ].filter(Boolean).join('、') || '暂无可查看文件';

  return `
    <div class="preview-empty">
      <span class="eye-icon big" aria-hidden="true"></span>
      <h3>这个报告暂时不能直接预览</h3>
      <p>网页里直接预览优先支持 PDF。当前文件：${escapeHtml(availableFiles)}。</p>
      <p>可以先下载到电脑里，用 Word 或 Excel 打开查看。</p>
      ${downloadLinks}
    </div>
  `;
}

function isRoundingCalculator(report) {
  return report && report.name === '约修计算器' && (report.templateType === 'auxiliary' || report.categoryName === '辅助检测');
}

function isSandCompactionCalculator(report) {
  return report && report.name === '灌砂法压实度计算器' && (report.templateType === 'auxiliary' || report.categoryName === '辅助检测');
}

function isMileageSplitCalculator(report) {
  return report && report.name === 'K公里数拆分工具' && (report.templateType === 'auxiliary' || report.categoryName === 'K公里数拆分');
}

function isCircledNumberDesigner(report) {
  return report && report.name === '带圈数字作图工具' && (report.templateType === 'auxiliary' || report.categoryName === '带圈数字作图');
}

function isQuestionBankTool(report) {
  return report && report.name === '题库查询工具' && (report.templateType === 'auxiliary' || report.categoryName === '题库查询');
}

function isOnlineTool(report) {
  return isRoundingCalculator(report) || isSandCompactionCalculator(report) || isMileageSplitCalculator(report) || isCircledNumberDesigner(report) || isQuestionBankTool(report);
}

function renderRoundingCalculator() {
  return `
    <div class="rounding-tool">
      <section class="rounding-card">
        <div>
          <p class="tool-kicker">辅助检测 / 数值修约</p>
          <h3>约修计算器</h3>
          <p>按“四舍六入五看奇偶”计算。5 后面还有非零数字时进位；刚好为 5 时，看前一位，奇数进、偶数舍。</p>
        </div>
        <div class="rounding-form">
          <label>
            要修约的数字
            <input id="roundingValue" value="12.345" inputmode="decimal" placeholder="例如：12.345">
          </label>
          <label>
            计算方式
            <select id="roundingMode">
              <option value="places">保留小数位</option>
              <option value="step">按修约间隔</option>
            </select>
          </label>
          <label id="roundingPlacesWrap">
            保留几位小数
            <input id="roundingPlaces" type="number" min="0" max="12" value="2">
          </label>
          <label id="roundingStepWrap" hidden>
            修约间隔
            <input id="roundingStep" value="0.01" inputmode="decimal" placeholder="例如：0.1、0.01、1">
          </label>
        </div>
        <div class="rounding-result">
          <span>修约结果</span>
          <strong id="roundingResult">12.34</strong>
          <small id="roundingExplain">第三位是 5，前一位 4 是偶数，所以舍去。</small>
        </div>
        <div class="rounding-actions">
          <button class="primary" data-rounding-action="calc" type="button">计算</button>
          <button class="mini" data-rounding-action="copy" type="button">复制结果</button>
          <button class="mini" data-rounding-action="clear" type="button">清空</button>
        </div>
      </section>
      <section class="rounding-examples">
        <h4>常用例子</h4>
        <button type="button" data-rounding-example="12.345|2">12.345 保留 2 位 = 12.34</button>
        <button type="button" data-rounding-example="12.355|2">12.355 保留 2 位 = 12.36</button>
        <button type="button" data-rounding-example="12.365|2">12.365 保留 2 位 = 12.36</button>
      </section>
    </div>
  `;
}

function renderSandCompactionCalculator() {
  return `
    <div class="compaction-tool">
      <section class="compaction-hero">
        <div>
          <p class="tool-kicker">辅助检测 / 灌砂法</p>
          <h3>灌砂法压实度计算器</h3>
          <p>输入灌砂试验数据后，自动计算量砂密度、试洞体积、含水率、湿密度、干密度和压实度，并按设计值给出判断。</p>
        </div>
        <div class="compaction-status" id="compactionStatus">等待输入数据</div>
      </section>

      <div class="compaction-grid">
        <section class="calc-panel">
          <div class="calc-panel-head">
            <h4>量砂密度</h4>
            <label class="switch-line">
              <input id="sandDensityDirect" type="checkbox">
              直接输入量砂密度
            </label>
          </div>
          <div class="calc-fields" id="sandCalculateInput">
            ${calcField('sandMass', '装入量筒内砂的质量 m5', 'g', '例如 1800')}
            ${calcField('sandVolume', '量筒内砂的体积 V0', 'cm³', '例如 1000')}
          </div>
          <div class="calc-fields" id="sandDirectInput" hidden>
            ${calcField('sandDensityInput', '量砂密度 ρ砂', 'g/cm³', '例如 1.5200')}
          </div>
        </section>

        <section class="calc-panel">
          <h4>灌砂试验</h4>
          <div class="calc-fields">
            ${calcField('beforeMass', '灌砂前砂和筒总质量 m1', 'g', '例如 6500')}
            ${calcField('afterMass', '灌砂后砂和筒总质量 m2', 'g', '例如 4200')}
            ${calcField('coneMass', '锥体部分砂质量 m3', 'g', '例如 650')}
            ${calcField('sampleMass', '试洞试样总质量 m4', 'g', '例如 2400')}
          </div>
        </section>

        <section class="calc-panel">
          <div class="calc-panel-head">
            <h4>含水率</h4>
            <label class="switch-line">
              <input id="waterRatioDirect" type="checkbox">
              直接输入平均含水率
            </label>
          </div>
          <div class="calc-fields" id="waterCalculateInput">
            ${calcField('wetSample1', '湿试样质量 1', 'g', '例如 120.00')}
            ${calcField('drySample1', '干试样质量 1', 'g', '例如 110.00')}
            ${calcField('wetSample2', '湿试样质量 2', 'g', '例如 118.00')}
            ${calcField('drySample2', '干试样质量 2', 'g', '例如 108.50')}
          </div>
          <div class="calc-fields" id="waterDirectInput" hidden>
            ${calcField('avgWaterRatioInput', '平均含水率 ω', '%', '例如 8.5')}
          </div>
        </section>

        <section class="calc-panel">
          <h4>击实与判定</h4>
          <div class="calc-fields">
            ${calcField('maxDryDensity', '最大干密度', 'g/cm³', '例如 2.1200')}
            ${calcField('optWaterRatio', '最佳含水率', '%', '可不填')}
            ${calcField('designCompaction', '压实度设计值', '%', '例如 96.0')}
          </div>
          <div class="calc-fields three">
            <label>
              密度位数
              <select id="densityDecimal">
                <option value="4">0.0001</option>
                <option value="3">0.001</option>
                <option value="2">0.01</option>
              </select>
            </label>
            <label>
              含水率位数
              <select id="waterDecimal">
                <option value="2">0.01</option>
                <option value="1">0.1</option>
                <option value="0">1</option>
              </select>
            </label>
            <label>
              压实度位数
              <select id="compactionDecimal">
                <option value="2">0.01</option>
                <option value="1">0.1</option>
                <option value="0">1</option>
              </select>
            </label>
          </div>
        </section>
      </div>

      <section class="compaction-results">
        ${calcResult('sandDensityResult', '量砂密度', 'g/cm³', 'ρ砂 = m5 / V0')}
        ${calcResult('holeVolumeResult', '试洞体积', 'cm³', 'V = (m1 - m2 - m3) / ρ砂')}
        ${calcResult('avgWaterRatioResult', '平均含水率', '%', 'ω = 平均含水率')}
        ${calcResult('wetDensityResult', '湿密度', 'g/cm³', 'ρ湿 = m4 / V')}
        ${calcResult('dryDensityResult', '干密度', 'g/cm³', 'ρ干 = ρ湿 / (1 + ω/100)')}
        ${calcResult('compactionResult', '压实度', '%', 'K = ρ干 / 最大干密度 × 100')}
      </section>

      <div class="compaction-actions">
        <button class="primary" data-compaction-action="calc" type="button">计算</button>
        <button class="mini" data-compaction-action="sample" type="button">填入示例</button>
        <button class="mini" data-compaction-action="copy" type="button">复制结果</button>
        <button class="mini danger-btn" data-compaction-action="clear" type="button">清空</button>
      </div>
    </div>
  `;
}

function calcField(id, label, unit, placeholder) {
  return `
    <label>
      ${label}
      <span class="calc-input-wrap">
        <input id="${id}" type="number" step="any" placeholder="${placeholder}">
        <em>${unit}</em>
      </span>
    </label>
  `;
}

function calcResult(id, label, unit, formula) {
  return `
    <article>
      <span>${label}</span>
      <strong id="${id}">--</strong>
      <small>${unit}</small>
      <em>${formula}</em>
    </article>
  `;
}

function renderMileageSplitCalculator() {
  return `
    <div class="mileage-tool">
      <section class="mileage-hero">
        <div>
          <p class="tool-kicker">辅助检测 / K公里数拆分</p>
          <h3>K公里数拆分工具</h3>
          <p>输入起止桩号，按数量自动拆分中间里程点。适合抽检点位、记录点位、现场随机点位快速生成。</p>
        </div>
        <div class="mileage-chip">支持 K0+050、AK0+050、00+50 等格式</div>
      </section>

      <section class="mileage-panel">
        <div class="mileage-fields">
          <label class="wide">
            里程区间
            <input id="mileageRange" value="K0+050.123-K0+160.354" placeholder="例如：K0+050.123-K0+160.354">
          </label>
          <label>
            生成点数量
            <input id="mileagePointCount" type="number" min="1" max="50" value="2">
          </label>
          <label>
            随机变化比例
            <span class="calc-input-wrap">
              <input id="mileageRandomPercent" type="number" min="0" max="10" step="0.1" value="5">
              <em>%</em>
            </span>
          </label>
        </div>
        <div class="mileage-actions">
          <button class="primary" data-mileage-action="generate" type="button">生成里程点</button>
          <button class="mini" data-mileage-action="sample" type="button">填入示例</button>
          <button class="mini" data-mileage-action="copy" type="button">复制结果</button>
          <button class="mini danger-btn" data-mileage-action="clear" type="button">清空</button>
        </div>
      </section>

      <section class="mileage-result-card">
        <div class="mileage-result-head">
          <h4>拆分结果</h4>
          <span id="mileageResultCount">0 个点</span>
        </div>
        <pre id="mileageResult">生成的里程点将显示在这里...</pre>
        <div class="mileage-info">
          <span id="mileageIntervalInfo">区间长度：-- 米，理论间隔：-- 米</span>
          <span id="mileageRandomInfo">随机范围：±-- 米</span>
        </div>
      </section>
    </div>
  `;
}

function renderCircledNumberDesigner() {
  return `
    <div class="circle-tool">
      <section class="circle-hero">
        <div>
          <p class="tool-kicker">辅助检测 / 带圈数字作图</p>
          <h3>带圈数字作图工具</h3>
          <p>快速生成带圈编号示意图，可调行列、大小、间距、外框样式和颜色，适合现场点位、检测布点、示意图辅助制作。</p>
        </div>
        <div class="circle-hero-badge">1-100 个编号</div>
      </section>

      <section class="circle-workbench">
        <aside class="circle-controls">
          <div class="circle-control-grid">
            ${numberControl('circlePointCount', '点数', 1, 100, 9)}
            ${numberControl('circleRows', '行数', 1, 20, 3)}
            ${numberControl('circleCols', '列数', 1, 20, 3)}
            ${rangeControl('circleSpacing', '点间距', 20, 100, 40, 'px')}
            ${rangeControl('circlePointSize', '点大小', 10, 70, 30, 'px')}
            ${rangeControl('circleWaveRange', '波动范围', 0, 20, 5, 'px')}
            ${rangeControl('circleBorderPadding', '外框间距', 0, 60, 10, 'px')}
          </div>

          <div class="circle-style-box">
            <span>外框样式</span>
            <div class="circle-style-buttons">
              <button class="active" data-circle-style="square" type="button">正方形</button>
              <button data-circle-style="rect-horizontal" type="button">横向长方形</button>
              <button data-circle-style="rect-vertical" type="button">纵向长方形</button>
              <button data-circle-style="circle" type="button">圆形</button>
            </div>
          </div>

          <div class="circle-color-grid">
            ${colorControl('circleColor', '圆圈颜色', '#0f8a67')}
            ${colorControl('circleTextColor', '数字颜色', '#ffffff')}
            ${colorControl('circleBorderColor', '外框颜色', '#d6a64c')}
          </div>

          <div class="circle-actions">
            <button class="primary" data-circle-action="apply" type="button">生成图形</button>
            <button class="mini" data-circle-action="copy" type="button">复制图片</button>
            <button class="mini" data-circle-action="download" type="button">下载图片</button>
          </div>
        </aside>

        <section class="circle-stage-card">
          <div id="circleStage" class="circle-stage">
            <div id="circleBoundingBox" class="circle-bounding-box style-square"></div>
            <div id="circleGrid" class="circle-grid"></div>
          </div>
          <p>提示：波动范围为 0 时，编号点固定不动；点数和行列不一致时，会按列数自动排布。</p>
        </section>
      </section>
    </div>
  `;
}

function numberControl(id, label, min, max, value) {
  return `
    <label>
      ${label}
      <input id="${id}" type="number" min="${min}" max="${max}" value="${value}">
    </label>
  `;
}

function rangeControl(id, label, min, max, value, unit) {
  return `
    <label>
      <span>${label}<em id="${id}Value">${value}${unit}</em></span>
      <input id="${id}" type="range" min="${min}" max="${max}" value="${value}" data-unit="${unit}">
    </label>
  `;
}

function colorControl(id, label, value) {
  return `
    <label>
      ${label}
      <input id="${id}" type="color" value="${value}">
    </label>
  `;
}

function renderQuestionBankTool() {
  return `
    <div class="question-tool">
      <section class="question-hero">
        <div>
          <p class="tool-kicker">辅助检测 / 题库查询</p>
          <h3>恒信通题库查询工具</h3>
          <p>支持两个关键词组合搜索。这里先做成你的本地题库工具，后续把公司有权限的题库文本粘贴导入，就能在局域网内查询使用。</p>
        </div>
        <div class="question-hero-badge">本地保存 / 可导入</div>
      </section>

      <section class="question-search-card">
        <label>
          查询条件 1
          <input id="questionKeyword1" placeholder="例如：混凝土、压实度、钢筋">
        </label>
        <label>
          查询条件 2
          <input id="questionKeyword2" placeholder="可不填，例如：答案、标准、试验">
        </label>
        <div class="question-actions">
          <button class="primary" data-question-action="search" type="button">开始查询</button>
          <button class="mini" data-question-action="sample" type="button">载入示例</button>
          <button class="mini" data-question-action="clear" type="button">清空搜索</button>
        </div>
      </section>

      <section class="question-import-card">
        <div>
          <h4>导入自己的题库</h4>
          <p>一行一题，建议格式：编号--专项类别--题目和选项--答案。导入内容保存在这台浏览器里，不会去外网抓别人题库。</p>
        </div>
        <textarea id="questionImportText" rows="5" placeholder="例如：
001--道路工程--压实度检测常用方法有哪些？A 灌砂法 B 环刀法 C 钻芯法--答案：A/B
002--桥梁工程--桥梁外观检查应记录哪些内容？--答案：裂缝、蜂窝、露筋等"></textarea>
        <div class="question-actions">
          <button class="primary" data-question-action="import" type="button">导入题库</button>
          <button class="mini danger-btn" data-question-action="clear-bank" type="button">清空本机题库</button>
        </div>
      </section>

      <section class="question-results-card">
        <div class="question-result-head">
          <h4>查询结果</h4>
          <span id="questionResultCount">0 条结果</span>
        </div>
        <div id="questionResultList" class="question-result-list">
          <div class="empty compact">输入关键词后点击“开始查询”。</div>
        </div>
      </section>
    </div>
  `;
}

function handleRoundingCalculatorInput(event) {
  if (event.target.closest('.rounding-tool')) {
    updateRoundingModeVisibility();
    calculateRounding();
  }
  if (event.target.closest('.compaction-tool')) {
    updateCompactionModeVisibility();
    calculateSandCompaction();
  }
  if (event.target.closest('.circle-tool')) {
    renderCircleNumbers();
  }
}

function handleRoundingCalculatorClick(event) {
  const questionButton = event.target.closest('[data-question-action]');
  if (questionButton) {
    const questionAction = questionButton.dataset.questionAction;
    if (questionAction === 'search') {
      searchQuestionBank();
      return;
    }
    if (questionAction === 'sample') {
      loadQuestionSamples();
      searchQuestionBank();
      return;
    }
    if (questionAction === 'clear') {
      clearQuestionSearch();
      return;
    }
    if (questionAction === 'import') {
      importQuestionBank();
      searchQuestionBank();
      return;
    }
    if (questionAction === 'clear-bank') {
      clearQuestionBank();
      return;
    }
  }

  const circleStyleButton = event.target.closest('[data-circle-style]');
  if (circleStyleButton) {
    document.querySelectorAll('[data-circle-style]').forEach((button) => button.classList.toggle('active', button === circleStyleButton));
    renderCircleNumbers();
    return;
  }

  const circleButton = event.target.closest('[data-circle-action]');
  if (circleButton) {
    const circleAction = circleButton.dataset.circleAction;
    if (circleAction === 'apply') {
      renderCircleNumbers();
      return;
    }
    if (circleAction === 'copy') {
      copyCircleImage();
      return;
    }
    if (circleAction === 'download') {
      downloadCircleImage();
      return;
    }
  }

  const mileageButton = event.target.closest('[data-mileage-action]');
  if (mileageButton) {
    const mileageAction = mileageButton.dataset.mileageAction;
    if (mileageAction === 'generate') {
      generateMileageSplit();
      return;
    }
    if (mileageAction === 'sample') {
      fillMileageSplitSample();
      generateMileageSplit();
      return;
    }
    if (mileageAction === 'clear') {
      clearMileageSplit();
      return;
    }
    if (mileageAction === 'copy') {
      copyMileageSplitResult();
      return;
    }
  }

  const compactionButton = event.target.closest('[data-compaction-action]');
  if (compactionButton) {
    const compactionAction = compactionButton.dataset.compactionAction;
    if (compactionAction === 'calc') {
      calculateSandCompaction();
      return;
    }
    if (compactionAction === 'sample') {
      fillSandCompactionSample();
      calculateSandCompaction();
      return;
    }
    if (compactionAction === 'clear') {
      clearSandCompaction();
      return;
    }
    if (compactionAction === 'copy') {
      copySandCompactionResult();
      return;
    }
  }

  const example = event.target.closest('[data-rounding-example]');
  if (example) {
    const [value, places] = example.dataset.roundingExample.split('|');
    document.getElementById('roundingMode').value = 'places';
    document.getElementById('roundingValue').value = value;
    document.getElementById('roundingPlaces').value = places;
    updateRoundingModeVisibility();
    calculateRounding();
    return;
  }

  const button = event.target.closest('[data-rounding-action]');
  if (!button) return;
  const action = button.dataset.roundingAction;
  if (action === 'calc') {
    calculateRounding();
    return;
  }
  if (action === 'clear') {
    document.getElementById('roundingValue').value = '';
    document.getElementById('roundingResult').textContent = '等待输入';
    document.getElementById('roundingExplain').textContent = '输入数字后自动计算。';
    return;
  }
  if (action === 'copy') {
    const text = document.getElementById('roundingResult').textContent;
    navigator.clipboard?.writeText(text);
    notice('结果已复制');
  }
}

function defaultQuestionSamples() {
  return [
    {
      id: 'HX-SAMPLE-001',
      category: '道路工程',
      content: '灌砂法检测压实度时，应准确记录灌砂前后砂筒质量、锥体砂质量、试样质量和含水率。',
      answer: '要点：试洞体积、湿密度、干密度、压实度。'
    },
    {
      id: 'HX-SAMPLE-002',
      category: '桥梁工程',
      content: '桥梁外观检查应关注裂缝、蜂窝麻面、露筋、支座状态、伸缩缝和排水设施等内容。',
      answer: '答案：按现场检查记录如实填写。'
    },
    {
      id: 'HX-SAMPLE-003',
      category: '试验室质量检测',
      content: '试验记录应做到原始、真实、完整、可追溯，修改时应保留修改痕迹。',
      answer: '答案：原始性、真实性、完整性、可追溯性。'
    }
  ];
}

function getLocalQuestionBank() {
  try {
    const stored = JSON.parse(localStorage.getItem('hxtQuestionBank') || '[]');
    return Array.isArray(stored) ? stored : [];
  } catch (_) {
    return [];
  }
}

function setLocalQuestionBank(items) {
  localStorage.setItem('hxtQuestionBank', JSON.stringify(items));
}

function questionBankItems() {
  return [...defaultQuestionSamples(), ...getLocalQuestionBank()];
}

function parseQuestionLine(line, index) {
  const text = String(line || '').trim();
  if (!text) return null;
  const parts = text.split('--').map((item) => item.trim());
  if (parts.length >= 4) {
    return {
      id: parts[0] || `IMPORT-${index + 1}`,
      category: parts[1] || '未分类',
      content: parts.slice(2, -1).join('--') || text,
      answer: parts[parts.length - 1] || ''
    };
  }
  return {
    id: `IMPORT-${index + 1}`,
    category: '未分类',
    content: text,
    answer: ''
  };
}

function importQuestionBank() {
  const textarea = document.getElementById('questionImportText');
  const text = textarea?.value || '';
  const items = text.split(/\r?\n/).map(parseQuestionLine).filter(Boolean);
  if (!items.length) {
    showError(new Error('请先粘贴要导入的题库内容'));
    return;
  }
  const oldItems = getLocalQuestionBank();
  setLocalQuestionBank([...oldItems, ...items]);
  if (textarea) textarea.value = '';
  notice(`题库已导入 ${items.length} 条`);
}

function loadQuestionSamples() {
  const input1 = document.getElementById('questionKeyword1');
  const input2 = document.getElementById('questionKeyword2');
  if (input1) input1.value = '检测';
  if (input2) input2.value = '';
}

function searchQuestionBank() {
  const keyword1 = (document.getElementById('questionKeyword1')?.value || '').trim();
  const keyword2 = (document.getElementById('questionKeyword2')?.value || '').trim();
  const list = document.getElementById('questionResultList');
  const count = document.getElementById('questionResultCount');
  if (!list || !count) return;
  if (!keyword1) {
    list.innerHTML = '<div class="empty compact">请输入第一个关键词。</div>';
    count.textContent = '0 条结果';
    return;
  }
  const words = [keyword1, keyword2].filter(Boolean);
  const results = questionBankItems().filter((item) => {
    const haystack = `${item.id} ${item.category} ${item.content} ${item.answer}`;
    return words.every((word) => haystack.toLowerCase().includes(word.toLowerCase()));
  });
  count.textContent = `${results.length} 条结果`;
  if (!results.length) {
    list.innerHTML = '<div class="empty compact">没有找到符合条件的内容。可以换个关键词，或先导入自己的题库。</div>';
    return;
  }
  list.innerHTML = results.map((item) => `
    <article>
      <div class="question-meta">
        <span>${escapeHtml(item.id)}</span>
        <strong>${escapeHtml(item.category)}</strong>
      </div>
      <p>${highlightQuestionText(item.content, words)}</p>
      ${item.answer ? `<div class="question-answer">${highlightQuestionText(item.answer, words)}</div>` : ''}
    </article>
  `).join('');
}

function highlightQuestionText(value, words) {
  let html = escapeHtml(value || '');
  for (const word of words) {
    const safeWord = escapeHtml(word).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    html = html.replace(new RegExp(safeWord, 'gi'), '<mark>$&</mark>');
  }
  return html;
}

function clearQuestionSearch() {
  const input1 = document.getElementById('questionKeyword1');
  const input2 = document.getElementById('questionKeyword2');
  const list = document.getElementById('questionResultList');
  const count = document.getElementById('questionResultCount');
  if (input1) input1.value = '';
  if (input2) input2.value = '';
  if (count) count.textContent = '0 条结果';
  if (list) list.innerHTML = '<div class="empty compact">输入关键词后点击“开始查询”。</div>';
}

function clearQuestionBank() {
  if (!confirm('确定清空本机导入的题库吗？只清空当前浏览器里保存的导入内容，示例不会删除。')) return;
  setLocalQuestionBank([]);
  clearQuestionSearch();
  notice('本机导入题库已清空');
}

function getCircleConfig() {
  const readNumber = (id, min, max, fallback) => {
    const value = Number(document.getElementById(id)?.value);
    if (!Number.isFinite(value)) return fallback;
    return Math.max(min, Math.min(max, Math.round(value)));
  };
  return {
    count: readNumber('circlePointCount', 1, 100, 9),
    rows: readNumber('circleRows', 1, 20, 3),
    cols: readNumber('circleCols', 1, 20, 3),
    spacing: readNumber('circleSpacing', 20, 100, 40),
    pointSize: readNumber('circlePointSize', 10, 70, 30),
    waveRange: readNumber('circleWaveRange', 0, 20, 5),
    borderPadding: readNumber('circleBorderPadding', 0, 60, 10),
    circleColor: document.getElementById('circleColor')?.value || '#0f8a67',
    textColor: document.getElementById('circleTextColor')?.value || '#ffffff',
    borderColor: document.getElementById('circleBorderColor')?.value || '#d6a64c',
    borderStyle: document.querySelector('[data-circle-style].active')?.dataset.circleStyle || 'square'
  };
}

function renderCircleNumbers() {
  const grid = document.getElementById('circleGrid');
  const box = document.getElementById('circleBoundingBox');
  if (!grid || !box) return;
  const config = getCircleConfig();

  ['circleSpacing', 'circlePointSize', 'circleWaveRange', 'circleBorderPadding'].forEach((id) => {
    const input = document.getElementById(id);
    const label = document.getElementById(`${id}Value`);
    if (input && label) label.textContent = `${input.value}${input.dataset.unit || ''}`;
  });

  grid.innerHTML = '';
  grid.style.gridTemplateColumns = `repeat(${config.cols}, ${config.pointSize}px)`;
  grid.style.gap = `${config.spacing}px`;

  for (let index = 1; index <= config.count; index += 1) {
    const point = document.createElement('span');
    point.className = 'circle-point';
    point.textContent = String(index);
    point.style.width = `${config.pointSize}px`;
    point.style.height = `${config.pointSize}px`;
    point.style.fontSize = `${Math.max(10, config.pointSize * 0.48)}px`;
    point.style.backgroundColor = config.circleColor;
    point.style.color = config.textColor;
    if (config.waveRange > 0) {
      const x = (Math.random() - 0.5) * 2 * config.waveRange;
      const y = (Math.random() - 0.5) * 2 * config.waveRange;
      point.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
    }
    grid.appendChild(point);
  }

  requestAnimationFrame(() => updateCircleBoundingBox(config));
}

function updateCircleBoundingBox(config = getCircleConfig()) {
  const stage = document.getElementById('circleStage');
  const grid = document.getElementById('circleGrid');
  const box = document.getElementById('circleBoundingBox');
  if (!stage || !grid || !box) return;
  const stageRect = stage.getBoundingClientRect();
  const gridRect = grid.getBoundingClientRect();
  const padding = config.borderPadding;
  box.style.left = `${gridRect.left - stageRect.left - padding}px`;
  box.style.top = `${gridRect.top - stageRect.top - padding}px`;
  box.style.width = `${gridRect.width + padding * 2}px`;
  box.style.height = `${gridRect.height + padding * 2}px`;
  box.style.borderColor = config.borderColor;
  box.className = `circle-bounding-box style-${config.borderStyle}`;
}

function drawCircleToolToCanvas() {
  const config = getCircleConfig();
  const rows = Math.ceil(config.count / config.cols);
  const gridWidth = config.cols * config.pointSize + Math.max(0, config.cols - 1) * config.spacing;
  const gridHeight = rows * config.pointSize + Math.max(0, rows - 1) * config.spacing;
  const margin = 52;
  const canvas = document.createElement('canvas');
  canvas.width = Math.ceil(gridWidth + (config.borderPadding + margin) * 2);
  canvas.height = Math.ceil(gridHeight + (config.borderPadding + margin) * 2);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const boxX = margin;
  const boxY = margin;
  const boxW = gridWidth + config.borderPadding * 2;
  const boxH = gridHeight + config.borderPadding * 2;
  ctx.strokeStyle = config.borderColor;
  ctx.lineWidth = 4;
  drawBoxPath(ctx, boxX, boxY, boxW, boxH, config.borderStyle);
  ctx.stroke();

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `700 ${Math.max(10, config.pointSize * 0.48)}px Microsoft YaHei, Arial`;
  for (let index = 1; index <= config.count; index += 1) {
    const zero = index - 1;
    const col = zero % config.cols;
    const row = Math.floor(zero / config.cols);
    const x = margin + config.borderPadding + col * (config.pointSize + config.spacing) + config.pointSize / 2;
    const y = margin + config.borderPadding + row * (config.pointSize + config.spacing) + config.pointSize / 2;
    ctx.beginPath();
    ctx.arc(x, y, config.pointSize / 2, 0, Math.PI * 2);
    ctx.fillStyle = config.circleColor;
    ctx.fill();
    ctx.fillStyle = config.textColor;
    ctx.fillText(String(index), x, y + 1);
  }
  return canvas;
}

function drawBoxPath(ctx, x, y, width, height, style) {
  ctx.beginPath();
  if (style === 'circle') {
    ctx.ellipse(x + width / 2, y + height / 2, width / 2, height / 2, 0, 0, Math.PI * 2);
    return;
  }
  const radius = style === 'square' ? 0 : 12;
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
}

async function copyCircleImage() {
  const canvas = drawCircleToolToCanvas();
  if (!navigator.clipboard || typeof ClipboardItem === 'undefined') {
    showError(new Error('当前浏览器不支持直接复制图片，可以用“下载图片”。'));
    return;
  }
  canvas.toBlob(async (blob) => {
    await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
    notice('带圈数字图片已复制');
  });
}

function downloadCircleImage() {
  const canvas = drawCircleToolToCanvas();
  const link = document.createElement('a');
  link.download = `带圈数字作图-${Date.now()}.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
}

function parseMileageText(value) {
  const match = String(value || '').trim().match(/^([A-Z]*)(\d+)(?:\+(\d+(?:\.\d+)?))?$/i);
  if (!match) return null;
  const prefix = (match[1] || '').toUpperCase();
  const kmText = match[2];
  const meterText = match[3] || '0';
  const isShortMeter = !prefix && kmText.length === 2 && meterText.split('.')[0].length === 2;
  const km = Number.parseInt(kmText, 10);
  const meter = Math.round(Number.parseFloat(meterText) || 0);
  return {
    prefix,
    km,
    meter,
    total: km * 1000 + meter,
    format: {
      prefix,
      kmLength: kmText.length,
      meterLength: isShortMeter ? 2 : 3
    }
  };
}

function parseMileageRangeText(value) {
  const parts = String(value || '').split('-').map((item) => item.trim()).filter(Boolean);
  if (parts.length !== 2) return null;
  const start = parseMileageText(parts[0]);
  const end = parseMileageText(parts[1]);
  if (!start || !end || start.total >= end.total) return null;
  return {
    start,
    end,
    format: start.format,
    length: end.total - start.total
  };
}

function formatMileagePoint(total, format) {
  const rounded = Math.round(total);
  const km = Math.floor(rounded / 1000);
  const meter = rounded - km * 1000;
  return `${format.prefix}${String(km).padStart(format.kmLength, '0')}+${String(meter).padStart(format.meterLength, '0')}`;
}

function generateMileageSplit() {
  const rangeInput = document.getElementById('mileageRange');
  const countInput = document.getElementById('mileagePointCount');
  const percentInput = document.getElementById('mileageRandomPercent');
  const resultEl = document.getElementById('mileageResult');
  const countEl = document.getElementById('mileageResultCount');
  const intervalEl = document.getElementById('mileageIntervalInfo');
  const randomEl = document.getElementById('mileageRandomInfo');
  if (!rangeInput || !countInput || !percentInput || !resultEl) return;

  const range = parseMileageRangeText(rangeInput.value);
  const count = Number.parseInt(countInput.value, 10);
  const percent = Number.parseFloat(percentInput.value);
  if (!range || !Number.isFinite(count) || count < 1 || count > 50 || !Number.isFinite(percent) || percent < 0 || percent > 10) {
    resultEl.textContent = '请输入有效区间、点位数量和随机比例。';
    if (countEl) countEl.textContent = '0 个点';
    if (intervalEl) intervalEl.textContent = '区间长度：-- 米，理论间隔：-- 米';
    if (randomEl) randomEl.textContent = '随机范围：±-- 米';
    return;
  }

  const interval = range.length / (count + 1);
  const randomRange = (range.length * percent) / 100;
  const points = [];
  for (let index = 1; index <= count; index += 1) {
    const base = range.start.total + interval * index;
    const offset = (Math.random() - 0.5) * 2 * randomRange;
    let actual = Math.round(base + offset);
    if (actual <= range.start.total) actual = range.start.total + 1;
    if (actual >= range.end.total) actual = range.end.total - 1;
    points.push(formatMileagePoint(actual, range.format));
  }

  resultEl.textContent = points.join('\n');
  if (countEl) countEl.textContent = `${points.length} 个点`;
  if (intervalEl) intervalEl.textContent = `区间长度：${range.length.toFixed(1)} 米，理论间隔：${interval.toFixed(2)} 米`;
  if (randomEl) randomEl.textContent = `随机范围：±${randomRange.toFixed(2)} 米（基于 ${percent}%）`;
}

function fillMileageSplitSample() {
  const rangeInput = document.getElementById('mileageRange');
  const countInput = document.getElementById('mileagePointCount');
  const percentInput = document.getElementById('mileageRandomPercent');
  if (rangeInput) rangeInput.value = 'K0+050.123-K0+160.354';
  if (countInput) countInput.value = '2';
  if (percentInput) percentInput.value = '5';
}

function clearMileageSplit() {
  const rangeInput = document.getElementById('mileageRange');
  const countInput = document.getElementById('mileagePointCount');
  const percentInput = document.getElementById('mileageRandomPercent');
  const resultEl = document.getElementById('mileageResult');
  const countEl = document.getElementById('mileageResultCount');
  const intervalEl = document.getElementById('mileageIntervalInfo');
  const randomEl = document.getElementById('mileageRandomInfo');
  if (rangeInput) rangeInput.value = '';
  if (countInput) countInput.value = '2';
  if (percentInput) percentInput.value = '5';
  if (resultEl) resultEl.textContent = '生成的里程点将显示在这里...';
  if (countEl) countEl.textContent = '0 个点';
  if (intervalEl) intervalEl.textContent = '区间长度：-- 米，理论间隔：-- 米';
  if (randomEl) randomEl.textContent = '随机范围：±-- 米';
}

function copyMileageSplitResult() {
  const text = document.getElementById('mileageResult')?.textContent || '';
  if (!text || text.includes('将显示在这里') || text.includes('请输入有效')) {
    showError(new Error('当前没有可复制的里程点'));
    return;
  }
  navigator.clipboard?.writeText(text);
  notice('K公里数拆分结果已复制');
}

function updateCompactionModeVisibility() {
  const sandDirect = document.getElementById('sandDensityDirect')?.checked || false;
  const waterDirect = document.getElementById('waterRatioDirect')?.checked || false;
  const sandDirectInput = document.getElementById('sandDirectInput');
  const sandCalculateInput = document.getElementById('sandCalculateInput');
  const waterDirectInput = document.getElementById('waterDirectInput');
  const waterCalculateInput = document.getElementById('waterCalculateInput');
  if (sandDirectInput && sandCalculateInput) {
    sandDirectInput.hidden = !sandDirect;
    sandCalculateInput.hidden = sandDirect;
  }
  if (waterDirectInput && waterCalculateInput) {
    waterDirectInput.hidden = !waterDirect;
    waterCalculateInput.hidden = waterDirect;
  }
}

function readCalcNumber(id) {
  const value = document.getElementById(id)?.value;
  if (value === undefined || value === null || String(value).trim() === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function roundCalc(value, places) {
  if (!Number.isFinite(value)) return null;
  const factor = 10 ** places;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

function setCalcResult(id, value, places = null) {
  const el = document.getElementById(id);
  if (!el) return;
  if (value === null || value === undefined || !Number.isFinite(value)) {
    el.textContent = '--';
    return;
  }
  el.textContent = places === null ? String(value) : value.toFixed(places);
}

function calculateWaterRatioValue(wet, dry) {
  if (wet === null || dry === null || dry <= 0 || wet < dry) return null;
  return ((wet - dry) / dry) * 100;
}

function calculateSandCompaction() {
  if (!document.querySelector('.compaction-tool')) return;
  updateCompactionModeVisibility();

  const densityDecimals = Number(document.getElementById('densityDecimal')?.value || 4);
  const waterDecimals = Number(document.getElementById('waterDecimal')?.value || 2);
  const compactionDecimals = Number(document.getElementById('compactionDecimal')?.value || 2);

  const sandDirect = document.getElementById('sandDensityDirect')?.checked || false;
  let sandDensity = null;
  if (sandDirect) {
    sandDensity = roundCalc(readCalcNumber('sandDensityInput'), densityDecimals);
  } else {
    const sandMass = readCalcNumber('sandMass');
    const sandVolume = readCalcNumber('sandVolume');
    if (sandMass !== null && sandVolume > 0) sandDensity = roundCalc(sandMass / sandVolume, densityDecimals);
  }
  setCalcResult('sandDensityResult', sandDensity, densityDecimals);

  let holeVolume = null;
  const beforeMass = readCalcNumber('beforeMass');
  const afterMass = readCalcNumber('afterMass');
  const coneMass = readCalcNumber('coneMass');
  if (sandDensity > 0 && beforeMass !== null && afterMass !== null && coneMass !== null) {
    const usedSand = beforeMass - afterMass - coneMass;
    if (usedSand > 0) holeVolume = roundCalc(usedSand / sandDensity, 1);
  }
  setCalcResult('holeVolumeResult', holeVolume, 1);

  const waterDirect = document.getElementById('waterRatioDirect')?.checked || false;
  let avgWaterRatio = null;
  if (waterDirect) {
    avgWaterRatio = roundCalc(readCalcNumber('avgWaterRatioInput'), waterDecimals);
  } else {
    const ratio1 = calculateWaterRatioValue(readCalcNumber('wetSample1'), readCalcNumber('drySample1'));
    const ratio2 = calculateWaterRatioValue(readCalcNumber('wetSample2'), readCalcNumber('drySample2'));
    const ratios = [ratio1, ratio2].filter((item) => item !== null);
    if (ratios.length) avgWaterRatio = roundCalc(ratios.reduce((sum, item) => sum + item, 0) / ratios.length, waterDecimals);
  }
  setCalcResult('avgWaterRatioResult', avgWaterRatio, waterDecimals);

  let wetDensity = null;
  const sampleMass = readCalcNumber('sampleMass');
  if (holeVolume > 0 && sampleMass !== null) wetDensity = roundCalc(sampleMass / holeVolume, densityDecimals);
  setCalcResult('wetDensityResult', wetDensity, densityDecimals);

  let dryDensity = null;
  if (wetDensity !== null && avgWaterRatio !== null) {
    dryDensity = roundCalc(wetDensity / (1 + avgWaterRatio / 100), densityDecimals);
  }
  setCalcResult('dryDensityResult', dryDensity, densityDecimals);

  let compaction = null;
  const maxDryDensity = readCalcNumber('maxDryDensity');
  if (dryDensity !== null && maxDryDensity > 0) {
    compaction = roundCalc((dryDensity / maxDryDensity) * 100, compactionDecimals);
  }
  setCalcResult('compactionResult', compaction, compactionDecimals);
  updateCompactionStatus(compaction, readCalcNumber('designCompaction'), compactionDecimals);
}

function updateCompactionStatus(compaction, designValue, places) {
  const status = document.getElementById('compactionStatus');
  if (!status) return;
  status.className = 'compaction-status';
  if (compaction === null || !Number.isFinite(compaction)) {
    status.textContent = '等待输入数据';
    return;
  }
  if (compaction > 100) {
    status.textContent = `压实度 ${compaction.toFixed(places)}%，结果超百，请复核数据`;
    status.classList.add('warn');
    return;
  }
  if (designValue === null || !Number.isFinite(designValue)) {
    status.textContent = `压实度 ${compaction.toFixed(places)}%，未填写设计值`;
    status.classList.add('neutral');
    return;
  }
  if (compaction >= designValue) {
    status.textContent = `压实度 ${compaction.toFixed(places)}%，达到设计值`;
    status.classList.add('pass');
  } else {
    status.textContent = `压实度 ${compaction.toFixed(places)}%，未达到 ${designValue}%`;
    status.classList.add('fail');
  }
}

function fillSandCompactionSample() {
  const sample = {
    sandMass: '1800',
    sandVolume: '1000',
    beforeMass: '6500',
    afterMass: '4200',
    coneMass: '650',
    sampleMass: '2400',
    wetSample1: '120',
    drySample1: '110',
    wetSample2: '118',
    drySample2: '108.5',
    maxDryDensity: '2.1200',
    optWaterRatio: '8.0',
    designCompaction: '96.0'
  };
  Object.entries(sample).forEach(([id, value]) => {
    const input = document.getElementById(id);
    if (input) input.value = value;
  });
  const sandDirect = document.getElementById('sandDensityDirect');
  const waterDirect = document.getElementById('waterRatioDirect');
  if (sandDirect) sandDirect.checked = false;
  if (waterDirect) waterDirect.checked = false;
  updateCompactionModeVisibility();
}

function clearSandCompaction() {
  document.querySelectorAll('.compaction-tool input[type="number"]').forEach((input) => {
    input.value = '';
  });
  document.querySelectorAll('.compaction-tool input[type="checkbox"]').forEach((input) => {
    input.checked = false;
  });
  updateCompactionModeVisibility();
  ['sandDensityResult', 'holeVolumeResult', 'avgWaterRatioResult', 'wetDensityResult', 'dryDensityResult', 'compactionResult'].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.textContent = '--';
  });
  const status = document.getElementById('compactionStatus');
  if (status) {
    status.className = 'compaction-status';
    status.textContent = '等待输入数据';
  }
}

function copySandCompactionResult() {
  const lines = [
    `量砂密度：${document.getElementById('sandDensityResult')?.textContent || '--'} g/cm³`,
    `试洞体积：${document.getElementById('holeVolumeResult')?.textContent || '--'} cm³`,
    `平均含水率：${document.getElementById('avgWaterRatioResult')?.textContent || '--'} %`,
    `湿密度：${document.getElementById('wetDensityResult')?.textContent || '--'} g/cm³`,
    `干密度：${document.getElementById('dryDensityResult')?.textContent || '--'} g/cm³`,
    `压实度：${document.getElementById('compactionResult')?.textContent || '--'} %`,
    `判断：${document.getElementById('compactionStatus')?.textContent || ''}`
  ];
  navigator.clipboard?.writeText(lines.join('\n'));
  notice('灌砂法计算结果已复制');
}

function updateRoundingModeVisibility() {
  const mode = document.getElementById('roundingMode')?.value || 'places';
  const placesWrap = document.getElementById('roundingPlacesWrap');
  const stepWrap = document.getElementById('roundingStepWrap');
  if (!placesWrap || !stepWrap) return;
  placesWrap.hidden = mode !== 'places';
  stepWrap.hidden = mode !== 'step';
}

function calculateRounding() {
  const valueInput = document.getElementById('roundingValue');
  const resultEl = document.getElementById('roundingResult');
  const explainEl = document.getElementById('roundingExplain');
  if (!valueInput || !resultEl || !explainEl) return;

  try {
    const mode = document.getElementById('roundingMode').value;
    const value = valueInput.value.trim();
    const places = Math.max(0, Math.min(12, Number(document.getElementById('roundingPlaces').value || 0)));
    const step = document.getElementById('roundingStep').value.trim();
    const calc = mode === 'step'
      ? roundHalfEvenByStep(value, step)
      : roundHalfEvenByPlaces(value, places);
    resultEl.textContent = calc.result;
    explainEl.textContent = calc.explain;
  } catch (error) {
    resultEl.textContent = '无法计算';
    explainEl.textContent = error.message || '请检查输入的数字。';
  }
}

function roundHalfEvenByPlaces(value, places) {
  return roundHalfEvenByStep(value, places === 0 ? '1' : `0.${'0'.repeat(places - 1)}1`, places);
}

function roundHalfEvenByStep(value, step, fixedPlaces = null) {
  const number = parseDecimalParts(value);
  const interval = parseDecimalParts(step);
  if (interval.num <= 0n) throw new Error('修约间隔必须大于 0。');

  const numerator = number.num * 10n ** BigInt(interval.scale);
  const denominator = interval.num * 10n ** BigInt(number.scale);
  let quotient = numerator / denominator;
  const remainder = numerator % denominator;
  const twice = remainder * 2n;
  let action = '舍去';
  if (twice > denominator) {
    quotient += 1n;
    action = '进位';
  } else if (twice === denominator) {
    if (quotient % 2n !== 0n) {
      quotient += 1n;
      action = '刚好一半，前一位为奇数，所以进位';
    } else {
      action = '刚好一半，前一位为偶数，所以舍去';
    }
  }

  const roundedNum = quotient * interval.num;
  const sign = number.negative && roundedNum !== 0n ? '-' : '';
  const result = sign + formatScaledInteger(roundedNum, interval.scale, fixedPlaces ?? interval.scale);
  return { result, explain: `按间隔 ${step || '1'} 修约：${action}。` };
}

function parseDecimalParts(value) {
  const raw = String(value || '').trim();
  if (!/^-?\d*(?:\.\d*)?$/.test(raw) || raw === '' || raw === '-' || raw === '.') {
    throw new Error('请输入普通数字，例如 12.345。');
  }
  const negative = raw.startsWith('-');
  const unsigned = negative ? raw.slice(1) : raw;
  const [intPartRaw, fracPartRaw = ''] = unsigned.split('.');
  const intPart = intPartRaw || '0';
  const fracPart = fracPartRaw || '';
  const digits = (intPart + fracPart).replace(/^0+(?=\d)/, '') || '0';
  return {
    negative,
    num: BigInt(digits),
    scale: fracPart.length
  };
}

function formatScaledInteger(num, scale, fixedPlaces) {
  let digits = num.toString().padStart(scale + 1, '0');
  if (scale === 0) {
    return fixedPlaces > 0 ? `${digits}.${'0'.repeat(fixedPlaces)}` : digits;
  }
  const point = digits.length - scale;
  let text = `${digits.slice(0, point)}.${digits.slice(point)}`;
  if (fixedPlaces !== null && fixedPlaces !== undefined) {
    const [intPart, fracPart = ''] = text.split('.');
    return fixedPlaces === 0 ? intPart : `${intPart}.${fracPart.padEnd(fixedPlaces, '0').slice(0, fixedPlaces)}`;
  }
  return text.replace(/\.?0+$/, '');
}

async function showLogs(reportId) {
  try {
    const data = await api(`/api/reports/${reportId}/logs`);
    const uploadLines = data.uploads.length
      ? data.uploads.map((item) => `${formatTime(item.uploadedAt)}  ${item.uploadedByName || '未知'}  ${fileLabel(item.fileType)}  ${actionLabel(item.action)}  ${item.originalName}`).join('\n')
      : '暂无上传记录';
    const downloadLines = data.downloads.length
      ? data.downloads.map((item) => `${formatTime(item.downloadedAt)}  ${item.downloadedByName || '未知'}  ${fileLabel(item.fileType)}`).join('\n')
      : '暂无下载记录';
    alert(`上传记录：\n${uploadLines}\n\n下载记录：\n${downloadLines}`);
  } catch (error) {
    showError(error);
  }
}

async function openVersions(reportId) {
  const report = state.reports.find((item) => item.id === reportId);
  if (!report) return;
  els.versionTitle.textContent = `历史版本：${report.name}`;
  els.versionBody.innerHTML = '<div class="empty compact">正在读取版本...</div>';
  els.versionModal.hidden = false;

  try {
    const data = await api(`/api/reports/${reportId}/versions`);
    renderVersions(reportId, data.versions);
  } catch (error) {
    els.versionBody.innerHTML = `<div class="empty compact">${escapeHtml(error.message || '版本读取失败')}</div>`;
  }
}

function closeVersions() {
  els.versionModal.hidden = true;
  els.versionBody.innerHTML = '';
}

function renderVersions(reportId, versions) {
  if (!versions.length) {
    els.versionBody.innerHTML = '<div class="empty compact">暂无历史版本</div>';
    return;
  }

  els.versionBody.innerHTML = `
    <div class="version-list">
      ${versions.map((item) => `
        <div class="version-row">
          <div>
            <strong>${fileLabel(item.fileType)} 第 ${item.versionNo} 版</strong>
            <div class="muted">${escapeHtml(item.originalName)} / ${actionLabel(item.action)}</div>
            <div class="muted">${escapeHtml(item.uploadedByName || '未知')} ${formatTime(item.uploadedAt)}${item.notes ? ` / ${escapeHtml(item.notes)}` : ''}</div>
          </div>
          ${canManageTemplates() ? `<button class="mini" data-action="restore-version" data-report-id="${reportId}" data-version-id="${item.id}" type="button">恢复此版</button>` : ''}
        </div>
      `).join('')}
    </div>
  `;
}

async function handleVersionBodyClick(event) {
  const button = event.target.closest('button[data-action="restore-version"]');
  if (!button) return;
  const reportId = Number(button.dataset.reportId);
  const versionId = Number(button.dataset.versionId);
  if (!confirm('确定恢复这个历史版本吗？当前新版不会删除，会继续保留在历史版本里。')) return;

  try {
    await api(`/api/reports/${reportId}/versions/${versionId}/restore`, { method: 'POST' });
    notice('历史版本已恢复');
    await loadData();
    await openVersions(reportId);
  } catch (error) {
    showError(error);
  }
}

function openAdmin() {
  els.adminModal.hidden = false;
  setAdminTab(canManageUsers() ? 'upload' : 'upload');
  refreshAdminOptions();
  loadUsers().catch(showError);
  loadInactiveReports().catch(showError);
  loadBackups().catch(showError);
}

function closeAdmin() {
  els.adminModal.hidden = true;
}

function setAdminTab(tabName) {
  const allowedTab = tabName === 'users' && !canManageUsers() ? 'upload' : tabName;
  els.adminTabs.forEach((button) => {
    const active = button.dataset.adminTab === allowedTab;
    button.classList.toggle('active', active);
  });
  els.adminPages.forEach((page) => {
    const active = page.dataset.adminPage === allowedTab;
    page.hidden = !active;
    page.classList.toggle('active', active);
  });
}

function refreshAdminOptions() {
  if (!canManageTemplates()) return;

  els.reportSelect.innerHTML = '<option value="">新增报告</option>' +
    state.reports.map((report) => `<option value="${report.id}">${escapeHtml(report.name)}</option>`).join('');

  const templateFormType = state.selectedTemplateType === 'video' ? 'system' : state.selectedTemplateType;
  els.reportTemplateTypeSelect.value = templateFormType;
  els.categoryTemplateTypeSelect.value = templateFormType;
  els.bulkTemplateTypeSelect.value = templateFormType;
  updateReportCategoryOptions();
  updateBulkCategoryOptions();
  updateCategoryParentOptions();
  renderCategoryManageList();
  renderVideoCategorySuggestions();
}

async function loadInactiveReports() {
  if (!canManageTemplates()) {
    els.inactiveReportList.innerHTML = '';
    return;
  }

  const allReports = [];
  for (const type of TEMPLATE_TYPES) {
    const data = await api(`/api/reports?templateType=${encodeURIComponent(type.id)}&includeInactive=1`);
    allReports.push(...data.reports);
  }
  renderInactiveReports(allReports.filter((report) => !report.active));
}

function renderInactiveReports(reports) {
  if (!reports.length) {
    els.inactiveReportList.innerHTML = '<div class="empty compact">暂无已停用模板</div>';
    return;
  }

  els.inactiveReportList.innerHTML = reports.map((report) => `
    <div class="manage-row inactive-report-row" data-inactive-report="${report.id}">
      <div>
        <strong>${escapeHtml(report.name)}</strong>
        <div class="muted">${escapeHtml(templateLabel(report.templateType))} / ${escapeHtml(report.categoryName)}</div>
      </div>
      <span class="muted">编号：${report.id}</span>
      <button class="mini" data-action="restore-report" type="button">恢复</button>
    </div>
  `).join('');
}

function updateReportCategoryOptions(selectedId = '') {
  const templateType = els.reportTemplateTypeSelect.value || state.selectedTemplateType;
  els.reportCategorySelect.innerHTML = categoryOptionsForType(templateType, selectedId, null);
}

function updateBulkCategoryOptions(selectedId = '') {
  const templateType = els.bulkTemplateTypeSelect.value || state.selectedTemplateType;
  els.bulkCategorySelect.innerHTML = categoryOptionsForType(templateType, selectedId, null);
}

function updateCategoryParentOptions(selectedId = '', excludeId = null) {
  const templateType = els.categoryTemplateTypeSelect.value || state.selectedTemplateType;
  els.categoryParentSelect.innerHTML = '<option value="">无上级分类</option>' +
    categoryOptionsForType(templateType, selectedId, excludeId);
}

function fillReportFormFromSelection() {
  const reportId = Number(els.reportSelect.value);
  const report = state.reports.find((item) => item.id === reportId);
  if (!report) {
    els.reportNameInput.value = '';
    els.reportRemarksInput.value = '';
    els.reportTemplateTypeSelect.value = state.selectedTemplateType;
    updateReportCategoryOptions();
    return;
  }
  els.reportNameInput.value = report.name;
  els.reportTemplateTypeSelect.value = report.templateType || state.selectedTemplateType;
  updateReportCategoryOptions(report.categoryId || '');
  els.reportRemarksInput.value = report.remarks || '';
}

async function handleReportSubmit(event) {
  event.preventDefault();
  try {
    const formData = new FormData(els.reportForm);
    const response = await fetch('/api/reports', {
      method: 'POST',
      body: formData,
      credentials: 'same-origin'
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.message || '保存失败');

    notice('报告已保存');
    els.reportForm.reset();
    await loadData();
  } catch (error) {
    showError(error);
  }
}

async function handleBulkSubmit(event) {
  event.preventDefault();
  if (!els.bulkFilesInput.files.length) {
    showError(new Error('请先选择要导入的文件'));
    return;
  }

  try {
    const formData = new FormData(els.bulkForm);
    const response = await fetch('/api/reports/bulk', {
      method: 'POST',
      body: formData,
      credentials: 'same-origin'
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.message || '批量导入失败');

    notice(`批量导入完成，共新增 ${data.count || 0} 份模板`);
    const templateType = els.bulkTemplateTypeSelect.value || state.selectedTemplateType;
    els.bulkForm.reset();
    els.bulkTemplateTypeSelect.value = templateType;
    updateBulkCategoryOptions();
    await loadData();
  } catch (error) {
    showError(error);
  }
}

async function handleCategorySubmit(event) {
  event.preventDefault();
  const formData = new FormData(els.categoryForm);
  try {
    await api('/api/categories', {
      method: 'POST',
      body: {
        name: formData.get('name'),
        templateType: formData.get('templateType'),
        parentId: formData.get('parentId')
      }
    });
    const templateType = formData.get('templateType') || state.selectedTemplateType;
    els.categoryForm.reset();
    els.categoryTemplateTypeSelect.value = templateType;
    notice('分类已新增');
    await loadData();
  } catch (error) {
    showError(error);
  }
}

function renderCategoryManageList() {
  if (!els.categoryList) return;
  els.categoryList.innerHTML = state.categories.map((category) => `
    <div class="manage-row category-row" data-category-row="${category.id}">
      <input data-field="name" value="${escapeAttribute(category.name)}">
      <select data-field="templateType">
        ${templateOptions(category.templateType)}
      </select>
      <select data-field="parentId">
        <option value="">无上级分类</option>
        ${state.categories
          .filter((item) => item.id !== category.id && item.templateType === category.templateType)
          .map((item) => `<option value="${item.id}" ${item.id === category.parentId ? 'selected' : ''}>${escapeHtml(item.name)}</option>`)
          .join('')}
      </select>
      <span class="muted">${categoryTotalCount(category)} 份模板</span>
      <button class="mini danger-btn" data-action="delete-category" type="button">删除</button>
      <button class="mini" data-action="save-category" type="button">保存</button>
    </div>
  `).join('');
}

function categoryTotalCount(category) {
  return Number(category.count || 0);
}

async function handleCategoryListClick(event) {
  const button = event.target.closest('button[data-action]');
  if (!button) return;
  const row = button.closest('[data-category-row]');
  const id = Number(row.dataset.categoryRow);
  const action = button.dataset.action;

  if (action === 'delete-category') {
    if (!confirm('确定删除这个分类吗？只有没有模板、没有下级分类的分类才能删除。')) return;
    try {
      await api(`/api/categories/${id}`, { method: 'DELETE' });
      notice('分类已删除');
      await loadData();
    } catch (error) {
      showError(error);
    }
    return;
  }

  if (action !== 'save-category') return;

  try {
    await api(`/api/categories/${id}`, {
      method: 'PATCH',
      body: {
        name: row.querySelector('[data-field="name"]').value,
        templateType: row.querySelector('[data-field="templateType"]').value,
        parentId: row.querySelector('[data-field="parentId"]').value
      }
    });
    notice('分类已保存');
    await loadData();
  } catch (error) {
    showError(error);
  }
}

function handleCategoryListChange(event) {
  const select = event.target.closest('select[data-field="templateType"]');
  if (!select) return;
  const row = select.closest('[data-category-row]');
  const id = Number(row.dataset.categoryRow);
  const parentSelect = row.querySelector('select[data-field="parentId"]');
  parentSelect.innerHTML = '<option value="">无上级分类</option>' +
    categoryOptionsForType(select.value, '', id);
}

function categoryOptionsForType(templateType, selectedId = '', excludeId = null) {
  return state.categories
    .filter((category) => category.templateType === templateType && category.id !== excludeId)
    .map((category) => `<option value="${category.id}" ${String(category.id) === String(selectedId || '') ? 'selected' : ''}>${escapeHtml(category.name)}</option>`)
    .join('');
}

function templateOptions(selectedType) {
  return TEMPLATE_TYPES
    .map((type) => `<option value="${type.id}" ${type.id === selectedType ? 'selected' : ''}>${escapeHtml(type.label)}</option>`)
    .join('');
}

function scopeOptions(selectedScope = 'all') {
  const scopes = [
    { id: 'all', label: '可看全部' },
    { id: 'entrust', label: '只看委托单/任务单' },
    { id: 'report', label: '只看检测报告' },
    { id: 'auxiliary', label: '只看辅助检测' },
    { id: 'system', label: '只看管理体系' },
    { id: 'video', label: '只看检测视频' },
    { id: 'project', label: '只看阜南南阳大道' }
  ];
  return scopes
    .map((scope) => `<option value="${scope.id}" ${scope.id === (selectedScope || 'all') ? 'selected' : ''}>${escapeHtml(scope.label)}</option>`)
    .join('');
}

async function handleVideoSubmit(event) {
  event.preventDefault();
  const id = Number(els.videoIdInput.value);
  const body = {
    title: els.videoTitleInput.value.trim(),
    category: els.videoCategoryInput.value.trim(),
    lecturer: els.videoLecturerInput.value.trim(),
    fileName: els.videoFileNameInput.value.trim(),
    remarks: els.videoRemarksInput.value.trim()
  };

  try {
    if (id) {
      await api(`/api/training-videos/${id}`, { method: 'PATCH', body });
      notice('检测视频已保存');
    } else {
      await api('/api/training-videos', { method: 'POST', body });
      notice('检测视频已新增');
    }
    resetVideoForm();
    await loadData();
  } catch (error) {
    showError(error);
  }
}

function resetVideoForm() {
  els.videoForm.reset();
  els.videoIdInput.value = '';
  const selectedCategory = state.categories.find((item) => item.id === state.selectedCategoryId);
  if (els.videoCategoryInput) {
    els.videoCategoryInput.value = selectedCategory?.templateType === 'video' ? selectedCategory.name : '';
  }
}

function renderVideoCategorySuggestions() {
  if (!els.videoCategorySuggestions) return;
  els.videoCategorySuggestions.innerHTML = state.categories
    .filter((category) => category.templateType === 'video')
    .map((category) => `<option value="${escapeAttribute(category.name)}"></option>`)
    .join('');
}

function fillVideoForm(videoId) {
  const video = state.videos.find((item) => item.id === videoId);
  if (!video) return;
  els.videoIdInput.value = video.id;
  els.videoTitleInput.value = video.title || '';
  els.videoCategoryInput.value = video.category || '';
  els.videoLecturerInput.value = video.lecturer || '';
  els.videoFileNameInput.value = video.fileName || '';
  els.videoRemarksInput.value = video.remarks || '';
}

function renderVideoAdminList() {
  if (!els.videoAdminList) return;
  if (!canManageTemplates()) {
    els.videoAdminList.innerHTML = '';
    return;
  }
  if (!state.videos.length) {
    els.videoAdminList.innerHTML = `<div class="empty compact">暂无检测视频。视频目录：${escapeHtml(state.videoDir || 'E:\\恒信通视频')}</div>`;
    return;
  }

  els.videoAdminList.innerHTML = state.videos.map((video) => `
    <div class="manage-row video-admin-row" data-video-row="${video.id}">
      <div>
        <strong>${escapeHtml(video.title)}</strong>
        <div class="muted">${escapeHtml(video.category || '未分类')} / ${escapeHtml(video.fileName)}</div>
      </div>
      <span class="muted">${escapeHtml(video.lecturer || '暂无来源')}</span>
      <button class="mini" data-action="edit-video-admin" type="button">编辑</button>
      <button class="mini danger-btn" data-action="disable-video" type="button">停用</button>
    </div>
  `).join('');
}

async function handleVideoAdminClick(event) {
  const button = event.target.closest('button[data-action]');
  if (!button) return;
  const row = button.closest('[data-video-row]');
  if (!row) return;
  const id = Number(row.dataset.videoRow);
  const action = button.dataset.action;

  if (action === 'edit-video-admin') {
    fillVideoForm(id);
    return;
  }

  if (action === 'disable-video') {
    if (!confirm('确定停用这个检测视频吗？硬盘里的视频文件不会删除。')) return;
    try {
      await api(`/api/training-videos/${id}`, { method: 'PATCH', body: { active: false } });
      notice('检测视频已停用');
      await loadData();
    } catch (error) {
      showError(error);
    }
  }
}

async function loadUsers() {
  if (!canManageUsers()) {
    els.userList.innerHTML = '';
    return;
  }
  const data = await api('/api/users');
  renderUsers(data.users);
}

function renderUsers(users) {
  els.userList.innerHTML = users.map((user) => `
    <div class="manage-row user-row" data-user-row="${user.id}">
      <input data-field="username" value="${escapeAttribute(user.username)}">
      <input data-field="displayName" value="${escapeAttribute(user.displayName)}">
      <select data-field="role">
        <option value="user" ${user.role === 'user' ? 'selected' : ''}>普通用户</option>
        <option value="admin" ${user.role === 'admin' ? 'selected' : ''}>管理员</option>
        <option value="superadmin" ${user.role === 'superadmin' ? 'selected' : ''}>超级管理员</option>
      </select>
      <select data-field="scope">
        ${scopeOptions(user.scope)}
      </select>
      <label>
        <span>启用</span>
        <input data-field="active" type="checkbox" ${user.active ? 'checked' : ''}>
      </label>
      <input data-field="password" placeholder="新密码，不填不改">
      <button class="mini" data-action="save-user" type="button">保存</button>
    </div>
  `).join('');
}

async function handleUserSubmit(event) {
  event.preventDefault();
  const formData = new FormData(els.userForm);
  try {
    await api('/api/users', {
      method: 'POST',
      body: {
        username: formData.get('username'),
        displayName: formData.get('displayName'),
        password: formData.get('password'),
        role: formData.get('role'),
        scope: formData.get('scope')
      }
    });
    els.userForm.reset();
    notice('用户已新增');
    await loadUsers();
  } catch (error) {
    showError(error);
  }
}

async function handleUserListClick(event) {
  const button = event.target.closest('button[data-action="save-user"]');
  if (!button) return;
  const row = button.closest('[data-user-row]');
  const id = Number(row.dataset.userRow);
  const body = {
    username: row.querySelector('[data-field="username"]').value,
    displayName: row.querySelector('[data-field="displayName"]').value,
    role: row.querySelector('[data-field="role"]').value,
    scope: row.querySelector('[data-field="scope"]').value,
    active: row.querySelector('[data-field="active"]').checked,
    password: row.querySelector('[data-field="password"]').value
  };
  if (!body.password) delete body.password;

  try {
    await api(`/api/users/${id}`, { method: 'PATCH', body });
    notice('用户已保存');
    await loadUsers();
  } catch (error) {
    showError(error);
  }
}

async function handleInactiveReportListClick(event) {
  const button = event.target.closest('button[data-action="restore-report"]');
  if (!button) return;
  const row = button.closest('[data-inactive-report]');
  const id = Number(row.dataset.inactiveReport);
  await updateReportActive(id, true);
}

async function updateReportActive(reportId, active) {
  const actionText = active ? '恢复' : '停用';
  if (!active && !confirm('确定停用这个模板吗？停用后普通列表会隐藏它，但文件不会删除，可以在管理后台恢复。')) return;
  if (active && !confirm('确定恢复这个模板吗？恢复后会重新显示在模板列表里。')) return;

  try {
    await api(`/api/reports/${reportId}/status`, {
      method: 'PATCH',
      body: { active }
    });
    notice(`模板已${actionText}`);
    await loadData();
    if (!els.adminModal.hidden) await loadInactiveReports();
  } catch (error) {
    showError(error);
  }
}

async function showOperationLogs() {
  try {
    const data = await api('/api/operation-logs');
    const lines = data.logs.length
      ? data.logs.map((item) => `${formatTime(item.createdAt)}  ${item.userName || '未知'}  ${item.action}  ${item.targetName || ''}${item.detail ? `  ${item.detail}` : ''}`)
      : ['暂无操作日志'];
    alert(`最近操作日志：\n${lines.join('\n')}`);
  } catch (error) {
    showError(error);
  }
}

function handleExport() {
  window.location.href = '/api/export/templates';
}

async function loadBackups() {
  if (!canManageTemplates()) {
    els.backupList.innerHTML = '';
    return;
  }
  const data = await api('/api/backups');
  renderBackups(data.backups || []);
}

function renderBackups(backups) {
  if (!backups.length) {
    els.backupList.innerHTML = '<div class="empty compact">暂无可恢复备份</div>';
    return;
  }

  els.backupList.innerHTML = backups.map((backup) => `
    <div class="manage-row backup-row" data-backup-name="${escapeAttribute(backup.name)}">
      <div>
        <strong>${escapeHtml(backup.name)}</strong>
        <div class="muted">${formatTime(backup.createdAt)} / ${Number(backup.fileCount || 0)} 个文件${backup.createdByName ? ` / ${escapeHtml(backup.createdByName)}` : ''}</div>
      </div>
      <button class="mini danger-btn" data-action="restore-backup" type="button">恢复此备份</button>
    </div>
  `).join('');
}

async function handleBackupListClick(event) {
  const button = event.target.closest('button[data-action="restore-backup"]');
  if (!button) return;
  const row = button.closest('[data-backup-name]');
  const backupName = row.dataset.backupName;
  const first = confirm(`确定恢复备份「${backupName}」吗？\n\n系统会先自动备份当前状态，然后用这个备份覆盖当前数据库和上传文件，并自动重启网站。`);
  if (!first) return;
  const second = confirm('再次确认：恢复后当前网页会断开几秒钟，需要重新登录。是否继续？');
  if (!second) return;

  try {
    button.disabled = true;
    button.textContent = '正在恢复...';
    const data = await api(`/api/backups/${encodeURIComponent(backupName)}/restore`, { method: 'POST' });
    alert(`${data.message}\n\n恢复前自动备份：${data.beforeRestorePath || '已创建'}`);
    setTimeout(() => {
      window.location.href = '/';
    }, 12000);
  } catch (error) {
    button.disabled = false;
    button.textContent = '恢复此备份';
    showError(error);
  }
}

async function handleBackup() {
  if (!confirm('现在备份数据库和上传文件吗？')) return;
  try {
    const data = await api('/api/backup', { method: 'POST' });
    notice(`${data.message}：${data.backupPath}，共 ${data.fileCount || 0} 个文件`);
    if (!els.adminModal.hidden) await loadInactiveReports();
    if (!els.adminModal.hidden) await loadBackups();
  } catch (error) {
    showError(error);
  }
}

async function api(url, options = {}) {
  const fetchOptions = {
    method: options.method || 'GET',
    credentials: 'same-origin',
    headers: {},
    body: undefined
  };

  if (options.body !== undefined) {
    fetchOptions.headers['Content-Type'] = 'application/json';
    fetchOptions.body = JSON.stringify(options.body);
  }

  const response = await fetch(url, fetchOptions);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || '请求失败');
  return data;
}

function formatTime(value) {
  if (!value) return '暂无';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '暂无';
  return date.toLocaleString('zh-CN', { hour12: false });
}

function isRecent(value, days) {
  if (!value) return false;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  return Date.now() - date.getTime() <= days * 24 * 60 * 60 * 1000;
}

function isStale(value, days) {
  if (!value) return false;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  return Date.now() - date.getTime() > days * 24 * 60 * 60 * 1000;
}

function fileLabel(fileType) {
  if (fileType === 'word') return 'Word';
  if (fileType === 'pdf') return 'PDF';
  if (fileType === 'excel') return 'Excel';
  return fileType || '文件';
}

function actionLabel(action) {
  if (action === 'create') return '新增';
  if (action === 'bulk-create') return '批量导入';
  if (action === 'replace') return '替换';
  if (action === 'restore') return '恢复';
  return action || '操作';
}

function roleLabel(role) {
  if (role === 'superadmin') return '超级管理员';
  if (role === 'admin') return '管理员';
  return '普通用户';
}

function normalizeTemplateType(value) {
  if (value === 'entrust' || value === 'task') return 'entrust';
  if (value === 'auxiliary') return 'auxiliary';
  if (value === 'system') return 'system';
  if (value === 'video') return 'video';
  if (value === 'project') return 'project';
  if (value === 'instrument') return 'instrument';
  if (value === 'tool') return 'tool';
  return 'report';
}

function templateLabel(templateType) {
  return (TEMPLATE_TYPES.find((item) => item.id === normalizeTemplateType(templateType)) || TEMPLATE_TYPES[0]).label;
}

function canManageTemplates() {
  return state.user && (state.user.role === 'admin' || state.user.role === 'superadmin');
}

function canManageUsers() {
  return state.user && state.user.role === 'superadmin';
}

function notice(text) {
  els.toast.textContent = text;
  els.toast.hidden = false;
  clearTimeout(notice.timer);
  notice.timer = setTimeout(() => {
    els.toast.hidden = true;
  }, 3600);
}

function showError(error) {
  alert(error.message || '操作失败');
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeAttribute(value) {
  return escapeHtml(value).replace(/`/g, '&#96;');
}
