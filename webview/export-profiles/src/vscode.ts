import type { WebviewApi } from 'vscode-webview';

export interface MessageListener {
  command: MessageCommand;
  callback: (message: Message) => void;
}

const messageListeners: MessageListener[] = [];

window.addEventListener('message', (event) => {
  const data = event.data as Message;
  messageListeners.forEach((listener) => {
    if (listener.command === data.command) {
      listener.callback(data);
    }
  });
});

const vsCodeApi: WebviewApi<unknown> | undefined =
  typeof acquireVsCodeApi === 'function'
    ? acquireVsCodeApi()
    : undefined;

/**
 * 发送消息
 * @param message 消息
 */
function postMessage(message: Message) {
  vsCodeApi?.postMessage(message);
}

/**
 * 同步获取数据
 * @param message 消息
 * @param timeout 超时时间 (ms) 负数表示不超时
 * @returns 
 */
function getData<T>(message: Message<T>, timeout: number = 5000) {
  postMessage(message);
  return new Promise<T>((resolve, reject) => {
    // 超时处理
    timeout > 0 && setTimeout(() => reject(), timeout);
    // 监听消息
    const eventListener = (event: MessageEvent) => {
      const data = event.data as Message<T>;
      if (data.command === message.command && data.data) {
        window.removeEventListener('message', eventListener);
        resolve(data.data);
      }
    };
    window.addEventListener('message', eventListener);
  });
}

/**
 * 打开资源
 * @param data 资源信息
 */
function openResource(data: OpenResourceMessageData) {
  postMessage({ command: 'openResource', data });
}

/**
 * 保存文件
 * @param data 保存的文件数据
 */
function saveFile(data: SaveFileMessageData[]) {
  postMessage({ command: 'saveFile', data });
}

/**
 * 刷新配置文件列表
 */
function refreshProfiles() {
  postMessage({ command: 'refreshProfiles' });
}

/**
 * 添加消息监听器
 * @param listener 消息监听器
 */
function addEventListener(listener: MessageListener) {
  messageListeners.push(listener);
}

/**
 * 删除消息监听器
 * @param listener 消息监听器
 */
function removeEventListener(listener: MessageListener) {
  const index = messageListeners.indexOf(listener);
  if (index >= 0) {
    messageListeners.splice(index, 1);
  }
}

export default {
  postMessage,
  getData,
  addEventListener,
  removeEventListener,
  openResource,
  refreshProfiles,
  saveFile
};
