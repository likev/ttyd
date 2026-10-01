if (process.env.NODE_ENV === 'development') {
    import('preact/debug');
}
import 'whatwg-fetch';
import { h, render } from 'preact';
import { App } from './components/app';
import './style/index.css';

const init = () => render(<App />, document.body);
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
