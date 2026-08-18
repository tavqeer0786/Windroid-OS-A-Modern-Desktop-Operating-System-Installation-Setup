# Windroid OS — Phase 2 Installer Rewrite Requirements & Architectural Specification

## 1. Executive Summary & Purpose

This document specifies the technical and architectural requirements for the **Phase 2 Windroid OS Installer Rewrite**.

In **Phase 1**, all legacy installer artifacts, outdated partition logic, and tightly coupled first-boot background scripts were deprecated and removed to provide a clean, pristine slate. The Out-Of-Box Experience (OOBE), user customization interfaces, and desktop shell remain intact and fully functional.

Phase 2 will introduce a robust, modern, production-grade OS installer engine capable of reliable bare-metal and virtual machine installations from live media (USB/ISO).

---

## 2. Core Architecture & Subsystem Boundaries

```
+-------------------------------------------------------------------------------+
|                             WINDROID OS RUNTIME                               |
+-------------------------------------------------------------------------------+
|  LIVE SESSION (ISO/USB)            |  INSTALLED SYSTEM (Target Disk)          |
|  - Live Desktop / Try Mode         |  - GRUB EFI / PC Bootloader             |
|  - Native Bridge API (:4174)       |  - Root Filesystem (ext4 / btrfs)        |
|  - Phase 2 Installer Wizard UI     |  - /etc/windroid/installer-state.json    |
|  - Real-time Progress Monitor      |  - First-Boot OOBE Setup Wizard          |
+------------------------------------+------------------------------------------+
                                     |
                                     v
+-------------------------------------------------------------------------------+
|                       PHASE 2 NATIVE INSTALLATION ENGINE                      |
|                  (Integrated into linux/windroid-bridge.py)                   |
+-------------------------------------------------------------------------------+
| 1. Disk & Media Discovery (lsblk, findmnt, smart safety exclusions)           |
| 2. Partition Planner & Table Builder (parted, sgdisk, wipefs, mkfs)           |
| 3. Filesystem Mounting & Target Staging (/mnt/windroid-target)                |
| 4. System Transfer & Unpack Engine (unsquashfs / rsync with progress stream)  |
| 5. System Chroot Configuration (/dev, /proc, /sys bind-mounts, UUID fstab)    |
| 6. Bootloader Deployment (grub-install --target=x86_64-efi / i386-pc)         |
| 7. Initramfs & Kernel Hook Execution (update-initramfs -u -k all)             |
| 8. Handover State Writing (/mnt/target/etc/windroid/installer-state.json)     |
+-------------------------------------------------------------------------------+
```

---

## 3. Key Functional Modules for Phase 2

### 3.1. Live Media & Disk Discovery Engine
- **Active Live Media Detection**:
  - Automatically identify boot media via `findmnt` queries across `/run/live/medium`, `/run/live`, `/cdrom`, `/medium`, `/live/image`.
  - Mark live media devices as protected with `isLiveMedia: true` and `protected: true`.
- **Target Drive Discovery**:
  - Scan block devices using structured JSON from `lsblk -J -b -o NAME,PATH,SIZE,FSTYPE,LABEL,UUID,MOUNTPOINT,TYPE,RO,RM,MODEL,TRAN,SERIAL,VENDOR,ROTA`.
  - Exclude loop devices, zram, optical drives, read-only devices, and active live root sources.
  - Report device capacity, transport type (NVMe, SATA, USB, eMMC), rotational flag (SSD vs HDD), and existing partition tables.

### 3.2. Partitioning & Formatting Subsystem
- **Erase Disk Mode (Automated)**:
  - **UEFI Mode (Default)**:
    - Partition 1: EFI System Partition (ESP), size: 512 MB – 1024 MB, filesystem: `fat32` (`vfat`), flags: `esp`, `boot`, mount point: `/boot/efi`.
    - Partition 2: Root Filesystem, size: Remaining disk capacity, filesystem: `ext4` or `btrfs`, mount point: `/`.
  - **BIOS / Legacy Mode**:
    - Partition 1: BIOS Boot / Boot Partition, size: 1 MB – 512 MB (or directly root with MBR bootloader embedded in MBR gap).
    - Partition 2: Root Filesystem, mount point: `/`.
