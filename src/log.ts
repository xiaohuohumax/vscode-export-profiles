import { LogLevel, window } from 'vscode';

const logLevel: LogLevel = LogLevel[import.meta.env.VITE_LOG_LEVEL];

const outputChannel = logLevel !== LogLevel.Off
  ? window.createOutputChannel(import.meta.env.VITE_OUTPUT_CHANNEL_NAME)
  : null;

/**
 * 打印日志
 * @param level 日志等级
 * @param msgs 日志内容
 * @returns 
 */
function base(level: LogLevel, ...msgs: unknown[]) {
  if (logLevel > level || logLevel === LogLevel.Off) {
    return;
  }

  // 简单获取调用信息
  let caller = '';
  const stack = new Error().stack;
  if (stack) {
    caller = stack.split('\n')[3]?.replace(/\s*at\s*/i, '');
  }

  const replaces: [string, string][] = [
    // 时间
    [':time', new Date().toLocaleString()],
    // 消息主体
    [':msg', msgs.join(' ')],
    // 日志等级
    [':level', LogLevel[level].padStart(7, ' ')],
    // 调用者信息
    [':caller', caller],
  ];

  const line = replaces.reduce(
    (f, [key, value]) => f.replace(key, value),
    import.meta.env.VITE_LOG_FORMAT
  );

  outputChannel?.appendLine(line);
}

function print(level: LogLevel, ...msgs: unknown[]) {
  base(level, ...msgs);
}

function info(...msgs: unknown[]) {
  base(LogLevel.Info, ...msgs);
}

function debug(...msgs: unknown[]) {
  base(LogLevel.Debug, ...msgs);
}

function warning(...msgs: unknown[]) {
  base(LogLevel.Warning, ...msgs);
}

function error(...msgs: unknown[]) {
  base(LogLevel.Error, ...msgs);
}

/**
 * 日志终端是否显示
 * @param preserveFocus 是否显示
 */
function show(preserveFocus?: boolean) {
  outputChannel?.show(preserveFocus);
}

export default {
  print,
  info,
  debug,
  warning,
  error,
  show
};