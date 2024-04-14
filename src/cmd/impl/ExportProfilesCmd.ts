import showEscPick from '#/src/components/pick/showEscPick';
import log from '#/src/log';
import ExportProfilesPanel from '#/src/panels/ExportProfilesPanel';
import fsUtil from '#/src/utils/fsUtil';
import constants from '@/constants';
import path from 'path';
import { Uri, commands, l10n, window } from 'vscode';
import { LoadProfilesCmd } from './LoadProfilesCmd';
import { EAborted } from '#/src/error';

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
   * 格式化需要保存的profiles
   * @param data profiles
   * @returns 
   */
  async formatSaveProfiles(data: SaveFileMessageData[]) {
    const extensions: CodeProfileExtension[] = [];
    let settings: CodeProfileSettings = {};
    let keybindings: CodeProfileKeybinding[] = [];
    const snippets: CodeProfileSnippets = {};

    for (const profile of this.profiles) {
      try {
        const saveProfile = data.find(d => d.profileTitle === profile.title);
        if (!saveProfile) {
          continue;
        }
        // 需要保存资源ID
        // eslint-disable-next-line no-inner-declarations
        function filterResource<T extends ProfileResourceMeta>(resources: T[]): T[] {
          return resources.filter(r => saveProfile!.keys.includes(r.key));
        }

        // 处理扩展配置
        filterResource(profile.extensions).forEach(e => {
          if (!extensions.map(e => e.identifier.id).includes(e.identifier.id)) {
            extensions.push(e);
          }
        });
        // 处理用户设置配置
        // settings: ProfileResource[]
        for (const resourceSetting of filterResource(profile.settings)) {
          const settingPath = Uri.file(resourceSetting.fsPath);
          const settingData = await fsUtil.readJSONFile<CodeProfileSettings>(settingPath);
          settings = Object.assign(settings, settingData);
        }

        // 处理按键绑定配置
        // keybindings: ProfileResource[]
        for (const resourceKeybinding of filterResource(profile.keybindings)) {
          const keybindingPath = Uri.file(resourceKeybinding.fsPath);
          const keybindingsData = await fsUtil.readJSONFile<CodeProfileKeybinding[]>(keybindingPath);
          keybindings.push(...keybindingsData);
        }
        // 处理代码片段配置
        // snippets: ProfileResource[]
        for (const resourceSnippet of filterResource(profile.snippets)) {
          const snippetData = await fsUtil.readFile(Uri.file(resourceSnippet.fsPath));
          const name = resourceSnippet.name;

          // 重复数据不保存
          if (Object.values(snippets).includes(snippetData)) {
            continue;
          }

          // 名称存在，添加随机后缀
          if (name in snippets && snippets[name] !== snippetData) {
            let newName = name;
            do {
              newName = Math.random().toString(36).substring(2, 9) + name;
            } while (newName in snippets);
            snippets[newName] = snippetData;
          } else {
            // 名称不存在，直接保存
            snippets[name] = snippetData;
          }
        }
      } catch (err) {
        log.error('formatSaveProfiles error', err);
      }
    }

    const codeProfile: CodeProfile = {
      name: '',
      extensions: JSON.stringify(extensions.map(e => ({ identifier: e.identifier, displayName: e.displayName }))),
    };

    if (Object.values(settings).length !== 0) {
      codeProfile.settings = JSON.stringify({
        settings: JSON.stringify(settings, undefined, 4)
      });
    }

    if (keybindings.length !== 0) {
      // 去重 命令相同的按键绑定
      keybindings = keybindings
        .filter((k, index) =>
          keybindings.findIndex(item => item.key + item.command === k.key + k.command) === index
        );

      codeProfile.keybindings = JSON.stringify({
        keybindings: JSON.stringify(keybindings, undefined, 4)
      });
    }

    if (Object.values(snippets).length !== 0) {
      codeProfile.snippets = JSON.stringify({ snippets });
    }

    return codeProfile;
  }

  /**
   * webview请求保存文件
   * @param data 保存文件信息
   * @returns 
   */
  async saveFile(data: SaveFileMessageData[]) {
    try {
      const saveUri = await window.showSaveDialog({
        title: l10n.t('Save profiles'),
        defaultUri: Uri.file(constants.defaultCodeProfileName),
      });

      if (!saveUri) {
        window.showWarningMessage(l10n.t('Cancel'));
        log.warning(l10n.t('Cancel'));
        return;
      }

      const codeProfile = await this.formatSaveProfiles(data);
      codeProfile.name = path.basename(saveUri.fsPath, path.extname(saveUri.fsPath));

      fsUtil.writeFile(saveUri, JSON.stringify(codeProfile, undefined, 4));

      // 关闭panel
      ExportProfilesPanel.dispose();

      window.showInformationMessage(l10n.t('Export success'));
    } catch (err) {
      const e = err as Error;
      window.showErrorMessage(l10n.t('Export failed') + ':' + e.message);
      log.error(l10n.t('Export failed'));
      log.error(e.stack);
    }
  }

  /**
   * webview请求l10n资源
   */
  loadL10n() {
    ExportProfilesPanel.postMessage({
      command: 'loadL10n',
      data: l10n.bundle,
    });
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
  protected async selectUserDataProfile(userDataProfiles: UserDataProfile[]) {
    const result = await showEscPick(
      userDataProfiles.map(w => w.name),
      {
        title: l10n.t('Select profiles'),
        placeHolder: l10n.t('Select profiles to export'),
        esc: l10n.t('Cancel'),
        canPickMany: true
      });
    return userDataProfiles.filter(w => result.includes(w.name));
  }

  async run() {
    const { userDataProfiles } = await this.getStorage();
    // 加载profiles
    const userDataProfile = await this.selectUserDataProfile(userDataProfiles);
    log.debug('select userDataProfile', userDataProfile.map(w => w.name));

    this.profiles = await this.formatUserDataProfiles(userDataProfile);

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
    window.showErrorMessage(l10n.t('Export profiles error: {0}', error.message));
    log.error('Export profiles error', error);
    log.error(error.stack);
  }

  async deactivate() {
    ExportProfilesPanel.dispose();
  }
}