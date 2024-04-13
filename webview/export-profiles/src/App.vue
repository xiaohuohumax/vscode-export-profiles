<template>
  <IxThemeProvider presetTheme="default" :tokens="tokens">
    <ExportProfiles />
  </IxThemeProvider>
</template>
<script setup lang="ts">
import { DeepPartialThemeTokens, IxThemeProvider } from '@idux/components';
import ExportProfiles from './components/ExportProfiles.vue';

// 修改 vscode 主题配色方案
const tokens: DeepPartialThemeTokens = {
  global: {
    colorBg: 'var(--vscode-editor-background)',
    colorText: 'var(--vscode-foreground)',
    colorTextTitle: 'var(--vscode-foreground)',
  },
  components: {
    button: {
      borderRadius: 2,
      borderColor: "var(--vscode-button-border)",
      color: "var(--vscode-button-secondaryForeground)",
      bgColor: "var(--vscode-button-secondaryBackground)",
      ghostColorHover: "var(--vscode-button-secondaryHoverBackground)",
      primaryBgColor: "var(--vscode-button-background)",
      primaryBgColorHover: "var(--vscode-button-hoverBackground)",
      primaryColor: "var(--vscode-button-foreground)"
    },
    checkbox: {
      fieldsetBorderColor: "var(--vscode-checkbox-border)",
      fieldsetBgColor: "var(--vscode-checkbox-background)"
    },
    tree: {
      nodeBgColorSelected: "var(--vscode-list-activeSelectionBackground)",
      nodeColorSelected: "var(--vscode-list-activeSelectionForeground)",
      nodeBgColorHover: 'var(--vscode-list-hoverBackground)',
    },
    empty: {
      color: "var(--vscode-foreground)"
    },
    spin: {
      maskBgColor: "var(--vscode-editor-background)",
      bgCircleStroke: "var(--vscode-button-background)"
    }
  }
}
</script>