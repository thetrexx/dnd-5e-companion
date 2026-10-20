import { render } from 'preact';
import { App } from './app';
import { applyTheme } from './theme/themes';
import './styles/fonts.css';
import './styles/themes/faerun.css';
import './styles/base.css';

applyTheme('faerun');
render(<App />, document.getElementById('app')!);
