interface Extension {
  // id 标识
  identifier: Identifier
  location: {
    // 本地插件保存路径
    path: string
  }
  metadata: {
    // 是否全局安装
    isApplicationScoped: boolean
  }
}