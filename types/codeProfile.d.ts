// 扩展
type CodeProfileExtension = ProfileExtension

// 设置
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type CodeProfileSettings = Record<string, any>

// 代码片段
type CodeProfileSnippets = Record<string, string>

// keybinding
interface CodeProfileKeybinding {
  // 按键key
  key: string
  // 命令command
  command: string
  // 作用域when
  when?: string
}

// profile 导出
interface CodeProfile {
  name: string
  extensions: string
  settings?: string
  keybindings?: string
  snippets?: string
}