#!/usr/bin/env bash
# ==============================================================================
# Windroid OS Live ISO Builder
# Builds a bootable hybrid Debian Live ISO (x86_64) running Openbox + Windroid Shell
# ==============================================================================

set -Eeuo pipefail

trap 'echo "[ERROR] Build script failed at line $LINENO: command \"$BASH_COMMAND\" failed with exit code $?"' ERR

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
WORK_DIR="${PROJECT_ROOT}/iso-builder/workspace"
OUTPUT_DIR="${PROJECT_ROOT}/build"
ISO_NAME="Windroid-Live-x86_64.iso"
MIN_ISO_SIZE_BYTES=$((300 * 1024 * 1024)) # 300 MB minimum threshold

# Explicitly force Debian mode
export LB_MODE="debian"

echo "=================================================================="
echo "           Windroid OS Live ISO Builder (x86_64)                  "
echo "=================================================================="
echo "Project Root : ${PROJECT_ROOT}"
echo "Workspace    : ${WORK_DIR}"
echo "Output Dir   : ${OUTPUT_DIR}"
echo "Target OS    : Debian 12 (Bookworm amd64)"
echo "------------------------------------------------------------------"

# 1. Environment & Privilege Verification
echo "[1/8] Verifying operating system & privileges..."
if [[ "$(uname -s)" != "Linux" ]]; then
    echo "[ERROR] This script must be run on Linux (Debian, Ubuntu, or WSL2)."
    exit 1
fi

SUDO_CMD=""
if [ "$(id -u)" -ne 0 ]; then
    if command -v sudo >/dev/null 2>&1; then
        SUDO_CMD="sudo"
    else
        echo "[ERROR] Root or sudo access is required to run Debian live-build (debootstrap/chroot)."
        exit 1
    fi
fi

# Verify Debian Archive Keyring exists
if [ ! -f "/usr/share/keyrings/debian-archive-keyring.gpg" ]; then
    echo "[ERROR] Debian archive keyring (/usr/share/keyrings/debian-archive-keyring.gpg) is missing."
    echo "[ERROR] Please install the 'debian-archive-keyring' package on the host machine."
    exit 1
fi

# 2. Package Dependency Checks & Installation
REQUIRED_PKGS=(
    debootstrap
    debian-archive-keyring
    squashfs-tools
    xorriso
    grub-pc-bin
    grub-efi-amd64-bin
    mtools
    dosfstools
    rsync
    curl
    ca-certificates
)
MISSING_PKGS=()

for pkg in "${REQUIRED_PKGS[@]}"; do
    if ! dpkg -l "$pkg" 2>/dev/null | grep -q '^ii'; then
        MISSING_PKGS+=("$pkg")
    fi
done

