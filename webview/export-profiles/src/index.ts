import { createApp } from 'vue';
import App from './App.vue';
import Idux from './plugin/idux';
import * as l1on from './plugin/l10n';
import './index.css';

l1on.init();

const app = createApp(App);
app.use(Idux);
app.mount('#app');