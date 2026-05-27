import { h, Component } from 'preact';
import { bind } from 'decko';
import './keyboard.scss';

interface Props {
    onKeyPress: (data: string) => void;
    onClose: () => void;
    onToggleNativeKeyboard: () => void;
}

interface State {
    mode: 'terminal' | 'qwerty';
    ctrlActive: boolean;
    altActive: boolean;
    shiftActive: boolean;
    nativeKeyboardActive: boolean;
}

export class Keyboard extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {
            mode: 'terminal',
            ctrlActive: false,
            altActive: false,
            shiftActive: false,
            nativeKeyboardActive: false,
        };
    }

    @bind
    private handleKey(e: PointerEvent, type: 'char' | 'special', value: string) {
        // Prevent losing focus from the terminal textarea
        e.preventDefault();

        let { ctrlActive, altActive, shiftActive } = this.state;
        let data = value;

        if (type === 'char') {
            if (ctrlActive) {
                const charCode = value.toLowerCase().charCodeAt(0);
                if (charCode >= 97 && charCode <= 122) {
                    // Ctrl+A (1) to Ctrl+Z (26)
                    data = String.fromCharCode(charCode - 96);
                }
                ctrlActive = false;
            } else if (altActive) {
                data = '\x1b' + (shiftActive ? value.toUpperCase() : value.toLowerCase());
                altActive = false;
            } else if (shiftActive) {
                data = value.toUpperCase();
                shiftActive = false;
            } else {
                data = value.toLowerCase();
            }
            this.setState({ ctrlActive, altActive, shiftActive });
            this.props.onKeyPress(data);
        } else {
            // Special keys
            switch (value) {
                case 'CTRL':
                    this.setState({ ctrlActive: !ctrlActive });
                    break;
                case 'ALT':
                    this.setState({ altActive: !altActive });
                    break;
                case 'SHIFT':
                    this.setState({ shiftActive: !shiftActive });
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
                            // F1-F4: ESC O P, ESC O Q, ESC O R, ESC O S
                            this.props.onKeyPress('\x1bO' + String.fromCharCode(79 + num));
                        } else if (num >= 5 && num <= 8) {
                            // F5-F8: ESC [ 15 ~, ESC [ 17 ~, ESC [ 18 ~, ESC [ 19 ~
                            const codeMap = [15, 17, 18, 19];
                            this.props.onKeyPress(`\x1b[${codeMap[num - 5]}~`);
                        } else if (num >= 9 && num <= 12) {
                            // F9-F12: ESC [ 20 ~, ESC [ 21 ~, ESC [ 23 ~, ESC [ 24 ~
                            const codeMap = [20, 21, 23, 24];
                            this.props.onKeyPress(`\x1b[${codeMap[num - 9]}~`);
                        }
                    }
                    break;
            }
        }
    }

    @bind
    private toggleMode(e: PointerEvent) {
        e.preventDefault();
        this.setState({ mode: this.state.mode === 'terminal' ? 'qwerty' : 'terminal' });
    }

    @bind
    private handleNativeKeyboardToggle(e: PointerEvent) {
        e.preventDefault();
        this.setState({ nativeKeyboardActive: !this.state.nativeKeyboardActive });
        this.props.onToggleNativeKeyboard();
    }

    render() {
        const { mode, ctrlActive, altActive, shiftActive, nativeKeyboardActive } = this.state;

        const renderKey = (label: string, type: 'char' | 'special', value: string, extraClass = '') => {
            let activeClass = '';
            if (value === 'CTRL' && ctrlActive) activeClass = 'active';
            if (value === 'ALT' && altActive) activeClass = 'active';
            if (value === 'SHIFT' && shiftActive) activeClass = 'active';

            return (
                <button
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
            <div className="virtual-keyboard-container">
                <div className="keyboard-header">
                    <button className="header-btn" onPointerDown={this.toggleMode}>
                        {mode === 'terminal' ? '⌨️ Text Input' : '⚙️ Terminal Keys'}
                    </button>
                    <button
                        className={`header-btn ${nativeKeyboardActive ? 'active' : ''}`}
                        onPointerDown={this.handleNativeKeyboardToggle}
                    >
                        {nativeKeyboardActive ? '📱 Block Mobile KB' : '🌐 Show Mobile KB (IME)'}
                    </button>
                    <button
                        className="header-btn close"
                        onPointerDown={e => {
                            e.preventDefault();
                            this.props.onClose();
                        }}
                    >
                        ❌ Hide
                    </button>
                </div>

                <div className="keyboard-body">
                    {mode === 'terminal' ? (
                        <div className="layout-terminal">
                            {/* Row 1: Modifier and Core Actions */}
                            <div className="kbd-row">
                                {renderKey('ESC', 'special', 'ESC', 'key-fn')}
                                {renderKey('TAB', 'special', 'TAB', 'key-fn')}
                                {renderKey('CTRL', 'special', 'CTRL', 'key-modifier')}
                                {renderKey('ALT', 'special', 'ALT', 'key-modifier')}
                                {renderKey('INS', 'special', 'INS', 'key-fn')}
                                {renderKey('DEL', 'special', 'DEL', 'key-fn')}
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
                                {renderKey('HOME', 'special', 'HOME', 'key-fn')}
                                {renderKey('END', 'special', 'END', 'key-fn')}
                                {renderKey('PGUP', 'special', 'PGUP', 'key-fn')}
                                {renderKey('PGDN', 'special', 'PGDN', 'key-fn')}
                                {renderKey('BKSP', 'special', 'BACKSPACE', 'key-fn wide')}
                            </div>
                            {/* Row 5: Arrows and Space / Enter */}
                            <div className="kbd-row">
                                {renderKey('◀', 'special', 'LEFT', 'key-arrow')}
                                {renderKey('▲', 'special', 'UP', 'key-arrow')}
                                {renderKey('▼', 'special', 'DOWN', 'key-arrow')}
                                {renderKey('▶', 'special', 'RIGHT', 'key-arrow')}
                                {renderKey('SPACE', 'special', 'SPACE', 'key-space')}
                                {renderKey('ENTER', 'special', 'ENTER', 'key-enter')}
                            </div>
                        </div>
                    ) : (
                        <div className="layout-qwerty">
                            {qwertyRows.map((row, idx) => (
                                <div className="kbd-row" key={idx}>
                                    {row.map(key => {
                                        if (key === 'SHIFT') {
                                            return renderKey('⇧', 'special', 'SHIFT', 'key-modifier wide');
                                        }
                                        if (key === 'BACKSPACE') {
                                            return renderKey('⌫', 'special', 'BACKSPACE', 'key-fn wide');
                                        }
                                        return renderKey(shiftActive ? key : key.toLowerCase(), 'char', key);
                                    })}
                                </div>
                            ))}
                            {/* QWERTY Row 4: Modifiers, Space, Enter */}
                            <div className="kbd-row">
                                {renderKey('CTRL', 'special', 'CTRL', 'key-modifier')}
                                {renderKey('ALT', 'special', 'ALT', 'key-modifier')}
                                {renderKey('SPACE', 'special', 'SPACE', 'key-space')}
                                {renderKey('/', 'char', '/')}
                                {renderKey('-', 'char', '-')}
                                {renderKey('ENTER', 'special', 'ENTER', 'key-enter wide')}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        );
    }
}
