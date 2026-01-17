

const inspectedTabId = chrome.devtools.inspectedWindow.tabId;

let isCapturing = false;

let selectedRequestId = null;

let pollingTimer = null;

const POLLING_INTERVAL = 1000;

let currentRequests = [];

let sortAscending = true;

let discoveredHosts = new Set();

let repeaterTabs = [];

let activeRepeaterTabId = null;

let repeaterTabCounter = 0;

let DOM = {};

document.addEventListener('DOMContentLoaded', () => {
  init();
});

/**
 * 初始化函数
 * 设置 DOM 引用、绑定事件、加载状态
 */
function init() {
  console.log('[Bu-kit Panel] 初始化开始, tabId:', inspectedTabId);
  
  initDOMReferences();
  
  bindEvents();
  
  loadCaptureState();
  
  startPolling();
  
  console.log('[Bu-kit Panel] 初始化完成');
}

/**
 * 初始化 DOM 元素引用
 * 将常用的 DOM 元素缓存到 DOM 对象中
 */
function initDOMReferences() {
  DOM.captureBtn = document.getElementById('captureBtn');           // 捕获按钮
  DOM.clearBtn = document.getElementById('clearBtn');               // 清除按钮
  DOM.searchInput = document.getElementById('searchInput');         // 搜索输入框
  DOM.clearSearchBtn = document.getElementById('clearSearchBtn');   // 清除搜索按钮
  DOM.typeFilter = document.getElementById('typeFilter');           // 类型过滤器
  DOM.methodFilter = document.getElementById('methodFilter');       // 方法过滤器
  DOM.hostFilter = document.getElementById('hostFilter');           // Host 过滤器
  DOM.sortById = document.getElementById('sortById');               // 排序按钮
  DOM.sortIcon = document.getElementById('sortIcon');               // 排序图标
  DOM.requestCount = document.getElementById('requestCount');       // 请求计数
  DOM.captureStatus = document.getElementById('captureStatus');     // 捕获状态
  
  DOM.requestList = document.getElementById('requestList');         // 请求列表容器
  DOM.emptyState = document.getElementById('emptyState');           // 空状态提示
  
  DOM.detailPanel = document.getElementById('detailPanel');         // 详情面板
  DOM.closeDetailBtn = document.getElementById('closeDetailBtn');   // 关闭详情按钮
  DOM.generalInfo = document.getElementById('generalInfo');         // 概要信息
  DOM.responseHeaders = document.getElementById('responseHeaders'); // 响应头
  DOM.requestHeaders = document.getElementById('requestHeaders');   // 请求头
  DOM.requestBody = document.getElementById('requestBody');         // 请求体
  DOM.responseBody = document.getElementById('responseBody');       // 响应体
  DOM.previewContent = document.getElementById('previewContent');   // 预览内容
  
  DOM.tabBtns = document.querySelectorAll('.tab-btn');              // 所有标签按钮
  DOM.tabContents = document.querySelectorAll('.tab-content');      // 所有标签内容
  
  DOM.navHistory = document.getElementById('navHistory');           // HTTP History 导航
  DOM.navRepeater = document.getElementById('navRepeater');         // Repeater 导航
  DOM.pageHistory = document.getElementById('pageHistory');         // HTTP History 页面
  DOM.pageRepeater = document.getElementById('pageRepeater');       // Repeater 页面
  DOM.repeaterCount = document.getElementById('repeaterCount');     // Repeater 计数
  
  DOM.repeaterTabs = document.getElementById('repeaterTabs');       // Repeater Tab 容器
  DOM.addRepeaterTab = document.getElementById('addRepeaterTab');   // 添加 Tab 按钮
  DOM.repeaterContent = document.getElementById('repeaterContent'); // Repeater 内容区
  DOM.repeaterEmpty = document.getElementById('repeaterEmpty');     // Repeater 空状态
  DOM.repeaterTabContents = document.getElementById('repeaterTabContents'); // Tab 内容容器
}

/**
 * 绑定事件监听器
 * 为各个 UI 元素绑定事件处理函数
 */
function bindEvents() {
  DOM.captureBtn.addEventListener('click', () => {
    handleCaptureClick();
  });
  
  DOM.clearBtn.addEventListener('click', () => {
    handleClearClick();
  });
  
  DOM.searchInput.addEventListener('input', (event) => {
    handleSearchInput(event);
  });
  
  DOM.clearSearchBtn.addEventListener('click', () => {
    DOM.searchInput.value = '';
    refreshRequests();
  });
  
  DOM.typeFilter.addEventListener('change', (event) => {
    handleFilterChange(event);
  });
  
  DOM.methodFilter.addEventListener('change', (event) => {
    handleFilterChange(event);
  });
  
  DOM.hostFilter.addEventListener('change', (event) => {
    handleFilterChange(event);
  });
  
  DOM.sortById.addEventListener('click', () => {
    handleSortClick();
  });
  
  DOM.closeDetailBtn.addEventListener('click', () => {
    hideDetailPanel();
  });
  
  DOM.tabBtns.forEach((btn) => {
    btn.addEventListener('click', (event) => {
      handleTabClick(event);
    });
  });
  
  DOM.navHistory.addEventListener('click', () => {
    switchMainPage('history');
  });
  
  DOM.navRepeater.addEventListener('click', () => {
    switchMainPage('repeater');
  });
  
  DOM.addRepeaterTab.addEventListener('click', () => {
    createRepeaterTab(null);
  });
  
  DOM.requestList.addEventListener('click', (event) => {
    const actionBtn = event.target.closest('.action-btn[data-action="repeater"]');
    if (actionBtn) {
      event.stopPropagation();
      const row = actionBtn.closest('.request-row');
      if (row && row.dataset.requestId) {
        console.log('[Bu-kit Panel] Repeater 按钮点击（事件委托）, requestId:', row.dataset.requestId);
        handleSendToRepeater(row.dataset.requestId);
      }
    }
  });
}

/**
 * 加载当前捕获状态
 * 从 background 获取当前标签页的捕获状态
 */
