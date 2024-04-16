<template>
  <div class="h-svh b-1">
    <!-- 链接失效提示 -->
    <IxResult class="h-full flex justify-center flex-col" status="warning" v-if="isPingFailed"
      :title="l10n.t('Connection Failed')"
      :subtitle="l10n.t('Connection Failed, please close this page and try again')">
      <template #icon>
        <IxIcon name="disconnect" color="var(--vscode-editorWarning-foreground)" />
      </template>
    </IxResult>
    <!-- 加载 -->
    <IxSpin :spinning="spinning" class="h-full" v-else-if="spinning"></IxSpin>
    <template v-else>
      <!-- 空白 -->
      <div class="flex justify-center items-center h-full" v-if="!hadProfileNode">
        <IxEmpty :description="l10n.t('No profile selected')" />
      </div>
      <!-- profile 详情 -->
      <div class="py-10 px-14 flex flex-col h-full" v-else>
        <!-- 标题 -->
        <IxHeader class="flex-shrink-0 justify-between mb-10" showBar size="lg">
          [{{ active }}/{{ profileNodes.length }}] {{ profile.title }}
          <span class="opacity-70">{{ profile.isDefault ? l10n.t('Default profile') : '' }}</span>
        </IxHeader>
        <IxRadioGroup v-if="profileNodes.length > 1" mode="primary" @change="radioChange" :value="active" buttoned
          :dataSource="profileNodes">
        </IxRadioGroup>
        <!-- profile 树形控件 -->
        <div ref="profileTreeRef" class="flex-grow-1 overflow-y-auto my-3">
          <IxTree class="py-10" v-model:expandedKeys="profile.expandedKeys" v-model:checkedKeys="profile.checkedKeys"
            blocked checkable :dataSource="profile.treeData" cascaderStrategy="all">
            <!-- 展开图标 -->
            <template #expandIcon="{ expanded }">
              <IxIcon :name="expanded ? 'down' : 'right'"></IxIcon>
            </template>
            <!-- 节点标签 -->
            <template #label="{ node }">
              <div @click="openResource(node)">
                {{ node.label }}
                <span class="opacity-70">{{ node.description ?? '' }}</span>
              </div>
            </template>
          </IxTree>
        </div>
        <!-- 控件 -->
        <IxSpace v-if="hadProfileNode" justify="end">
          <IxButton class="w-48" v-if="active > 1" @click="pre">
            {{ l10n.t('Previous') }}
          </IxButton>
          <IxButton class="w-48" v-if="active < profileNodes.length" @click="next">
            {{ l10n.t('Next') }}
          </IxButton>
          <IxButton class="w-48" mode="primary" @click="saveFile('merge')" v-if="profileNodes.length === 1">
            {{ l10n.t('Export') }}
          </IxButton>
          <template v-else>
            <IxButton class="w-48" mode="primary" @click="saveFile('merge')">
              {{ l10n.t('Merge export') }}
            </IxButton>
            <IxButton class="w-48" mode="primary" @click="saveFile('single')">
              {{ l10n.t('Single export') }}
            </IxButton>
          </template>
        </IxSpace>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import type { TreeNode } from '@idux/components';
import { IxButton, IxEmpty, IxHeader, IxIcon, IxSpace, IxSpin, IxTree, IxResult, IxRadioGroup } from '@idux/components';
import { computed, nextTick, onUnmounted, ref, toRaw, watch } from 'vue';
import vscode, { MessageListener } from '../vscode';
import l10n from '../plugin/l10n';

const spinning = ref(true)

const active = ref(1)

type SteepTreeNode = TreeNode & {
  key: string
  openData?: string
  type?: ProfileResourceMetaType
  children?: SteepTreeNode[];
  description?: string
}

interface ProfileNode {
  // radio props
  key: number
  label: string
  // profile
  title: string
  scrollTop?: number
  description: string
  isDefault: boolean
  treeData: SteepTreeNode[]
  checkedKeys: string[]
  expandedKeys: string[]
}

const profileNodes = ref<ProfileNode[]>([])

/**
 * 格式化 profile 文件资源类型树形数据
 * @param key 节点key
 * @param resources 文件资源列表
 */
function formatProfileResourceTreeData(key: string, resources: ProfileResource[]): SteepTreeNode {
  return {
    label: key,
    key,
    description: resources.some(r => r.isDefault) ? l10n.t('From default profile') : undefined,
    children: resources.map(r => ({
      label: r.name,
      key: r.key,
      type: r.type,
      openData: r.fsPath,
    }))
  }
}

/**
 * 格式化 profile 树形数据
 * @param profile  profile 数据
 * @param index  profile 索引
 */
