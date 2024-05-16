import log from '#/src/log';
import ExportProfilesPanel from '#/src/panels/ExportProfilesPanel';
import fsUtil from '#/src/utils/fsUtil';
import path from 'path';
import { Uri, commands, l10n, window } from 'vscode';
import { LoadProfilesCmd } from './LoadProfilesCmd';
import { EAborted, EEscAborted } from '#/src/error';
import constants from '#/src/constants';

/**
 * 导出 profile 配置
 */
export class ExportProfilesCmd extends LoadProfilesCmd implements CommandCallbackFunction {
  // 用户配置信息
  protected profiles: Profile[] = [];

  /**
   * 刷新webview profiles
   */
  refreshProfiles() {
    ExportProfilesPanel.postMessage({
      command: 'refreshProfiles',
      data: this.profiles,
    });
  }

  /**
   * webview请求打开资源
   * @param open 资源信息
   */
  openResource(open: OpenResourceMessageData) {
    switch (open.type) {
      case 'file':
        window.showTextDocument(Uri.file(open.data));
        break;
      case 'extension':
        commands.executeCommand('extension.open', open.data);
        break;
    }
  }

  /**
   * 合并需要保存的profile
   * @param codeProfile 保存结果
   * @param profile 原始profile
   * @param resourceKeys 需要保存的资源ID
   */
  async mergeSaveProfile(codeProfile: Required<CodeProfile>, profile: Profile, resourceKeys: string[]): Promise<void> {
    // 需要保存资源ID
    function filterResource<T extends ProfileResourceMeta>(resources: T[]): T[] {
      return resources.filter(r => resourceKeys.includes(r.key));
    }

    // 处理扩展配置
    filterResource(profile.extensions).forEach(e => {
      if (!codeProfile.extensions.map(e => e.identifier.id).includes(e.identifier.id)) {
        codeProfile.extensions.push(e);
      }
    });

    // 处理用户设置配置
    for (const resourceSetting of filterResource(profile.settings)) {
      const settingPath = Uri.file(resourceSetting.fsPath);
      const settingData = await fsUtil.readJSONFile<CodeProfileSettings>(settingPath);
      codeProfile.settings = Object.assign(codeProfile.settings, settingData);
    }

    // 处理按键绑定配置
    for (const resourceKeybinding of filterResource(profile.keybindings)) {
      const keybindingPath = Uri.file(resourceKeybinding.fsPath);
      const keybindingsData = await fsUtil.readJSONFile<CodeProfileKeybinding[]>(keybindingPath);
      keybindingsData.forEach(k => {
        if (!codeProfile.keybindings.some(item => item.key === k.key && item.command === k.command)) {
          codeProfile.keybindings.push(k);
        }
      });
    }

    // 处理代码片段配置
    for (const resourceSnippet of filterResource(profile.snippets)) {
      const snippetData = await fsUtil.readFile(Uri.file(resourceSnippet.fsPath));
      const name = resourceSnippet.name;

      // 重复数据不保存
      if (Object.values(codeProfile.snippets).includes(snippetData)) {
        continue;
      }

      // 名称存在，添加随机后缀
      if (name in codeProfile.snippets && codeProfile.snippets[name] !== snippetData) {
        let newName = name;
        do {
          newName = Math.random().toString(36).substring(2, 9) + name;
        } while (newName in codeProfile.snippets);
        codeProfile.snippets[newName] = snippetData;
      } else {
        // 名称不存在，直接保存
        codeProfile.snippets[name] = snippetData;
      }
    }
  }

  /**
   * 合并需要保存的profiles
   * @param exportProfiles profiles
   * @returns 
   */
  async mergeSaveProfiles(exportProfiles: ExportProfile[]): Promise<CodeProfileFile> {

    const codeProfile: Required<CodeProfile> = {
      extensions: [],
      settings: {},
      keybindings: [],
      snippets: {}
    };

    for (const profile of this.profiles) {
      // 去除异常捕获，全部抛出，否则用户可能不知情
      const saveProfile = exportProfiles.find(d => d.title === profile.title);
      if (saveProfile) {
        await this.mergeSaveProfile(codeProfile, profile, saveProfile.keys);
      }
    }

    const codeProfileFile: CodeProfileFile = { name: '' };
    let dataCount = 0;

    if (codeProfile.extensions.length !== 0) {
      const extensions = codeProfile.extensions.map(e => ({
        identifier: e.identifier,
        displayName: e.displayName
      }));
      codeProfileFile.extensions = JSON.stringify(extensions);
      dataCount++;
    }

    if (Object.values(codeProfile.settings).length !== 0) {
      codeProfileFile.settings = JSON.stringify({
        settings: JSON.stringify(codeProfile.settings, undefined, 4)
      });
      dataCount++;
    }

    if (codeProfile.keybindings.length !== 0) {
      codeProfileFile.keybindings = JSON.stringify({
        keybindings: JSON.stringify(codeProfile.keybindings, undefined, 4)
      });
      dataCount++;
    }

    if (Object.values(codeProfile.snippets).length !== 0) {
      codeProfileFile.snippets = JSON.stringify({ snippets: codeProfile.snippets });
      dataCount++;
    }

    if (dataCount === 0) {
      // 已转为 webview 校验，此处只做意外兜底
      throw new EAborted(l10n.t('No data selected for export'));
    }

    return codeProfileFile;
  }

