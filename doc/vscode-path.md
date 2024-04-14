## VSCode Path

## Code Path

`%APPDATA%\Code`

```txt
Code
 ├── ***
 └── User
     ├── globalStorage
     │   ├── ***
     │   └── storage.json         // profiles 记录
     ├── keybindings.json         // 全局 keybindings.json
     ├── profiles                 // profiles 目录
     │   ├── ***
     │   └── e5d0fae              // profile 目录名称由 storage.json 映射
     │       ├── ***              // 其他私有(settings.json, snippets等)
     │       └── extensions.json  // profile 私有扩展列表
     ├── settings.json            // 全局 settings.json
     └── snippets                 // 全局 snippets 目录
         └── ***.code-snippets
```

## .vscode Path

`%USERPROFILE%\.vscode` or `%HOME%\.vscode`

```txt
.vscode
 ├── ***
 └── extensions           // 所有扩展安装目录
     ├── ***
     └── extensions.json  // 默认环境扩展列表
```