#!/usr/bin/env bash
# Windroid OS Desktop Shell Live Autostart Setup Script
set -e

echo "[Windroid OS] Installing desktop shell and autostart configuration for Live ISO..."

INSTALL_BIN_DIR="/usr/bin"
AUTOSTART_DIR="${HOME}/.config/autostart"
SYSTEM_AUTOSTART_DIR="/etc/xdg/autostart"
DESKTOP_APPS_DIR="${HOME}/.local/share/applications"

mkdir -p "$AUTOSTART_DIR"
mkdir -p "$DESKTOP_APPS_DIR"

if [ -f "./linux/windroid-bridge.py" ] && [ -w "$INSTALL_BIN_DIR" ]; then
    cp "./linux/windroid-bridge.py" "$INSTALL_BIN_DIR/windroid-bridge.py"
    chmod +x "$INSTALL_BIN_DIR/windroid-bridge.py"
fi

if [ -f "./linux/windroid-shell-runner.sh" ] && [ -w "$INSTALL_BIN_DIR" ]; then
    cp "./linux/windroid-shell-runner.sh" "$INSTALL_BIN_DIR/windroid-shell-runner.sh"
    chmod +x "$INSTALL_BIN_DIR/windroid-shell-runner.sh"
fi

if [ -f "./src-tauri/target/release/windroid-desktop" ]; then
    echo "[Windroid OS] Installing compiled shell binary..."
    cp "./src-tauri/target/release/windroid-desktop" "$INSTALL_BIN_DIR/windroid-desktop" || \
    cp "./src-tauri/target/release/windroid-desktop" "${HOME}/.local/bin/windroid-desktop"
fi

cp "./linux/windroid-os.desktop" "$DESKTOP_APPS_DIR/windroid-os.desktop" 2>/dev/null || true
cp "./linux/autostart/windroid-os-autostart.desktop" "$AUTOSTART_DIR/windroid-os-autostart.desktop" 2>/dev/null || true

if [ -w "$SYSTEM_AUTOSTART_DIR" ]; then
    cp "./linux/autostart/windroid-os-autostart.desktop" "$SYSTEM_AUTOSTART_DIR/windroid-os-autostart.desktop"
fi

echo "[Windroid OS] Live desktop shell autostart setup complete."
