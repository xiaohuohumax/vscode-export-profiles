import { EEscAborted } from '@/error';
import { SaveDialogOptions, window } from 'vscode';

export type EscSaveDialogOptions = SaveDialogOptions & {
  esc: string
};

/**
 * 通用保存文件监听ESC异常
 * @param options 保存配置
 * @returns 
 */
export default async function showEscSaveDialog(options: EscSaveDialogOptions) {
  const result = await window.showSaveDialog(options);
  if (result === undefined) {
    throw new EEscAborted(options.esc);
  }
  return result;
}