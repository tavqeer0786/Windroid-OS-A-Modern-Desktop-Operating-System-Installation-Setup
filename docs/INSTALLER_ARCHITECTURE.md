# Windroid OS Installer Architecture (Phase 2 Production Specification)

## 1. Overview
The Windroid OS installer is an atomic, native Linux system installation engine designed to install Windroid OS directly onto bare-metal hardware or virtualized disks. It operates as a true OS deployment lifecycle, replacing web-only mock behaviors with an authoritative native bridge and target filesystem state machine.

---

## 2. Installer Lifecycle

```
LIVE_ISO
   ↓
INSTALLER_BOOT (RuntimeMode: 'installer' / 'live')
   ↓
DISK_DISCOVERY (lsblk --json, findmnt, live-media protection filter)
   ↓
TARGET_SELECTION (Excludes live media, optical devices, <4GB disks)
   ↓
PLAN_GENERATION (UEFI + GPT layout: 512MB ESP fat32 + Root ext4)
   ↓
PLAN_VALIDATION & AUTHORIZATION (Single-use token issuance)
   ↓
EXECUTION PIPELINE (linux/windroid-bridge.py worker thread):
   1. Disk Preparation (swapoff -a, unmount active mounts)
   2. Partitioning (wipefs, parted mklabel gpt, mkpart ESP, mkpart Root, partprobe, udevadm settle)
   3. Filesystem Creation (mkfs.vfat -F32 -n "EFI", mkfs.ext4 -F -L "WindroidOS")
   4. Deployment (squashfs extraction / rsync image deployment to /mnt/windroid-target)
   5. System Configuration (fstab generation via partition UUIDs, hostname, hosts)
   6. Bootloader Installation (chroot /mnt/windroid-target grub-install --target=x86_64-efi, update-grub, fallback EFI BOOTX64.EFI)
   7. Verification (Verifies /etc/fstab, kernel image, and EFI binary integrity)
   8. Commit Point (Atomic persistence of OOBE_PENDING to /mnt/windroid-target/var/lib/windroid/installer-state.json)
   ↓
REBOOT HANDOFF (Eject ISO / prompt restart)
   ↓
INSTALLED_FIRST_BOOT (RuntimeMode: 'installer', InitialPhase: 'oobe')
   ↓
OOBE_COMPLETION (User creation, lightdm configuration, state -> DESKTOP_READY)
   ↓
DESKTOP_READY (Standard user session, installer never launches again)
```

---

## 3. Storage & Safety Model

### Live Media Protection
- Discovers live media root source using `findmnt -n -o SOURCE` across `/run/live/medium`, `/run/live`, `/cdrom`, etc.
- Resolves symlinks and strips partition numbers (`/dev/sdb1` -> `/dev/sdb`, `/dev/nvme0n1p1` -> `/dev/nvme0n1`).
- Marks live media `isLiveMedia: true`, `protected: true`.
- Completely excludes protected devices and read-only media from target selection.

### Minimal Disk Size
- Requires minimum 4 GB capacity for installation target.

### Single-Use Authorization Token
- The installer backend generates a cryptographically random, single-use token (`secrets.token_hex(24)`) during plan validation.
- Execution requires this valid token to guard against accidental or duplicate installation execution.

---

## 4. Native State Engine (`installer-state.json`)

The single source of truth is `/var/lib/windroid/installer-state.json` (and `installation-state.json` fallback).

### Valid State Transitions
1. `INSTALLATION_IN_PROGRESS`
2. `OOBE_PENDING` (userConfig = null, installationCompleted = true)
3. `OOBE_COMPLETE` (userConfig populated with real user, oobeCompleted = true)
4. `DESKTOP_READY`
5. `FAILED`

### Atomic Write Protocol
All state writes follow the strict atomic replacement pattern:
1. Write JSON data to `<target_path>.tmp`
2. Perform `os.fsync(f.fileno())`
3. Atomic replace `os.replace(<target_path>.tmp, <target_path>)`
4. Directory `fsync` on parent directory to ensure metadata persistence
5. System-wide sync: `run_command(["sync"])`

---

## 5. First Boot & OOBE Isolation

- The installed system boots into the single-user OOBE screen if `installer-state.json` is `OOBE_PENDING`.
- Once OOBE completes and `DESKTOP_READY` is reached, `StartupResolver` permanently locks out the installer interface and boots straight to desktop/login screen.
