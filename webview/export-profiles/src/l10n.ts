import * as l1on from '@vscode/l10n';
import vscode from './vscode.ts';

/**
 * 初始化 l10n 模块
 */
async function init() {
  const contents = await vscode.getData<l1on.l10nJsonFormat>({ command: 'loadL10n' });
  l1on.config({ contents });
}

export { init };

export default l1on;