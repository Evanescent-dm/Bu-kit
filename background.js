

const httpHistory = {};

const debuggerAttached = {};

const requestToTab = {};

const MAX_REQUESTS_PER_TAB = 1000;

const MAX_RESPONSE_BODY_SIZE = 5 * 1024 * 1024; // 5MB

chrome.runtime.onInstalled.addListener((details) => {
  console.log('[Bu-kit] 扩展已安装/更新:', details.reason);
  
  if (details.reason === 'install') {
    initializeDefaultSettings();
  }
  
  if (details.reason === 'update') {
    const version = chrome.runtime.getManifest().version;
    console.log('[Bu-kit] 扩展已更新到版本:', version);
  }
});

/**
 * 初始化默认设置
 * 将默认配置保存到 chrome.storage.local
 */
function initializeDefaultSettings() {
  const defaultSettings = {
    autoCapture: false,
    captureImages: false,
    captureFonts: false,
    filterRules: [],
    maxRequests: MAX_REQUESTS_PER_TAB
  };
  
  chrome.storage.local.set(defaultSettings, () => {
    console.log('[Bu-kit] 默认配置已初始化:', defaultSettings);
  });
}

/**
 * 连接 debugger 到指定标签页
 * 启用 Network 域以捕获网络请求
 * @param {number} tabId - 目标标签页 ID
 * @returns {Promise<{success: boolean, error?: string}>} 操作结果
 */
