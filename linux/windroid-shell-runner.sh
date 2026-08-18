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

    # 2. Authoritative Native State Evaluation via Python Validator
    STATE_EVAL=$(python3 -c "
import json, os, re, subprocess

P_FILE = '/var/lib/windroid/installer-state.json'
B_FILE = '/var/lib/windroid/installation-state.json'
VALID_STATES = ['INSTALLER', 'INSTALLATION_IN_PROGRESS', 'INSTALLATION_COMPLETE', 'OOBE_PENDING', 'OOBE_IN_PROGRESS', 'OOBE_COMPLETE', 'DESKTOP_READY', 'FAILED']

def load_data(filepath):
    if not os.path.exists(filepath):
        return None
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            data = json.load(f)
        if isinstance(data, dict) and data.get('version') == 'windroid-installer-state-v1' and data.get('state') in VALID_STATES:
            return data
    except Exception:
        pass
    return None

p_data = load_data(P_FILE)
b_data = load_data(B_FILE)

chosen_data = None
if p_data and b_data:
    p_gen = int(p_data.get('generation', 0) or 0)
    b_gen = int(b_data.get('generation', 0) or 0)
    chosen_data = b_data if b_gen > p_gen else p_data
elif p_data:
    chosen_data = p_data
elif b_data:
    chosen_data = b_data

if not chosen_data:
    if not os.path.exists(P_FILE) and not os.path.exists(B_FILE):
        print('MISSING|none|no')
    else:
        print('CORRUPT|none|no')
    exit(0)

state = chosen_data.get('state', 'INVALID')
u_cfg = chosen_data.get('userConfig') or {}
username = str(u_cfg.get('username', '')).strip()

user_ok = 'no'
if username and username not in ['root', 'user', 'windroid-oobe']:
    res = subprocess.run(['getent', 'passwd', username], stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    if res.returncode == 0 and res.stdout.strip():
        parts = res.stdout.strip().split(':')
        if len(parts) >= 7:
            try:
                uid = int(parts[2])
                home_dir = parts[5]
                if (uid >= 1000 or username == 'root') and os.path.exists(home_dir):
                    user_ok = 'yes'
            except Exception:
                pass
        elif os.path.exists(f'/home/{username}'):
            user_ok = 'yes'

print(f'{state}|{username}|{user_ok}')
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
            for i in $(seq 1 15); do
                if command -v systemctl >/dev/null 2>&1; then
                    if ! systemctl is-active --quiet windroid-bridge.service 2>/dev/null; then
                        systemctl start windroid-bridge.service 2>/dev/null || sudo systemctl start windroid-bridge.service 2>/dev/null || true
                    fi
                fi

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
