# ttyd Mobile-Friendly Plan

**Branch:** `feature/ip-rate-limiting`
**Date:** 2026-08-10
**Scope:** Make ttyd fully usable on mobile phones and tablets (iOS, Android, iPadOS)

---

## Current State

| Area | Status | Notes |
|---|---|---|
| Viewport meta tag | ❌ Missing | No `<meta name="viewport">` — browser uses desktop layout width (~980px), content is tiny and zoomable |
| Zoom prevention | ❌ Missing | Double-tap and pinch-to-zoom interfere with terminal interaction |
| Font size on mobile | ❌ Too small | Default `fontSize: 13` is unreadable on phones; no mobile-specific adjustment |
| Terminal columns | ❌ Too many | FitAddon fits to pixel width, yielding ~120 cols on a phone in landscape — bash wraps awkwardly |
| Virtual keyboard | ✅ Exists | Custom keyboard component already in place; needs height refinements |
| Safe area insets | ⚠️ Partial | `safe-area-inset-bottom` on keyboard only; top notch/dynamic island not handled |
| Orientation change | ❌ Not handled | No listener for `orientationchange`; terminal doesn't refit |
| Touch scrollback | ⚠️ Default | xterm.js has basic touch scroll; could be smoother |
| Landscape usability | ❌ Not handled | Virtual keyboard takes >50% of screen in landscape |

---

## Plan — Ordered by Priority

### Phase 1: Core Viewport & Zoom Lock (P0)

#### 1.1 Add viewport meta tag to `html/src/template.html`

```html
<meta name="viewport"
      content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">
```

**What this does:**
- `width=device-width` — sets layout width to the actual screen width (e.g., 390px on iPhone 15) instead of the desktop default (~980px)
- `initial-scale=1.0, maximum-scale=1.0, user-scalable=no` — prevents pinch-to-zoom and double-tap zoom, which interfere with terminal touch interaction
- `viewport-fit=cover` — extends content into notch/dynamic island safe areas (needed for `env(safe-area-inset-*)` CSS to work)

**File:** `html/src/template.html`

#### 1.2 Prevent iOS double-tap zoom via CSS

In `html/src/style/index.scss`:

```scss
html, body {
  touch-action: manipulation;  // disables double-tap zoom, keeps pinch scroll
  -webkit-text-size-adjust: 100%;  // prevent iOS text size inflation
  text-size-adjust: 100%;
}
```

#### 1.3 Prevent touch-move bounce/overscroll

```scss
html, body {
  overscroll-behavior: none;
  -webkit-overflow-scrolling: touch;
  position: fixed;  // prevent iOS rubber-band bounce
  width: 100%;
}
```

---

### Phase 2: Mobile Font Size & Column Fitting (P0)

#### 2.1 Detect mobile and apply larger font size

In `html/src/components/terminal/index.tsx` — during `componentDidMount`, before `xterm.open()`:

```typescript
const isMobile = /* existing detection */;
if (isMobile) {
    // Use a larger font for readability on small screens
    this.xterm.terminal.options.fontSize = Math.max(16, this.xterm.terminal.options.fontSize);
}
```

**Rationale:** At `fontSize: 16` on an iPhone 15 (390px wide), FitAddon calculates ~40 columns, which is a comfortable width for bash. At `fontSize: 13`, you get ~50 columns — still OK but squinting-level small.

#### 2.2 Expose a `mobileFontSize` client option

Add to `ClientOptions` interface in `xterm/index.ts`:

```typescript
mobileFontSize: number;  // default: 16
```

Then in `applyPreferences`:

```typescript
case 'mobileFontSize':
    if (isMobile && value > 0) {
        terminal.options.fontSize = value;
        fitAddon.fit();
    }
    break;
```

**Usage:** `ttyd -t mobileFontSize=18 bash` — users can tune to their preference.

#### 2.3 Minimum columns floor

After `fitAddon.fit()`, check if columns fell below a usable threshold and adjust:

```typescript
// In the fit() wrapper or after fit calls:
if (terminal.cols < 40) {
    terminal.options.fontSize = Math.max(10, terminal.options.fontSize - 1);
    fitAddon.fit();
}
```

This prevents pathologically narrow terminals (e.g., 20 columns in portrait with large font).

---

### Phase 3: Orientation & Resize Handling (P1)

#### 3.1 Listen for orientation changes

In `componentDidMount`:

```typescript
// Refit terminal on orientation change (with debounce for iOS animation)
const orientationHandler = () => {
    setTimeout(() => {
        this.xterm.fit();
    }, 300);  // iOS orientation animation takes ~250ms
};
window.addEventListener('orientationchange', orientationHandler);
// Also handle the newer API:
screen.orientation?.addEventListener('change', orientationHandler);
```

#### 3.2 Collapse virtual keyboard in landscape

When screen height < 400px (landscape phone), auto-collapse the keyboard:

```typescript
const isLandscapePhone = window.innerHeight < 400;
if (isLandscapePhone && this.state.showKeyboard) {
    // Auto-switch to collapsed header-only mode
}
```

#### 3.3 Visual viewport resize listener (for native keyboard appearance)

The `VisualViewport` API accurately reports available space when the native keyboard appears:

```typescript
if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', () => {
        this.xterm.fit();
    });
}
```

---

### Phase 4: CSS & Layout Hardening (P1)

