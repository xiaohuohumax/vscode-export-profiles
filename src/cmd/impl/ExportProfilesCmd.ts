import showEscPick from '#/src/components/pick/showEscPick';
import log from '#/src/log';
import ExportProfilesPanel from '#/src/panels/ExportProfilesPanel';
import fsUtil from '#/src/utils/fsUtil';
import constants from '@/constants';
import os from 'os';
import path from 'path';
import { FileType, Uri, commands, extensions, l10n, window } from 'vscode';
import ICmd from '../iCmd';

// profile 是否使用默认配置
const defaultUseDefaultFlags: UseDefaultFlags = {
  settings: false,
  keybindings: false,
  snippets: false,
  tasks: false,
  extensions: false,
};

/**
 * 随机生成字符串
 * @param length 长度
 * @returns 
 */
function randomString(length: number) {
  let result = '';
  do {
    result += Math.random().toString(36).slice(2);
  } while (result.length < length);
  return result.slice(0, length);
}

// webview 消息请求回调函数
type CommandCallbackFunction = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key in MessageCommand]?: (...args: any[]) => any;
};

export class ExportProfilesCmd extends ICmd implements CommandCallbackFunction {
  // 资源ID长度
  private readonly resourceIdLength = 30;
  // 用户配置信息
  private profiles: Profile[] = [];

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
      if (!this[command]) {
        return;
      }
      await this[command](message.data);
    });
  }

  /**
   * 获取用户Home目录路径
   * @param p 子路径
   * @returns 
   */
  protected homePathResolve(...p: string[]) {
    return Uri.joinPath(Uri.file(os.homedir()), ...p);
  }

  /**
   * 获取vscode目录路径 code
   * @param p 子路径
   * @returns 
   */
  protected codePathResolve(...p: string[]) {
    return Uri.joinPath(this.context.globalStorageUri, '../../../', ...p);
  }

  /**
   * 获取vscode用户目录路径 user
   * @param p 子路径
   * @returns 
   */
  protected userPathResolve(...p: string[]) {
    return this.codePathResolve('user', ...p);
  }

  /**
   * 获取扩展的显示名称
   * @param extension 扩展
   * @returns 
   */
  async getExtensionDisplayName(extension: Extension): Promise<string> {
    let packageJson = extensions.all.find(e => e.id === extension.identifier.id)?.packageJSON;

    if (!packageJson) {
      const localPackageJsonPath = Uri.joinPath(Uri.file(extension.location.path), 'package.json');
      if (!await fsUtil.isExists(localPackageJsonPath)) {
        // 无法找到package.json文件，使用id作为displayName
        return extension.identifier.id;
      }
      packageJson = await fsUtil.readJSONFile<PackageJson>(localPackageJsonPath);

      // 名称存在 l10n
      if (packageJson.displayName && /^%.*%$/ig.test(packageJson.displayName)) {
        const packageNlsJsonPath = Uri.joinPath(Uri.file(extension.location.path), 'package.nls.json');
        if (!await fsUtil.isExists(packageNlsJsonPath)) {
          packageJson.displayName = undefined;
        } else {
          const nlsJson = await fsUtil.readJSONFile<{ [key: string]: string }>(packageNlsJsonPath);
          packageJson.displayName = nlsJson[packageJson.displayName.slice(1, -1)];
        }
      }
    }

    return packageJson.displayName
      ? packageJson.displayName
      : packageJson.publisher + '.' + packageJson.name;
  }

  /**
   * 通过扩展配置文件获取扩展信息
   * @param extensionJsonPath 扩展配置文件路径
   * @returns 
   */
  async getExtensionByExtensionJsonFile(extensionJsonPath: Uri): Promise<Extension[]> {
    if (!await fsUtil.isExists(extensionJsonPath)) {
      return [];
    }
    return await fsUtil.readJSONFile<Extension[]>(extensionJsonPath);
  }

  /**
   * 通过用户数据配置文件获取扩展信息
   * ```
   * // 全局扩展
   * .vscode/extensions/extensions.json
   * // profile扩展
   * user/profiles/xxx/extensions.json
   * ```
   * @param userDataProfile 用户数据配置信息
   * @returns 
   */
  async getExtensionsByUserDataProfile(userDataProfile: UserDataProfile): Promise<ProfileExtension[]> {
    const { useDefaultFlags } = userDataProfile;
    const extensions: Extension[] = [];
    // 加载全局扩展
    const globalExtensionsPath = this.homePathResolve('.vscode', 'extensions', 'extensions.json');
    const globalExtensions: Extension[] = await this.getExtensionByExtensionJsonFile(globalExtensionsPath);

    // 加载私有扩展
    if (useDefaultFlags === undefined || useDefaultFlags.extensions === false) {
      // 加载默认全局扩展
      globalExtensions.forEach(e => e.metadata.isApplicationScoped && extensions.push(e));
      // 加载私有扩展
      const extensionsPath = this.userPathResolve('profiles', userDataProfile.location, 'extensions.json');
      extensions.push(...await this.getExtensionByExtensionJsonFile(extensionsPath));
    } else {
      // 加载默认扩展
      extensions.push(...globalExtensions);
    }

    const result: ProfileExtension[] = [];
    for (const extension of extensions) {
      result.push({
        key: randomString(this.resourceIdLength),
        type: 'extension',
        identifier: extension.identifier,
        displayName: await this.getExtensionDisplayName(extension),
      });
    }
    return result;
  }

  /**
   * 通过用户数据配置文件获取用户设置信息 
   * ```
   * // 全局设置
   * user/settings.json
   * // profile设置
   * user/profiles/xxx/settings.json
   * ```
   * @param userDataProfile 用户数据配置信息
   * @returns 
   */
  async getSettingsByUserDataProfile(userDataProfile: UserDataProfile): Promise<ProfileResource[]> {
    const { useDefaultFlags } = userDataProfile;

    let isDefault = true;
    let settingPath = this.userPathResolve('settings.json');

    if (useDefaultFlags === undefined || useDefaultFlags.settings === false) {
      settingPath = this.userPathResolve('profiles', userDataProfile.location, 'settings.json');
      isDefault = false;
    }

    if (! await fsUtil.isExists(settingPath)) {
      return [];
    }

    return [{
      key: randomString(this.resourceIdLength),
      type: 'file',
      name: 'settings.json',
      fsPath: settingPath.fsPath,
      isDefault,
    }];
  }

  /**
   * 通过用户数据配置文件获取按键绑定信息
   * ```
   * // 全局按键绑定
   * user/keybindings.json
   * // profile按键绑定
   * user/profiles/xxx/keybindings.json
   * ```
   * @param userDataProfile 用户数据配置信息
   * @returns 
   */
  async getKeybindingsByUserDataProfile(userDataProfile: UserDataProfile): Promise<ProfileResource[]> {
    const { useDefaultFlags } = userDataProfile;

    let isDefault = true;
    let keybindingPath = this.userPathResolve('keybindings.json');

    if (useDefaultFlags === undefined || useDefaultFlags.keybindings === false) {
      keybindingPath = this.userPathResolve('profiles', userDataProfile.location, 'keybindings.json');
      isDefault = false;
    }

    if (!await fsUtil.isExists(keybindingPath)) {
      return [];
    }

    return [{
      key: randomString(this.resourceIdLength),
      type: 'file',
      name: 'keybindings.json',
      fsPath: keybindingPath.fsPath,
      isDefault,
    }];
  }

  /**
   * 通过用户数据配置文件获取代码片段信息
   * ```
   * // 全局代码片段
   * user/snippets/*
   * // profile代码片段
   * user/profiles/xxx/snippets/*
   * ```
   * @param userDataProfile 用户数据配置信息
   * @returns 
   */
  async getSnippetsByUserDataProfile(userDataProfile: UserDataProfile): Promise<ProfileResource[]> {
    const { useDefaultFlags } = userDataProfile;

    let isDefault = true;
    let snippetsFolderPath = this.userPathResolve('snippets');

    if (useDefaultFlags === undefined || useDefaultFlags.snippets === false) {
      snippetsFolderPath = this.userPathResolve('profiles', userDataProfile.location, 'snippets');
      isDefault = false;
    }

    if (! await fsUtil.isExists(snippetsFolderPath)) {
      return [];
    }

    return (await fsUtil.readDirectory(snippetsFolderPath))
      .filter(([, kind]) => kind === FileType.File)
      .map(([name]) => ({
        name,
        type: 'file',
        key: randomString(this.resourceIdLength),
        fsPath: Uri.joinPath(snippetsFolderPath, name).fsPath,
        isDefault,
      }));
  }

  /**
   * 格式化用户数据配置文件信息
   * @param userDataProfiles 用户数据配置信息
   * @returns 
   */
  async formatUserDataProfiles(userDataProfiles: UserDataProfile[]): Promise<Profile[]> {
    const result: Profile[] = [];
    for (const userDataProfile of userDataProfiles) {
      result.push({
        title: userDataProfile.name,
        useDefaultFlags: Object.assign(defaultUseDefaultFlags, userDataProfile),
        settings: await this.getSettingsByUserDataProfile(userDataProfile),
        keybindings: await this.getKeybindingsByUserDataProfile(userDataProfile),
        snippets: await this.getSnippetsByUserDataProfile(userDataProfile),
        extensions: await this.getExtensionsByUserDataProfile(userDataProfile),
      });
    }
    return result;
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
    // 获取全部profiles概述信息
    const storagePath = this.userPathResolve('globalStorage', 'storage.json');
    const storage = await fsUtil.readJSONFile<Storage>(storagePath);

    // 加载profiles
    const userDataProfile = await this.selectUserDataProfile(storage.userDataProfiles);
    this.profiles = await this.formatUserDataProfiles(userDataProfile);

    const isInit = ExportProfilesPanel.isInit();
    // 显示webview
    ExportProfilesPanel.render(this.context.extensionUri);
    // 刷新profiles
    isInit && this.refreshProfiles();
  }

  async deactivate() {
    ExportProfilesPanel.dispose();
  }
}