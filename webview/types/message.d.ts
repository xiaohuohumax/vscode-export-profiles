// 消息类型定义
type MessageCommand = 'refreshProfiles' | 'openResource' | 'saveFile' | 'ping' | 'showMessage'

// webview 消息请求回调函数
type CommandCallbackFunction = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key in MessageCommand]?: (...args: any[]) => any;
};

// 消息格式
// eslint-disable-next-line @typescript-eslint/no-explicit-any
interface Message<T = any> {
  // 消息命令
  command: MessageCommand
  // 消息数据
  data?: T
}

// 打开资源消息数据格式
interface OpenResourceMessageData {
  // 资源类型
  type: ProfileResourceMetaType
  // 资源路径
  // file: 文件路径
  // extension: 扩展ID
  data: string
}

interface ExportProfile {
  // profile title
  title: string
  // 需要保存的资源
  keys: ProfileResourceMetaKey[]
}

type ExportType = 'merge' | 'single'

// 保存文件消息数据格式
interface SaveFileMessageData {
  // 导出类型
  exportType: ExportType,
  // 导出数据
  exportProfiles: ExportProfile[]
}

type ShowMsgMessageDataType = 'warn'

// 显示消息消息数据格式
interface ShowMsgMessageData {
  // 消息类型
  type: ShowMsgMessageDataType
  // 消息内容
  message: string
}