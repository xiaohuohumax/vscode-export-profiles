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
 * @returns 
 */
function getData<T>(message: Message<T>) {
  postMessage(message);
  return new Promise<T>((resolve) => {
    window.addEventListener('message', (event) => {
      const data = event.data as Message<T>;
      if (data.command === message.command && data.data) {
        resolve(data.data);
      }
    });
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
