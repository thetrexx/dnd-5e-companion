import { render } from 'preact';
import { App } from './app';
import { applyTheme, storedTheme } from './theme/themes';
import './styles/fonts.css';
import './styles/themes/faerun.css';
import './styles/base.css';

applyTheme(storedTheme());
render(<App />, document.getElementById('app')!);
