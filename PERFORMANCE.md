# Windroid OS — Performance Baseline & Architectural Guidelines

## Performance Target & Hardware Baseline

- **Environment**: Web Browser Prototype Target (React 19 + Vite + Tailwind CSS)
- **Target Hardware Specifications**:
  - **CPU**: Intel Core i3 10th Gen
  - **RAM**: 8 GB RAM
  - **Graphics**: Integrated Graphics
  - **Storage**: 128 GB SSD

---

## Mandatory Performance Rules

1. **No Infinite Render Loops**: Never trigger state updates during render or within `useEffect` hooks without strict equality guards or primitive dependency arrays.
2. **No Recursive Event Dispatch**: Custom DOM events (`windroid-clear-launch-overlay`, `windroid-cancel-desktop-drag`, `windroid-fs-changed`, etc.) must never be re-dispatched from within their own event listener callbacks.
3. **No Repeated `localStorage` Writes**: Batch sync operations and prevent rapid file/state writes during system idle or component mounting.
4. **No Duplicate Filesystem Notifications**: Emit filesystem change events (`windroid-fs-changed`) only on actual mutation, not on render or read operations.
5. **No Repeated DOM Measurements**: Avoid calling `getBoundingClientRect()` or scroll calculations inside high-frequency animation frame or layout loops without throttling/debouncing.
6. **No State Updates During Render**: All side-effects and state updates must occur within explicit event handlers or properly guarded `useEffect` hooks.
7. **Complete Listener & Timer Cleanup**: Every `addEventListener`, `setInterval`, `setTimeout`, or `requestAnimationFrame` MUST return a corresponding cleanup function in its `useEffect` teardown.
8. **Stable Callbacks**: Use `useCallback` and `useMemo` for handler functions passed across window management and system context layers.
9. **Memoized Derived State**: Derive window states, active counts, and filtering logic using `useMemo` rather than maintaining redundant synchronized state.
10. **Single Source of Truth**: Maintain standard authoritative states for windows, running apps, and desktop items in `OSContext`.
11. **No Duplicate Windows**: Enforce stable `appId` and `windowId` checks in `createWindow` and `openApp` to focus existing single-instance app windows rather than spawning redundant instances.
12. **No Duplicate Dialogs, Notifications, or FS Nodes**: Deduplicate notifications and system dialog requests before inserting into state collections.

---

## Verification Criteria for Future Features

Every future feature or bug fix must pass the following validation sequence before acceptance:

- [ ] **Build Verification**: `npm run build` / `compile_applet` passes cleanly without errors.
- [ ] **TypeScript Check**: `tsc --noEmit` / `lint_applet` passes without type errors or missing declarations.
- [ ] **2-Minute Idle Test**: Desktop remains idling for 2 minutes without CPU spikes, memory growth, or background timer leaks.
- [ ] **10 App Open/Close Cycles**: Repeatedly launching and closing system applications (Settings, Files, Browser, Terminal, Music, etc.) 10+ times results in exactly 1 window per launch.
- [ ] **Browser Responsiveness**: UI remains at 60fps with sub-10ms input response latency.
- [ ] **CPU Settling**: CPU utilization returns to near 0% within 500ms after window minimize/maximize/open/close operations.
- [ ] **Memory Stability**: Heap allocation remains stable without runaway retention or leaks after opening and closing windows.
