import { h, Component } from 'preact';
import { bind } from 'decko';
import './keyboard.css';

interface Props {
    nativeKeyboardActive?: boolean;
    onKeyPress: (data: string) => void;
    onClose: () => void;
    onToggleNativeKeyboard?: () => void;
}

interface KeyDef {
    key: string;
    upper?: string;
    sym?: string;
    fnLabel?: string;
    fnSeq?: string;
}

const QWERTY_ROW_1: KeyDef[] = [
    { key: 'q', upper: 'Q', sym: '1' },
    { key: 'w', upper: 'W', sym: '2' },
    { key: 'e', upper: 'E', sym: '3' },
    { key: 'r', upper: 'R', sym: '4' },
    { key: 't', upper: 'T', sym: '5' },
    { key: 'y', upper: 'Y', sym: '6' },
    { key: 'u', upper: 'U', sym: '7' },
    { key: 'i', upper: 'I', sym: '8' },
    { key: 'o', upper: 'O', sym: '9' },
    { key: 'p', upper: 'P', sym: '0' },
];

const QWERTY_ROW_2: KeyDef[] = [
    { key: 'a', upper: 'A', sym: '~' },
    { key: 's', upper: 'S', sym: '!' },
    { key: 'd', upper: 'D', sym: '@' },
    { key: 'f', upper: 'F', sym: '#' },
    { key: 'g', upper: 'G', sym: '%' },
    { key: 'h', upper: 'H', sym: "'" },
    { key: 'j', upper: 'J', sym: '&' },
    { key: 'k', upper: 'K', sym: '*' },
    { key: 'l', upper: 'L', sym: '?' },
];

const QWERTY_ROW_3: KeyDef[] = [
    { key: 'z', upper: 'Z', sym: '(' },
    { key: 'x', upper: 'X', sym: ')' },
    { key: 'c', upper: 'C', sym: '-' },
    { key: 'v', upper: 'V', sym: '_' },
    { key: 'b', upper: 'B', sym: ':' },
    { key: 'n', upper: 'N', sym: ';' },
    { key: 'm', upper: 'M', sym: '/' },
];

const SYMBOLS_NUM_ROW: KeyDef[] = [
    { key: '1', fnLabel: 'F1', fnSeq: '\x1bOP' },
    { key: '2', fnLabel: 'F2', fnSeq: '\x1bOQ' },
    { key: '3', fnLabel: 'F3', fnSeq: '\x1bOR' },
    { key: '4', fnLabel: 'F4', fnSeq: '\x1bOS' },
    { key: '5', fnLabel: 'F5', fnSeq: '\x1b[15~' },
    { key: '6', fnLabel: 'F6', fnSeq: '\x1b[17~' },
    { key: '7', fnLabel: 'F7', fnSeq: '\x1b[18~' },
    { key: '8', fnLabel: 'F8', fnSeq: '\x1b[19~' },
    { key: '9', fnLabel: 'F9', fnSeq: '\x1b[20~' },
    { key: '0', fnLabel: 'F10', fnSeq: '\x1b[21~' },
];

const SYMBOLS_ROW_2: (string | KeyDef)[] = [
    '+', '=', '[', ']', '{', '}', '<', '>',
    { key: '\\', fnLabel: 'F11', fnSeq: '\x1b[23~' },
    { key: '|', fnLabel: 'F12', fnSeq: '\x1b[24~' },
];

const SHIFT_MAP: Record<string, string> = {
    '1': '!', '2': '@', '3': '#', '4': '$', '5': '%',
    '6': '^', '7': '&', '8': '*', '9': '(', '0': ')',
    '`': '~', '-': '_', '=': '+', '[': '{', ']': '}',
    '\\': '|', ';': ':', "'": '"', ',': '<', '.': '>',
    '/': '?',
};

function vibrate(duration = 15) {
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
        try {
            navigator.vibrate(duration);
        } catch {
            // ignore
        }
    }
}

const HideIcon = () => (
    <svg
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
    >
        <rect x="2" y="4" width="20" height="12" rx="2" />
        <path d="M6 8h.01M10 8h.01M14 8h.01M18 8h.01M8 12h.01M12 12h.01M16 12h.01" />
        <polyline points="9 19 12 22 15 19" />
    </svg>
);

const EnterIcon = () => (
    <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
    >
        <polyline points="9 10 4 15 9 20" />
        <path d="M20 4v7a4 4 0 0 1-4 4H4" />
    </svg>
);

