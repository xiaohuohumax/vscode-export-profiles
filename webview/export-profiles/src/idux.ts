import { type App } from 'vue';

import '@idux/components/index.full.css';

import { createGlobalConfig } from '@idux/components/config';
import { IDUX_ICON_DEPENDENCIES, addIconDefinitions } from '@idux/components/icon';

addIconDefinitions(IDUX_ICON_DEPENDENCIES);

const customConfig = {
  icon: {
    loadIconDynamically: async (iconName: string) => {
      return fetch(`/idux-icons/${iconName}.svg`).then((res) => res.text());
    }
  }
};
const globalConfig = createGlobalConfig(customConfig);

const install = (app: App): void => {
  app.use(globalConfig);
};

export default { install };