- **Formatting Tools**:
  - Safe partition wiping: `wipefs -a /dev/sdX` and `sgdisk --zap-all /dev/sdX`.
  - Filesystem creation: `mkfs.vfat -F32 /dev/sdX1` and `mkfs.ext4 -F -L "WindroidOS" /dev/sdX2`.

### 3.3. System Extraction & Image Transfer
- **Live Image Sources**:
  - Extract root system from `/run/live/medium/live/filesystem.squashfs` (or mounted overlay) using `unsquashfs -f -d /mnt/windroid-target` or `rsync -aHAX --info=progress2`.
- **Progress Telemetry**:
  - Stream parsed real-time progress percentages (0–100%) and stage descriptions to WebSocket/HTTP polling clients.

### 3.4. Target System Configuration & Bootloader
- **Chroot Bind Mounts**:
  - Mount virtual filesystems: `mount --bind /dev /mnt/target/dev`, `mount --bind /dev/pts /mnt/target/dev/pts`, `mount -t proc proc /mnt/target/proc`, `mount -t sysfs sys /mnt/target/sys`, `mount -t efivarfs efivarfs /mnt/target/sys/firmware/efi/efivars` (when in UEFI mode).
- **Filesystem Table (`/etc/fstab`)**:
  - Query UUIDs via `blkid -s UUID -o value <partition>`.
  - Generate `/etc/fstab` using persistent UUIDs (never ephemeral device node paths like `/dev/sda2`).
- **GRUB Bootloader Installation**:
  - Execute within target chroot:
    - UEFI: `grub-install --target=x86_64-efi --efi-directory=/boot/efi --bootloader-id=WindroidOS --recheck` followed by `update-grub`.
    - BIOS: `grub-install --target=i386-pc /dev/sdX --recheck` followed by `update-grub`.
- **Kernel & Initramfs**:
  - Execute `update-initramfs -u -k all` inside target chroot to ensure all disk drivers and storage modules are incorporated.

### 3.5. First-Boot Handover & OOBE State Machine
- Write installation handover state to `/mnt/target/etc/windroid/installer-state.json`:
  ```json
  {
    "version": "windroid-installer-state-v1",
    "state": "OOBE_PENDING",
    "updatedAt": "2026-08-16T12:00:00.000Z",
    "targetDisk": "/dev/nvme0n1",
    "localeConfig": {
      "language": "en_US.UTF-8"
    },
    "userConfig": null,
    "installationCompleted": true,
    "installationCompletedAt": "2026-08-16T12:15:30.000Z",
    "oobeCompleted": false,
    "oobeCompletedAt": null,
    "completedAt": "2026-08-16T12:15:30.000Z",
    "error": null
  }
  ```
- On the first reboot into the installed disk, the system detects `state === "OOBE_PENDING"` and routes the user into the OOBE Setup flow (Region, Keyboard, User Creation, Personalization) before transitioning to `DESKTOP_READY`.

---

## 4. REST API Endpoint Specifications (Native Bridge :4174)

| Endpoint | Method | Description |
| :--- | :--- | :--- |
| `/api/installer/status` | `GET` | Returns current installer execution status, stage, progress, and runtime mode. |
| `/api/installer/boot-mode` | `GET` | Detects UEFI vs. Legacy BIOS firmwares (`/sys/firmware/efi`). |
| `/api/installer/disks` | `GET` | Scans and returns available storage disks, identifying live media and partitions. |
| `/api/installer/plan` | `POST` | Generates a validated partition and installation execution plan. |
| `/api/installer/validate` | `POST` | Validates proposed partition layouts and checks storage constraints. |
| `/api/installer/authorize` | `POST` | Issues a single-use cryptographically signed authorization token for disk writes. |
| `/api/installer/execute` | `POST` | Initiates background asynchronous installation execution with progress tracking. |

---

## 5. Non-Functional Requirements & Safety Guards

1. **Destructive Operation Safety**:
   - Zero partition writes or formatting without an explicit, user-confirmed single-use authorization token.
2. **Crash Resilience & Cleanup**:
   - All chroot bind mounts and target directory mounts must be unmounted cleanly (`umount -R /mnt/windroid-target`) even on abnormal failure.
3. **No Disruption of Working Shell**:
   - The desktop environment, Quick Settings, audio/brightness sliders, start menu, and OOBE customization remain completely isolated from installer backend failures.
4. **Offline Capability**:
   - Complete installation pipeline must operate fully offline without external network dependencies.