const BackspaceIcon = () => (
    <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
    >
        <path d="M21 4H8l-7 8 7 8h13a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z" />
        <line x1="18" y1="9" x2="12" y2="15" />
        <line x1="12" y1="9" x2="18" y2="15" />
    </svg>
);

interface PopupCandidate {
    id: string;
    label: string;
    value: string;
    isFn?: boolean;
}

interface PopupState {
    pointerId: number;
    candidates: PopupCandidate[];
    selectedIndex: number | null;
    left: number;
    top: number;
}

interface ActivePointer {
    pointerId: number;
    startX: number;
    startY: number;
    target: HTMLElement;
    keyDef: KeyDef;
    longPressTimer: number | null;
    longPressFired: boolean;
    dragCancelled: boolean;
}

interface State {
    mode: 'qwerty' | 'symbols';
    ctrlActive: boolean;
    shiftActive: boolean;
    activePopup: PopupState | null;
    pressedKeys: Record<string, boolean>;
}

export class Keyboard extends Component<Props, State> {
    private containerRef: HTMLDivElement | null = null;
    private activePointers = new Map<number, ActivePointer>();
    private activePopup: PopupState | null = null;
    private pressedKeys: Record<string, boolean> = {};
    private backspaceTimer: number | null = null;
    private backspaceInterval: number | null = null;

    constructor(props: Props) {
        super(props);
        this.state = {
            mode: 'qwerty',
            ctrlActive: false,
            shiftActive: false,
            activePopup: null,
            pressedKeys: {},
        };
    }

    componentDidMount() {
        window.addEventListener('contextmenu', this.preventContextMenu, { capture: true });
        document.addEventListener('contextmenu', this.preventContextMenu, { capture: true });
    }

    componentWillUnmount() {
        window.removeEventListener('contextmenu', this.preventContextMenu, { capture: true });
        document.removeEventListener('contextmenu', this.preventContextMenu, { capture: true });
        this.clearBackspaceTimers();
        for (const ptr of this.activePointers.values()) {
            if (ptr.longPressTimer !== null) {
                clearTimeout(ptr.longPressTimer);
            }
        }
        this.activePointers.clear();
    }

    @bind
    private preventContextMenu(e: Event) {
        e.preventDefault();
        e.stopPropagation();
        if (window.getSelection) {
            window.getSelection()?.removeAllRanges();
        }
        return false;
    }

    @bind
    private handleContainerTouchStart(e: TouchEvent) {
        e.stopPropagation();
        if (document.activeElement && document.activeElement instanceof HTMLElement) {
            document.activeElement.blur();
        }
        if (window.getSelection) {
            window.getSelection()?.removeAllRanges();
        }
    }

    @bind
    private updateKeyboardState(partial: Partial<State>) {
        Object.assign(this.state, partial);
        this.setState(partial as any);
    }

    @bind
    private sendChar(char: string) {
        const { ctrlActive, shiftActive } = this.state;
        let data = char;

        if (shiftActive) {
            if (SHIFT_MAP[char]) {
                data = SHIFT_MAP[char];
            } else {
                data = char.toUpperCase();
            }
            this.updateKeyboardState({ shiftActive: false });
        }

        if (ctrlActive) {
            const charCode = data.toLowerCase().charCodeAt(0);
            if (charCode >= 97 && charCode <= 122) {
                data = String.fromCharCode(charCode - 96);
            } else if (data === ' ' || data === '@') {
                data = '\x00';
            } else if (data === '[') {
                data = '\x1b';
            } else if (data === '\\') {
                data = '\x1c';
            } else if (data === ']') {
                data = '\x1d';
            } else if (data === '^') {
                data = '\x1e';
            } else if (data === '_') {
                data = '\x1f';
            } else if (data === '?') {
                data = '\x7f';
            }
            this.updateKeyboardState({ ctrlActive: false });
        }
        this.props.onKeyPress(data);
    }