async function loadCaptureState() {
  try {
    const response = await sendMessageToBackground({
      action: 'getCaptureState',
      tabId: inspectedTabId
    });
    
    if (response && response.success) {
      isCapturing = response.data.attached;
      updateCaptureUI(isCapturing);
      updateRequestCount(response.data.requestCount);
    }
  } catch (error) {
    console.error('[Bu-kit Panel] 加载捕获状态失败:', error);
  }
}

/**
 * 处理捕获按钮点击
 * 根据当前状态切换捕获开关
 */
async function handleCaptureClick() {
  if (isCapturing) {
    await stopCapture();
  } else {
    await startCapture();
  }
}

/**
 * 开始捕获
 * 连接 debugger 并开始监控网络请求
 */
async function startCapture() {
  try {
    DOM.captureBtn.disabled = true;
    
    const response = await sendMessageToBackground({
      action: 'startCapture',
      tabId: inspectedTabId
    });
    
    if (response && response.success) {
      isCapturing = true;
      updateCaptureUI(true);
      console.log('[Bu-kit Panel] 开始捕获');
    } else {
      console.error('[Bu-kit Panel] 开始捕获失败:', response?.error);
      alert('开始捕获失败: ' + (response?.error || '未知错误'));
    }
  } catch (error) {
    console.error('[Bu-kit Panel] 开始捕获异常:', error);
    alert('开始捕获失败: ' + error.message);
  } finally {
    DOM.captureBtn.disabled = false;
  }
}

/**
 * 停止捕获
 * 断开 debugger 连接
 */
async function stopCapture() {
  try {
    DOM.captureBtn.disabled = true;
    
    const response = await sendMessageToBackground({
      action: 'stopCapture',
      tabId: inspectedTabId
    });
    
    if (response && response.success) {
      isCapturing = false;
      updateCaptureUI(false);
      console.log('[Bu-kit Panel] 停止捕获');
    } else {
      console.error('[Bu-kit Panel] 停止捕获失败:', response?.error);
    }
  } catch (error) {
    console.error('[Bu-kit Panel] 停止捕获异常:', error);
  } finally {
    DOM.captureBtn.disabled = false;
  }
}

/**
 * 更新捕获 UI
 * 根据捕获状态更新按钮和状态指示器
 * @param {boolean} capturing - 是否正在捕获
 */
function updateCaptureUI(capturing) {
  if (capturing) {
    DOM.captureBtn.classList.add('capturing');
    DOM.captureBtn.querySelector('.btn-text').textContent = '停止捕获';
    DOM.captureBtn.title = '停止捕获网络请求';
    
    DOM.captureStatus.classList.remove('status-stopped');
    DOM.captureStatus.classList.add('status-capturing');
    DOM.captureStatus.querySelector('.status-text').textContent = '捕获中';
  } else {
    DOM.captureBtn.classList.remove('capturing');
    DOM.captureBtn.querySelector('.btn-text').textContent = '开始捕获';
    DOM.captureBtn.title = '开始捕获网络请求';
    
    DOM.captureStatus.classList.remove('status-capturing');
    DOM.captureStatus.classList.add('status-stopped');
    DOM.captureStatus.querySelector('.status-text').textContent = '未捕获';
  }
}

/**
 * 开始轮询请求数据
 * 定期从 background 获取最新请求
 */
function startPolling() {
  refreshRequests();
  
  pollingTimer = setInterval(() => {
    refreshRequests();
  }, POLLING_INTERVAL);
}

/**
 * 停止轮询
 */
function stopPolling() {
  if (pollingTimer) {
    clearInterval(pollingTimer);
    pollingTimer = null;
  }
}

/**
 * 刷新请求列表
 * 从 background 获取请求数据并渲染
 */
async function refreshRequests() {
  try {
    const response = await sendMessageToBackground({
      action: 'getRequests',
      tabId: inspectedTabId
    });
    
    if (response && response.success) {
      currentRequests = response.data || [];
      renderRequestList(currentRequests);
      updateRequestCount(currentRequests.length);
    }
  } catch (error) {
    console.error('[Bu-kit Panel] 刷新请求失败:', error);
  }
}

/**
 * 渲染请求列表
 * 将请求数据渲染为 HTML 列表
 * @param {Array} requests - 请求数组
 */
function renderRequestList(requests) {
  collectHosts(requests);
  
  const filteredRequests = applyFilters(requests);
  
  const sortedRequests = applySorting(filteredRequests);
  
  if (sortedRequests.length === 0) {
    DOM.emptyState.style.display = 'flex';
    const rows = DOM.requestList.querySelectorAll('.request-row');
    rows.forEach(row => row.remove());
    return;
  }
  
  DOM.emptyState.style.display = 'none';
  
  const existingRows = DOM.requestList.querySelectorAll('.request-row');
  existingRows.forEach(row => row.remove());
  
  const fragment = document.createDocumentFragment();
  
  sortedRequests.forEach((request, index) => {
    const row = createRequestRow(request, request.originalIndex || (index + 1));
    fragment.appendChild(row);
  });
  
  DOM.requestList.appendChild(fragment);
}

/**
 * 创建请求行元素
 * @param {Object} request - 请求数据
 * @param {number} index - 序号
 * @returns {HTMLElement} 请求行元素
 */
