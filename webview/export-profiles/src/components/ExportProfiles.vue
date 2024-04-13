<template>
  <div class="h-svh b-1">
    <!-- 加载 -->
    <IxSpin :spinning="spinning" class="h-full" v-if="spinning"></IxSpin>
    <template v-else>
      <!-- 空白 -->
      <div class="flex justify-center items-center h-full" v-if="!hadProfileNode">
        <IxEmpty :description="l10n.t('No profile selected')" />
      </div>
      <!-- profile 详情 -->
      <div class="py-10 px-14 pb-26 flex flex-col h-full" v-else>
        <!-- 控件 -->
        <IxSpace class="fixed bottom-10 right-14 z-50" v-if="hadProfileNode">
          <IxButton class="w-48" v-if="active > 1" @click="pre">
            {{ l10n.t('Previous') }}
          </IxButton>
          <IxButton class="w-48" v-if="active < profileNodes.length" @click="next">
            {{ l10n.t('Next') }}
          </IxButton>
          <IxButton class="w-48" mode="primary" @click="save">
            {{ l10n.t('Export') }}
          </IxButton>
        </IxSpace>
        <!-- 标题 -->
        <IxHeader class="flex-shrink-0 justify-between mb-10" showBar size="lg">
          [{{ active }}/{{ profileNodes.length }}] {{ profile.title }}
        </IxHeader>
        <!-- profile 树形控件 -->
        <div class="flex-grow-1 overflow-hidden">
          <IxTree class="py-10" autoHeight v-model:expandedKeys="profile.expandedKeys"
            v-model:checkedKeys="profile.checkedKeys" blocked checkable :dataSource="profile.treeData"
            cascaderStrategy="all">
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
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import type { TreeNode } from '@idux/components';
import { IxButton, IxEmpty, IxHeader, IxIcon, IxSpace, IxSpin, IxTree } from '@idux/components';
import { computed, onUnmounted, ref, toRaw } from 'vue';
import l10n from '../l10n';
import vscode, { MessageListener } from '../vscode';

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
  title: string
  description: string
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
 */
function formatTreeData(profile: Profile): ProfileNode {
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
    title: profile.title,
    description: profile.title,
    treeData: [{
      label: "Profile",
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
    profileNodes.value = profiles.map(profile => formatTreeData(profile))
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

/**
 * 刷新 profile 事件监听
 */
const refreshProfilesListener: MessageListener = {
  command: 'refreshProfiles',
  callback: (message: Message<Profile[]>) => message.data && updateProfileNodes(message.data)
}
vscode.addEventListener(refreshProfilesListener)
onUnmounted(() => vscode.removeEventListener(refreshProfilesListener))

// 控件
const pre = () => active.value -= 1
const next = () => active.value += 1
let saveI: number | undefined
const save = () => {
  if (saveI) {
    return
  }
  saveI = setTimeout(() => saveI = undefined, 1000)
  vscode.saveFile(toRaw(profileNodes.value).map(p => ({ profileTitle: p.title, keys: p.checkedKeys })))
}

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
</script>
