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

interface CodeProfile {
  extensions?: CodeProfileExtension[]
  settings?: CodeProfileSettings
  keybindings?: CodeProfileKeybinding[]
  snippets?: CodeProfileSnippets
}

// profile 导出
interface CodeProfileFile {
  name: string
  extensions?: string
  settings?: string
  keybindings?: string
  snippets?: string
}