function createRequestRow(request, index) {
  const row = document.createElement('div');
  row.className = 'request-row';
  row.dataset.requestId = request.id;
  
  if (request.failed) {
    row.classList.add('failed');
  }
  
  if (request.id === selectedRequestId) {
    row.classList.add('selected');
  }
  
  let urlPath = request.url;
  let host = '-';
  try {
    const urlObj = new URL(request.url);
    urlPath = urlObj.pathname + urlObj.search;
    host = urlObj.hostname;
  } catch (e) {
  }
  
  row.innerHTML = `
    <!-- 序号列 -->
    <div class="col col-id">${index}</div>
    <!-- 方法列 -->
    <div class="col col-method">
      <span class="method-badge method-${request.method}">${request.method}</span>
    </div>
    <!-- 状态码列 -->
    <div class="col col-status">
      <span class="status-badge ${getStatusClass(request.status)}">${request.status || '-'}</span>
    </div>
    <!-- Host 列（域名） -->
    <div class="col col-host" title="${escapeHtml(host)}">${escapeHtml(host)}</div>
    <!-- URL 列 -->
    <div class="col col-url" title="${escapeHtml(request.url)}">${escapeHtml(urlPath)}</div>
    <!-- 类型列 -->
    <div class="col col-type">${request.type || '-'}</div>
    <!-- 大小列 -->
    <div class="col col-size">${formatSize(request.responseSize)}</div>
    <!-- 时间列 -->
    <div class="col col-time">${request.time || '-'}</div>
    <!-- 操作列 -->
    <div class="col col-actions">
      <button class="action-btn" data-action="repeater" title="发送到 Repeater">⇒</button>
    </div>
  `;
  
  row.addEventListener('click', (event) => {
    if (event.target.classList.contains('action-btn')) {
      return;
    }
    handleRequestClick(request.id);
  });
  
  const repeaterBtn = row.querySelector('.action-btn[data-action="repeater"]');
  if (repeaterBtn) {
    repeaterBtn.addEventListener('click', (event) => {
      event.stopPropagation();
      console.log('[Bu-kit Panel] Repeater 按钮被点击, requestId:', request.id);
      handleSendToRepeater(request.id);
    });
  } else {
    console.error('[Bu-kit Panel] 未找到 Repeater 按钮');
  }
  
  return row;
}

/**
 * 获取状态码对应的 CSS 类名
 * @param {number} status - HTTP 状态码
 * @returns {string} CSS 类名
 */
function getStatusClass(status) {
  if (!status) {
    return '';
  }
  
  if (status >= 200 && status < 300) {
    return 'status-2xx';
  } else if (status >= 300 && status < 400) {
    return 'status-3xx';
  } else if (status >= 400 && status < 500) {
    return 'status-4xx';
  } else if (status >= 500) {
    return 'status-5xx';
  }
  
  return '';
}

/**
 * 格式化文件大小
 * @param {number} bytes - 字节数
 * @returns {string} 格式化后的大小字符串
 */
function formatSize(bytes) {
  if (bytes === null || bytes === undefined || bytes === 0) {
    return '-';
  }
  
  const units = ['B', 'KB', 'MB', 'GB'];
  let unitIndex = 0;
  let size = bytes;
  
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  
  return size.toFixed(unitIndex > 0 ? 1 : 0) + ' ' + units[unitIndex];
}

/**
 * HTML 转义函数
 * 防止 XSS 攻击
 * @param {string} text - 原始文本
 * @returns {string} 转义后的文本
 */
function escapeHtml(text) {
  if (typeof text !== 'string') {
    return text;
  }
  
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * 更新请求计数显示
 * @param {number} count - 请求数量
 */
function updateRequestCount(count) {
  DOM.requestCount.textContent = `${count} 个请求`;
}

/**
 * 处理搜索输入
 * @param {Event} event - 输入事件
 */
function handleSearchInput(event) {
  clearTimeout(handleSearchInput.timer);
  handleSearchInput.timer = setTimeout(() => {
    renderRequestList(currentRequests);
  }, 300);
}

/**
 * 处理过滤器变化
 * @param {Event} event - 变化事件
 */
function handleFilterChange(event) {
  renderRequestList(currentRequests);
}

/**
 * 应用过滤器
 * 根据搜索关键词和过滤条件筛选请求
 * @param {Array} requests - 原始请求数组
 * @returns {Array} 过滤后的请求数组
 */
function applyFilters(requests) {
  const searchKeyword = DOM.searchInput.value.trim().toLowerCase();
  const typeFilter = DOM.typeFilter.value;
  const methodFilter = DOM.methodFilter.value;
  const hostFilter = DOM.hostFilter.value;
  
  return requests.filter((request, index) => {
    request.originalIndex = index + 1;
    return filterRequest(request, searchKeyword, typeFilter, methodFilter, hostFilter);
  });
}

/**
 * 过滤单个请求
 * @param {Object} request - 请求对象
 * @param {string} searchKeyword - 搜索关键词
 * @param {string} typeFilter - 类型过滤值
 * @param {string} methodFilter - 方法过滤值
 * @param {string} hostFilter - Host 过滤值
 * @returns {boolean} 是否通过过滤
 */
function filterRequest(request, searchKeyword, typeFilter, methodFilter, hostFilter) {
  if (searchKeyword) {
    const urlMatch = request.url.toLowerCase().includes(searchKeyword);
    const methodMatch = request.method.toLowerCase().includes(searchKeyword);
    const statusMatch = String(request.status).includes(searchKeyword);
    const typeMatch = (request.type || '').toLowerCase().includes(searchKeyword);
    const hostMatch = getHostFromUrl(request.url).toLowerCase().includes(searchKeyword);
    
    if (!urlMatch && !methodMatch && !statusMatch && !typeMatch && !hostMatch) {
      return false;
    }
  }
  
  if (typeFilter && request.type !== typeFilter) {
    return false;
  }
  
  if (methodFilter && request.method !== methodFilter) {
    return false;
  }
  
  if (hostFilter) {
    const requestHost = getHostFromUrl(request.url);
    if (requestHost !== hostFilter) {
      return false;
    }
  }
  
  return true;
}

/**
 * 处理排序按钮点击
 * 切换排序方向并重新渲染列表
 */
function handleSortClick() {
  sortAscending = !sortAscending;
  
  updateSortIcon();
  
  renderRequestList(currentRequests);
  
  console.log('[Bu-kit Panel] 排序方向:', sortAscending ? '升序' : '降序');
}

/**
 * 更新排序图标显示
 * 根据当前排序方向更新图标样式
 */
function updateSortIcon() {
  if (sortAscending) {
    DOM.sortIcon.classList.remove('asc');
  } else {
    DOM.sortIcon.classList.add('asc');
  }
}

/**
 * 应用排序
 * 根据当前排序方向对请求进行排序
 * @param {Array} requests - 请求数组
 * @returns {Array} 排序后的请求数组
 */
function applySorting(requests) {
  const sorted = [...requests];
  
  sorted.sort((a, b) => {
    const indexA = a.originalIndex || 0;
    const indexB = b.originalIndex || 0;
    
    if (sortAscending) {
      return indexA - indexB;
    } else {
      return indexB - indexA;
    }
  });
  
  return sorted;
}

/**
 * 从 URL 中提取域名
 * @param {string} url - URL 字符串
 * @returns {string} 域名，解析失败返回空字符串
 */
function getHostFromUrl(url) {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname;
  } catch (e) {
    return '';
  }
}

