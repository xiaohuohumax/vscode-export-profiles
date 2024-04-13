import { EEscAborted } from '@/error';
import { QuickPickOptions, window } from 'vscode';

export type EscPickOptions = QuickPickOptions & {
  esc: string
};

/**
 * 通用选择器监听ESC异常
 * @param items 待选列表
 * @param options 选择器配置
 * @returns 
 */
export default async function showEscPick(items: readonly string[], options: EscPickOptions) {
  const result = await window.showQuickPick(items, options);
  if (result === undefined) {
    throw new EEscAborted(options.esc);
  }
  return result;
}