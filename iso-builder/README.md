# Windroid OS Live ISO Builder

This directory contains the automated build scripts, GitHub Actions workflow, and configuration overlays for building **WindroidOS-Live-x86_64.iso**, a lightweight bootable Debian Live desktop environment running the Windroid OS shell.

---

## 🚀 Architectural Overview

```
BIOS / UEFI
  └─► GRUB Bootloader
        └─► Linux Kernel (Debian 12 Bookworm amd64)
              └─► systemd & init
                    └─► LightDM Display Manager (Autologin 'user')
                          └─► Openbox Window Manager Session
                                └─► Windroid Shell Watchdog Runner (windroid-shell-runner.sh)
                                      └─► Windroid OS Desktop Shell
```

---

## 🤖 GitHub Actions Automated ISO Builder

The repository includes a GitHub Actions workflow `.github/workflows/build-live-iso.yml` that automatically builds and validates the bootable Debian Live ISO.

### Steps to Run and Download the Live ISO:

1. **Push the workflow to GitHub** (if committing locally).
2. **Open the repository** on GitHub.
3. **Open the Actions tab**.
4. **Select "Build Windroid OS Live ISO"** from the left sidebar workflows list.
5. **Click "Run workflow"** (select branch `main`) and press the green button.
6. **Wait for the workflow to finish** (~10 to 20 minutes for debootstrap & squashfs packaging).
7. **Open the completed run**.
8. **Download the "WindroidOS-Live-x86_64" artifact** listed under the Artifacts section.
9. **Extract the downloaded ZIP** file on your host machine.
10. **Attach `WindroidOS-Live-x86_64.iso` to VirtualBox** or flash it to a USB drive using Rufus / `dd`.

> **Important Notes:**
> - GitHub downloads workflow artifacts as a **ZIP file**. The actual `WindroidOS-Live-x86_64.iso` is inside that ZIP archive alongside `SHA256SUMS`.
> - A **green workflow status** indicates that the Debian `live-build` succeeded, produced a valid hybrid ISO larger than 300 MB, and passed SHA256 checksum verification.
> - *Note on testing:* A successful workflow run verifies ISO compilation and integrity, but does not prove that VirtualBox boot works; boot testing must be performed separately in VirtualBox or QEMU.

---

## 🛠️ Required Dependencies for Local WSL2 / Ubuntu Builds

To build the full bootable Debian Live ISO locally on your system, install the required system packages and dependencies:

```bash
sudo apt update && sudo apt install -y \
  live-build \
  debootstrap \
  squashfs-tools \
  xorriso \
  grub-pc-bin \
  grub-efi-amd64-bin \
  mtools \
  dosfstools \
  rsync \
  curl \
  ca-certificates \
  build-essential \
  pkg-config \
  libwebkit2gtk-4.1-dev \
  libappindicator3-dev \
  librsvg2-dev \
  patchelf
```

---

## ⚙️ How to Build Locally in WSL2 / Ubuntu

1. **Install Node Dependencies**:
   ```bash
   npm install
   ```

2. **Run the Automated Live ISO Builder**:
   ```bash
   npm run build:live-iso
   ```
   *or run directly with elevated privileges:*
   ```bash
   sudo ./iso-builder/build-live-iso.sh
   ```

3. **What the Script Does**:
   - Verifies root / sudo capabilities and installs missing dependencies.
   - Compiles the production React web bundle (`dist/`).
   - Checks for compiled native Tauri binaries.
   - Initializes a clean Debian 12 (Bookworm) amd64 `live-build` configuration.
   - Injects Xorg, Openbox, LightDM autologin, NetworkManager, WebKitGTK, and Windroid shell autostart configurations.
   - Executes `sudo lb build` to debootstrap Debian Bookworm, build the `squashfs` root filesystem, and assemble an `iso-hybrid` image.
   - Validates that `build/WindroidOS-Live-x86_64.iso` exists and is > 300 MB before outputting SHA256 checksums.

---

## 📁 Expected Output Paths

After a successful build, outputs are saved in `build/`:
- `build/WindroidOS-Live-x86_64.iso` (Full bootable hybrid ISO, ~350 MB - 800 MB)
- `build/SHA256SUMS`

---

## 🖥️ VirtualBox Attachment Instructions

1. Open VirtualBox and click **New**.
2. **Name**: `Windroid OS Live`
3. **Type**: `Linux`, **Version**: `Debian (64-bit)`
4. **RAM**: Allocate at least `2048 MB` (minimum `1024 MB`).
5. **Storage**: Under **Storage -> Controller: IDE**, select the optical drive, click the disc icon, and choose `WindroidOS-Live-x86_64.iso` (extracted from the downloaded artifact ZIP).
6. **Start VM**: Windroid OS will boot through GRUB -> systemd -> LightDM autologin -> Openbox, and launch the Windroid OS desktop shell automatically.