/**
 * 收集所有请求中的域名
 * 并更新 Host 过滤下拉框
 * @param {Array} requests - 请求数组
 */
function collectHosts(requests) {
  const previousCount = discoveredHosts.size;
  
  requests.forEach((request) => {
    const host = getHostFromUrl(request.url);
    if (host) {
      discoveredHosts.add(host);
    }
  });
  
  if (discoveredHosts.size > previousCount) {
    updateHostFilter();
  }
}

/**
 * 更新 Host 过滤下拉框
 * 根据已发现的域名动态填充选项
 */
function updateHostFilter() {
  const currentValue = DOM.hostFilter.value;
  
  while (DOM.hostFilter.options.length > 1) {
    DOM.hostFilter.remove(1);
  }
  
  const sortedHosts = Array.from(discoveredHosts).sort();
  
  sortedHosts.forEach((host) => {
    const option = document.createElement('option');
    option.value = host;
    option.textContent = host;
    DOM.hostFilter.appendChild(option);
  });
  
  if (currentValue && discoveredHosts.has(currentValue)) {
    DOM.hostFilter.value = currentValue;
  }
  
  console.log('[Bu-kit Panel] Host 过滤器已更新，共', discoveredHosts.size, '个域名');
}

/**
 * 处理请求行点击
 * @param {string} requestId - 请求 ID
 */
function handleRequestClick(requestId) {
  selectRequest(requestId);
}

/**
 * 选中请求
 * @param {string} requestId - 请求 ID
 */
function selectRequest(requestId) {
  selectedRequestId = requestId;
  
  updateSelectedRow(requestId);
  
  loadRequestDetail(requestId);
}

/**
 * 更新选中行样式
 * @param {string} requestId - 请求 ID
 */
function updateSelectedRow(requestId) {
  const rows = DOM.requestList.querySelectorAll('.request-row');
  rows.forEach((row) => {
    row.classList.remove('selected');
  });
  
  const selectedRow = DOM.requestList.querySelector(`[data-request-id="${requestId}"]`);
  if (selectedRow) {
    selectedRow.classList.add('selected');
  }
}

/**
 * 加载请求详情
 * @param {string} requestId - 请求 ID
 */
async function loadRequestDetail(requestId) {
  try {
    const response = await sendMessageToBackground({
      action: 'getRequestDetail',
      tabId: inspectedTabId,
      requestId: requestId
    });
    
    if (response && response.success && response.data) {
      renderRequestDetail(response.data);
      showDetailPanel();
    } else {
      console.error('[Bu-kit Panel] 获取请求详情失败');
    }
  } catch (error) {
    console.error('[Bu-kit Panel] 加载请求详情异常:', error);
  }
}

/**
 * 渲染请求详情
 * @param {Object} detail - 请求详情对象
 */
function renderRequestDetail(detail) {
  renderGeneralInfo(detail);
  
  renderHeaders(detail.responseHeaders, DOM.responseHeaders);
  
  renderHeaders(detail.requestHeaders, DOM.requestHeaders);
  
  renderRequestBody(detail);
  
  renderResponseBody(detail);
  
  renderPreview(detail);
}

/**
 * 渲染概要信息
 * @param {Object} detail - 请求详情
 */
function renderGeneralInfo(detail) {
  const html = `
    <!-- 请求 URL -->
    <div class="info-item">
      <span class="info-label">Request URL:</span>
      <span class="info-value">${escapeHtml(detail.url)}</span>
    </div>
    <!-- 请求方法 -->
    <div class="info-item">
      <span class="info-label">Request Method:</span>
      <span class="info-value">${escapeHtml(detail.method)}</span>
    </div>
    <!-- 状态码 -->
    <div class="info-item">
      <span class="info-label">Status Code:</span>
      <span class="info-value ${getStatusClass(detail.status)}">${detail.status || '-'} ${detail.statusText || ''}</span>
    </div>
    <!-- 远程地址 -->
    <div class="info-item">
      <span class="info-label">Remote Address:</span>
      <span class="info-value">${detail.remoteIPAddress || '-'}${detail.remotePort ? ':' + detail.remotePort : ''}</span>
    </div>
    <!-- 协议 -->
    <div class="info-item">
      <span class="info-label">Protocol:</span>
      <span class="info-value">${detail.protocol || '-'}</span>
    </div>
    <!-- 资源类型 -->
    <div class="info-item">
      <span class="info-label">Type:</span>
      <span class="info-value">${detail.type || '-'}</span>
    </div>
    <!-- MIME 类型 -->
    <div class="info-item">
      <span class="info-label">MIME Type:</span>
      <span class="info-value">${detail.mimeType || '-'}</span>
    </div>
    <!-- 响应大小 -->
    <div class="info-item">
      <span class="info-label">Size:</span>
      <span class="info-value">${formatSize(detail.responseSize)}</span>
    </div>
  `;
  
  DOM.generalInfo.innerHTML = html;
}

/**
 * 渲染 Headers 列表
 * @param {Object} headers - Headers 对象
 * @param {HTMLElement} container - 容器元素
 */
function renderHeaders(headers, container) {
  if (!headers || Object.keys(headers).length === 0) {
    container.innerHTML = '<div class="empty-state" style="padding: 10px;">无数据</div>';
    return;
  }
  
  let html = '';
  for (const name in headers) {
    html += `
      <div class="header-item">
        <span class="header-name">${escapeHtml(name)}:</span>
        <span class="header-value">${escapeHtml(headers[name])}</span>
      </div>
    `;
  }
  
  container.innerHTML = html;
}

/**
 * 渲染请求体
 * @param {Object} detail - 请求详情
 */
function renderRequestBody(detail) {
  if (!detail.requestBody) {
    DOM.requestBody.textContent = '(无请求体)';
    return;
  }
  
  try {
    const json = JSON.parse(detail.requestBody);
    DOM.requestBody.textContent = JSON.stringify(json, null, 2);
  } catch (e) {
    DOM.requestBody.textContent = detail.requestBody;
  }
}