function formatTreeData(profile: Profile, index: number): ProfileNode {
  // 设置
  const settingTreeData: SteepTreeNode = formatProfileResourceTreeData('Settings', profile.settings)
  // 按键绑定
  const keybindingTreeData: SteepTreeNode = formatProfileResourceTreeData('Keybindings', profile.keybindings)
  // 代码片段
  const snippetTreeData: SteepTreeNode = formatProfileResourceTreeData('Snippets', profile.snippets)

  // 扩展
  const extensionTreeData: SteepTreeNode = {
    label: "Extensions",
    key: "Extensions",
    isLeaf: false,
    children: profile.extensions.map(e => ({
      label: e.displayName,
      type: e.type,
      key: e.key,
      openData: e.identifier.id
    }))
  }

  return {
    key: index + 1,
    label: profile.title,
    title: profile.title,
    description: profile.title,
    isDefault: profile.isDefault,
    treeData: [{
      label: profile.title,
      key: "Profile",
      children: [settingTreeData, keybindingTreeData, snippetTreeData, extensionTreeData]
    }],
    // 默认选择全部扩展
    checkedKeys: extensionTreeData.children!.map(c => c.key! as string),
    // 默认展开全部根节点
    expandedKeys: ['Profile', 'Settings', 'Keybindings', 'Snippets', 'Extensions']
  }
}

/**
 * 更新 profile 节点
 * @param profiles 
 */
function updateProfileNodes(profiles: Profile[]) {
  spinning.value = true
  active.value = 1
  setTimeout(() => {
    profileNodes.value = profiles.map((profile, index) => formatTreeData(profile, index))
    spinning.value = false
  }, 1000)
}

/**
 * 初始化
 */
function init() {
  spinning.value = true
  active.value = 1
  vscode.refreshProfiles()
}
init()

// 刷新 profile 事件监听
const refreshProfilesListener: MessageListener = {
  command: 'refreshProfiles',
  callback: (message: Message<Profile[]>) => message.data && updateProfileNodes(message.data)
}
vscode.addEventListener(refreshProfilesListener)
onUnmounted(() => vscode.removeEventListener(refreshProfilesListener))

const profileTreeRef = ref<HTMLDivElement>(null!)

function activeUpdate(steep: number, abs: boolean = false) {
  // 记录滚动位置
  profile.value.scrollTop = profileTreeRef.value.scrollTop
  abs ? (active.value = steep) : (active.value += steep)
}

// 控件
const pre = () => activeUpdate(-1)
const next = () => activeUpdate(1)
const radioChange = (index: number) => activeUpdate(index, true)

let saveI: number | undefined
function saveFile(exportType: ExportType) {
  if (!saveI) {
    saveI = setTimeout(() => saveI = undefined, 1000)

    // 检查是否存在空数据导出
    const emptyProfiles = profileNodes.value.filter(p => p.checkedKeys.length === 0)
    if (emptyProfiles.length > 0) {
      if (exportType === 'single') {
        // 单独导出时，提示空数据
        vscode.showMessage({
          type: 'warn',
          message: l10n.t('No data selected for export') + ': ' + emptyProfiles.map(p => p.title).join(', ')
        })
        return
      } else if (exportType === 'merge' && emptyProfiles.length === profileNodes.value.length) {
        // 合并导出且所有 profile 为空数据时，提示空数据
        vscode.showMessage({
          type: 'warn',
          message: l10n.t('No data selected for export')
        })
        return
      }
    }

    // 导出
    vscode.saveFile({
      exportType,
      exportProfiles: toRaw(profileNodes.value)
        .map(p => ({
          title: p.title,
          keys: p.checkedKeys
        })),
    })
  }
}

watch(() => active.value, () => {
  nextTick(() => {
    // 恢复滚动位置
    profileTreeRef.value.scrollTo({
      top: profile.value.scrollTop ?? 0,
      behavior: 'auto'
    })
  })
})

const profile = computed(() => profileNodes.value[active.value - 1])

const hadProfileNode = computed(() => profileNodes.value.length > 0)

/**
 * 打开资源
 * @param node 资源节点
 */
function openResource(node: SteepTreeNode) {
  if (!node.type) return
  vscode.openResource({
    type: node.type,
    data: node.openData!,
  })
}

// 心跳检查
const isPingFailed = ref(false)

const pingInterval = setInterval(async () => {
  try {
    await vscode.getData<string>({ command: 'ping' }, 2000);
  } catch (_) {
    clearInterval(pingInterval);
    isPingFailed.value = true;
  }
}, 3000);

onUnmounted(() => clearInterval(pingInterval))
</script>
