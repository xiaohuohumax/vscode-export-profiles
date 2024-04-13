import cmds from '@/cmd';
import log from '@/log';
import { ExtensionContext } from 'vscode';

export async function activate(context: ExtensionContext) {
  log.debug('activate');
  cmds.forEach(c => c.activate(context));
}

export function deactivate() {
  log.debug('deactivate');
  cmds.forEach(c => c.deactivate());
}