/**
 * 渲染响应体
 * @param {Object} detail - 请求详情
 */
function renderResponseBody(detail) {
  if (!detail.responseBody) {
    if (detail.responseBodyError) {
      DOM.responseBody.textContent = '(获取响应体失败: ' + detail.responseBodyError + ')';
    } else {
      DOM.responseBody.textContent = '(无响应体)';
    }
    return;
  }
  
  if (detail.responseBodyBase64) {
    DOM.responseBody.textContent = '(二进制内容，已 Base64 编码)\n\n' + detail.responseBody.substring(0, 1000);
    return;
  }
  
  let content = detail.responseBody;
  if (detail.responseBodyTruncated) {
    content += '\n\n... (内容已截断)';
  }
  
  try {
    const json = JSON.parse(detail.responseBody);
    DOM.responseBody.textContent = JSON.stringify(json, null, 2);
  } catch (e) {
    DOM.responseBody.textContent = content;
  }
}

/**
 * 渲染预览
 * @param {Object} detail - 请求详情
 */
function renderPreview(detail) {
  const mimeType = detail.mimeType || '';
  
  if (mimeType.startsWith('image/')) {
    if (detail.responseBody && detail.responseBodyBase64) {
      DOM.previewContent.innerHTML = `<img src="data:${mimeType};base64,${detail.responseBody}" alt="Image Preview">`;
    } else {
      DOM.previewContent.innerHTML = '<div class="empty-state">无法预览图片</div>';
    }
  } else if (mimeType.includes('json')) {
    try {
      const json = JSON.parse(detail.responseBody);
      DOM.previewContent.innerHTML = `<pre class="code-block">${escapeHtml(JSON.stringify(json, null, 2))}</pre>`;
    } catch (e) {
      DOM.previewContent.innerHTML = '<div class="empty-state">无法解析 JSON</div>';
    }
  } else if (mimeType.includes('html')) {
    DOM.previewContent.innerHTML = '<div class="empty-state">HTML 预览暂不支持</div>';
  } else {
    DOM.previewContent.innerHTML = '<div class="empty-state">无法预览此类型内容</div>';
  }
}

/**
 * 显示详情面板
 */
function showDetailPanel() {
  DOM.detailPanel.classList.add('visible');
}

/**
 * 隐藏详情面板
 */
function hideDetailPanel() {
  DOM.detailPanel.classList.remove('visible');
  selectedRequestId = null;
  const rows = DOM.requestList.querySelectorAll('.request-row');
  rows.forEach((row) => {
    row.classList.remove('selected');
  });
}

/**
 * 处理标签页点击
 * @param {Event} event - 点击事件
 */
function handleTabClick(event) {
  const tabName = event.target.dataset.tab;
  switchTab(tabName);
}

/**
 * 切换标签页
 * @param {string} tabName - 标签名
 */
function switchTab(tabName) {
  updateTabButtons(tabName);
  updateTabContent(tabName);
}

/**
 * 更新标签按钮状态
 * @param {string} activeTab - 激活的标签名
 */
function updateTabButtons(activeTab) {
  DOM.tabBtns.forEach((btn) => {
    if (btn.dataset.tab === activeTab) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });
}

/**
 * 更新标签内容显示
 * @param {string} activeTab - 激活的标签名
 */
function updateTabContent(activeTab) {
  DOM.tabContents.forEach((content) => {
    const tabName = content.id.replace('tab-', '');
    if (tabName === activeTab) {
      content.classList.add('active');
    } else {
      content.classList.remove('active');
    }
  });
}

/**
 * 处理清除按钮点击
 */
async function handleClearClick() {
  const confirmed = confirm('确定要清除所有请求吗？');
  if (!confirmed) {
    return;
  }
  
  try {
    const response = await sendMessageToBackground({
      action: 'clearRequests',
      tabId: inspectedTabId
    });
    
    if (response && response.success) {
      currentRequests = [];
      discoveredHosts.clear();
      DOM.hostFilter.value = '';
      updateHostFilter();
      renderRequestList([]);
      hideDetailPanel();
      console.log('[Bu-kit Panel] 已清除所有请求');
    }
  } catch (error) {
    console.error('[Bu-kit Panel] 清除请求失败:', error);
  }
}

/**
 * 发送消息到 background
 * @param {Object} message - 消息对象
 * @returns {Promise<Object>} 响应对象
 */
function sendMessageToBackground(message) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(message, (response) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
      } else {
        resolve(response);
      }
    });
  });
}

/**
 * 面板显示时的回调函数
 * 刷新数据并恢复轮询
 */
function onPanelShown() {
  console.log('[Bu-kit Panel] 面板已显示');
  refreshRequests();
  if (!pollingTimer) {
    startPolling();
  }
}

/**
 * 面板隐藏时的回调函数
 * 停止轮询以节省资源
 */
function onPanelHidden() {
  console.log('[Bu-kit Panel] 面板已隐藏');
  stopPolling();
}

window.onPanelShown = onPanelShown;
window.onPanelHidden = onPanelHidden;

/**
 * 切换主页面（HTTP History / Repeater）
 * @param {string} pageName - 页面名 ('history' 或 'repeater')
 */
function switchMainPage(pageName) {
  DOM.navHistory.classList.toggle('active', pageName === 'history');
  DOM.navRepeater.classList.toggle('active', pageName === 'repeater');
  
  DOM.pageHistory.classList.toggle('active', pageName === 'history');
  DOM.pageRepeater.classList.toggle('active', pageName === 'repeater');
  
  console.log('[Bu-kit Panel] 切换到页面:', pageName);
}

/**
 * 处理发送到 Repeater
 * @param {string} requestId - 请求 ID
 */
