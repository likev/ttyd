import { h, Component } from 'preact';
import { bind } from 'decko';
import './keyboard.scss';

interface Props {
    nativeKeyboardActive: boolean;
    onKeyPress: (data: string) => void;
    onClose: () => void;
    onToggleNativeKeyboard: () => void;
}

interface State {
    mode: 'terminal' | 'qwerty' | 'symbols';
    ctrlActive: boolean;
    altActive: boolean;
    shiftActive: boolean;
}

export class Keyboard extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {
            mode: 'terminal',
            ctrlActive: false,
            altActive: false,
            shiftActive: false,
        };
    }

    @bind
    private handleKey(e: PointerEvent, type: 'char' | 'special', value: string) {
        // Prevent losing focus from the terminal textarea
        e.preventDefault();

        const { ctrlActive, altActive, shiftActive, mode } = this.state;
        let data = value;

        if (type === 'char') {
            if (ctrlActive) {
                const charCode = value.toLowerCase().charCodeAt(0);
                if (charCode >= 97 && charCode <= 122) {
                    // Ctrl+A (1) to Ctrl+Z (26)
                    data = String.fromCharCode(charCode - 96);
                }
            } else if (altActive) {
                data = '\x1b' + (shiftActive ? value.toUpperCase() : value);
            } else if (shiftActive) {
                data = value.toUpperCase();
            } else {
                data = mode === 'qwerty' ? (shiftActive ? value.toUpperCase() : value.toLowerCase()) : value;
            }
            this.setState({ ctrlActive: false, altActive: false, shiftActive: false });
            this.props.onKeyPress(data);
        } else {
            // Special keys
            switch (value) {
                case 'CTRL':
                    this.setState({ ctrlActive: !ctrlActive });
                    return;
                case 'ALT':
                    this.setState({ altActive: !altActive });
                    return;
                case 'SHIFT':
                    this.setState({ shiftActive: !shiftActive });
                    return;
                case 'CTRL_C':
                    this.props.onKeyPress('\x03');
                    break;
                case 'CTRL_D':
                    this.props.onKeyPress('\x04');
                    break;
                case 'ESC':
                    this.props.onKeyPress('\x1b');
                    break;
                case 'TAB':
                    this.props.onKeyPress('\t');
                    break;
                case 'ENTER':
                    this.props.onKeyPress('\r');
                    break;
                case 'BACKSPACE':
                    this.props.onKeyPress('\x7f');
                    break;
                case 'SPACE':
                    this.props.onKeyPress(' ');
                    break;
                case 'UP':
                    this.props.onKeyPress('\x1b[A');
                    break;
                case 'DOWN':
                    this.props.onKeyPress('\x1b[B');
                    break;
                case 'LEFT':
                    this.props.onKeyPress('\x1b[D');
                    break;
                case 'RIGHT':
                    this.props.onKeyPress('\x1b[C');
                    break;
                case 'HOME':
                    this.props.onKeyPress('\x1b[H');
                    break;
                case 'END':
                    this.props.onKeyPress('\x1b[F');
                    break;
                case 'PGUP':
                    this.props.onKeyPress('\x1b[5~');
                    break;
                case 'PGDN':
                    this.props.onKeyPress('\x1b[6~');
                    break;
                case 'DEL':
                    this.props.onKeyPress('\x1b[3~');
                    break;
                case 'INS':
                    this.props.onKeyPress('\x1b[2~');
                    break;
                default:
                    if (value.startsWith('F')) {
                        // Function keys F1-F12
                        const num = parseInt(value.substring(1), 10);
                        if (num >= 1 && num <= 4) {
                            this.props.onKeyPress('\x1bO' + String.fromCharCode(79 + num));
                        } else if (num >= 5 && num <= 8) {
                            const codeMap = [15, 17, 18, 19];
                            this.props.onKeyPress(`\x1b[${codeMap[num - 5]}~`);
                        } else if (num >= 9 && num <= 12) {
                            const codeMap = [20, 21, 23, 24];
                            this.props.onKeyPress(`\x1b[${codeMap[num - 9]}~`);
                        }
                    }
                    break;
            }
            this.setState({ ctrlActive: false, altActive: false, shiftActive: false });
        }
    }

    @bind
    private handleNativeKeyboardToggle(e: PointerEvent) {
        e.preventDefault();
        this.props.onToggleNativeKeyboard();
    }

    render() {
        const { nativeKeyboardActive } = this.props;
        const { mode, ctrlActive, altActive, shiftActive } = this.state;

        const renderKey = (
            label: string,
            type: 'char' | 'special',
            value: string,
            extraClass = '',
            ariaLabel?: string
        ) => {
            let activeClass = '';
            if (value === 'CTRL' && ctrlActive) activeClass = 'active';
            if (value === 'ALT' && altActive) activeClass = 'active';
            if (value === 'SHIFT' && shiftActive) activeClass = 'active';

            return (
                <button
                    aria-label={ariaLabel || label}
                    className={`kbd-key ${type} ${extraClass} ${activeClass}`}
                    onPointerDown={e => this.handleKey(e, type, value)}
                >
                    {label}
                </button>
            );
        };

        const qwertyRows = [
            ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
            ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
            ['SHIFT', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', 'BACKSPACE'],
        ];

        return (
            <div className={`virtual-keyboard-container ${nativeKeyboardActive ? 'collapsed' : ''}`}>
                <div className="keyboard-header">
                    {!nativeKeyboardActive && (
                        <button
                            className={`header-btn ${mode === 'terminal' ? 'active' : ''}`}
                            aria-label="Terminal Keys layout"
                            onPointerDown={e => {
                                e.preventDefault();
                                this.setState({ mode: 'terminal' });
                            }}
                        >
                            ⚙️ Keys
                        </button>
                    )}
                    {!nativeKeyboardActive && (
                        <button
                            className={`header-btn ${mode === 'qwerty' ? 'active' : ''}`}
                            aria-label="Text QWERTY layout"
                            onPointerDown={e => {
                                e.preventDefault();
                                this.setState({ mode: 'qwerty' });
                            }}
                        >
                            🔤 ABC
                        </button>
                    )}
                    {!nativeKeyboardActive && (
                        <button
                            className={`header-btn ${mode === 'symbols' ? 'active' : ''}`}
                            aria-label="Numbers and Symbols layout"
                            onPointerDown={e => {
                                e.preventDefault();
                                this.setState({ mode: 'symbols' });
                            }}
                        >
                            1️⃣ #+=
                        </button>
                    )}
                    <button
                        className={`header-btn ${nativeKeyboardActive ? 'active' : ''}`}
                        aria-label="Toggle native mobile keyboard"
                        onPointerDown={this.handleNativeKeyboardToggle}
                    >
                        {nativeKeyboardActive ? '📱 Block' : '🌐 IME'}
                    </button>
                    <button
                        className="header-btn close"
                        aria-label="Hide virtual keyboard"
                        onPointerDown={e => {
                            e.preventDefault();
                            this.props.onClose();
                        }}
                    >
                        ❌ Hide
                    </button>
                </div>

                {!nativeKeyboardActive && (
                    <div className="keyboard-body">
                        {mode === 'terminal' && (
                            <div className="layout-terminal">
                                {/* Row 1: Modifier, Quick Shortcuts, and Core Actions */}
                                <div className="kbd-row">
                                    {renderKey('ESC', 'special', 'ESC', 'key-fn', 'Escape')}
                                    {renderKey('TAB', 'special', 'TAB', 'key-fn', 'Tab')}
                                    {renderKey('CTRL', 'special', 'CTRL', 'key-modifier', 'Control')}
                                    {renderKey('ALT', 'special', 'ALT', 'key-modifier', 'Alt')}
                                    {renderKey('^C', 'special', 'CTRL_C', 'key-fn key-shortcut', 'Control C')}
                                    {renderKey('^D', 'special', 'CTRL_D', 'key-fn key-shortcut', 'Control D')}
                                    {renderKey('INS', 'special', 'INS', 'key-fn', 'Insert')}
                                    {renderKey('DEL', 'special', 'DEL', 'key-fn', 'Delete')}
                                </div>
                                {/* Row 2: Function Keys F1-F6 */}
                                <div className="kbd-row">
                                    {renderKey('F1', 'special', 'F1', 'key-fn')}
                                    {renderKey('F2', 'special', 'F2', 'key-fn')}
                                    {renderKey('F3', 'special', 'F3', 'key-fn')}
                                    {renderKey('F4', 'special', 'F4', 'key-fn')}
                                    {renderKey('F5', 'special', 'F5', 'key-fn')}
                                    {renderKey('F6', 'special', 'F6', 'key-fn')}
                                </div>
                                {/* Row 3: Function Keys F7-F12 */}
                                <div className="kbd-row">
                                    {renderKey('F7', 'special', 'F7', 'key-fn')}
                                    {renderKey('F8', 'special', 'F8', 'key-fn')}
                                    {renderKey('F9', 'special', 'F9', 'key-fn')}
                                    {renderKey('F10', 'special', 'F10', 'key-fn')}
                                    {renderKey('F11', 'special', 'F11', 'key-fn')}
                                    {renderKey('F12', 'special', 'F12', 'key-fn')}
                                </div>
                                {/* Row 4: Navigation / Edit Actions */}
                                <div className="kbd-row">
                                    {renderKey('HOME', 'special', 'HOME', 'key-fn', 'Home')}
                                    {renderKey('END', 'special', 'END', 'key-fn', 'End')}
                                    {renderKey('PGUP', 'special', 'PGUP', 'key-fn', 'Page Up')}
                                    {renderKey('PGDN', 'special', 'PGDN', 'key-fn', 'Page Down')}
                                    {renderKey('BKSP', 'special', 'BACKSPACE', 'key-fn wide', 'Backspace')}
                                </div>
                                {/* Row 5: Arrows and Space / Enter */}
                                <div className="kbd-row">
                                    {renderKey('◀', 'special', 'LEFT', 'key-arrow', 'Left Arrow')}
                                    {renderKey('▲', 'special', 'UP', 'key-arrow', 'Up Arrow')}
                                    {renderKey('▼', 'special', 'DOWN', 'key-arrow', 'Down Arrow')}
                                    {renderKey('▶', 'special', 'RIGHT', 'key-arrow', 'Right Arrow')}
                                    {renderKey('SPACE', 'special', 'SPACE', 'key-space', 'Space')}
                                    {renderKey('ENTER', 'special', 'ENTER', 'key-enter', 'Enter')}
                                </div>
                            </div>
                        )}
                        {mode === 'qwerty' && (
                            <div className="layout-qwerty">
                                {qwertyRows.map((row, idx) => (
                                    <div className="kbd-row" key={idx}>
                                        {row.map(key => {
                                            if (key === 'SHIFT') {
                                                return renderKey('⇧', 'special', 'SHIFT', 'key-modifier wide', 'Shift');
                                            }
                                            if (key === 'BACKSPACE') {
                                                return renderKey(
                                                    '⌫',
                                                    'special',
                                                    'BACKSPACE',
                                                    'key-fn wide',
                                                    'Backspace'
                                                );
                                            }
                                            return renderKey(
                                                shiftActive ? key : key.toLowerCase(),
                                                'char',
                                                key,
                                                '',
                                                `Key ${key}`
                                            );
                                        })}
                                    </div>
                                ))}
                                {/* QWERTY Row 4: Modifiers, Space, Enter */}
                                <div className="kbd-row">
                                    {renderKey('CTRL', 'special', 'CTRL', 'key-modifier', 'Control')}
                                    {renderKey('ALT', 'special', 'ALT', 'key-modifier', 'Alt')}
                                    {renderKey('SPACE', 'special', 'SPACE', 'key-space', 'Space')}
                                    {renderKey('/', 'char', '/', '', 'Slash')}
                                    {renderKey('-', 'char', '-', '', 'Dash')}
                                    {renderKey('ENTER', 'special', 'ENTER', 'key-enter wide', 'Enter')}
                                </div>
                            </div>
                        )}
                        {mode === 'symbols' && (
                            <div className="layout-symbols">
                                <div className="kbd-row">
                                    {['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'].map(num =>
                                        renderKey(num, 'char', num, 'key-fn', `Number ${num}`)
                                    )}
                                </div>
                                <div className="kbd-row">
                                    {['!', '@', '#', '$', '%', '^', '&', '*', '(', ')'].map(sym =>
                                        renderKey(sym, 'char', sym, '', `Symbol ${sym}`)
                                    )}
                                </div>
                                <div className="kbd-row">
                                    {['~', '`', '-', '_', '=', '+', '[', ']', '{', '}'].map(sym =>
                                        renderKey(sym, 'char', sym, '', `Symbol ${sym}`)
                                    )}
                                </div>
                                <div className="kbd-row">
                                    {['\\', '|', ';', ':', "'", '"', ',', '.', '<', '>'].map(sym =>
                                        renderKey(sym, 'char', sym, '', `Symbol ${sym}`)
                                    )}
                                </div>
                                <div className="kbd-row">
                                    {renderKey('CTRL', 'special', 'CTRL', 'key-modifier', 'Control')}
                                    {renderKey('ALT', 'special', 'ALT', 'key-modifier', 'Alt')}
                                    {renderKey('/', 'char', '/', '', 'Slash')}
                                    {renderKey('?', 'char', '?', '', 'Question Mark')}
                                    {renderKey('SPACE', 'special', 'SPACE', 'key-space', 'Space')}
                                    {renderKey('BKSP', 'special', 'BACKSPACE', 'key-fn wide', 'Backspace')}
                                    {renderKey('ENTER', 'special', 'ENTER', 'key-enter wide', 'Enter')}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        );
    }
}
