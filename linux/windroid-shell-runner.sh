#!/usr/bin/env bash
# Windroid OS Desktop Shell Watchdog Runner
# Production-Grade Boot-Chain Implementation (Phase 2B Hardened)
# Automatically manages and routes Windroid Shell sessions with strict fail-closed guarantees.

export DISPLAY="${DISPLAY:-:0}"

SHELL_LOG="/tmp/windroid-shell.log"
HTTP_LOG="/tmp/windroid-http.log"
CHROMIUM_LOG="/tmp/windroid-chromium.log"
BRIDGE_LOG="/tmp/windroid-bridge.log"

echo "[Windroid OS] Initializing Desktop Shell Watchdog at $(date)" > "$SHELL_LOG"

# ------------------------------------------------------------------------------
# Single-Instance Lock & Guard
# ------------------------------------------------------------------------------
LOCK_FILE="/tmp/windroid-shell-runner.lock"
exec 200>"$LOCK_FILE"
if ! flock -n 200; then
    echo "[Windroid OS] Another instance of windroid-shell-runner.sh is already running (PID $(cat "$LOCK_FILE" 2>/dev/null || echo 'unknown')). Exiting duplicate instance." >> "$SHELL_LOG"
    exit 0
fi
echo "$$" > "$LOCK_FILE"

HTTP_PID=""

cleanup() {
    echo "[Windroid OS] Runner shutting down, performing cleanup..." >> "$SHELL_LOG"
    if [ -n "$HTTP_PID" ] && kill -0 "$HTTP_PID" 2>/dev/null; then
        echo "[Windroid OS] Terminating HTTP server (PID $HTTP_PID)..." >> "$SHELL_LOG"
        kill "$HTTP_PID" 2>/dev/null || true
        wait "$HTTP_PID" 2>/dev/null || true
    fi
    rm -f "$LOCK_FILE" 2>/dev/null || true
}

trap cleanup EXIT INT TERM