async function handleSendToRepeater(requestId) {
  console.log('[Bu-kit Panel] handleSendToRepeater 被调用, requestId:', requestId);
  
  try {
    const response = await sendMessageToBackground({
      action: 'getRequestDetail',
      tabId: inspectedTabId,
      requestId: requestId
    });
    
    console.log('[Bu-kit Panel] getRequestDetail 响应:', response);
    
    if (response && response.success && response.data) {
      const rawRequest = buildRawRequest(response.data);
      console.log('[Bu-kit Panel] 构建的原始请求:', rawRequest);
      createRepeaterTab(rawRequest, response.data);
      switchMainPage('repeater');
      console.log('[Bu-kit Panel] 已发送到 Repeater:', requestId);
    } else {
      console.warn('[Bu-kit Panel] getRequestDetail 响应无效:', response);
      alert('获取请求详情失败，请稍后重试');
    }
  } catch (error) {
    console.error('[Bu-kit Panel] 发送到 Repeater 失败:', error);
  }
}

/**
 * 规范化请求头为统一数组格式
 * @param {Object|Array} headers - 请求头数据
 * @returns {Array<{name: string, value: string}>} 规范化后的请求头
 */
function normalizeRequestHeaders(headers) {
  const normalized = [];
  if (!headers) {
    return normalized;
  }
  
  if (Array.isArray(headers)) {
    headers.forEach((header) => {
      if (!header || !header.name) {
        return;
      }
      let value = header.value;
      if (Array.isArray(value)) {
        value = value.join(', ');
      }
      if (value === undefined || value === null) {
        value = '';
      }
      normalized.push({
        name: String(header.name),
        value: String(value)
      });
    });
    return normalized;
  }
  
  if (typeof headers === 'object') {
    Object.entries(headers).forEach(([name, value]) => {
      if (!name) {
        return;
      }
      let normalizedValue = value;
      if (Array.isArray(normalizedValue)) {
        normalizedValue = normalizedValue.join(', ');
      }
      if (normalizedValue === undefined || normalizedValue === null) {
        normalizedValue = '';
      }
      normalized.push({
        name: String(name),
        value: String(normalizedValue)
      });
    });
  }
  
  return normalized;
}

/**
 * 构建原始 HTTP 请求文本
 * @param {Object} detail - 请求详细信息
 * @returns {string} 原始请求文本
 */
function buildRawRequest(detail) {
  let urlPath = '/';
  let host = '';
  try {
    const urlObj = new URL(detail.url);
    urlPath = urlObj.pathname + urlObj.search;
    host = urlObj.host;
  } catch (e) {
    urlPath = detail.url;
  }
  
  const headerList = normalizeRequestHeaders(detail.requestHeaders);
  const hostHeader = headerList.find(header => header.name.toLowerCase() === 'host');
  if (!host && hostHeader && hostHeader.value) {
    host = hostHeader.value;
  }
  
  let raw = `${detail.method} ${urlPath} HTTP/1.1\r\n`;
  
  if (host) {
    raw += `Host: ${host}\r\n`;
  }
  
  headerList.forEach((header) => {
    if (!header.name) {
      return;
    }
    if (header.name.toLowerCase() === 'host') {
      return;
    }
    raw += `${header.name}: ${header.value}\r\n`;
  });
  
  raw += '\r\n';
  
  if (detail.requestBody !== null && detail.requestBody !== undefined) {
    if (typeof detail.requestBody === 'string') {
      raw += detail.requestBody;
    } else {
      try {
        raw += JSON.stringify(detail.requestBody);
      } catch (error) {
        raw += String(detail.requestBody);
      }
    }
  }
  
  return raw;
}

/**
 * 创建 Repeater Tab
 * @param {string|null} rawRequest - 原始请求文本
 * @param {Object|null} detail - 请求详细信息（可选）
 */
function createRepeaterTab(rawRequest, detail = null) {
  repeaterTabCounter++;
  const tabId = `repeater-${repeaterTabCounter}`;
  
  let tabName = `Tab ${repeaterTabCounter}`;
  if (detail && detail.url) {
    try {
      const urlObj = new URL(detail.url);
      tabName = urlObj.pathname.split('/').pop() || urlObj.hostname;
      if (tabName.length > 20) {
        tabName = tabName.substring(0, 20) + '...';
      }
    } catch (e) {
    }
  }
  
  const tab = {
    id: tabId,
    name: tabName,
    rawRequest: rawRequest || '',
    response: '',
    status: null,
    time: null,
    size: null,
    loading: false
  };
  
  repeaterTabs.push(tab);
  
  renderRepeaterTab(tab);
  
  renderRepeaterTabContent(tab);
  
  activateRepeaterTab(tabId);
  
  updateRepeaterCount();
  
  DOM.repeaterEmpty.style.display = 'none';
  
  console.log('[Bu-kit Panel] 创建 Repeater Tab:', tabId);
}

/**
 * 渲染 Repeater Tab 标签
 * @param {Object} tab - Tab 数据
 */
function renderRepeaterTab(tab) {
  const tabEl = document.createElement('div');
  tabEl.className = 'repeater-tab';
  tabEl.dataset.tabId = tab.id;
  
  tabEl.innerHTML = `
    <span class="repeater-tab-text" title="${escapeHtml(tab.name)}">${escapeHtml(tab.name)}</span>
    <button class="repeater-tab-close" title="关闭">×</button>
  `;
  
  tabEl.addEventListener('click', (event) => {
    if (event.target.classList.contains('repeater-tab-close')) {
      return;
    }
    activateRepeaterTab(tab.id);
  });
  
  const closeBtn = tabEl.querySelector('.repeater-tab-close');
  closeBtn.addEventListener('click', (event) => {
    event.stopPropagation();
    closeRepeaterTab(tab.id);
  });
  
  DOM.repeaterTabs.appendChild(tabEl);
}

/**
 * 渲染 Repeater Tab 内容
 * @param {Object} tab - Tab 数据
 */