    @bind
    private handleSpecial(action: string, e?: PointerEvent) {
        e?.preventDefault();
        vibrate(15);
        if (this.activePopup) {
            this.activePopup = null;
            this.updateKeyboardState({ activePopup: null });
        }

        switch (action) {
            case 'ESC':
                this.updateKeyboardState({ ctrlActive: false, shiftActive: false });
                this.props.onKeyPress('\x1b');
                break;
            case 'BACKSPACE':
                this.props.onKeyPress('\x7f');
                break;
            case 'ENTER':
                this.props.onKeyPress('\r');
                break;
            case 'SPACE':
                this.sendChar(' ');
                break;
            case 'CTRL':
                this.updateKeyboardState({ ctrlActive: !this.state.ctrlActive });
                break;
            case 'SHIFT':
                this.updateKeyboardState({ shiftActive: !this.state.shiftActive });
                break;
            case 'MODE_SYMBOLS':
                this.activePopup = null;
                this.pressedKeys = {};
                this.updateKeyboardState({ mode: 'symbols', activePopup: null, pressedKeys: {}, ctrlActive: false });
                break;
            case 'MODE_QWERTY':
                this.activePopup = null;
                this.pressedKeys = {};
                this.updateKeyboardState({ mode: 'qwerty', activePopup: null, pressedKeys: {}, ctrlActive: false });
                break;
            case 'HIDE':
                this.props.onClose();
                break;
            case 'TAB':
                if (this.state.shiftActive) {
                    this.updateKeyboardState({ shiftActive: false });
                    this.props.onKeyPress('\x1b[Z');
                } else {
                    this.props.onKeyPress('\t');
                }
                break;
            case 'LEFT':
                if (this.state.shiftActive) {
                    this.updateKeyboardState({ shiftActive: false });
                    this.props.onKeyPress('\x1b[1;2D');
                } else {
                    this.props.onKeyPress('\x1b[D');
                }
                break;
            case 'UP':
                if (this.state.shiftActive) {
                    this.updateKeyboardState({ shiftActive: false });
                    this.props.onKeyPress('\x1b[1;2A');
                } else {
                    this.props.onKeyPress('\x1b[A');
                }
                break;
            case 'DOWN':
                if (this.state.shiftActive) {
                    this.updateKeyboardState({ shiftActive: false });
                    this.props.onKeyPress('\x1b[1;2B');
                } else {
                    this.props.onKeyPress('\x1b[B');
                }
                break;
            case 'RIGHT':
                if (this.state.shiftActive) {
                    this.updateKeyboardState({ shiftActive: false });
                    this.props.onKeyPress('\x1b[1;2C');
                } else {
                    this.props.onKeyPress('\x1b[C');
                }
                break;
            case 'HOME':
                if (this.state.shiftActive) {
                    this.updateKeyboardState({ shiftActive: false });
                    this.props.onKeyPress('\x1b[1;2H');
                } else {
                    this.props.onKeyPress('\x1b[H');
                }
                break;
            case 'END':
                if (this.state.shiftActive) {
                    this.updateKeyboardState({ shiftActive: false });
                    this.props.onKeyPress('\x1b[1;2F');
                } else {
                    this.props.onKeyPress('\x1b[F');
                }
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
        }
    }

    @bind
    private handleBackspacePointerDown(e: PointerEvent) {
        e.preventDefault();
        this.handleSpecial('BACKSPACE');

        this.clearBackspaceTimers();
        this.backspaceTimer = window.setTimeout(() => {
            this.backspaceInterval = window.setInterval(() => {
                vibrate(10);
                this.handleSpecial('BACKSPACE');
            }, 80);
        }, 400);
    }

    @bind
    private clearBackspaceTimers() {
        if (this.backspaceTimer !== null) {
            clearTimeout(this.backspaceTimer);
            this.backspaceTimer = null;
        }
        if (this.backspaceInterval !== null) {
            clearInterval(this.backspaceInterval);
            this.backspaceInterval = null;
        }
    }

