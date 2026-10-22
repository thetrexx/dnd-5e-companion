import { render } from 'preact';
import { App } from './app';
import { applyTheme } from './theme/themes';
import { applyStrength, loadSettings } from './settings/settings';
import './styles/fonts.css';
import './styles/base.css';
import './styles/components.css';
import './styles/screens.css';
import './styles/motion.css';

const settings = loadSettings();
applyTheme(settings.theme);
applyStrength(settings);
render(<App />, document.getElementById('app')!);