function renderRepeaterTabContent(tab) {
  const contentEl = document.createElement('div');
  contentEl.className = 'repeater-tab-content';
  contentEl.dataset.tabId = tab.id;
  
  contentEl.innerHTML = `
    <div class="repeater-split">
      <!-- 左侧：请求面板 -->
      <div class="repeater-request-panel">
        <div class="repeater-panel-header">
          <span class="repeater-panel-title">Request</span>
          <button class="repeater-send-btn" data-tab-id="${tab.id}">
            <span>→</span>
            <span>Send</span>
          </button>
        </div>
        <textarea class="repeater-editor" data-tab-id="${tab.id}" placeholder="输入 HTTP 请求...">${escapeHtml(tab.rawRequest)}</textarea>
      </div>
      
      <!-- 右侧：响应面板 -->
      <div class="repeater-response-panel">
        <div class="repeater-panel-header">
          <span class="repeater-panel-title">Response</span>
        </div>
        <div class="repeater-status" data-tab-id="${tab.id}">
          <div class="repeater-status-item">
            <span class="repeater-status-label">Status:</span>
            <span class="repeater-status-value" data-field="status">-</span>
          </div>
          <div class="repeater-status-item">
            <span class="repeater-status-label">Time:</span>
            <span class="repeater-status-value" data-field="time">-</span>
          </div>
          <div class="repeater-status-item">
            <span class="repeater-status-label">Size:</span>
            <span class="repeater-status-value" data-field="size">-</span>
          </div>
        </div>
        <div class="repeater-response" data-tab-id="${tab.id}">点击 Send 按钮发送请求</div>
      </div>
    </div>
  `;
  
  const sendBtn = contentEl.querySelector('.repeater-send-btn');
  sendBtn.addEventListener('click', () => {
    handleRepeaterSend(tab.id);
  });
  
  const editor = contentEl.querySelector('.repeater-editor');
  editor.addEventListener('input', (event) => {
    const tabData = repeaterTabs.find(t => t.id === tab.id);
    if (tabData) {
      tabData.rawRequest = event.target.value;
    }
  });
  
  DOM.repeaterTabContents.appendChild(contentEl);
}

/**
 * 激活 Repeater Tab
 * @param {string} tabId - Tab ID
 */
function activateRepeaterTab(tabId) {
  activeRepeaterTabId = tabId;
  
  const tabs = DOM.repeaterTabs.querySelectorAll('.repeater-tab');
  tabs.forEach(tab => {
    tab.classList.toggle('active', tab.dataset.tabId === tabId);
  });
  
  const contents = DOM.repeaterTabContents.querySelectorAll('.repeater-tab-content');
  contents.forEach(content => {
    content.classList.toggle('active', content.dataset.tabId === tabId);
  });
}

/**
 * 关闭 Repeater Tab
 * @param {string} tabId - Tab ID
 */
function closeRepeaterTab(tabId) {
  const index = repeaterTabs.findIndex(t => t.id === tabId);
  if (index !== -1) {
    repeaterTabs.splice(index, 1);
  }
  
  const tabEl = DOM.repeaterTabs.querySelector(`[data-tab-id="${tabId}"]`);
  if (tabEl) {
    tabEl.remove();
  }
  
  const contentEl = DOM.repeaterTabContents.querySelector(`[data-tab-id="${tabId}"]`);
  if (contentEl) {
    contentEl.remove();
  }
  
  updateRepeaterCount();
  
  if (activeRepeaterTabId === tabId) {
    if (repeaterTabs.length > 0) {
      activateRepeaterTab(repeaterTabs[repeaterTabs.length - 1].id);
    } else {
      activeRepeaterTabId = null;
      DOM.repeaterEmpty.style.display = 'flex';
    }
  }
  
  console.log('[Bu-kit Panel] 关闭 Repeater Tab:', tabId);
}

/**
 * 更新 Repeater Tab 计数
 */
function updateRepeaterCount() {
  const count = repeaterTabs.length;
  DOM.repeaterCount.textContent = count;
  DOM.repeaterCount.classList.toggle('has-tabs', count > 0);
}

/**
 * 处理 Repeater 发送请求
 * @param {string} tabId - Tab ID
 */
async function handleRepeaterSend(tabId) {
  const tab = repeaterTabs.find(t => t.id === tabId);
  if (!tab) return;
  
  const editor = DOM.repeaterTabContents.querySelector(`.repeater-editor[data-tab-id="${tabId}"]`);
  const rawRequest = editor ? editor.value : tab.rawRequest;
  
  const parsed = parseRawRequest(rawRequest);
  if (!parsed) {
    updateRepeaterResponse(tabId, '解析请求失败，请检查请求格式', null);
    return;
  }
  
  tab.loading = true;
  updateRepeaterResponse(tabId, '发送中...', null, true);
  
  const startTime = Date.now();
  
  try {
    const response = await sendRepeaterRequest(parsed);
    
    const elapsed = Date.now() - startTime;
    
    tab.loading = false;
    tab.status = response.status;
    tab.time = elapsed + 'ms';
    tab.size = formatSize(response.body ? response.body.length : 0);
    tab.response = buildRawResponse(response);
    
    updateRepeaterResponse(tabId, tab.response, {
      status: tab.status,
      time: tab.time,
      size: tab.size
    });
    
    console.log('[Bu-kit Panel] Repeater 请求完成:', tabId, tab.status);
  } catch (error) {
    tab.loading = false;
    tab.response = `请求失败: ${error.message}`;
    
    updateRepeaterResponse(tabId, tab.response, null);
    
    console.error('[Bu-kit Panel] Repeater 请求失败:', error);
  }
}

/**
 * 解析原始 HTTP 请求
 * @param {string} rawRequest - 原始请求文本
 * @returns {Object|null} 解析后的请求对象
 */
