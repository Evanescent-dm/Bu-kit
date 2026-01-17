

const PANEL_TITLE = 'Bu-kit';

const PANEL_ICON = 'icons/icon_16.png';

const PANEL_PAGE = 'panel/panel.html';

chrome.devtools.panels.create(
  PANEL_TITLE,
  PANEL_ICON,
  PANEL_PAGE,
  (panel) => {
    onPanelCreated(panel);
  }
);

/**
 * 面板创建完成后的处理函数
 * 注册面板的显示/隐藏事件监听器
 * @param {chrome.devtools.panels.ExtensionPanel} panel - 创建的面板对象
 */
function onPanelCreated(panel) {
  console.log('[Bu-kit] DevTools 面板已创建');
  
  panel.onShown.addListener((panelWindow) => {
    onPanelShown(panelWindow);
  });
  
  panel.onHidden.addListener(() => {
    onPanelHidden();
  });
}

/**
 * 面板显示时的处理函数
 * 可以在这里初始化面板内容或刷新数据
 * @param {Window} panelWindow - 面板的 window 对象
 */
function onPanelShown(panelWindow) {
  console.log('[Bu-kit] 面板已显示');
  
  if (panelWindow && typeof panelWindow.onPanelShown === 'function') {
    panelWindow.onPanelShown();
  }
}

/**
 * 面板隐藏时的处理函数
 * 可以在这里暂停某些操作以节省资源
 */
function onPanelHidden() {
  console.log('[Bu-kit] 面板已隐藏');
}

const inspectedTabId = chrome.devtools.inspectedWindow.tabId;

console.log('[Bu-kit] 当前检查的标签页 ID:', inspectedTabId);

console.log('[Bu-kit] DevTools 脚本初始化完成');
