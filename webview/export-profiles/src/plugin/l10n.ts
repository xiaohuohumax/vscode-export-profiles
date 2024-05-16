import * as l1on from '@vscode/l10n';

// l10n 通过全局变量 _l10nContents 获取
l1on.config({ contents: window._l10nContents });

export default l1on;