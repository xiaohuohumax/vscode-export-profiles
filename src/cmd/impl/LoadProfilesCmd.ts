import { FileType, Uri, extensions } from 'vscode';
import fsUtil from '#/src/utils/fsUtil';
import ICmd from '../iCmd';
import os from 'os';

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

/**
 * 加载解析 profiles 配置
 */
export class LoadProfilesCmd extends ICmd {
  // 资源ID长度
  private readonly resourceIdLength = 30;

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
  protected async getExtensionDisplayName(extension: Extension): Promise<string> {
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
  protected async getExtensionByExtensionJsonFile(extensionJsonPath: Uri): Promise<Extension[]> {
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
  protected async getExtensionsByUserDataProfile(userDataProfile: UserDataProfile): Promise<ProfileExtension[]> {
    const extensions: Extension[] = [];
    // 加载全局扩展
    const globalExtensionsPath = this.homePathResolve('.vscode', 'extensions', 'extensions.json');
    const globalExtensions: Extension[] = await this.getExtensionByExtensionJsonFile(globalExtensionsPath);

    // 加载私有扩展
    if (!userDataProfile?.useDefaultFlags?.extensions) {
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
  protected async getSettingsByUserDataProfile(userDataProfile: UserDataProfile): Promise<ProfileResource[]> {
    let isDefault = true;
    let settingPath = this.userPathResolve('settings.json');

    if (!userDataProfile?.useDefaultFlags?.settings) {
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
  protected async getKeybindingsByUserDataProfile(userDataProfile: UserDataProfile): Promise<ProfileResource[]> {
    let isDefault = true;
    let keybindingPath = this.userPathResolve('keybindings.json');

    if (!userDataProfile?.useDefaultFlags?.keybindings) {
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
  protected async getSnippetsByUserDataProfile(userDataProfile: UserDataProfile): Promise<ProfileResource[]> {
    let isDefault = true;
    let snippetsFolderPath: Uri = this.userPathResolve('snippets');

    if (!userDataProfile?.useDefaultFlags?.snippets) {
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
   * 获取 Storage 信息
   * @returns 
   */
  protected async getStorage(): Promise<Storage> {
    // 获取全部profiles概述信息
    const storagePath = this.userPathResolve('globalStorage', 'storage.json');
    return await fsUtil.readJSONFile<Storage>(storagePath);
  }

  /**
   * 格式化用户数据配置文件信息
   * @param userDataProfiles 用户数据配置信息
   * @returns 
   */
  protected async formatUserDataProfiles(userDataProfiles: UserDataProfile[]): Promise<Profile[]> {
    const result: Profile[] = [];
    for (const userDataProfile of userDataProfiles) {
      result.push({
        title: userDataProfile.name,
        isDefault: userDataProfile.isDefault ?? false,
        useDefaultFlags: userDataProfile.useDefaultFlags ?? {},
        settings: await this.getSettingsByUserDataProfile(userDataProfile),
        keybindings: await this.getKeybindingsByUserDataProfile(userDataProfile),
        snippets: await this.getSnippetsByUserDataProfile(userDataProfile),
        extensions: await this.getExtensionsByUserDataProfile(userDataProfile),
      });
    }
    return result;
  }

  async run() { }
}