if [ ${#MISSING_PKGS[@]} -gt 0 ]; then
    echo "[2/8] Missing required packages: ${MISSING_PKGS[*]}"
    echo "[2/8] Attempting to install missing build dependencies..."
    $SUDO_CMD apt-get update -qq || true
    $SUDO_CMD apt-get install -y --no-install-recommends "${MISSING_PKGS[@]}" || {
        echo "[ERROR] Failed to install required packages: ${MISSING_PKGS[*]}"
        exit 1
    }
fi

# Ensure official Debian Bookworm live-build package 1:20230502 is installed
LIVE_BUILD_VER="$(dpkg-query -W -f='${Version}' live-build 2>/dev/null || echo 'none')"
if [ "$LIVE_BUILD_VER" != "1:20230502" ]; then
    echo "[2/8] Installing official Debian Bookworm live-build package (1:20230502)..."
    $SUDO_CMD apt-get remove -y live-build || true
    curl -sSL -o /tmp/live-build_20230502_all.deb https://deb.debian.org/debian/pool/main/l/live-build/live-build_20230502_all.deb
    dpkg-deb --info /tmp/live-build_20230502_all.deb
    $SUDO_CMD apt-get install -y /tmp/live-build_20230502_all.deb
    rm -f /tmp/live-build_20230502_all.deb
fi

LIVE_BUILD_VER="$(dpkg-query -W -f='${Version}' live-build 2>/dev/null || echo 'none')"
if [ "$LIVE_BUILD_VER" != "1:20230502" ]; then
    echo "[ERROR] Expected Debian Bookworm live-build 1:20230502."
    echo "[ERROR] Installed package version: $LIVE_BUILD_VER"
    exit 1
fi

echo "[2/8] Live-build 1:20230502 and all required dependencies are installed and verified."

# 3. Build Production Web Application
echo "[3/8] Building Windroid OS Web Production Bundle..."
cd "${PROJECT_ROOT}"
npm run build:web

if [ ! -f "${PROJECT_ROOT}/dist/index.html" ]; then
    echo "[ERROR] Web app build failed. '${PROJECT_ROOT}/dist/index.html' not found."
    exit 1
fi

# 4. Check Desktop Shell Executables (Native Tauri vs Chromium Kiosk Fallback)
echo "[4/8] Checking Windroid OS Desktop Shell executable..."
SHELL_BIN="${PROJECT_ROOT}/src-tauri/target/release/windroid-desktop"
if [ -f "$SHELL_BIN" ]; then
    echo "Found compiled native Tauri shell binary: $SHELL_BIN"
else
    echo "Native Tauri binary not found. Web application bundle will serve as primary desktop shell via Chromium Kiosk fallback."
fi

# 5. Prepare Clean Workspace & Debian live-build Configuration
echo "[5/8] Printing toolchain diagnostics..."
cat /etc/os-release
dpkg-query -W -f='${Version}\n' live-build
lb --version || true
debootstrap --version
xorriso -version | head -n 5
df -h

echo "[5/8] Safely unmounting any leftover mounts and cleaning workspace..."
if [ -d "${WORK_DIR}" ]; then
    $SUDO_CMD umount -l "${WORK_DIR}/chroot/proc" 2>/dev/null || true
    $SUDO_CMD umount -l "${WORK_DIR}/chroot/sys" 2>/dev/null || true
    $SUDO_CMD umount -l "${WORK_DIR}/chroot/dev/pts" 2>/dev/null || true
    $SUDO_CMD umount -l "${WORK_DIR}/chroot/dev" 2>/dev/null || true
fi

cd "${PROJECT_ROOT}/iso-builder"
if [ -d "${WORK_DIR}" ]; then
    cd "${WORK_DIR}"
    $SUDO_CMD lb clean --purge 2>/dev/null || true
    cd "${PROJECT_ROOT}/iso-builder"
    $SUDO_CMD rm -rf "${WORK_DIR}"
fi

mkdir -p "${OUTPUT_DIR}"
mkdir -p "${WORK_DIR}"
cd "${WORK_DIR}"

echo "Configuring Debian live-build (Bookworm amd64)..."
LB_CONFIG_HELP="$(lb config --help 2>&1 || true)"

LB_CONFIG_ARGS=(
    --ignore-system-defaults
    --mode debian
    --distribution bookworm
    --architectures amd64
    --binary-images iso-hybrid
    --archive-areas "main contrib non-free non-free-firmware"
    --mirror-bootstrap "https://deb.debian.org/debian"
    --mirror-chroot "https://deb.debian.org/debian"
    --mirror-binary "https://deb.debian.org/debian"
    --mirror-chroot-security "https://deb.debian.org/debian-security"
    --mirror-binary-security "https://deb.debian.org/debian-security"
    --bootloader grub-efi
    --debian-installer none
    --apt-indices false
    --memtest none
    --win32-loader false
)

if echo "$LB_CONFIG_HELP" | grep -q -- "--security"; then
    LB_CONFIG_ARGS+=(--security true)
fi

echo "=== Live-Build Configuration ==="
echo "Resolved lb config arguments: ${LB_CONFIG_ARGS[*]}"

$SUDO_CMD lb config "${LB_CONFIG_ARGS[@]}"

# Strict validation: Ensure Ubuntu mirrors or obsolete bookworm/updates did not leak into configuration
echo "Validating generated live-build repository configuration..."
if grep -R -n -E "bookworm/updates|archive\.ubuntu\.com|ports\.ubuntu\.com|ubuntu\.com/ubuntu|jammy|noble" config; then
    echo "[ERROR] Invalid Ubuntu mirror or obsolete 'bookworm/updates' suite detected in live-build configuration!"
    exit 1
fi

grep -R -q "deb\.debian\.org/debian" config || {
    echo "[ERROR] Debian mirror is missing from live-build configuration!"
    exit 1
}

echo "Configured archive directory contents (if any):"
find config/archives -maxdepth 1 -type f -print -exec cat {} \; 2>/dev/null || true

echo "Live-build configuration validated successfully (Debian Bookworm amd64)."

# 6. Populate Chroot Packages & System Inclusions
echo "[6/8] Populating live-build chroot overlay and package manifests..."
mkdir -p config/package-lists
cat <<'EOF' > config/package-lists/windroid.list.chroot
live-boot
live-config
live-config-systemd
linux-image-amd64
systemd-sysv
xorg
xserver-xorg-video-all
x11-xserver-utils
xinit
openbox
lightdm
zenity
dbus-x11
network-manager
bluez
bluez-tools
rfkill
dnsmasq-base
wireless-tools
wpasupplicant
upower
pulseaudio-utils
alsa-utils
redshift
power-profiles-daemon
fonts-dejavu-core
fonts-noto-core
hicolor-icon-theme
ca-certificates
chromium
python3
python3-pam
curl
console-setup
kbd
sudo
user-setup
parted
dosfstools
e2fsprogs
ntfs-3g
exfatprogs
udisks2
rsync
squashfs-tools
grub-efi-amd64-signed
grub-efi-amd64
grub-pc-bin
efibootmgr
util-linux
udev
initramfs-tools
locales
EOF

# System directory structure inside ISO squashfs
mkdir -p config/includes.chroot/usr/bin
mkdir -p config/includes.chroot/opt/windroid/web
mkdir -p config/includes.chroot/usr/share/windroid/web
mkdir -p config/includes.chroot/usr/share/applications
mkdir -p config/includes.chroot/etc/lightdm/lightdm.conf.d
mkdir -p config/includes.chroot/etc/skel/.config/openbox
mkdir -p config/hooks/normal

# Copy Web Assets to both /opt/windroid/web/ and /usr/share/windroid/web/
cp -r "${PROJECT_ROOT}/dist/"* config/includes.chroot/opt/windroid/web/
cp -r "${PROJECT_ROOT}/dist/"* config/includes.chroot/usr/share/windroid/web/

# Validate overlay web bundle assets
if [ ! -f "config/includes.chroot/opt/windroid/web/index.html" ]; then
    echo "[ERROR] Web bundle index.html is missing from chroot overlay!"
    exit 1
fi

if ! ls config/includes.chroot/opt/windroid/web/assets/*.js >/dev/null 2>&1; then
    echo "[ERROR] Web bundle JS assets are missing from chroot overlay!"
    exit 1
fi

# Copy Native Shell Binary if available
if [ -f "$SHELL_BIN" ]; then
    cp "$SHELL_BIN" config/includes.chroot/usr/bin/windroid-desktop
    chmod +x config/includes.chroot/usr/bin/windroid-desktop
fi

# Copy Native System Bridge
if [ -f "${PROJECT_ROOT}/linux/windroid-bridge.py" ]; then
    cp "${PROJECT_ROOT}/linux/windroid-bridge.py" config/includes.chroot/usr/bin/windroid-bridge.py
    chmod +x config/includes.chroot/usr/bin/windroid-bridge.py
fi

# Copy Native System Bridge Systemd Service
if [ -f "${PROJECT_ROOT}/linux/windroid-bridge.service" ]; then
    mkdir -p config/includes.chroot/etc/systemd/system
    cp "${PROJECT_ROOT}/linux/windroid-bridge.service" config/includes.chroot/etc/systemd/system/windroid-bridge.service
fi

# Copy First-Boot Orchestrator & Systemd Service
if [ -f "${PROJECT_ROOT}/linux/windroid-first-boot.py" ]; then
    cp "${PROJECT_ROOT}/linux/windroid-first-boot.py" config/includes.chroot/usr/bin/windroid-first-boot.py
    chmod +x config/includes.chroot/usr/bin/windroid-first-boot.py
fi

if [ -f "${PROJECT_ROOT}/linux/systemd/windroid-first-boot.service" ]; then
    mkdir -p config/includes.chroot/etc/systemd/system
    cp "${PROJECT_ROOT}/linux/systemd/windroid-first-boot.service" config/includes.chroot/etc/systemd/system/windroid-first-boot.service
fi

# Copy Shell Watchdog Runner
cp "${PROJECT_ROOT}/linux/windroid-shell-runner.sh" config/includes.chroot/usr/bin/windroid-shell-runner.sh
chmod +x config/includes.chroot/usr/bin/windroid-shell-runner.sh

# Copy Desktop Launcher
cp "${PROJECT_ROOT}/linux/windroid-os.desktop" config/includes.chroot/usr/share/applications/windroid-os.desktop

# Copy Openbox Autostart Definition
mkdir -p config/includes.chroot/etc/skel/.config/openbox
mkdir -p config/includes.chroot/etc/xdg/openbox
mkdir -p config/includes.chroot/etc/xdg/autostart

cp "${PROJECT_ROOT}/linux/openbox/autostart" config/includes.chroot/etc/skel/.config/openbox/autostart
chmod +x config/includes.chroot/etc/skel/.config/openbox/autostart
cp "${PROJECT_ROOT}/linux/openbox/autostart" config/includes.chroot/etc/xdg/openbox/autostart
chmod +x config/includes.chroot/etc/xdg/openbox/autostart

# Copy XDG Autostart Desktop File
if [ -f "${PROJECT_ROOT}/linux/autostart/windroid-os-autostart.desktop" ]; then
    cp "${PROJECT_ROOT}/linux/autostart/windroid-os-autostart.desktop" config/includes.chroot/etc/xdg/autostart/windroid-os-autostart.desktop
elif [ -f "${PROJECT_ROOT}/linux/windroid-os.desktop" ]; then
    cp "${PROJECT_ROOT}/linux/windroid-os.desktop" config/includes.chroot/etc/xdg/autostart/windroid-os-autostart.desktop
fi

# Copy LightDM Live Autologin Config
cp "${PROJECT_ROOT}/linux/lightdm/80-windroid-autologin.conf" config/includes.chroot/etc/lightdm/lightdm.conf.d/80-windroid-live-autologin.conf

# Setup Chroot Hook for Session and Source Sanitation
cat <<'EOF' > config/hooks/normal/0100-windroid-session.hook.chroot
#!/bin/sh
set -e

# Remove any generated invalid bookworm/updates entries if present
if [ -f /etc/apt/sources.list ]; then
    sed -i '/bookworm\/updates/d' /etc/apt/sources.list || true
fi
if [ -d /etc/apt/sources.list.d ]; then
    for f in /etc/apt/sources.list.d/*.list /etc/apt/sources.list.d/*.sources; do
        if [ -f "$f" ]; then
            sed -i '/bookworm\/updates/d' "$f" || true
        fi
    done
fi

# Permissions setup
chmod +x /usr/bin/windroid-bridge.py 2>/dev/null || true
chmod +x /usr/bin/windroid-first-boot.py 2>/dev/null || true
chmod +x /usr/bin/windroid-shell-runner.sh 2>/dev/null || true
if [ -f "/usr/bin/windroid-desktop" ]; then
    chmod +x /usr/bin/windroid-desktop 2>/dev/null || true
fi

# Set default session to Openbox
update-alternatives --set x-session-manager /usr/bin/openbox-session 2>/dev/null || true

# Enable services
systemctl enable windroid-bridge.service 2>/dev/null || true
systemctl enable windroid-first-boot.service 2>/dev/null || true
systemctl enable lightdm 2>/dev/null || systemctl enable LightDM 2>/dev/null || true
systemctl enable NetworkManager 2>/dev/null || true
systemctl enable bluetooth 2>/dev/null || true
EOF
chmod +x config/hooks/normal/0100-windroid-session.hook.chroot

# Setup Binary Hook for Bootloader Customization (GRUB & ISOLINUX)
mkdir -p config/hooks/binary

cat <<'EOF' > config/hooks/binary/0100-windroid-bootloader.hook.binary
#!/bin/sh
set -e

echo "=========================================================="
echo " Windroid Binary Hook: Customizing GRUB & ISOLINUX Boot    "
echo "=========================================================="

LIVE_DIR=""
if [ -d binary/live ]; then
    LIVE_DIR="binary/live"
elif [ -d binary/boot ]; then
    LIVE_DIR="binary/boot"
else
    echo "[ERROR] Neither binary/live nor binary/boot directory exists!"
    exit 1
fi

KERNEL_FILE=$(find "$LIVE_DIR" -maxdepth 2 \( -name "vmlinuz*" -o -name "vmlinux*" \) -type f ! -type l 2>/dev/null | sort | head -n 1)
if [ -z "$KERNEL_FILE" ]; then
    KERNEL_FILE=$(find "$LIVE_DIR" -maxdepth 2 -name "vmlinuz*" 2>/dev/null | sort | head -n 1)
fi

INITRD_FILE=$(find "$LIVE_DIR" -maxdepth 2 -name "initrd*" -type f ! -type l 2>/dev/null | sort | head -n 1)
if [ -z "$INITRD_FILE" ]; then
    INITRD_FILE=$(find "$LIVE_DIR" -maxdepth 2 -name "initrd*" 2>/dev/null | sort | head -n 1)
fi

SQUASH_FILE=$(find "$LIVE_DIR" -maxdepth 2 -name "filesystem.squashfs" 2>/dev/null | head -n 1)

echo "Discovered Boot Assets:"
echo "  Kernel   : ${KERNEL_FILE}"
echo "  Initrd   : ${INITRD_FILE}"
echo "  SquashFS : ${SQUASH_FILE}"

if [ -z "$KERNEL_FILE" ] || [ ! -f "$KERNEL_FILE" ]; then
    echo "[ERROR] Critical: No valid Linux kernel found in $LIVE_DIR!"
    exit 1
fi

if [ -z "$INITRD_FILE" ] || [ ! -f "$INITRD_FILE" ]; then
    echo "[ERROR] Critical: No valid initrd image found in $LIVE_DIR!"
    exit 1
fi

if [ -z "$SQUASH_FILE" ] || [ ! -f "$SQUASH_FILE" ]; then
    echo "[ERROR] Critical: filesystem.squashfs not found in $LIVE_DIR!"
    exit 1
fi

KERNEL_NAME=$(basename "$KERNEL_FILE")
INITRD_NAME=$(basename "$INITRD_FILE")

KERNEL_REL_PATH="/live/${KERNEL_NAME}"
INITRD_REL_PATH="/live/${INITRD_NAME}"

GRUB_CFG_CONTENT=$(cat <<GRUBEOF
if [ -s \$prefix/grubenv ]; then
  set have_grubenv=true
  load_env
fi

set default="0"
set timeout=-1

insmod part_gpt
insmod part_msdos
insmod fat
insmod ext2
insmod all_video
insmod gfxterm
insmod png

set color_normal=white/black
set color_highlight=black/white

search --no-floppy --set=root --file /live/filesystem.squashfs

menuentry "Windroid OS" {
    linux ${KERNEL_REL_PATH} boot=live components quiet splash windroid.mode=live ---
    initrd ${INITRD_REL_PATH}
}

menuentry "Install Windroid OS" {
    linux ${KERNEL_REL_PATH} boot=live components quiet splash windroid.mode=installer ---
    initrd ${INITRD_REL_PATH}
}

menuentry "Windroid OS (Safe graphics)" {
    linux ${KERNEL_REL_PATH} boot=live components nomodeset xforcevesa quiet splash windroid.mode=live ---
    initrd ${INITRD_REL_PATH}
}

submenu "Advanced options..." {
    menuentry "Windroid OS (Fail-safe mode)" {
        linux ${KERNEL_REL_PATH} boot=live components noapic noapm nodma nomce nolapic nomodeset nosmp windroid.mode=live ---
        initrd ${INITRD_REL_PATH}
    }
    menuentry "Install Windroid OS (Safe graphics)" {
        linux ${KERNEL_REL_PATH} boot=live components nomodeset xforcevesa quiet splash windroid.mode=installer ---
        initrd ${INITRD_REL_PATH}
    }
}
GRUBEOF
)

LOOPBACK_CFG_CONTENT=$(cat <<GRUBEOF
search --no-floppy --set=root --file /live/filesystem.squashfs

menuentry "Windroid OS" {
    linux ${KERNEL_REL_PATH} boot=live components quiet splash windroid.mode=live findiso=\${iso_path} ---
    initrd ${INITRD_REL_PATH}
}

menuentry "Install Windroid OS" {
    linux ${KERNEL_REL_PATH} boot=live components quiet splash windroid.mode=installer findiso=\${iso_path} ---
    initrd ${INITRD_REL_PATH}
}

menuentry "Windroid OS (Safe graphics)" {
    linux ${KERNEL_REL_PATH} boot=live components nomodeset xforcevesa quiet splash windroid.mode=live findiso=\${iso_path} ---
    initrd ${INITRD_REL_PATH}
}
GRUBEOF
)

for gdir in binary/boot/grub binary/EFI/BOOT binary/boot/grub/x86_64-efi; do
    if [ -d "$gdir" ]; then
        echo "$GRUB_CFG_CONTENT" > "$gdir/grub.cfg"
        echo "$LOOPBACK_CFG_CONTENT" > "$gdir/loopback.cfg"
        echo "Updated GRUB configuration in $gdir"
    fi
done

ISOLINUX_CFG_CONTENT=$(cat <<SYSEOF
ui vesamenu.c32
menu title Windroid OS Boot Menu
default install
timeout 0
prompt 1

label install
    menu label Install Windroid OS
    menu default
    kernel ${KERNEL_REL_PATH}
    append initrd=${INITRD_REL_PATH} boot=live components quiet splash windroid.mode=installer ---

label windroid
    menu label Windroid OS (Live Desktop)
    kernel ${KERNEL_REL_PATH}
    append initrd=${INITRD_REL_PATH} boot=live components quiet splash windroid.mode=live ---

label safe
    menu label Windroid OS (Safe graphics)
    kernel ${KERNEL_REL_PATH}
    append initrd=${INITRD_REL_PATH} boot=live components nomodeset xforcevesa quiet splash windroid.mode=live ---

label failsafe
    menu label Windroid OS (Fail-safe mode)
    kernel ${KERNEL_REL_PATH}
    append initrd=${INITRD_REL_PATH} boot=live components noapic noapm nodma nomce nolapic nomodeset nosmp windroid.mode=live ---
SYSEOF
)

for sys_dir in binary/isolinux binary/syslinux binary/boot/isolinux binary/boot/syslinux; do
    if [ -d "$sys_dir" ]; then
        echo "$ISOLINUX_CFG_CONTENT" > "$sys_dir/isolinux.cfg"
        echo "$ISOLINUX_CFG_CONTENT" > "$sys_dir/syslinux.cfg"
        echo "$ISOLINUX_CFG_CONTENT" > "$sys_dir/live.cfg"
        echo "Updated ISOLINUX configuration in $sys_dir"
    fi
done

echo "Windroid bootloader hook executed successfully."
EOF
chmod +x config/hooks/binary/0100-windroid-bootloader.hook.binary

# 7. Execute Debian live-build
echo "[7/8] Running Debian live-build (sudo lb build)..."
echo "=== Disk Space Before lb build ==="
df -h

$SUDO_CMD lb build

echo "=== Disk Space After lb build ==="
df -h

# 7.1 Post-processing stage: Apply Windroid bootloader configuration to binary/ tree
echo "[7.1/8] Post-processing binary/ directory with Windroid bootloader configuration..."

LIVE_DIR=""
if [ -d binary/live ]; then
    LIVE_DIR="binary/live"
elif [ -d binary/boot ]; then
    LIVE_DIR="binary/boot"
else
    echo "[ERROR] Neither binary/live nor binary/boot directory exists in binary tree!"
    exit 1
fi

KERNEL_FILE=$(find "$LIVE_DIR" -maxdepth 2 \( -name "vmlinuz*" -o -name "vmlinux*" \) -type f ! -type l ! -name "*.sig" 2>/dev/null | sort -V | tail -n 1)
INITRD_FILE=$(find "$LIVE_DIR" -maxdepth 2 -name "initrd*" -type f ! -type l ! -name "*.sig" 2>/dev/null | sort -V | tail -n 1)
SQUASH_FILE=$(find "$LIVE_DIR" -maxdepth 2 -name "filesystem.squashfs" 2>/dev/null | head -n 1)

echo "Discovered Live Boot Assets:"
echo "  Kernel   : ${KERNEL_FILE}"
echo "  Initrd   : ${INITRD_FILE}"
echo "  SquashFS : ${SQUASH_FILE}"

if [ -z "$KERNEL_FILE" ] || [ ! -f "$KERNEL_FILE" ]; then
    echo "[ERROR] Critical: No valid Linux kernel found in $LIVE_DIR!"
    exit 1
fi

if [ -z "$INITRD_FILE" ] || [ ! -f "$INITRD_FILE" ]; then
    echo "[ERROR] Critical: No valid initrd image found in $LIVE_DIR!"
    exit 1
fi

if [ -z "$SQUASH_FILE" ] || [ ! -f "$SQUASH_FILE" ]; then
    echo "[ERROR] Critical: filesystem.squashfs not found in $LIVE_DIR!"
    exit 1
fi

KERNEL_NAME=$(basename "$KERNEL_FILE")
INITRD_NAME=$(basename "$INITRD_FILE")

KERNEL_REL_PATH="/live/${KERNEL_NAME}"
INITRD_REL_PATH="/live/${INITRD_NAME}"

GRUB_CFG_CONTENT="if [ -s \$prefix/grubenv ]; then
  set have_grubenv=true
  load_env
fi

set default=\"0\"
set timeout=-1

insmod part_gpt
insmod part_msdos
insmod fat
insmod ext2
insmod all_video
insmod gfxterm
insmod png

set color_normal=white/black
set color_highlight=black/white

search --no-floppy --set=root --file /live/filesystem.squashfs

menuentry \"Windroid OS\" {
    linux ${KERNEL_REL_PATH} boot=live components quiet splash windroid.mode=live ---
    initrd ${INITRD_REL_PATH}
}

menuentry \"Install Windroid OS\" {
    linux ${KERNEL_REL_PATH} boot=live components quiet splash windroid.mode=installer ---
    initrd ${INITRD_REL_PATH}
}

menuentry \"Windroid OS (Safe graphics)\" {
    linux ${KERNEL_REL_PATH} boot=live components nomodeset xforcevesa quiet splash windroid.mode=live ---
    initrd ${INITRD_REL_PATH}
}

submenu \"Advanced options...\" {
    menuentry \"Windroid OS (Fail-safe mode)\" {
        linux ${KERNEL_REL_PATH} boot=live components noapic noapm nodma nomce nolapic nomodeset nosmp windroid.mode=live ---
        initrd ${INITRD_REL_PATH}
    }
    menuentry \"Install Windroid OS (Safe graphics)\" {
        linux ${KERNEL_REL_PATH} boot=live components nomodeset xforcevesa quiet splash windroid.mode=installer ---
        initrd ${INITRD_REL_PATH}
    }
}
"

LOOPBACK_CFG_CONTENT="search --no-floppy --set=root --file /live/filesystem.squashfs

menuentry \"Windroid OS\" {
    linux ${KERNEL_REL_PATH} boot=live components quiet splash windroid.mode=live findiso=\${iso_path} ---
    initrd ${INITRD_REL_PATH}
}

menuentry \"Install Windroid OS\" {
    linux ${KERNEL_REL_PATH} boot=live components quiet splash windroid.mode=installer findiso=\${iso_path} ---
    initrd ${INITRD_REL_PATH}
}

menuentry \"Windroid OS (Safe graphics)\" {
    linux ${KERNEL_REL_PATH} boot=live components nomodeset xforcevesa quiet splash windroid.mode=live findiso=\${iso_path} ---
    initrd ${INITRD_REL_PATH}
}
"

ISOLINUX_CFG_CONTENT="ui vesamenu.c32
menu title Windroid OS Boot Menu
default install
timeout 0
prompt 1

label install
    menu label Install Windroid OS
    menu default
    kernel ${KERNEL_REL_PATH}
    append initrd=${INITRD_REL_PATH} boot=live components quiet splash windroid.mode=installer ---

label windroid
    menu label Windroid OS (Live Desktop)
    kernel ${KERNEL_REL_PATH}
    append initrd=${INITRD_REL_PATH} boot=live components quiet splash windroid.mode=live ---

label safe
    menu label Windroid OS (Safe graphics)
    kernel ${KERNEL_REL_PATH}
    append initrd=${INITRD_REL_PATH} boot=live components nomodeset xforcevesa quiet splash windroid.mode=live ---

label failsafe
    menu label Windroid OS (Fail-safe mode)
    kernel ${KERNEL_REL_PATH}
    append initrd=${INITRD_REL_PATH} boot=live components noapic noapm nodma nomce nolapic nomodeset nosmp windroid.mode=live ---
"

for gdir in binary/boot/grub binary/EFI/BOOT binary/boot/grub/x86_64-efi; do
    $SUDO_CMD mkdir -p "$gdir"
    echo "$GRUB_CFG_CONTENT" | $SUDO_CMD tee "$gdir/grub.cfg" >/dev/null
    echo "$LOOPBACK_CFG_CONTENT" | $SUDO_CMD tee "$gdir/loopback.cfg" >/dev/null
    echo "  Applied Windroid GRUB config to $gdir"
done

for sys_dir in binary/isolinux binary/syslinux binary/boot/isolinux binary/boot/syslinux; do
    if [ -d "$sys_dir" ]; then
        echo "$ISOLINUX_CFG_CONTENT" | $SUDO_CMD tee "$sys_dir/isolinux.cfg" >/dev/null
        echo "$ISOLINUX_CFG_CONTENT" | $SUDO_CMD tee "$sys_dir/syslinux.cfg" >/dev/null
        echo "$ISOLINUX_CFG_CONTENT" | $SUDO_CMD tee "$sys_dir/live.cfg" >/dev/null
        echo "  Applied Windroid ISOLINUX config to $sys_dir"
    fi
done

echo "[7.2/8] Rebuilding hybrid ISO image from updated binary/ tree..."
$SUDO_CMD rm -f .build/binary_iso live-image-amd64.hybrid.iso binary.hybrid.iso
$SUDO_CMD lb binary_iso

# 7.5 Validation of Boot Assets & Menu Entries
echo "[7.5/8] Validating generated bootloader assets and GRUB menu..."

TARGET_GRUB_CFG="binary/boot/grub/grub.cfg"
if [ ! -f "$TARGET_GRUB_CFG" ]; then
    echo "[ERROR] GRUB config $TARGET_GRUB_CFG does not exist in binary tree!"
    exit 1
fi

if ! grep -q 'menuentry "Windroid OS"' "$TARGET_GRUB_CFG"; then
    echo "[ERROR] Windroid GRUB menu entry was NOT applied to $TARGET_GRUB_CFG!"
    echo "Current contents of $TARGET_GRUB_CFG:"
    cat "$TARGET_GRUB_CFG"
    exit 1
fi

echo "--- Active GRUB Configuration ($TARGET_GRUB_CFG) ---"
cat "$TARGET_GRUB_CFG"
echo "----------------------------------------------------"

VAL_KERNEL_REL=$(grep -A 2 'menuentry "Windroid OS"' "$TARGET_GRUB_CFG" | grep 'linux ' | awk '{print $2}')
VAL_INITRD_REL=$(grep -A 2 'menuentry "Windroid OS"' "$TARGET_GRUB_CFG" | grep 'initrd ' | awk '{print $2}')

echo "Active GRUB 'Windroid OS' boot entry details:"
echo "  Referenced Kernel Path : ${VAL_KERNEL_REL}"
echo "  Referenced Initrd Path : ${VAL_INITRD_REL}"

if [ -z "$VAL_KERNEL_REL" ] || [ -z "$VAL_INITRD_REL" ]; then
    echo "[ERROR] Could not parse kernel or initrd path from GRUB menuentry!"
    exit 1
fi

STAGING_KERNEL_FILE="binary${VAL_KERNEL_REL}"
STAGING_INITRD_FILE="binary${VAL_INITRD_REL}"
STAGING_SQUASH_FILE="binary/live/filesystem.squashfs"

echo "Verifying referenced assets exist in staging tree:"
echo "  Checking Kernel   ($STAGING_KERNEL_FILE)..."
if [ ! -f "$STAGING_KERNEL_FILE" ]; then
    echo "[ERROR] Referenced kernel file '$STAGING_KERNEL_FILE' DOES NOT EXIST in staging tree!"
    exit 1
fi

echo "  Checking Initrd   ($STAGING_INITRD_FILE)..."
if [ ! -f "$STAGING_INITRD_FILE" ]; then
    echo "[ERROR] Referenced initrd file '$STAGING_INITRD_FILE' DOES NOT EXIST in staging tree!"
    exit 1
fi

echo "  Checking SquashFS ($STAGING_SQUASH_FILE)..."
if [ ! -f "$STAGING_SQUASH_FILE" ]; then
    echo "[ERROR] SquashFS image '$STAGING_SQUASH_FILE' DOES NOT EXIST in staging tree!"
    exit 1
fi

if ! grep -A 2 'menuentry "Windroid OS"' "$TARGET_GRUB_CFG" | grep -q 'windroid.mode=live'; then
    echo "[ERROR] 'Windroid OS' entry is missing 'windroid.mode=live' kernel parameter!"
    exit 1
fi

if ! grep -A 2 'menuentry "Install Windroid OS"' "$TARGET_GRUB_CFG" | grep -q 'windroid.mode=installer'; then
    echo "[ERROR] 'Install Windroid OS' entry is missing 'windroid.mode=installer' kernel parameter!"
    exit 1
fi

echo "All staging bootloader assets verified successfully."

GEN_ISO=""
if [ -f "live-image-amd64.hybrid.iso" ]; then
    GEN_ISO="live-image-amd64.hybrid.iso"
elif [ -f "binary.hybrid.iso" ]; then
    GEN_ISO="binary.hybrid.iso"
fi

if [ -n "$GEN_ISO" ]; then
    mv "$GEN_ISO" "${OUTPUT_DIR}/${ISO_NAME}"
fi

# 8. Strict Verification & SHA256 Sum Generation
echo "[8/8] Verifying generated ISO file..."
FINAL_ISO_PATH="${OUTPUT_DIR}/${ISO_NAME}"

if [ ! -f "$FINAL_ISO_PATH" ]; then
    echo "[ERROR] Debian live-build failed to produce an ISO file."
    echo "[ERROR] Expected file path: ${FINAL_ISO_PATH}"
    exit 1
fi

ACTUAL_SIZE_BYTES=$(stat -c%s "$FINAL_ISO_PATH" 2>/dev/null || stat -f%z "$FINAL_ISO_PATH" 2>/dev/null || echo 0)

if [ "$ACTUAL_SIZE_BYTES" -le "$MIN_ISO_SIZE_BYTES" ]; then
    echo "[ERROR] ISO file was generated, but its size is too small!"
    echo "[ERROR] Actual size: ${ACTUAL_SIZE_BYTES} bytes ($((ACTUAL_SIZE_BYTES / 1024 / 1024)) MB)"
    echo "[ERROR] Required minimum size: ${MIN_ISO_SIZE_BYTES} bytes (300 MB)"
    rm -f "$FINAL_ISO_PATH"
    exit 1
fi

# Inspect ISO contents directly using xorriso if available
if command -v xorriso >/dev/null 2>&1; then
    echo "Inspecting ISO file bootloader configuration with xorriso..."
    rm -f /tmp/iso_grub.cfg
    xorriso -indev "${FINAL_ISO_PATH}" -osirrox on -extract /boot/grub/grub.cfg /tmp/iso_grub.cfg 2>/dev/null || true
    if [ -f /tmp/iso_grub.cfg ]; then
        echo "--- Extracted /boot/grub/grub.cfg from inside ${ISO_NAME} ---"
        cat /tmp/iso_grub.cfg
        echo "--------------------------------------------------------"
        if ! grep -q 'menuentry "Windroid OS"' /tmp/iso_grub.cfg; then
            echo "[ERROR] Final ISO file /boot/grub/grub.cfg DOES NOT contain 'Windroid OS' menuentry!"
            exit 1
        fi
        if ! grep -q 'menuentry "Install Windroid OS"' /tmp/iso_grub.cfg; then
            echo "[ERROR] Final ISO file /boot/grub/grub.cfg DOES NOT contain 'Install Windroid OS' menuentry!"
            exit 1
        fi
        if ! grep -q "windroid.mode=live" /tmp/iso_grub.cfg; then
            echo "[ERROR] Final ISO file /boot/grub/grub.cfg DOES NOT contain 'windroid.mode=live'!"
            exit 1
        fi
        if ! grep -q "windroid.mode=installer" /tmp/iso_grub.cfg; then
            echo "[ERROR] Final ISO file /boot/grub/grub.cfg DOES NOT contain 'windroid.mode=installer'!"
            exit 1
        fi
        echo "Final ISO GRUB config contents verified successfully."
    fi

    echo "Verifying required boot assets in final ISO tree with xorriso..."
    check_iso_file() {
        local file_path="$1"
        if ! xorriso -indev "${FINAL_ISO_PATH}" -find "${file_path}" 2>/dev/null | grep -q "${file_path}"; then
            echo "[ERROR] Required file missing from final ISO: ${file_path}"
            exit 1
        fi
        echo "Verified ISO file: ${file_path}"
    }

    check_iso_file "/boot/grub/grub.cfg"
    check_iso_file "${VAL_KERNEL_REL}"
    check_iso_file "${VAL_INITRD_REL}"
    check_iso_file "/live/filesystem.squashfs"

    echo "Final ISO required boot assets verified successfully."
fi

# Inspect SquashFS image contents if unsquashfs is available
if command -v unsquashfs >/dev/null 2>&1; then
    SQUASH_IMG="$(find "${WORK_DIR}" -name "*.squashfs" 2>/dev/null | head -n 1)"
    if [ -n "$SQUASH_IMG" ] && [ -f "$SQUASH_IMG" ]; then
        echo "Inspecting SquashFS image contents ($SQUASH_IMG)..."
        unsquashfs -l "$SQUASH_IMG" | grep -E "windroid-shell-runner|aether-shell-runner|index.html|openbox|lightdm|chromium|python3" || true
    fi
fi

cd "${OUTPUT_DIR}"
sha256sum "${ISO_NAME}" > SHA256SUMS

# Verify checksum
sha256sum -c SHA256SUMS

ISO_SIZE_MB=$((ACTUAL_SIZE_BYTES / 1024 / 1024))
SHA_VAL=$(awk '{print $1}' SHA256SUMS)

echo "=================================================================="
echo "BUILD SUCCESS: Bootable Debian Live ISO Created!"
echo "ISO File   : ${FINAL_ISO_PATH}"
echo "Size       : ${ISO_SIZE_MB} MB (${ACTUAL_SIZE_BYTES} bytes)"
echo "SHA256     : ${SHA_VAL}"
echo "=================================================================="

