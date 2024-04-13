// 资源类型
type ProfileResourceMetaType = 'file' | 'extension'

// 资源key 随机生成字符串 表示唯一身份
type ProfileResourceMetaKey = string

// 资源信息
interface ProfileResourceMeta {
  key: ProfileResourceMetaKey
  type: ProfileResourceMetaType
}

// 标识符
interface Identifier {
  id: string
  uuid: string
}

// 扩展
type ProfileExtension = ProfileResourceMeta & {
  identifier: Identifier
  displayName: string
}

// 资源
type ProfileResource = ProfileResourceMeta & {
  // 名称
  name: string
  // 路径
  fsPath: string
  // 是否使用默认
  isDefault: boolean
}

interface Profile {
  // 标题
  title: string
  // 使用默认配置情况
  useDefaultFlags: UseDefaultFlags
  // 扩展
  extensions: ProfileExtension[]
  // 按键绑定
  keybindings: ProfileResource[]
  // 代码片段
  snippets: ProfileResource[]
  // 设置
  settings: ProfileResource[]
}