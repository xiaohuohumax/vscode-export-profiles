import * as jsonParser from 'jsonc-parser';
import { Uri, workspace } from 'vscode';

/**
 * 资源是否存在
 * @param uri 资源路径
 * @returns 
 */
export async function isExists(uri: Uri) {
  try {
    await workspace.fs.stat(uri);
    return true;
  } catch (_) {
    return false;
  }
}

/**
 * 获取文件夹子文档列表
 * @param folder 文件夹路径
 * @returns 
 */
export async function readDirectory(folder: Uri) {
  return (await workspace.fs.readDirectory(folder));
}

/**
 * 读取文档内容
 * @param doc 文档路径
 * @param encoding 编码格式
 * @returns 
 */
export async function readFile(doc: Uri, encoding: BufferEncoding = 'utf-8') {
  const decoder = new TextDecoder(encoding);
  return decoder.decode(await workspace.fs.readFile(doc));
}

/**
 * 读取JSON格式文档
 * @param doc 文档路径
 * @param encoding 编码格式
 * @returns 
 */
export async function readJSONFile<T = unknown>(doc: Uri, encoding: BufferEncoding = 'utf-8') {
  return jsonParser.parse(await readFile(doc, encoding)) as T;
}

/**
 * 写入文档
 * @param doc 文档路径
 * @param data 数据
 * @returns 
 */
export async function writeFile(doc: Uri, data: string) {
  return workspace.fs.writeFile(doc, new TextEncoder().encode(data));
}

export default {
  isExists,
  readDirectory,
  readFile,
  readJSONFile,
  writeFile
};