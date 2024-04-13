import { Disposable, Uri, ViewColumn, Webview, WebviewPanel, l10n, window } from 'vscode';

export function getUri(webview: Webview, extensionUri: Uri, pathList: string[]) {
  return webview.asWebviewUri(Uri.joinPath(extensionUri, ...pathList));
}

let _panel: WebviewPanel | undefined;
const _disposables: Disposable[] = [];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
interface Listener<T = any> { (e: Message<T>): any; }

const _listeners: Listener[] = [];

function _getWebviewContent(webview: Webview, extensionUri: Uri) {
  const stylesUri = getUri(webview, extensionUri, ['webview', 'export-profiles', 'build', 'assets', 'index.css']);
  const scriptUri = getUri(webview, extensionUri, ['webview', 'export-profiles', 'build', 'assets', 'index.js']);

  return `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <link rel="stylesheet" type="text/css" href="${stylesUri}">
        <title>Hello World</title>
      </head>
      <body>
        <div id="app"></div>
        <script type="module" src="${scriptUri}"></script>
      </body>
    </html>
  `;
}

/**
 * 发送消息
 * @param message 消息
 */
function postMessage<T>(message: Message<T>) {
  _panel?.webview.postMessage(message);
}

/**
 * 监听消息
 * @param listener 监听器
 */
function addWebviewMessageListener<T>(listener: Listener<T>) {
  _listeners.push(listener);
}

/**
 * 渲染面板
 * @param extensionUri 插件Uri
 * @returns 
 */
function render(extensionUri: Uri) {
  if (_panel) {
    // 如果面板已经存在，则直接显示
    _panel.reveal(ViewColumn.One);
    return;
  }
  const panel = window.createWebviewPanel(
    'showExportProfiles',
    l10n.t('Export Profiles'),
    ViewColumn.One,
    {
      enableScripts: true,
      retainContextWhenHidden: true,
      localResourceRoots: [
        Uri.joinPath(extensionUri, 'out'),
        Uri.joinPath(extensionUri, 'webview/export-profiles/build')
      ],
    }
  );
  // 监听面板关闭
  panel.onDidDispose(() => dispose(), null, _disposables);
  // 加载html内容
  panel.webview.html = _getWebviewContent(panel.webview, extensionUri);
  // 添加监听器
  _listeners.forEach(listener => panel.webview.onDidReceiveMessage(
    listener,
    undefined,
    _disposables
  ));
  _panel = panel;
}

/**
 * 销毁面板
 */
function dispose() {
  _panel?.dispose();
  _panel = undefined;

  while (_disposables.length) {
    const disposable = _disposables.pop();
    if (disposable) {
      disposable.dispose();
    }
  }
}

/**
 * 是否已经初始化
 * @returns 
 */
function isInit() {
  return _panel !== undefined;
}

export default {
  render,
  dispose,
  postMessage,
  addWebviewMessageListener,
  isInit
};