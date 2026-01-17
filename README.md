<div align="center">

<img src="Bu-kit.png" alt="Bu-kit Logo" width="600"/>

# Bu-kit

![Version](https://img.shields.io/badge/version-0.0.1-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![Chrome](https://img.shields.io/badge/chrome-extension-orange.svg)

**一款轻量级的 Chrome HTTP 请求监控与调试工具**

**A lightweight Chrome HTTP request monitoring and debugging tool**

[简体中文](#简体中文) | [English](#english)

</div>

---

## 简体中文

### 📖 项目简介

Bu-kit 是一款基于 Chrome Extension Manifest V3 的 HTTP 请求监控与调试工具，灵感来源于著名的渗透测试工具 Burp Suite。通过 `chrome.debugger` API 和 DevTools Protocol，Bu-kit 能够捕获并展示完整的 HTTP 请求/响应数据，为 Web 开发者和安全研究人员提供强大的网络流量分析能力。

### ✨ 核心特性

- 🔍 **完整请求捕获** - 基于 DevTools Protocol 的 Network 域捕获所有网络请求
- 📊 **实时监控** - 实时显示页面加载的所有 HTTP/HTTPS 请求
- 🔎 **智能过滤** - 支持按 URL、方法、状态码、资源类型、Host 等多维度过滤
- 📝 **详情查看** - 完整展示请求头、响应头、请求体、响应体
- 🔄 **Repeater 功能** - 手动编辑并重放 HTTP 请求，类似 Burp Suite Repeater
- 💾 **本地存储** - 请求数据仅存储在本地内存，保护隐私安全

### 🚀 快速开始

#### 安装步骤

1. **下载项目**
   ```bash
   git clone https://github.com/Evanescent-dm/Bu-kit.git
   cd Bu-kit
   ```

2. **加载扩展**
   - 打开 Chrome 浏览器，访问 `chrome://extensions/`
   - 开启右上角的「开发者模式」
   - 点击「加载已解压的扩展程序」
   - 选择 Bu-kit 项目目录

#### 使用方法

1. **开始捕获**
   - 方式一：点击浏览器工具栏的扩展图标，在弹出窗口中点击「开始捕获」
   - 方式二：按 F12 打开 DevTools，切换到「Bu-kit」标签页，点击「开始捕获」

2. **查看请求**
   - 在 DevTools 的 Bu-kit 面板中查看所有捕获的请求
   - 点击任意请求行查看详细信息（Headers、Request、Response、Preview）

3. **过滤与搜索**
   - 使用顶部搜索框搜索 URL、方法、状态码
   - 使用下拉菜单按资源类型、请求方法、Host 过滤

4. **使用 Repeater**
   - 在请求列表中光标移动至数据行，点击数据右侧的->按钮，「发送到 Repeater」
   - 在 Repeater 标签页中编辑请求内容
   - 点击「发送」按钮重放请求并查看响应

5. **停止捕获**
   - 点击「停止捕获」按钮断开 debugger 连接

### 📁 项目结构

```
Bu-kit/
├── manifest.json           # 扩展配置文件（Manifest V3）
├── background.js           # 后台服务脚本（Service Worker）
├── devtools.html           # DevTools 入口页面
├── devtools.js             # DevTools 面板初始化脚本
├── popup.html              # 弹出窗口页面
├── popup.js                # 弹出窗口逻辑
├── popup_clean.html        # 弹出窗口备用页面
├── panel/                  # DevTools 面板模块
│   ├── panel.html          # 面板主页面
│   ├── panel.css           # 面板样式表
│   └── panel.js            # 面板主逻辑
├── icons/                  # 图标资源
│   ├── icon_16.png
│   ├── icon_48.png
│   └── icon_128.png
├── _locales/               # 国际化资源
│   ├── en/
│   │   └── messages.json   # 英文语言包
│   └── zh_CN/
│       └── messages.json   # 简体中文语言包
├── README.md               # 项目说明文档
└── PROJECT_ANALYSIS.md     # 项目分析文档
```

### 🏗️ 技术架构

#### 核心技术栈

- **Chrome Extension Manifest V3** - 最新的扩展开发规范
- **Chrome Debugger API** - 用于连接和控制浏览器调试器
- **DevTools Protocol** - 捕获网络请求的底层协议
- **Service Worker** - 后台服务处理请求捕获和存储
- **DevTools Panel API** - 自定义开发者工具面板

#### 架构设计

```
┌─────────────────┐
│  DevTools Panel │ ──┐
└─────────────────┘   │
                      │ chrome.runtime.sendMessage
┌─────────────────┐   │
│     Popup       │ ──┤
└─────────────────┘   │
                      ▼
              ┌──────────────────┐
              │ Background       │
              │ Service Worker   │
              └──────────────────┘
                      │
                      │ chrome.debugger API
                      ▼
              ┌──────────────────┐
              │ DevTools Protocol│
              │  Network Events  │
              └──────────────────┘
```


### 📊 功能特性详解

#### HTTP History（请求历史）

- ✅ 按标签页独立存储请求历史
- ✅ 支持最多 100 条请求记录（可配置）
- ✅ 实时更新请求状态（pending → completed/failed）

#### 过滤与搜索

- 🔍 关键词搜索：URL、方法、状态码
- 📋 资源类型过滤：Document、XHR、Fetch、Script、Stylesheet、Image 等
- 🌐 请求方法过滤：GET、POST、PUT、DELETE 等
- 🏠 Host 过滤：按域名筛选请求
- ⏱️ 排序：按时间正序/倒序排列

#### Repeater 功能

- ✏️ 可视化编辑 HTTP 请求
- 🔄 支持修改 Method、URL、Headers、Body
- 📤 重新发送请求并查看响应
- 📑 多标签页管理多个 Repeater 会话

### ⚠️ 注意事项

1. **Debugger 权限**
   - 使用 debugger API 需要用户授权
   - 连接后页面顶部会显示「正在调试此浏览器」提示条
   - 这是 Chrome 的安全机制，属于正常现象

2. **性能影响**
   - 捕获大量请求可能影响页面性能
   - 建议仅在需要调试时开启捕获
   - 可通过过滤规则减少捕获的请求数量

3. **隐私安全**
   - 所有请求数据仅存储在本地内存中
   - 不会上传到任何服务器
   - 关闭标签页后数据自动清除
   - 响应体大小限制为 5MB，超出部分会被截断

4. **浏览器限制**
   - Repeater 功能基于 `fetch` API 实现
   - 某些受限 Header（如 `Host`、`Origin`）可能被浏览器忽略
   - 跨域请求受 CORS 策略限制

### 🛣️ 后续规划

- [ ] **Intruder 模块** - 参数化攻击和批量测试
- [ ] **请求拦截** - 拦截并修改请求/响应
- [ ] **导出功能** - 支持导出为 HAR、cURL、代码片段
- [ ] **规则匹配** - 自定义过滤规则和高亮敏感信息
- [ ] **持久化存储** - 可选的请求历史持久化
- [ ] **WebSocket 支持** - 捕获和分析 WebSocket 通信

### 🤝 贡献指南

欢迎提交 Issue 和 Pull Request！

### 📄 开源协议

本项目采用 MIT 协议开源 - 查看 [LICENSE](LICENSE) 文件了解详情

### 📧 联系方式

如有问题或建议，欢迎通过 Issue 反馈。

---

## English

### 📖 Introduction

Bu-kit is a Chrome Extension (Manifest V3) based HTTP request monitoring and debugging tool, inspired by the famous penetration testing tool Burp Suite. Using `chrome.debugger` API and DevTools Protocol, Bu-kit can capture and display complete HTTP request/response data, providing powerful network traffic analysis capabilities for web developers and security researchers.

### ✨ Key Features

- 🔍 **Complete Request Capture** - Capture all network requests based on DevTools Protocol Network domain
- 📊 **Real-time Monitoring** - Display all HTTP/HTTPS requests in real-time during page loading
- 🔎 **Smart Filtering** - Filter by URL, method, status code, resource type, host, and more
- 📝 **Detailed View** - Display complete request headers, response headers, request body, and response body
- 🔄 **Repeater Function** - Manually edit and replay HTTP requests, similar to Burp Suite Repeater
- 💾 **Local Storage** - Request data stored only in local memory for privacy protection

### 🚀 Quick Start

#### Installation

1. **Download the Project**
   ```bash
   git clone https://github.com/Evanescent-dm/Bu-kit.git
   cd Bu-kit
   ```

2. **Load Extension**
   - Open Chrome browser and visit `chrome://extensions/`
   - Enable "Developer mode" in the top right corner
   - Click "Load unpacked"
   - Select the Bu-kit project directory

#### Usage

1. **Start Capturing**
   - Method 1: Click the extension icon in the browser toolbar, then click "Start Capture" in the popup
   - Method 2: Press F12 to open DevTools, switch to the "Bu-kit" tab, and click "Start Capture"

2. **View Requests**
   - View all captured requests in the Bu-kit panel of DevTools
   - Click any request row to view detailed information (Headers, Request, Response, Preview)

3. **Filter and Search**
   - Use the top search box to search for URL, method, status code
   - Use dropdown menus to filter by resource type, request method, host

4. **Use Repeater**
   - Move cursor to a data row in the request list, click the -> button on the right side of the data to "Send to Repeater"
   - Edit the request content in the Repeater tab
   - Click the "Send" button to replay the request and view the response

5. **Stop Capturing**
   - Click the "Stop Capture" button to disconnect the debugger

### 📁 Project Structure

```
Bu-kit/
├── manifest.json           # Extension configuration (Manifest V3)
├── background.js           # Background service script (Service Worker)
├── devtools.html           # DevTools entry page
├── devtools.js             # DevTools panel initialization script
├── popup.html              # Popup window page
├── popup.js                # Popup window logic
├── popup_clean.html        # Popup window backup page
├── panel/                  # DevTools panel module
│   ├── panel.html          # Panel main page
│   ├── panel.css           # Panel stylesheet
│   └── panel.js            # Panel main logic
├── icons/                  # Icon resources
│   ├── icon_16.png
│   ├── icon_48.png
│   └── icon_128.png
├── _locales/               # Internationalization resources
│   ├── en/
│   │   └── messages.json   # English language pack
│   └── zh_CN/
│       └── messages.json   # Simplified Chinese language pack
├── README.md               # Project documentation
└── PROJECT_ANALYSIS.md     # Project analysis document
```

### 🏗️ Technical Architecture

#### Core Tech Stack

- **Chrome Extension Manifest V3** - Latest extension development specification
- **Chrome Debugger API** - For connecting and controlling browser debugger
- **DevTools Protocol** - Underlying protocol for capturing network requests
- **Service Worker** - Background service for request capture and storage
- **DevTools Panel API** - Custom developer tools panel

#### Architecture Design

```
┌─────────────────┐
│  DevTools Panel │ ──┐
└─────────────────┘   │
                      │ chrome.runtime.sendMessage
┌─────────────────┐   │
│     Popup       │ ──┤
└─────────────────┘   │
                      ▼
              ┌──────────────────┐
              │ Background       │
              │ Service Worker   │
              └──────────────────┘
                      │
                      │ chrome.debugger API
                      ▼
              ┌──────────────────┐
              │ DevTools Protocol│
              │  Network Events  │
              └──────────────────┘
```


### 📊 Feature Details

#### HTTP History

- ✅ Store request history independently per tab
- ✅ Support up to 100 request records (configurable)
- ✅ Real-time update request status (pending → completed/failed)

#### Filtering and Search

- 🔍 Keyword search: URL, method, status code
- 📋 Resource type filter: Document, XHR, Fetch, Script, Stylesheet, Image, etc.
- 🌐 Request method filter: GET, POST, PUT, DELETE, etc.
- 🏠 Host filter: Filter requests by domain
- ⏱️ Sort: Sort by time in ascending/descending order

#### Repeater Function

- ✏️ Visual editing of HTTP requests
- 🔄 Support modifying Method, URL, Headers, Body
- 📤 Resend requests and view responses
- 📑 Multi-tab management of multiple Repeater sessions

### ⚠️ Notes

1. **Debugger Permission**
   - Using debugger API requires user authorization
   - A "Debugging this browser" banner will appear at the top of the page after connection
   - This is Chrome's security mechanism and is normal

2. **Performance Impact**
   - Capturing a large number of requests may affect page performance
   - It is recommended to enable capture only when debugging is needed
   - Filter rules can reduce the number of captured requests

3. **Privacy and Security**
   - All request data is stored only in local memory
   - No data is uploaded to any server
   - Data is automatically cleared when the tab is closed
   - Response body size is limited to 5MB, excess will be truncated

4. **Browser Limitations**
   - Repeater function is implemented based on `fetch` API
   - Some restricted headers (e.g., `Host`, `Origin`) may be ignored by the browser
   - Cross-origin requests are subject to CORS policy restrictions

### 🛣️ Roadmap

- [ ] **Intruder Module** - Parameterized attacks and batch testing
- [ ] **Request Interception** - Intercept and modify requests/responses
- [ ] **Export Function** - Support export as HAR, cURL, code snippets
- [ ] **Rule Matching** - Custom filter rules and highlight sensitive information
- [ ] **Persistent Storage** - Optional request history persistence
- [ ] **WebSocket Support** - Capture and analyze WebSocket communication

### 🤝 Contributing

Issues and Pull Requests are welcome!

### 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details

### 📧 Contact

If you have any questions or suggestions, please feel free to provide feedback through Issues.

---

<div align="center">

**Made with ❤️ for Web Developers and Security Researchers**

</div>
