import 'virtual:uno.css';
import { type App } from 'vue';

import './style';

import { createGlobalConfig } from '@idux/components/config';
import { IDUX_ICON_DEPENDENCIES, addIconDefinitions } from '@idux/components/icon';

addIconDefinitions(IDUX_ICON_DEPENDENCIES);

const install = (app: App): void => {
  app.use(createGlobalConfig({}));
};

export { default as themeTokens } from './themeTokens';

export default { install };