import { bind } from 'decko';
import { Component, h } from 'preact';
import { Xterm, XtermOptions } from './xterm';

import '@xterm/xterm/css/xterm.css';
import { Modal } from '../modal';
import { Keyboard } from '../keyboard';

interface Props extends XtermOptions {
    id: string;
}

interface State {
    modal: boolean;
    showKeyboard: boolean;
}

export class Terminal extends Component<Props, State> {
    private container: HTMLElement;
    private xterm: Xterm;

    constructor(props: Props) {
        super(props);
        this.xterm = new Xterm(props, this.showModal);
        this.state = {
            modal: false,
            showKeyboard: false,
        };
    }

    async componentDidMount() {
        await this.xterm.refreshToken();
        this.xterm.open(this.container);
        this.xterm.connect();

        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        if (isMobile) {
            // Apply inputmode="none" to the helper textarea to block native keyboard
            const textarea = this.container.querySelector('.xterm-helper-textarea');
            if (textarea) {
                textarea.setAttribute('inputmode', 'none');

                // Listen to focus/blur to toggle virtual keyboard visibility
                textarea.addEventListener('focus', () => {
                    this.setState({ showKeyboard: true }, () => {
                        this.xterm.fit();
                    });
                });

                textarea.addEventListener('blur', () => {
                    setTimeout(() => {
                        if (document.activeElement !== textarea) {
                            this.setState({ showKeyboard: false }, () => {
                                this.xterm.fit();
                            });
                        }
                    }, 150);
                });
            }
        }
    }

    componentWillUnmount() {
        this.xterm.dispose();
    }

    render({ id }: Props, { modal, showKeyboard }: State) {
        return (
            <div
                id={id}
                ref={c => (this.container = c as HTMLElement)}
                style={showKeyboard ? { height: 'calc(100% - 270px)' } : {}}
            >
                <Modal show={modal}>
                    <label class="file-label">
                        <input onChange={this.sendFile} class="file-input" type="file" multiple />
                        <span class="file-cta">Choose files…</span>
                    </label>
                </Modal>
                {showKeyboard && (
                    <Keyboard
                        onKeyPress={data => this.xterm.sendData(data)}
                        onClose={() => {
                            this.setState({ showKeyboard: false }, () => {
                                this.xterm.fit();
                            });
                        }}
                    />
                )}
            </div>
        );
    }

    @bind
    showModal() {
        this.setState({ modal: true });
    }

    @bind
    sendFile(event: Event) {
        this.setState({ modal: false });
        const files = (event.target as HTMLInputElement).files;
        if (files) this.xterm.sendFile(files);
    }
}
