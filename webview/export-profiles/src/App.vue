<template>
  <IxThemeProvider presetTheme="default" :tokens="themeTokens">
    <ExportProfiles />
  </IxThemeProvider>
</template>
<script setup lang="ts">
import { IxThemeProvider } from '@idux/components';
import ExportProfiles from './components/ExportProfiles.vue';
import { themeTokens } from './plugin/idux';
</script>