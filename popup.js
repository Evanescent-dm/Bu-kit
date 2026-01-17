

let currentTabId = null;

let isCapturing = false;

let DOM = {};

document.addEventListener('DOMContentLoaded', () => {
  init();
});

/**
 * 初始化函数
 */
function init() {
  console.log('[Bu-kit Popup] 初始化开始');
  
  initDOMReferences();
  
  bindEvents();
  
  loadCurrentTab();
  
  showVersion();
  
  console.log('[Bu-kit Popup] 初始化完成');
}

/**
 * 初始化 DOM 元素引用
 */
function initDOMReferences() {
  DOM.captureStatus = document.getElementById('captureStatus');   // 捕获状态文本
  DOM.requestCount = document.getElementById('requestCount');     // 请求数量
  DOM.tabInfo = document.getElementById('tabInfo');               // 标签页信息
  
  DOM.captureBtn = document.getElementById('captureBtn');         // 捕获按钮
  DOM.openPanelBtn = document.getElementById('openPanelBtn');     // 打开面板按钮
  
  DOM.version = document.getElementById('version');               // 版本号
}

/**
 * 绑定事件监听器
 */
function bindEvents() {
  DOM.captureBtn.addEventListener('click', () => {
    handleCaptureClick();
  });
  
  DOM.openPanelBtn.addEventListener('click', () => {
    handleOpenPanelClick();
  });
}

/**
 * 显示版本号
 */
function showVersion() {
  const version = chrome.runtime.getManifest().version;
  DOM.version.textContent = 'v' + version;
}

/**
 * 加载当前标签页信息
 */
async function loadCurrentTab() {
  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (tabs && tabs.length > 0) {
      const tab = tabs[0];
      currentTabId = tab.id;
      
      try {
        const url = new URL(tab.url);
        DOM.tabInfo.textContent = url.hostname;
        DOM.tabInfo.title = tab.url;
      } catch (e) {
        DOM.tabInfo.textContent = tab.url || '-';
      }
      
      loadCaptureState();
    } else {
      DOM.tabInfo.textContent = '-';
    }
  } catch (error) {
    console.error('[Bu-kit Popup] 加载标签页失败:', error);
    DOM.tabInfo.textContent = '-';
  }
}

/**
 * 加载捕获状态
 */
async function loadCaptureState() {
  if (!currentTabId) {
    return;
  }
  
  try {
    const response = await sendMessage({
      action: 'getCaptureState',
      tabId: currentTabId
    });
    
    if (response && response.success) {
      isCapturing = response.data.attached;
      updateUI(response.data);
    }
  } catch (error) {
    console.error('[Bu-kit Popup] 加载捕获状态失败:', error);
  }
}

/**
 * 更新 UI 显示
 * @param {Object} data - 状态数据
 */
function updateUI(data) {
  if (data.attached) {
    DOM.captureStatus.textContent = '捕获中';
    DOM.captureStatus.classList.remove('stopped');
    DOM.captureStatus.classList.add('capturing');
    
    DOM.captureBtn.textContent = '■ 停止捕获';
    DOM.captureBtn.classList.add('capturing');
  } else {
    DOM.captureStatus.textContent = '未捕获';
    DOM.captureStatus.classList.remove('capturing');
    DOM.captureStatus.classList.add('stopped');
    
    DOM.captureBtn.textContent = '● 开始捕获';
    DOM.captureBtn.classList.remove('capturing');
  }
  
  DOM.requestCount.textContent = data.requestCount || 0;
}

/**
 * 处理捕获按钮点击
 */
async function handleCaptureClick() {
  if (!currentTabId) {
    alert('无法获取当前标签页');
    return;
  }
  
  if (isCapturing) {
    await stopCapture();
  } else {
    await startCapture();
  }
}

/**
 * 开始捕获
 */
async function startCapture() {
  try {
    DOM.captureBtn.disabled = true;
    DOM.captureBtn.textContent = '连接中...';
    
    const response = await sendMessage({
      action: 'startCapture',
      tabId: currentTabId
    });
    
    if (response && response.success) {
      isCapturing = true;
      updateUI({ attached: true, requestCount: 0 });
      console.log('[Bu-kit Popup] 开始捕获成功');
    } else {
      alert('开始捕获失败: ' + (response?.error || '未知错误'));
    }
  } catch (error) {
    console.error('[Bu-kit Popup] 开始捕获异常:', error);
    alert('开始捕获失败: ' + error.message);
  } finally {
    DOM.captureBtn.disabled = false;
    loadCaptureState();
  }
}

/**
 * 停止捕获
 */
async function stopCapture() {
  try {
    DOM.captureBtn.disabled = true;
    DOM.captureBtn.textContent = '断开中...';
    
    const response = await sendMessage({
      action: 'stopCapture',
      tabId: currentTabId
    });
    
    if (response && response.success) {
      isCapturing = false;
      updateUI({ attached: false, requestCount: 0 });
      console.log('[Bu-kit Popup] 停止捕获成功');
    } else {
      console.error('[Bu-kit Popup] 停止捕获失败:', response?.error);
    }
  } catch (error) {
    console.error('[Bu-kit Popup] 停止捕获异常:', error);
  } finally {
    DOM.captureBtn.disabled = false;
    loadCaptureState();
  }
}

/**
 * 处理打开面板按钮点击
 */
function handleOpenPanelClick() {
  alert('请按 F12 打开开发者工具，然后切换到 "Bu-kit" 标签页查看详细请求信息。');
}

/**
 * 发送消息到 background
 * @param {Object} message - 消息对象
 * @returns {Promise<Object>} 响应对象
 */
function sendMessage(message) {
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

console.log('[Bu-kit Popup] 脚本加载完成');
