import './style.css';
import { App } from './core/App.js';

const container = document.querySelector('#app');
const app = new App(container);
app.start();
