interface ImportMetaEnv {
  /**
   * 日志等级
   */
  readonly VITE_LOG_LEVEL: keyof typeof import('vscode').LogLevel

  /**
   * 日志打印格式
   * 
   * ```
   * :time    时间戳
   * :level   等级
   * :msg     消息
   * :caller  调用者信息
   * ```
   */
  readonly VITE_LOG_FORMAT: string

  /**
   * 输出窗口名称
   */
  readonly VITE_OUTPUT_CHANNEL_NAME: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}