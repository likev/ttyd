import { bind } from 'decko';
import { Component, h } from 'preact';
import { Xterm, XtermOptions, isMobileDevice } from './xterm';

import '@xterm/xterm/css/xterm.css';
import { Modal } from '../modal';
import { Keyboard } from '../keyboard';

interface Props extends XtermOptions {
    id: string;
}

interface State {
    modal: boolean;
    showKeyboard: boolean;
    nativeKeyboardActive: boolean;
}

export class Terminal extends Component<Props, State> {
    private container: HTMLElement;
    private xterm: Xterm;
    private unmountCleanups: Array<() => void> = [];

    constructor(props: Props) {
        super(props);
        this.xterm = new Xterm(props, this.showModal);
        this.state = {
            modal: false,
            showKeyboard: false,
            nativeKeyboardActive: false,
        };
    }

    async componentDidMount() {
        await this.xterm.refreshToken();
        this.xterm.open(this.container);
        this.xterm.connect();

        const isMobile = isMobileDevice();
        if (isMobile) {
            // Apply inputmode="none" to the helper textarea to block native keyboard
            const textarea = this.container.querySelector('.xterm-helper-textarea') as HTMLTextAreaElement;
            if (textarea) {
                textarea.setAttribute('inputmode', 'none');
            }

            // Tap-to-focus and Long-press paste touch handlers
            let longPressTimer: number | null = null;
            let touchStartX = 0;
            let touchStartY = 0;

            const onTouchStart = (e: TouchEvent) => {
                if (e.touches.length === 1) {
                    touchStartX = e.touches[0].clientX;
                    touchStartY = e.touches[0].clientY;

                    // Tap to focus helper textarea without auto-showing virtual keyboard
                    if (textarea && document.activeElement !== textarea) {
                        textarea.focus();
                    }

                    // Long press paste
                    longPressTimer = window.setTimeout(async () => {
                        longPressTimer = null;
                        if (navigator.clipboard && navigator.clipboard.readText) {
                            try {
                                const text = await navigator.clipboard.readText();
                                if (text) {
                                    this.xterm.sendData(text);
                                }
                            } catch (err) {
                                // Clipboard access permission denied or unavailable
                            }
                        }
                    }, 600);
                }
            };

            const onTouchMove = (e: TouchEvent) => {
                if (longPressTimer !== null && e.touches.length === 1) {
                    const diffX = Math.abs(e.touches[0].clientX - touchStartX);
                    const diffY = Math.abs(e.touches[0].clientY - touchStartY);
                    if (diffX > 10 || diffY > 10) {
                        clearTimeout(longPressTimer);
                        longPressTimer = null;
                    }
                }
            };

            const onTouchEnd = () => {
                if (longPressTimer !== null) {
                    clearTimeout(longPressTimer);
                    longPressTimer = null;
                }
            };

            this.container.addEventListener('touchstart', onTouchStart, { passive: true });
            this.container.addEventListener('touchmove', onTouchMove, { passive: true });
            this.container.addEventListener('touchend', onTouchEnd, { passive: true });
            this.unmountCleanups.push(() => {
                this.container.removeEventListener('touchstart', onTouchStart);
                this.container.removeEventListener('touchmove', onTouchMove);
                this.container.removeEventListener('touchend', onTouchEnd);
            });

            // Orientation change handling
            const onOrientationChange = () => {
                setTimeout(() => {
                    this.xterm.fit();
                }, 300);
            };

            window.addEventListener('orientationchange', onOrientationChange);
            screen.orientation?.addEventListener('change', onOrientationChange);
            this.unmountCleanups.push(() => {
                window.removeEventListener('orientationchange', onOrientationChange);
                screen.orientation?.removeEventListener('change', onOrientationChange);
            });

            // VisualViewport resize listener for software keyboard appearances
            if (window.visualViewport) {
                const onVisualViewportResize = () => {
                    this.xterm.fit();
                };
                window.visualViewport.addEventListener('resize', onVisualViewportResize);
                this.unmountCleanups.push(() => {
                    window.visualViewport?.removeEventListener('resize', onVisualViewportResize);
                });
            }
        }
    }

    componentWillUnmount() {
        for (const cleanup of this.unmountCleanups) {
            cleanup();
        }
        this.unmountCleanups = [];
        this.xterm.dispose();
    }

    @bind
    openKeyboard() {
        const textarea = this.container?.querySelector('.xterm-helper-textarea') as HTMLTextAreaElement;
        if (textarea) {
            textarea.setAttribute('inputmode', 'none');
            textarea.blur();
            textarea.focus();
        }
        this.setState({ showKeyboard: true }, () => {
            this.xterm.fit();
        });
    }

    render({ id }: Props, { modal, showKeyboard, nativeKeyboardActive }: State) {
        const isMobile = isMobileDevice();
        return (
            <div
                id={id}
                ref={c => (this.container = c as HTMLElement)}
                style={
                    showKeyboard
                        ? {
                              height: nativeKeyboardActive
                                  ? 'calc(100% - var(--kbd-collapsed-height))'
                                  : 'calc(100% - var(--kbd-total-height))',
                          }
                        : {}
                }
            >
                <Modal show={modal}>
                    <label class="file-label">
                        <input onChange={this.sendFile} class="file-input" type="file" multiple />
                        <span class="file-cta">Choose files…</span>
                    </label>
                </Modal>
                {showKeyboard && (
                    <Keyboard
                        nativeKeyboardActive={nativeKeyboardActive}
                        onKeyPress={data => this.xterm.sendData(data)}
                        onToggleNativeKeyboard={this.toggleNativeKeyboard}
                        onClose={() => {
                            const textarea = this.container.querySelector(
                                '.xterm-helper-textarea'
                            ) as HTMLTextAreaElement;
                            if (textarea) {
                                textarea.setAttribute('inputmode', 'none');
                                textarea.blur();
                            }
                            this.setState({ showKeyboard: false, nativeKeyboardActive: false }, () => {
                                this.xterm.fit();
                            });
                        }}
                    />
                )}
                {isMobile && !showKeyboard && (
                    <button
                        aria-label="Show virtual keyboard"
                        class="floating-keyboard-btn"
                        onClick={this.openKeyboard}
                        onTouchEnd={e => {
                            e.preventDefault();
                            this.openKeyboard();
                        }}
                    >
                        ⌨️
                    </button>
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

    @bind
    toggleNativeKeyboard() {
        const textarea = this.container.querySelector('.xterm-helper-textarea') as HTMLTextAreaElement;
        if (textarea) {
            const currentMode = textarea.getAttribute('inputmode');
            if (currentMode === 'none') {
                textarea.setAttribute('inputmode', 'text');
                textarea.focus();
                this.setState({ nativeKeyboardActive: true }, () => {
                    this.xterm.fit();
                });
            } else {
                textarea.setAttribute('inputmode', 'none');
                textarea.blur();
                textarea.focus();
                this.setState({ nativeKeyboardActive: false }, () => {
                    this.xterm.fit();
                });
            }
        }
    }
}