function parseRawRequest(rawRequest) {
  try {
    if (!rawRequest || typeof rawRequest !== 'string') {
      return null;
    }

    const separatorMatch = rawRequest.match(/\r?\n\r?\n/);
    let headerPart = rawRequest;
    let body = '';
    if (separatorMatch) {
      const splitIndex = separatorMatch.index;
      headerPart = rawRequest.slice(0, splitIndex);
      body = rawRequest.slice(splitIndex + separatorMatch[0].length);
    }
    
    const lines = headerPart.split(/\r?\n/);
    if (lines.length === 0) return null;
    
    const requestLineIndex = lines.findIndex(line => line.trim().length > 0);
    if (requestLineIndex === -1) return null;
    const requestLine = lines[requestLineIndex].trim();
    const requestParts = requestLine.split(/\s+/);
    if (requestParts.length < 2) return null;
    
    const method = requestParts[0];
    const target = requestParts[1];
    
    const headerList = [];
    const headerMap = {};
    let lastHeader = null;
    for (let i = requestLineIndex + 1; i < lines.length; i++) {
      const line = lines[i];
      if (!line) {
        continue;
      }
      if (/^\s+/.test(line) && lastHeader) {
        lastHeader.value += ` ${line.trim()}`;
        const lowerName = lastHeader.name.toLowerCase();
        const values = headerMap[lowerName];
        if (values && values.length > 0) {
          values[values.length - 1] = lastHeader.value;
        }
        continue;
      }
      const colonIndex = line.indexOf(':');
      if (colonIndex <= 0) {
        continue;
      }
      const name = line.substring(0, colonIndex).trim();
      const value = line.substring(colonIndex + 1).trim();
      const header = { name, value };
      headerList.push(header);
      lastHeader = header;
      const lowerName = name.toLowerCase();
      if (!headerMap[lowerName]) {
        headerMap[lowerName] = [];
      }
      headerMap[lowerName].push(value);
    }
    
    const getHeaderValue = (key) => (headerMap[key] && headerMap[key][0]) ? headerMap[key][0] : '';
    const hostHeader = getHeaderValue('host');
    const originHeader = getHeaderValue('origin');
    const refererHeader = getHeaderValue('referer');
    const forwardedProto = getHeaderValue('x-forwarded-proto');
    
    let url = '';
    if (/^https?:\/\//i.test(target)) {
      url = target;
    } else {
      let host = hostHeader;
      if (!host && originHeader) {
        try {
          host = new URL(originHeader).host;
        } catch (e) {
        }
      }
      if (!host && refererHeader) {
        try {
          host = new URL(refererHeader).host;
        } catch (e) {
        }
      }
      if (!host) {
        return null;
      }
      
      let protocol = 'http';
      let protocolFromHeader = '';
      if (originHeader) {
        try {
          protocolFromHeader = new URL(originHeader).protocol;
        } catch (e) {
        }
      }
      if (!protocolFromHeader && refererHeader) {
        try {
          protocolFromHeader = new URL(refererHeader).protocol;
        } catch (e) {
        }
      }
      if (protocolFromHeader) {
        protocol = protocolFromHeader.replace(':', '');
      } else if (forwardedProto) {
        protocol = forwardedProto;
      } else if (host && /:\d+$/.test(host)) {
        const port = host.split(':').pop();
        if (port === '443') {
          protocol = 'https';
        } else if (port === '80') {
          protocol = 'http';
        }
      }
      
      const normalizedPath = target.startsWith('/') ? target : `/${target}`;
      url = `${protocol}://${host}${normalizedPath}`;
    }
    
    return {
      method,
      url,
      headers: headerList,
      body
    };
  } catch (error) {
    console.error('[Bu-kit Panel] 解析请求失败:', error);
    return null;
  }
}

/**
 * 发送 Repeater 请求
 * @param {Object} parsed - 解析后的请求对象
 * @returns {Promise<Object>} 响应对象
 */
async function sendRepeaterRequest(parsed) {
  const fetchHeaders = new Headers();
  if (Array.isArray(parsed.headers)) {
    parsed.headers.forEach((header) => {
      if (!header || !header.name) {
        return;
      }
      try {
        fetchHeaders.append(header.name, header.value ?? '');
      } catch (error) {
        console.warn('[Bu-kit Panel] 请求头无效，已忽略:', header, error);
      }
    });
  } else if (parsed.headers && typeof parsed.headers === 'object') {
    Object.entries(parsed.headers).forEach(([name, value]) => {
      try {
        fetchHeaders.append(name, value);
      } catch (error) {
        console.warn('[Bu-kit Panel] 请求头无效，已忽略:', name, error);
      }
    });
  }
  const fetchOptions = {
    method: parsed.method,
    headers: fetchHeaders,
    mode: 'cors',
    credentials: 'include'
  };
  
  if (parsed.body && parsed.method !== 'GET' && parsed.method !== 'HEAD') {
    fetchOptions.body = parsed.body;
  }
  
  const response = await fetch(parsed.url, fetchOptions);
  
  const body = await response.text();
  
  const responseHeaders = {};
  response.headers.forEach((value, name) => {
    responseHeaders[name] = value;
  });
  
  return {
    status: response.status,
    statusText: response.statusText,
    headers: responseHeaders,
    body
  };
}

/**
 * 构建原始 HTTP 响应文本
 * @param {Object} response - 响应对象
 * @returns {string} 原始响应文本
 */
function buildRawResponse(response) {
  let raw = `HTTP/1.1 ${response.status} ${response.statusText}\r\n`;
  
  for (const [name, value] of Object.entries(response.headers)) {
    raw += `${name}: ${value}\r\n`;
  }
  
  raw += '\r\n';
  
  if (response.body) {
    raw += response.body;
  }
  
  return raw;
}

/**
 * 更新 Repeater 响应显示
 * @param {string} tabId - Tab ID
 * @param {string} content - 响应内容
 * @param {Object|null} status - 状态信息
 * @param {boolean} loading - 是否加载中
 */
function updateRepeaterResponse(tabId, content, status, loading = false) {
  const responseEl = DOM.repeaterTabContents.querySelector(`.repeater-response[data-tab-id="${tabId}"]`);
  if (responseEl) {
    if (loading) {
      responseEl.innerHTML = '<div class="repeater-loading"><div class="repeater-spinner"></div><span>发送中...</span></div>';
    } else {
      responseEl.textContent = content;
    }
  }
  
  const statusEl = DOM.repeaterTabContents.querySelector(`.repeater-status[data-tab-id="${tabId}"]`);
  if (statusEl && status) {
    const statusValue = statusEl.querySelector('[data-field="status"]');
    const timeValue = statusEl.querySelector('[data-field="time"]');
    const sizeValue = statusEl.querySelector('[data-field="size"]');
    
    if (statusValue) statusValue.textContent = status.status || '-';
    if (timeValue) timeValue.textContent = status.time || '-';
    if (sizeValue) sizeValue.textContent = status.size || '-';
  }
}

console.log('[Bu-kit Panel] 脚本加载完成');
