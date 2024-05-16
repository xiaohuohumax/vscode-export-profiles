import { createApp } from 'vue';
import App from './App.vue';
import Idux from './plugin/idux';
import './index.css';

const app = createApp(App);
app.use(Idux);
app.mount('#app');