    @bind
    private handleLetterPointerDown(e: PointerEvent, keyDef: KeyDef) {
        e.preventDefault();
        vibrate(15);

        if (document.activeElement && document.activeElement instanceof HTMLElement) {
            document.activeElement.blur();
        }
        if (window.getSelection) {
            window.getSelection()?.removeAllRanges();
        }

        const pointerId = e.pointerId;
        const target = e.currentTarget as HTMLElement;

        try {
            target.setPointerCapture(pointerId);
        } catch {
            // ignore
        }

        const timer = (keyDef.fnSeq || keyDef.sym) ? window.setTimeout(() => {
            const ptr = this.activePointers.get(pointerId);
            if (!ptr) return;
            ptr.longPressFired = true;
            ptr.longPressTimer = null;
            vibrate(25);

            const keyRect = target.getBoundingClientRect();
            const containerRect = this.containerRef?.getBoundingClientRect() || {
                left: 0,
                top: 0,
                width: window.innerWidth,
            };

            const keyCenterX = keyRect.left + keyRect.width / 2 - containerRect.left;
            const keyTop = keyRect.top - containerRect.top;

            let candidates: PopupCandidate[] = [];
            let defaultIndex = 1;

            if (keyDef.fnLabel && keyDef.fnSeq) {
                candidates = [
                    { id: 'char', label: keyDef.key, value: keyDef.key, isFn: false },
                    { id: 'fn', label: keyDef.fnLabel, value: keyDef.fnSeq, isFn: true },
                ];
                defaultIndex = 1;
            } else if (keyDef.upper && keyDef.sym) {
                candidates = [
                    { id: 'upper', label: keyDef.upper, value: keyDef.upper, isFn: false },
                    { id: 'symbol', label: keyDef.sym, value: keyDef.sym, isFn: false },
                    { id: 'lower', label: keyDef.key, value: keyDef.key, isFn: false },
                ];
                defaultIndex = 1;
            } else {
                return;
            }

            const isLandscape = window.innerHeight <= 500;
            const isTwoItem = candidates.length === 2;
            const popupWidth = isTwoItem ? (isLandscape ? 84 : 96) : (isLandscape ? 116 : 140);
            const popupHeight = isLandscape ? 40 : 48;

            let desiredLeft = keyCenterX - popupWidth / 2;
            if (isTwoItem) {
                desiredLeft = keyCenterX - popupWidth * 0.72;
            }
            const clampedLeft = Math.max(8, Math.min(desiredLeft, containerRect.width - popupWidth - 8));
            const top = keyTop - popupHeight - 4;

            this.activePopup = {
                pointerId,
                candidates,
                selectedIndex: defaultIndex,
                left: clampedLeft,
                top,
            };

            this.updateKeyboardState({ activePopup: this.activePopup });
        }, 300) : null;

        this.activePointers.set(pointerId, {
            pointerId,
            startX: e.clientX,
            startY: e.clientY,
            target,
            keyDef,
            longPressTimer: timer,
            longPressFired: false,
            dragCancelled: false,
        });

        this.pressedKeys[keyDef.key] = true;
        this.updateKeyboardState({
            pressedKeys: { ...this.pressedKeys },
        });
    }

    @bind
    private handleLetterPointerMove(e: PointerEvent) {
        const ptr = this.activePointers.get(e.pointerId);
        if (!ptr) return;

        const deltaX = e.clientX - ptr.startX;
        const deltaY = e.clientY - ptr.startY;

        if (!ptr.longPressFired) {
            if (Math.hypot(deltaX, deltaY) > 20) {
                if (ptr.longPressTimer !== null) {
                    clearTimeout(ptr.longPressTimer);
                    ptr.longPressTimer = null;
                }
                ptr.dragCancelled = true;
                if (this.pressedKeys[ptr.keyDef.key]) {
                    delete this.pressedKeys[ptr.keyDef.key];
                    this.updateKeyboardState({ pressedKeys: { ...this.pressedKeys } });
                }
            }
            return;
        }

        const activePopup = this.activePopup;
        if (activePopup && activePopup.pointerId === e.pointerId) {
            if (deltaY < -90 || deltaY > 60) {
                if (activePopup.selectedIndex !== null) {
                    activePopup.selectedIndex = null;
                    this.updateKeyboardState({
                        activePopup: { ...activePopup },
                    });
                }
                return;
            }

            let selectedIndex: number | null = 1;
            if (activePopup.candidates.length === 2) {
                if (deltaX < -15) {
                    selectedIndex = 0;
                } else {
                    selectedIndex = 1;
                }
            } else if (activePopup.candidates.length === 3) {
                if (deltaX < -18) {
                    selectedIndex = 0;
                } else if (deltaX > 18) {
                    selectedIndex = 2;
                } else {
                    selectedIndex = 1;
                }
            }

            if (selectedIndex !== activePopup.selectedIndex) {
                vibrate(10);
                activePopup.selectedIndex = selectedIndex;
                this.updateKeyboardState({
                    activePopup: { ...activePopup },
                });
            }
        }
    }

