import { Config } from '@/config';
import log from '@/log';
import { ExtensionContext, commands, window } from 'vscode';

/**
 * 配置
 */
export interface CmdOptions {
  /**
   * 注册 key
   */
  key: string
}

/**
 * 通用命令
 */
export default abstract class ICmd {

  /**
   * vscode 上下文
   */
  protected context: ExtensionContext = null!;

  constructor(protected options: CmdOptions) {
    this.init();
  }

  /**
   * 初始执行
   */
  init() { }

  /**
   * 命令回调
   * 
   * 回调执行顺序
   * 
   * ```
   * | run
   * | catch
   * ↓ finally
   * ```
   * @param args 任意回调参数
   */
  abstract run(...args: unknown[]): Promise<void>;

  /**
   * 回调抛出异常时执行
   * @param error 异常
   */
  async catch(error: Error) {
    window.showErrorMessage(error.message);
    log.error(error.stack ?? error.message);
  }

  /**
   * 回调执行完后执行
   */
  async finally() { }

  /**
   * 注册指令
   * @param context 上下文
   */
  async activate(context: ExtensionContext) {
    this.context = context;
    log.debug('Register command:', this.options.key);

    const callback = async (...args: unknown[]) => {
      log.debug('Format config:', JSON.stringify(Config.get));
      log.debug('Command:', this.options.key, 'callback args:', args);
      try {
        return await this.run(...args);
      } catch (error) {
        await this.catch(error as Error);
      } finally {
        await this.finally();
      }
    };

    const disposable = commands.registerCommand(this.options.key, callback);

    context.subscriptions.push(disposable);
  }

  /**
   * 注销指令
   */
  async deactivate() {
    log.debug('Deactivate command:', this.options.key);
  }
}