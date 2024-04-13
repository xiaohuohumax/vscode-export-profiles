// 消息类型定义
type MessageCommand = 'refreshProfiles' | 'openResource' | 'saveFile' | 'loadL10n'

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

// 保存文件消息数据格式
interface SaveFileMessageData {
  // profile title
  profileTitle: string
  // 需要保存的资源
  keys: ProfileResourceMetaKey[]
}