  /**
   * 合并导出
   * @param exportProfiles 导出配置
   * @returns 
   */
  async mergeExport(exportProfiles: ExportProfile[]) {
    const codeProfileFile = await this.mergeSaveProfiles(exportProfiles);

    const fileName = exportProfiles.map(d => d.title).join(' + ');
    const saveUri = await window.showSaveDialog({
      title: l10n.t('Save profiles'),
      defaultUri: Uri.file(`${fileName}.${constants.codeProfileFileExt}`),
      filters: {
        'Code Profile': [constants.codeProfileFileExt]
      }
    });

    if (!saveUri) {
      throw new EEscAborted(l10n.t('Cancel'));
    }

    codeProfileFile.name = path.basename(saveUri.fsPath, path.extname(saveUri.fsPath));

    log.debug('save file', saveUri.fsPath, codeProfileFile.name);
    fsUtil.writeFile(saveUri, JSON.stringify(codeProfileFile, undefined, 4));
  }

  /**
   * 单独导出
   * @param exportProfiles 导出配置
   */
  async singleExport(exportProfiles: ExportProfile[]) {
    const saveFolderUri = await window.showOpenDialog({
      title: l10n.t('Save profiles'),
      canSelectFolders: true,
      canSelectFiles: false,
      canSelectMany: false
    });

    if (!saveFolderUri || saveFolderUri.length === 0) {
      throw new EEscAborted(l10n.t('Cancel'));
    }

    for (const saveProfile of exportProfiles) {
      const codeProfileFile = await this.mergeSaveProfiles([saveProfile]);
      codeProfileFile.name = saveProfile.title;

      const saveUri = Uri.joinPath(saveFolderUri[0], `${codeProfileFile.name}.${constants.codeProfileFileExt}`);

      log.debug('save file', saveUri.fsPath, codeProfileFile.name);
      fsUtil.writeFile(saveUri, JSON.stringify(codeProfileFile, undefined, 4));
    }
  }

  /**
   * webview请求保存文件
   * @param saveFileMessageData 保存文件信息
   * @returns 
   */
  async saveFile(saveFileMessageData: SaveFileMessageData) {
    log.debug('save file',
      saveFileMessageData.exportType,
      saveFileMessageData.exportProfiles.map(d => d.title)
    );

    try {
      switch (saveFileMessageData.exportType) {
        case 'merge':
          await this.mergeExport(saveFileMessageData.exportProfiles);
          break;
        case 'single':
          await this.singleExport(saveFileMessageData.exportProfiles);
          break;
        default:
          throw new Error('Unknown export type');
      }

      window.showInformationMessage(l10n.t('Export complete'));
      log.info(l10n.t('Export complete'));
      // 关闭panel
      ExportProfilesPanel.dispose();
    } catch (err) {
      this.catch(err as Error);
    }
  }

  /**
   * webview请求ping
   */
  ping() {
    ExportProfilesPanel.postMessage({
      command: 'ping',
      data: 'pong',
    });
  }

  /**
   * webview请求显示消息
   * @param showMessageMessageData 显示消息信息
   */
  showMessage(showMessageMessageData: ShowMsgMessageData) {
    switch (showMessageMessageData.type) {
      case 'warn':
        window.showWarningMessage(showMessageMessageData.message);
        break;
      // 待扩展
    }
  }

  init(): void {
    // 注册webview消息监听
    ExportProfilesPanel.addWebviewMessageListener(async (message: Message) => {
      const command = message.command as MessageCommand;
      log.debug('receive message', command, message.data);
      if (this[command]) {
        await this[command](message.data);
      }
    });
  }

  /**
   * 选择用户数据配置文件
   * @param userDataProfiles 用户数据配置信息
   * @returns 
   */
  protected async selectUserDataProfile(userDataProfiles: UserDataProfile[]): Promise<UserDataProfile[]> {
    const result = await window.showQuickPick(
      userDataProfiles.map(w => ({
        ...w,
        label: w.name,
        description: w.isDefault ? l10n.t('Default') : undefined,
      })),
      {
        title: l10n.t('Select profiles'),
        placeHolder: l10n.t('Select profiles to export'),
        canPickMany: true
      });
    if (result === undefined) {
      throw new EEscAborted(l10n.t('Cancel'));
    }
    return result;
  }

  /**
   * 获取全部用户数据配置文件
   * @returns 
   */
  async getAllUserDataProfiles() {
    const { userDataProfiles } = await this.getStorage();

    // 默认配置放到最前面
    userDataProfiles.unshift({
      location: '',
      name: 'Default',
      isDefault: true,
      useDefaultFlags: {
        settings: true,
        keybindings: true,
        snippets: true,
        tasks: true,
        extensions: true
      }
    });

    return userDataProfiles;
  }

  async run() {
    const userDataProfiles = await this.getAllUserDataProfiles();

    // 加载profiles
    const selectUserDataProfiles = await this.selectUserDataProfile(userDataProfiles);
    log.debug('select userDataProfile', selectUserDataProfiles.map(w => w.name));

    this.profiles = await this.formatUserDataProfiles(selectUserDataProfiles);

    const isInit = ExportProfilesPanel.isInit();
    // 显示webview
    ExportProfilesPanel.render(this.context.extensionUri);
    // 刷新profiles
    isInit && this.refreshProfiles();
  }

  async catch(error: Error) {
    if (error instanceof EAborted) {
      window.showWarningMessage(error.message);
      log.warning(error.message);
      return;
    }
    window.showErrorMessage(l10n.t('Export error: {0}', error.message));
    log.error('Export error', error);
    log.error(error.stack);
  }

  async deactivate() {
    ExportProfilesPanel.dispose();
  }
}