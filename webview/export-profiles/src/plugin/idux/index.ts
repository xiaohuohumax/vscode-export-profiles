import 'virtual:uno.css';
import { type App } from 'vue';

import './style';

import { createGlobalConfig } from '@idux/components/config';
import { Down, Right, addIconDefinitions, Disconnect } from '@idux/components/icon';

// 图标
addIconDefinitions([Down, Right, Disconnect]);

const install = (app: App): void => {
  app.use(createGlobalConfig({}));
};

export { default as themeTokens } from './themeTokens';

export default { install };