    @bind
    private handleLetterPointerUp(e: PointerEvent) {
        const ptr = this.activePointers.get(e.pointerId);
        if (!ptr) return;

        if (ptr.longPressTimer !== null) {
            clearTimeout(ptr.longPressTimer);
            ptr.longPressTimer = null;
        }

        try {
            if (ptr.target.hasPointerCapture(e.pointerId)) {
                ptr.target.releasePointerCapture(e.pointerId);
            }
        } catch {
            // ignore
        }

        const { keyDef, longPressFired, dragCancelled } = ptr;
        const activePopup = this.activePopup;

        if (!longPressFired) {
            if (!dragCancelled) {
                this.sendChar(keyDef.key);
            }
        } else if (activePopup && activePopup.pointerId === e.pointerId) {
            if (activePopup.selectedIndex !== null) {
                const cand = activePopup.candidates[activePopup.selectedIndex];
                if (cand) {
                    if (cand.isFn) {
                        this.props.onKeyPress(cand.value);
                    } else {
                        this.sendChar(cand.value);
                    }
                    vibrate(15);
                }
            }
        }

        this.activePointers.delete(e.pointerId);
        delete this.pressedKeys[keyDef.key];
        if (this.activePopup?.pointerId === e.pointerId) {
            this.activePopup = null;
        }

        this.updateKeyboardState({
            pressedKeys: { ...this.pressedKeys },
            activePopup: this.activePopup,
        });
    }

    @bind
    private handleLetterPointerCancel(e: PointerEvent) {
        const ptr = this.activePointers.get(e.pointerId);
        if (!ptr) return;

        if (ptr.longPressTimer !== null) {
            clearTimeout(ptr.longPressTimer);
            ptr.longPressTimer = null;
        }

        try {
            if (ptr.target.hasPointerCapture(e.pointerId)) {
                ptr.target.releasePointerCapture(e.pointerId);
            }
        } catch {
            // ignore
        }

        this.activePointers.delete(e.pointerId);
        delete this.pressedKeys[ptr.keyDef.key];
        if (this.activePopup?.pointerId === e.pointerId) {
            this.activePopup = null;
        }

        this.updateKeyboardState({
            pressedKeys: { ...this.pressedKeys },
            activePopup: this.activePopup,
        });
    }

    @bind
    private selectCandidate(cand: PopupCandidate) {
        vibrate(15);
        if (cand.isFn) {
            this.props.onKeyPress(cand.value);
        } else {
            this.sendChar(cand.value);
        }
        this.activePopup = null;
        this.updateKeyboardState({ activePopup: null });
    }

    @bind
    private renderKey(keyDef: KeyDef) {
        const isPressed = !!this.state.pressedKeys[keyDef.key];
        const subLabel = keyDef.fnLabel || keyDef.sym;
        return (
            <button
                key={keyDef.key}
                aria-label={`Key ${keyDef.key}`}
                className={`kbd-key key-letter ${isPressed ? 'pressed' : ''}`}
                onPointerDown={e => this.handleLetterPointerDown(e, keyDef)}
                onPointerMove={this.handleLetterPointerMove}
                onPointerUp={this.handleLetterPointerUp}
                onPointerCancel={this.handleLetterPointerCancel}
            >
                <div className="key-char-box">
                    {subLabel && <span className="key-sub-label">{subLabel}</span>}
                    <span className="key-main-label">{keyDef.key}</span>
                </div>
            </button>
        );
    }

