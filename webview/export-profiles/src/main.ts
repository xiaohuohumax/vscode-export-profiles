import 'virtual:uno.css';
import { createApp } from 'vue';
import App from './App.vue';
import Idux from './idux.ts';
import './index.css';
import * as l1on from './l10n.ts';

l1on.init();
const app = createApp(App);
app.use(Idux).mount('#app');