#### 4.1 Safe area insets everywhere

In `html/src/style/index.scss`:

```scss
#terminal-container {
  padding: env(safe-area-inset-top, 0) env(safe-area-inset-right, 0) 0 env(safe-area-inset-left, 0);
}
```

This prevents the terminal from rendering under the notch/dynamic island in landscape.

#### 4.2 Use CSS variable for keyboard height instead of magic numbers

In `keyboard.scss`, define:

```scss
:root {
  --kbd-header-height: 44px;
  --kbd-body-height: calc(5 * 44px + 4 * 6px);  // 5 rows × 44px + 4 gaps × 6px = 244px
  --kbd-total-height: calc(var(--kbd-header-height) + var(--kbd-body-height) + 20px);  // + padding
  --kbd-collapsed-height: calc(var(--kbd-header-height) + 20px);
}
```

In `terminal/index.tsx`, replace the hardcoded `270px` and `54px`:

```typescript
style={
    showKeyboard
        ? { height: nativeKeyboardActive
            ? 'calc(100% - var(--kbd-collapsed-height))'
            : 'calc(100% - var(--kbd-total-height))' }
        : {}
}
```

#### 4.3 Smaller keyboard rows in landscape

```scss
@media (max-height: 500px) {
  .kbd-key {
    height: 32px;
    font-size: 12px;
  }
  .layout-terminal, .layout-qwerty {
    gap: 3px;
  }
}
```

---

### Phase 5: Touch UX Improvements (P2)

#### 5.1 Tap-to-focus terminal

On mobile, tapping the terminal area should focus the hidden textarea (and show the virtual keyboard):

```typescript
this.container.addEventListener('touchstart', (e) => {
    const textarea = this.container.querySelector('.xterm-helper-textarea');
    if (textarea) textarea.focus();
}, { passive: true });
```

#### 5.2 Long-press for paste

Intercept long-press on the terminal to trigger paste from clipboard:

```typescript
let pressTimer: number;
this.container.addEventListener('touchstart', () => {
    pressTimer = window.setTimeout(async () => {
        const text = await navigator.clipboard.readText();
        if (text) this.xterm.sendData(text);
    }, 600);
});
this.container.addEventListener('touchend', () => clearTimeout(pressTimer));
this.container.addEventListener('touchmove', () => clearTimeout(pressTimer));
```

#### 5.3 Swipe gestures (optional, low priority)

- **Swipe up from bottom edge** → show virtual keyboard
- **Swipe down on keyboard header** → collapse keyboard

---

### Phase 6: Server-side COLUMNS Hint (P2)

#### 6.1 New `-C / --columns` option

Add a CLI option to override the initial terminal columns:

```
-C, --columns <cols>   Set initial terminal columns (default: auto-fit)
```

When set, the server sends it as a client preference `columns=N` and the frontend calls:

```typescript
terminal.resize(cols, terminal.rows);
```

**Use case:** `ttyd -C 80 bash` — force 80-column layout regardless of screen width. This is useful for scripts/TUI apps that assume 80 columns.

#### 6.2 COLUMNS environment variable

In `build_env()` in `protocol.c`, if the server has a `--columns` option, inject:

```c
snprintf(envp[i], 36, "COLUMNS=%d", server->columns);
```

This tells bash/readline the correct width from the start, before the first resize event arrives.

---

### Phase 7: Documentation (P2)

#### 7.1 Update man page and README

Add a **Mobile Usage** section:

```markdown
## Mobile Usage

ttyd includes a built-in virtual keyboard for mobile devices with terminal-specific
keys (Ctrl, Alt, Esc, arrows, function keys, Ctrl+C/D shortcuts).

For optimal mobile experience:
- Use `-t mobileFontSize=18` to increase font size on small screens
- Use `-C 80` to force 80-column width for TUI applications
- The virtual keyboard appears automatically when the terminal is tapped
- Tap "Show Mobile KB (IME)" to use the native keyboard for IME input (CJK, etc.)
```

---

## File Change Summary

| File | Changes |
|---|---|
| `html/src/template.html` | Add viewport meta tag |
| `html/src/style/index.scss` | Touch-action, overscroll, safe-area insets |
| `html/src/components/terminal/index.tsx` | Mobile font size, orientation handler, visual viewport listener, tap-to-focus |
| `html/src/components/keyboard/keyboard.scss` | CSS variables for height, landscape media query |
| `html/src/components/keyboard/index.tsx` | Landscape auto-collapse, swipe gestures |
| `html/src/components/terminal/xterm/index.ts` | `mobileFontSize` client option, columns floor |
| `src/server.c` | (Optional) `-C / --columns` CLI option |
| `src/server.h` | (Optional) `int columns` field |
| `src/protocol.c` | (Optional) COLUMNS env injection |
| `man/ttyd.man.md` | Mobile usage docs |
| `README.md` | Mobile usage docs |

---

## Implementation Order

```
Phase 1 (viewport + zoom lock)     ~30 min   ← biggest visual impact
Phase 2 (font size + columns)      ~30 min   ← makes it actually usable
Phase 3 (orientation + resize)     ~20 min
Phase 4 (CSS hardening)            ~20 min
Phase 5 (touch UX)                 ~30 min
Phase 6 (server-side columns)      ~30 min   ← optional
Phase 7 (docs)                     ~10 min
```

Total estimated effort: **~3 hours**