while true; do
    # 1. Authoritative runtime environment detection
    CMDLINE=$(cat /proc/cmdline 2>/dev/null || echo "")
    IS_LIVE=0
    if [ -d "/run/live" ] || [ -d "/run/live/medium" ] || [ -d "/cdrom" ] || echo "$CMDLINE" | grep -q "boot=live" || echo "$CMDLINE" | grep -q "live-media"; then
        IS_LIVE=1
    fi

    RUNTIME_MODE="installed"
    if [ "$IS_LIVE" -eq 1 ]; then
        RUNTIME_MODE="live"
    elif [ -f "/etc/windroid/runtime-mode" ]; then
        RUNTIME_MODE=$(cat /etc/windroid/runtime-mode | tr -d ' \n\r')
    fi

    # 2. Authoritative Native State Evaluation via windroid_state
    STATE_EVAL=$(python3 -c "
import sys, os
for d in ['/usr/lib/windroid', '/usr/bin', os.path.dirname(os.path.abspath('$0')), '/linux']:
    if os.path.exists(d) and d not in sys.path:
        sys.path.insert(0, d)
try:
    import windroid_state
    state, user, ok = windroid_state.eval_shell_state()
    print(f'{state}|{user}|{ok}')
except Exception as e:
    print('ERROR|none|no')
" 2>/dev/null || echo "ERROR|none|no")

    NATIVE_STATE=$(echo "$STATE_EVAL" | cut -d'|' -f1)
    NATIVE_USER=$(echo "$STATE_EVAL" | cut -d'|' -f2)
    USER_EXISTS=$(echo "$STATE_EVAL" | cut -d'|' -f3)

    echo "[Windroid OS] Runtime Mode: $RUNTIME_MODE | Evaluated State: $NATIVE_STATE | User: $NATIVE_USER (Exists: $USER_EXISTS)" >> "$SHELL_LOG"

    # 3. Deterministic URL Selection with Fail-Closed Guarantees
    TARGET_URL="http://127.0.0.1:4173/"
    SESSION_TYPE="live-desktop"

    if [ "$IS_LIVE" -eq 1 ]; then
        if echo "$CMDLINE" | grep -q "windroid.mode=installer"; then
            SESSION_TYPE="installer"
            TARGET_URL="http://127.0.0.1:4173/?mode=installer&context=boot"
            echo "[Windroid OS] LIVE ISO: Dedicated installer requested via cmdline." >> "$SHELL_LOG"
        else
            SESSION_TYPE="live-desktop"
            TARGET_URL="http://127.0.0.1:4173/?mode=live&context=live-desktop"
            echo "[Windroid OS] LIVE ISO: Launching Windroid Live Desktop." >> "$SHELL_LOG"
        fi
    else
        # Installed system
        case "$NATIVE_STATE" in
            OOBE_PENDING|OOBE_IN_PROGRESS)
                SESSION_TYPE="oobe"
                TARGET_URL="http://127.0.0.1:4173/?mode=oobe&context=installed-boot"
                echo "[Windroid OS] INSTALLED SYSTEM: Launching OOBE Session ($NATIVE_STATE)." >> "$SHELL_LOG"
                ;;
            OOBE_COMPLETE|DESKTOP_READY)
                if [ "$USER_EXISTS" = "yes" ]; then
                    SESSION_TYPE="installed-desktop"
                    TARGET_URL="http://127.0.0.1:4173/?mode=installed&context=boot"
                    echo "[Windroid OS] INSTALLED SYSTEM: Real user '$NATIVE_USER' verified. Launching Normal Desktop." >> "$SHELL_LOG"
                else
                    SESSION_TYPE="oobe"
                    TARGET_URL="http://127.0.0.1:4173/?mode=oobe&context=installed-boot"
                    echo "[Windroid OS] INSTALLED SYSTEM: User '$NATIVE_USER' not verified. Falling back to OOBE." >> "$SHELL_LOG"
                fi
                ;;
            FAILED)
                SESSION_TYPE="recovery"
                TARGET_URL="http://127.0.0.1:4173/?mode=recovery&error=installation_failed"
                echo "[Windroid OS] INSTALLED SYSTEM: State is FAILED. Routing to recovery." >> "$SHELL_LOG"
                ;;
            INSTALLATION_IN_PROGRESS)
                SESSION_TYPE="recovery"
                TARGET_URL="http://127.0.0.1:4173/?mode=recovery&error=incomplete_installation"
                echo "[Windroid OS] INSTALLED SYSTEM: Incomplete installation detected. Routing to recovery." >> "$SHELL_LOG"
                ;;
            *)
                SESSION_TYPE="recovery"
                TARGET_URL="http://127.0.0.1:4173/?mode=recovery&error=missing_or_corrupt_state"
                echo "[Windroid OS] INSTALLED SYSTEM: Missing or corrupt state ($NATIVE_STATE). Routing to recovery." >> "$SHELL_LOG"
                ;;
        esac
    fi

    if [ -x "/usr/bin/windroid-desktop" ] && [ "$SESSION_TYPE" = "installed-desktop" ]; then
        echo "[Windroid OS] Starting native Windroid OS Desktop Shell..." >> "$SHELL_LOG"
        /usr/bin/windroid-desktop --fullscreen >> "$SHELL_LOG" 2>&1
        EXIT_CODE=$?
    elif [ -f "/opt/windroid/web/index.html" ] || [ -f "/usr/share/windroid/web/index.html" ] || [ -f "/opt/aether-os/web/index.html" ]; then
        WEB_DIR="/opt/windroid/web"
        if [ ! -f "${WEB_DIR}/index.html" ]; then
            if [ -f "/usr/share/windroid/web/index.html" ]; then
                WEB_DIR="/usr/share/windroid/web"
            else
                WEB_DIR="/opt/aether-os/web"
            fi
        fi

        echo "[Windroid OS] Selected web bundle directory: ${WEB_DIR}" >> "$SHELL_LOG"

        if command -v python3 >/dev/null 2>&1 && command -v chromium >/dev/null 2>&1; then
            # Clean temporary profile if necessary
            rm -rf /tmp/windroid-chromium-profile 2>/dev/null || true

            # Verify Native System Bridge on 127.0.0.1:4174 (Authoritatively managed by systemd windroid-bridge.service)
            echo "[Windroid OS] Verifying Native System Bridge on 127.0.0.1:4174..." >> "$SHELL_LOG"
            BRIDGE_READY=0
            for i in $(seq 1 20); do
                if python3 -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:4174/api/health', timeout=1)" >/dev/null 2>&1; then
                    BRIDGE_READY=1
                    break
                elif command -v curl >/dev/null 2>&1 && curl -s -f --max-time 1 http://127.0.0.1:4174/api/health >/dev/null 2>&1; then
                    BRIDGE_READY=1
                    break
                fi
                sleep 0.5
            done

            if [ "$BRIDGE_READY" -eq 1 ]; then
                echo "[Windroid OS] Native System Bridge is ready at http://127.0.0.1:4174/" >> "$SHELL_LOG"
            else
                echo "[FATAL] Native System Bridge (windroid-bridge.service) is unavailable on port 4174." >> "$SHELL_LOG"
                echo "[FATAL] Failing closed to prevent unauthorized or broken execution without bridge." >> "$SHELL_LOG"
                if command -v zenity >/dev/null 2>&1; then
                    zenity --error \
                        --title="Windroid OS System Error" \
                        --text="Critical Error: Native System Bridge is not responding at http://127.0.0.1:4174/api/health.\n\nCannot start Windroid Desktop Shell without authoritative system bridge." \
                        --width=420 2>/dev/null || true
                fi
                sleep 3
                continue
            fi

            echo "[Windroid OS] Starting local HTTP server on port 4173..." >> "$SHELL_LOG"
            python3 -m http.server 4173 --bind 127.0.0.1 --directory "${WEB_DIR}" > "$HTTP_LOG" 2>&1 &
            HTTP_PID=$!
            echo "[Windroid OS] HTTP server launched with PID ${HTTP_PID}" >> "$SHELL_LOG"

            # Wait for server readiness (max 10s)
            SERVER_READY=0
            for i in $(seq 1 10); do
                if command -v curl >/dev/null 2>&1; then
                    if curl -s -f http://127.0.0.1:4173/ >/dev/null 2>&1; then
                        SERVER_READY=1
                        break
                    fi
                else
                    if python3 -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:4173/')" >/dev/null 2>&1; then
                        SERVER_READY=1
                        break
                    fi
                fi
                sleep 1
            done

            if [ "$SERVER_READY" -eq 1 ]; then
                echo "[Windroid OS] Local HTTP server is ready at http://127.0.0.1:4173/" >> "$SHELL_LOG"
            else
                echo "[WARNING] HTTP server did not respond within 10s, proceeding with Chromium startup..." >> "$SHELL_LOG"
            fi

            CHROMIUM_BIN="$(command -v chromium)"
            echo "[Windroid OS] Starting Chromium Kiosk Web Shell using ${CHROMIUM_BIN} with URL: ${TARGET_URL}" >> "$SHELL_LOG"

            "$CHROMIUM_BIN" \
                --kiosk \
                --no-first-run \
                --disable-session-crashed-bubble \
                --disable-infobars \
                --disable-background-networking \
                --disable-component-update \
                --disable-sync \
                --disable-translate \
                --password-store=basic \
                --user-data-dir=/tmp/windroid-chromium-profile \
                "$TARGET_URL" >> "$CHROMIUM_LOG" 2>&1
            
            EXIT_CODE=$?
            echo "[Windroid OS] Chromium exited with code $EXIT_CODE" >> "$SHELL_LOG"

            # Terminate HTTP server for this session iteration
            if [ -n "$HTTP_PID" ] && kill -0 "$HTTP_PID" 2>/dev/null; then
                echo "[Windroid OS] Stopping HTTP server PID $HTTP_PID..." >> "$SHELL_LOG"
                kill "$HTTP_PID" 2>/dev/null || true
                wait "$HTTP_PID" 2>/dev/null || true
                HTTP_PID=""
            fi
        elif [ "$SESSION_TYPE" = "installer" ] || [ "$SESSION_TYPE" = "oobe" ]; then
            echo "[FATAL] Chromium binary is missing; required for $SESSION_TYPE Boot Mode." >> "$SHELL_LOG"
            EXIT_CODE=1
        elif command -v firefox >/dev/null 2>&1; then
            echo "[Windroid OS] Starting Firefox Kiosk Web Shell..." >> "$SHELL_LOG"
            firefox --kiosk "$TARGET_URL" >> "$CHROMIUM_LOG" 2>&1
            EXIT_CODE=$?
        else
            echo "[Windroid OS] Missing python3 or chromium executable." >> "$SHELL_LOG"
            EXIT_CODE=1
        fi
    else
        echo "[Windroid OS] Desktop Shell executable or web bundle not found." >> "$SHELL_LOG"
        EXIT_CODE=1
    fi

    echo "[Windroid OS] Desktop Shell loop iteration finished with exit code $EXIT_CODE" >> "$SHELL_LOG"

    # In Installer/OOBE Boot Mode, exiting shell must NEVER drop to Live Desktop
    if [ "$SESSION_TYPE" = "installer" ] || [ "$SESSION_TYPE" = "oobe" ]; then
        echo "[Windroid OS] $SESSION_TYPE session closed. Triggering exit options..." >> "$SHELL_LOG"
        if command -v zenity >/dev/null 2>&1; then
            zenity --question \
                --title="Exit Windroid Setup" \
                --text="Windroid OS Setup has exited.\n\nChoose an action to proceed:" \
                --ok-label="Power Off" \
                --cancel-label="Restart Setup" \
                --width=380

            EXIT_DECISION=$?
            if [ $EXIT_DECISION -eq 0 ]; then
                echo "[Windroid OS] Powering off system after installer exit..." >> "$SHELL_LOG"
                systemctl poweroff 2>/dev/null || poweroff 2>/dev/null || true
                break
            fi
        else
            sleep 2
        fi
    else
        # Interactive restart dialog
        if command -v zenity >/dev/null 2>&1; then
            zenity --question \
                --title="Windroid OS Desktop" \
                --text="Windroid OS Desktop Shell has stopped.\n\nWould you like to restart the session?" \
                --ok-label="Restart Shell" \
                --cancel-label="Exit Session" \
                --width=360 \
                --timeout=15

            RESTART_DECISION=$?
            if [ $RESTART_DECISION -ne 0 ]; then
                echo "[Windroid OS] Session termination requested by user." >> "$SHELL_LOG"
                break
            fi
        else
            sleep 3
        fi
    fi
done