async function attachDebugger(tabId) {
  if (debuggerAttached[tabId]) {
    console.log('[Bu-kit] Debugger 已连接到标签页:', tabId);
    return { success: true, message: '已连接' };
  }
  
  try {
    await new Promise((resolve, reject) => {
      chrome.debugger.attach({ tabId: tabId }, '1.3', () => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve();
        }
      });
    });
    
    await new Promise((resolve, reject) => {
      chrome.debugger.sendCommand({ tabId: tabId }, 'Network.enable', {}, () => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve();
        }
      });
    });
    
    debuggerAttached[tabId] = true;
    
    if (!httpHistory[tabId]) {
      httpHistory[tabId] = {};
    }
    
    console.log('[Bu-kit] Debugger 已成功连接到标签页:', tabId);
    
    return { success: true, message: 'Debugger 已连接' };
    
  } catch (error) {
    console.error('[Bu-kit] 连接 Debugger 失败:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * 断开 debugger 与指定标签页的连接
 * @param {number} tabId - 目标标签页 ID
 * @returns {Promise<{success: boolean, error?: string}>} 操作结果
 */
async function detachDebugger(tabId) {
  if (!debuggerAttached[tabId]) {
    console.log('[Bu-kit] Debugger 未连接到标签页:', tabId);
    return { success: true, message: '未连接' };
  }
  
  try {
    await new Promise((resolve, reject) => {
      chrome.debugger.detach({ tabId: tabId }, () => {
        if (chrome.runtime.lastError) {
          console.warn('[Bu-kit] 断开 Debugger 警告:', chrome.runtime.lastError.message);
          resolve();
        } else {
          resolve();
        }
      });
    });
    
    debuggerAttached[tabId] = false;
    
    console.log('[Bu-kit] Debugger 已断开与标签页的连接:', tabId);
    
    return { success: true, message: 'Debugger 已断开' };
    
  } catch (error) {
    console.error('[Bu-kit] 断开 Debugger 失败:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * 获取指定标签页的捕获状态
 * @param {number} tabId - 标签页 ID
 * @returns {{attached: boolean, requestCount: number}} 捕获状态
 */
function getCaptureState(tabId) {
  return {
    attached: debuggerAttached[tabId] || false,
    requestCount: httpHistory[tabId] ? Object.keys(httpHistory[tabId]).length : 0
  };
}

chrome.debugger.onEvent.addListener((source, method, params) => {
  handleDebuggerEvent(source, method, params);
});

chrome.debugger.onDetach.addListener((source, reason) => {
  const tabId = source.tabId;
  
  console.log('[Bu-kit] Debugger 已断开:', tabId, '原因:', reason);
  
  debuggerAttached[tabId] = false;
});

/**
 * 处理 debugger 事件的主函数
 * 根据事件类型分发到对应的处理函数
 * @param {Object} source - 事件来源（包含 tabId）
 * @param {string} method - 事件方法名（如 'Network.requestWillBeSent'）
 * @param {Object} params - 事件参数
 */
function handleDebuggerEvent(source, method, params) {
  const tabId = source.tabId;
  
  switch (method) {
    
    case 'Network.requestWillBeSent':
      handleNetworkRequestWillBeSent(tabId, params);
      break;
    
    case 'Network.responseReceived':
      handleNetworkResponseReceived(tabId, params);
      break;
    
    case 'Network.loadingFinished':
      handleNetworkLoadingFinished(tabId, params);
      break;
    
    case 'Network.loadingFailed':
      handleNetworkLoadingFailed(tabId, params);
      break;
    
    default:
      break;
  }
}

/**
 * 处理 Network.requestWillBeSent 事件
 * 当浏览器即将发送网络请求时触发
 * @param {number} tabId - 标签页 ID
 * @param {Object} params - 事件参数
 */
function handleNetworkRequestWillBeSent(tabId, params) {
  const requestId = params.requestId;           // 请求唯一标识符
  const request = params.request;               // 请求详情对象
  const timestamp = params.timestamp;           // 请求时间戳
  const type = params.type;                     // 资源类型（Document, XHR, Fetch 等）
  const initiator = params.initiator;           // 请求发起者信息
  const redirectResponse = params.redirectResponse; // 重定向响应（如果有）
  
  if (!httpHistory[tabId]) {
    httpHistory[tabId] = {};
  }
  
  requestToTab[requestId] = tabId;
  
  if (redirectResponse) {
    if (httpHistory[tabId][requestId]) {
      httpHistory[tabId][requestId].redirectResponse = {
        status: redirectResponse.status,
        statusText: redirectResponse.statusText,
        headers: redirectResponse.headers,
        redirectUrl: request.url
      };
    }
  }
  
  const requestData = {
    id: requestId,
    tabId: tabId,
    url: request.url,
    method: request.method,
    type: type,
    timestamp: timestamp * 1000,
    time: new Date(timestamp * 1000).toLocaleTimeString(),
    
    requestHeaders: request.headers || {},
    requestBody: request.postData || null,
    initiator: initiator,
    
    status: null,
    statusText: null,
    responseHeaders: null,
    responseBody: null,
    mimeType: null,
    responseSize: null,
    
    completed: false,
    failed: false,
    error: null
  };
  
  httpHistory[tabId][requestId] = requestData;
  
  const requestCount = Object.keys(httpHistory[tabId]).length;
  if (requestCount > MAX_REQUESTS_PER_TAB) {
    pruneOldRequests(tabId);
  }
  
  console.log('[Bu-kit] 捕获请求:', request.method, request.url);
}

/**
 * 处理 Network.responseReceived 事件
 * 当收到服务器响应头时触发
 * @param {number} tabId - 标签页 ID
 * @param {Object} params - 事件参数
 */
function handleNetworkResponseReceived(tabId, params) {
  const requestId = params.requestId;           // 请求 ID
  const response = params.response;             // 响应对象
  
  if (!httpHistory[tabId] || !httpHistory[tabId][requestId]) {
    console.warn('[Bu-kit] 未找到对应的请求:', requestId);
    return;
  }
  
  const requestData = httpHistory[tabId][requestId];
  
  requestData.status = response.status;
  requestData.statusText = response.statusText;
  requestData.responseHeaders = response.headers || {};
  requestData.mimeType = response.mimeType;
  requestData.responseSize = response.encodedDataLength || 0;
  requestData.remoteIPAddress = response.remoteIPAddress || null;
  requestData.remotePort = response.remotePort || null;
  requestData.protocol = response.protocol || null;
  
  console.log('[Bu-kit] 收到响应:', response.status, requestData.url);
}

/**
 * 处理 Network.loadingFinished 事件
 * 当请求加载完成时触发，此时可以获取响应体
 * @param {number} tabId - 标签页 ID
 * @param {Object} params - 事件参数
 */
function handleNetworkLoadingFinished(tabId, params) {
  const requestId = params.requestId;           // 请求 ID
  const encodedDataLength = params.encodedDataLength; // 编码后的数据长度
  
  if (!httpHistory[tabId] || !httpHistory[tabId][requestId]) {
    return;
  }
  
  const requestData = httpHistory[tabId][requestId];
  
  requestData.completed = true;
  requestData.responseSize = encodedDataLength;
  
  fetchResponseBody(tabId, requestId);
  
  console.log('[Bu-kit] 请求完成:', requestData.url);
}

/**
 * 处理 Network.loadingFailed 事件
 * 当请求加载失败时触发
 * @param {number} tabId - 标签页 ID
 * @param {Object} params - 事件参数
 */
function handleNetworkLoadingFailed(tabId, params) {
  const requestId = params.requestId;           // 请求 ID
  const errorText = params.errorText;           // 错误描述
  const canceled = params.canceled;             // 是否被取消
  
  if (!httpHistory[tabId] || !httpHistory[tabId][requestId]) {
    return;
  }
  
  const requestData = httpHistory[tabId][requestId];
  
  requestData.completed = true;
  requestData.failed = true;
  requestData.error = canceled ? '请求已取消' : errorText;
  
  console.log('[Bu-kit] 请求失败:', requestData.url, errorText);
}

/**
 * 获取响应体内容
 * 使用 Network.getResponseBody 命令获取完整响应体
 * @param {number} tabId - 标签页 ID
 * @param {string} requestId - 请求 ID
 */
async function fetchResponseBody(tabId, requestId) {
  if (!debuggerAttached[tabId]) {
    console.warn('[Bu-kit] Debugger 已断开，无法获取响应体');
    return;
  }
  
  if (!httpHistory[tabId] || !httpHistory[tabId][requestId]) {
    return;
  }
  
  try {
    const result = await new Promise((resolve, reject) => {
      chrome.debugger.sendCommand(
        { tabId: tabId },
        'Network.getResponseBody',
        { requestId: requestId },
        (response) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            resolve(response);
          }
        }
      );
    });
    
    const requestData = httpHistory[tabId][requestId];
    
    if (result.body && result.body.length > MAX_RESPONSE_BODY_SIZE) {
      requestData.responseBody = result.body.substring(0, MAX_RESPONSE_BODY_SIZE);
      requestData.responseBodyTruncated = true;
    } else {
      requestData.responseBody = result.body || null;
      requestData.responseBodyTruncated = false;
    }
    
    requestData.responseBodyBase64 = result.base64Encoded || false;
    
    console.log('[Bu-kit] 已获取响应体:', requestData.url, 
      result.body ? result.body.length + ' bytes' : 'empty');
    
  } catch (error) {
    console.warn('[Bu-kit] 获取响应体失败:', requestId, error.message);
    
    if (httpHistory[tabId] && httpHistory[tabId][requestId]) {
      httpHistory[tabId][requestId].responseBodyError = error.message;
    }
  }
}

/**
 * 删除最旧的请求，保持存储在限制范围内
 * @param {number} tabId - 标签页 ID
 */
function pruneOldRequests(tabId) {
  if (!httpHistory[tabId]) {
    return;
  }
  
  const requests = Object.values(httpHistory[tabId]);
  requests.sort((a, b) => a.timestamp - b.timestamp);
  
  const deleteCount = requests.length - MAX_REQUESTS_PER_TAB;
  
  for (let i = 0; i < deleteCount; i++) {
    const requestId = requests[i].id;
    delete httpHistory[tabId][requestId];
    delete requestToTab[requestId];
  }
  
  console.log('[Bu-kit] 已清理', deleteCount, '个旧请求');
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  handleMessage(request, sender, sendResponse);
  return true;
});

/**
 * 处理消息的主函数
 * 根据 action 类型分发到对应的处理逻辑
 * @param {Object} request - 请求对象
 * @param {Object} sender - 发送者信息
 * @param {Function} sendResponse - 响应回调函数
 */
async function handleMessage(request, sender, sendResponse) {
  console.log('[Bu-kit] 收到消息:', request.action);
  
  switch (request.action) {
    
    case 'getRequests':
      const requests = getRequestsForTab(request.tabId);
      sendResponse({ success: true, data: requests });
      break;
    
    case 'getRequestDetail':
      const detail = getRequestDetail(request.tabId, request.requestId);
      sendResponse({ success: true, data: detail });
      break;
    
    case 'clearRequests':
      clearRequestsForTab(request.tabId);
      sendResponse({ success: true, message: '已清除所有请求' });
      break;
    
    case 'startCapture':
      const attachResult = await attachDebugger(request.tabId);
      sendResponse(attachResult);
      break;
    
    case 'stopCapture':
      const detachResult = await detachDebugger(request.tabId);
      sendResponse(detachResult);
      break;
    
    case 'getCaptureState':
      const state = getCaptureState(request.tabId);
      sendResponse({ success: true, data: state });
      break;
    
    case 'getAllCaptureStates':
      const allStates = {};
      for (const tabId in debuggerAttached) {
        allStates[tabId] = getCaptureState(parseInt(tabId));
      }
      sendResponse({ success: true, data: allStates });
      break;
    
    default:
      console.warn('[Bu-kit] 未知的操作:', request.action);
      sendResponse({ success: false, error: '未知的操作: ' + request.action });
  }
}

/**
 * 获取指定标签页的所有请求
 * @param {number} tabId - 标签页 ID
 * @returns {Array} 请求数组（按时间倒序）
 */
function getRequestsForTab(tabId) {
  if (!httpHistory[tabId]) {
    return [];
  }
  
  const requests = Object.values(httpHistory[tabId]);
  
  requests.sort((a, b) => b.timestamp - a.timestamp);
  
  return requests.map(req => ({
    id: req.id,
    url: req.url,
    method: req.method,
    type: req.type,
    status: req.status,
    statusText: req.statusText,
    mimeType: req.mimeType,
    responseSize: req.responseSize,
    time: req.time,
    timestamp: req.timestamp,
    completed: req.completed,
    failed: req.failed,
    error: req.error
  }));
}

/**
 * 获取指定请求的详细信息
 * @param {number} tabId - 标签页 ID
 * @param {string} requestId - 请求 ID
 * @returns {Object|null} 请求详情对象
 */
function getRequestDetail(tabId, requestId) {
  if (!httpHistory[tabId] || !httpHistory[tabId][requestId]) {
    return null;
  }
  
  return httpHistory[tabId][requestId];
}

/**
 * 清除指定标签页的所有请求
 * @param {number} tabId - 标签页 ID
 */
function clearRequestsForTab(tabId) {
  if (httpHistory[tabId]) {
    for (const requestId in httpHistory[tabId]) {
      delete requestToTab[requestId];
    }
    httpHistory[tabId] = {};
  }
  
  console.log('[Bu-kit] 已清除标签页', tabId, '的所有请求');
}

chrome.tabs.onRemoved.addListener((tabId) => {
  console.log('[Bu-kit] 标签页已关闭:', tabId);
  
  cleanupTab(tabId);
});

/**
 * 清理指定标签页的所有数据
 * @param {number} tabId - 标签页 ID
 */
function cleanupTab(tabId) {
  if (debuggerAttached[tabId]) {
    detachDebugger(tabId);
  }
  
  if (httpHistory[tabId]) {
    for (const requestId in httpHistory[tabId]) {
      delete requestToTab[requestId];
    }
    delete httpHistory[tabId];
  }
  
  delete debuggerAttached[tabId];
  
  console.log('[Bu-kit] 已清理标签页', tabId, '的所有数据');
}

console.log('[Bu-kit] 后台服务已启动');
console.log('[Bu-kit] 版本:', chrome.runtime.getManifest().version);