    render() {
        const { mode, ctrlActive, shiftActive, activePopup } = this.state;

        return (
            <div
                className="virtual-keyboard-container"
                ref={c => (this.containerRef = c as HTMLDivElement)}
                onContextMenu={this.preventContextMenu}
                onSelectStart={e => e.preventDefault()}
                onTouchStart={this.handleContainerTouchStart}
                onTouchMove={e => e.stopPropagation()}
                onTouchEnd={e => e.stopPropagation()}
            >
                {activePopup && (
                    <div
                        className="key-popup"
                        style={{
                            left: `${activePopup.left}px`,
                            top: `${activePopup.top}px`,
                        }}
                    >
                        {activePopup.candidates.map((cand, idx) => (
                            <div
                                key={cand.id}
                                className={`popup-item ${activePopup.selectedIndex === idx ? 'selected' : ''}`}
                                onPointerDown={e => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    this.selectCandidate(cand);
                                }}
                            >
                                {cand.label}
                            </div>
                        ))}
                    </div>
                )}

                <div className="keyboard-body">
                    {mode === 'qwerty' ? (
                        <div className="layout-qwerty">
                            {/* Row 1: q w e r t y u i o p */}
                            <div className="kbd-row">
                                {QWERTY_ROW_1.map(keyDef => this.renderKey(keyDef))}
                            </div>

                            {/* Row 2: a s d f g h j k l */}
                            <div className="kbd-row">
                                {QWERTY_ROW_2.map(keyDef => this.renderKey(keyDef))}
                            </div>

                            {/* Row 3: ESC z x c v b n m BKSP */}
                            <div className="kbd-row">
                                <button
                                    aria-label="Escape"
                                    className="kbd-key key-fn key-esc"
                                    onPointerDown={e => this.handleSpecial('ESC', e)}
                                >
                                    ESC
                                </button>
                                {QWERTY_ROW_3.map(keyDef => this.renderKey(keyDef))}
                                <button
                                    aria-label="Backspace"
                                    className="kbd-key key-fn key-backspace"
                                    onPointerDown={this.handleBackspacePointerDown}
                                    onPointerUp={this.clearBackspaceTimers}
                                    onPointerLeave={this.clearBackspaceTimers}
                                    onPointerCancel={this.clearBackspaceTimers}
                                >
                                    <BackspaceIcon />
                                </button>
                            </div>

                            {/* Row 4: Hide 123 , Space . Ctrl Enter */}
                            <div className="kbd-row">
                                <button
                                    aria-label="Hide keyboard"
                                    className="kbd-key key-fn key-hide"
                                    onPointerDown={e => this.handleSpecial('HIDE', e)}
                                >
                                    <HideIcon />
                                </button>
                                <button
                                    aria-label="Switch to symbols"
                                    className="kbd-key key-fn key-mode"
                                    onPointerDown={e => this.handleSpecial('MODE_SYMBOLS', e)}
                                >
                                    123
                                </button>
                                <button
                                    aria-label="Comma"
                                    className="kbd-key key-char"
                                    onPointerDown={e => {
                                        e.preventDefault();
                                        vibrate(15);
                                        this.sendChar(',');
                                    }}
                                >
                                    ,
                                </button>
                                <button
                                    aria-label="Space"
                                    className="kbd-key key-space"
                                    onPointerDown={e => this.handleSpecial('SPACE', e)}
                                >
                                    <span className="key-space-bar" />
                                </button>
                                <button
                                    aria-label="Period"
                                    className="kbd-key key-char"
                                    onPointerDown={e => {
                                        e.preventDefault();
                                        vibrate(15);
                                        this.sendChar('.');
                                    }}
                                >
                                    .
                                </button>
                                <button
                                    aria-label="Control"
                                    className={`kbd-key key-fn key-ctrl ${ctrlActive ? 'active' : ''}`}
                                    onPointerDown={e => this.handleSpecial('CTRL', e)}
                                >
                                    Ctrl
                                </button>
                                <button
                                    aria-label="Enter"
                                    className="kbd-key key-fn key-enter"
                                    onPointerDown={e => this.handleSpecial('ENTER', e)}
                                >
                                    <EnterIcon />
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="layout-symbols">
                            {/* Row 1: Numbers 1-0 with F1-F10 hold selection */}
                            <div className="kbd-row">
                                {SYMBOLS_NUM_ROW.map(keyDef => this.renderKey(keyDef))}
                            </div>

                            {/* Row 2: Non-duplicate symbols + = [ ] { } < > and \ (F11), | (F12) */}
                            <div className="kbd-row">
                                {SYMBOLS_ROW_2.map(item => {
                                    if (typeof item === 'string') {
                                        return (
                                            <button
                                                key={item}
                                                aria-label={`Symbol ${item}`}
                                                className="kbd-key key-char"
                                                onPointerDown={e => {
                                                    e.preventDefault();
                                                    vibrate(15);
                                                    this.sendChar(item);
                                                }}
                                            >
                                                {item}
                                            </button>
                                        );
                                    }
                                    return this.renderKey(item);
                                })}
                            </div>

                            {/* Row 3: Remaining symbols & wide Navigation keys: $ ^ " ` and ▲ Home End PgUp */}
                            <div className="kbd-row kbd-row-symbols-3">
                                {['$', '^', '"', '`'].map(sym => (
                                    <button
                                        key={sym}
                                        aria-label={`Symbol ${sym}`}
                                        className="kbd-key key-char key-symbol"
                                        onPointerDown={e => {
                                            e.preventDefault();
                                            vibrate(15);
                                            this.sendChar(sym);
                                        }}
                                    >
                                        {sym}
                                    </button>
                                ))}
                                <button
                                    aria-label="Up arrow"
                                    className="kbd-key key-arrow key-up"
                                    onPointerDown={e => this.handleSpecial('UP', e)}
                                >
                                    ▲
                                </button>
                                <button
                                    aria-label="Home"
                                    className="kbd-key key-fn key-nav"
                                    onPointerDown={e => this.handleSpecial('HOME', e)}
                                >
                                    Home
                                </button>
                                <button
                                    aria-label="End"
                                    className="kbd-key key-fn key-nav"
                                    onPointerDown={e => this.handleSpecial('END', e)}
                                >
                                    End
                                </button>
                                <button
                                    aria-label="Page Up"
                                    className="kbd-key key-fn key-nav"
                                    onPointerDown={e => this.handleSpecial('PGUP', e)}
                                >
                                    PgUp
                                </button>
                            </div>

                            {/* Row 4: Wide Navigation & Arrow keys: Tab ◀ ▶ Backspace PgDn */}
                            <div className="kbd-row kbd-row-arrows">
                                <button
                                    aria-label="Tab"
                                    className="kbd-key key-fn key-tab"
                                    onPointerDown={e => this.handleSpecial('TAB', e)}
                                >
                                    Tab
                                </button>
                                <button
                                    aria-label="Left arrow"
                                    className="kbd-key key-arrow"
                                    onPointerDown={e => this.handleSpecial('LEFT', e)}
                                >
                                    ◀
                                </button>
                                <button
                                    aria-label="Right arrow"
                                    className="kbd-key key-arrow"
                                    onPointerDown={e => this.handleSpecial('RIGHT', e)}
                                >
                                    ▶
                                </button>
                                <button
                                    aria-label="Backspace"
                                    className="kbd-key key-fn key-backspace"
                                    onPointerDown={this.handleBackspacePointerDown}
                                    onPointerUp={this.clearBackspaceTimers}
                                    onPointerLeave={this.clearBackspaceTimers}
                                    onPointerCancel={this.clearBackspaceTimers}
                                >
                                    <BackspaceIcon />
                                </button>
                                <button
                                    aria-label="Page Down"
                                    className="kbd-key key-fn key-nav key-pgdn"
                                    onPointerDown={e => this.handleSpecial('PGDN', e)}
                                >
                                    PgDn
                                </button>
                            </div>

                            {/* Row 5: Hide ABC Shift ▼ Space Del Enter */}
                            <div className="kbd-row">
                                <button
                                    aria-label="Hide keyboard"
                                    className="kbd-key key-fn key-hide"
                                    onPointerDown={e => this.handleSpecial('HIDE', e)}
                                >
                                    <HideIcon />
                                </button>
                                <button
                                    aria-label="Switch to letters"
                                    className="kbd-key key-fn key-mode"
                                    onPointerDown={e => this.handleSpecial('MODE_QWERTY', e)}
                                >
                                    ABC
                                </button>
                                <button
                                    aria-label="Shift"
                                    className={`kbd-key key-fn key-shift ${shiftActive ? 'active' : ''}`}
                                    onPointerDown={e => this.handleSpecial('SHIFT', e)}
                                >
                                    Shift
                                </button>
                                <button
                                    aria-label="Down arrow"
                                    className="kbd-key key-arrow key-down-arrow"
                                    onPointerDown={e => this.handleSpecial('DOWN', e)}
                                >
                                    ▼
                                </button>
                                <button
                                    aria-label="Space"
                                    className="kbd-key key-space"
                                    onPointerDown={e => this.handleSpecial('SPACE', e)}
                                >
                                    <span className="key-space-bar" />
                                </button>
                                <button
                                    aria-label="Delete"
                                    className="kbd-key key-fn key-del"
                                    onPointerDown={e => this.handleSpecial('DEL', e)}
                                >
                                    Del
                                </button>
                                <button
                                    aria-label="Enter"
                                    className="kbd-key key-fn key-enter"
                                    onPointerDown={e => this.handleSpecial('ENTER', e)}
                                >
                                    <EnterIcon />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        );
    }
}
