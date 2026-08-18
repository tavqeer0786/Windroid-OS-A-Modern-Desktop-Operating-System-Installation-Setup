use serde::{Deserialize, Serialize};
use std::fs;
use std::process::Command;

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct StorageDevice {
    pub id: String,
    pub device_path: String,
    pub display_name: String,
    pub label: String,
    pub r#type: String,
    pub category: String,
    pub transport: String,
    pub filesystem: String,
    pub uuid: String,
    pub mount_point: Option<String>,
    pub is_mounted: bool,
    pub is_removable: bool,
    pub is_ejectable: bool,
    pub is_read_only: bool,
    pub is_encrypted: bool,
    pub is_system_drive: bool,
    pub total_bytes: u64,
    pub used_bytes: u64,
    pub free_bytes: u64,
    pub usage_percent: u8,
    pub health_status: String,
    pub connection_state: String,
}

#[derive(Deserialize, Debug)]
struct LsblkOutput {
    blockdevices: Option<Vec<LsblkDevice>>,
}

#[derive(Deserialize, Debug)]
struct LsblkDevice {
    name: Option<String>,
    label: Option<String>,
    fstype: Option<String>,
    mountpoint: Option<String>,
    mountpoints: Option<Vec<Option<String>>>,
    size: Option<u64>,
    fsavail: Option<u64>,
    fsused: Option<u64>,
    fssize: Option<u64>,
    ro: Option<bool>,
    rm: Option<bool>,
    r#type: Option<String>,
    path: Option<String>,
    uuid: Option<String>,
    tran: Option<String>,
    hotplug: Option<bool>,
    children: Option<Vec<LsblkDevice>>,
}

const PSEUDO_FSTYPES: &[&str] = &[
    "overlay",
    "squashfs",
    "tmpfs",
    "devtmpfs",
    "proc",
    "sysfs",
    "cgroup",
    "cgroup2",
    "efivarfs",
    "pstore",
    "bpf",
    "tracefs",
    "debugfs",
    "devpts",
    "autofs",
    "fusectl",
    "mqueue",
    "ramfs",
    "configfs",
    "securityfs",
    "devfs",
];

pub fn discover_storage_devices() -> Vec<StorageDevice> {
    let mut devices = Vec::new();

    // 1. Try lsblk --json -b -o NAME,LABEL,FSTYPE,MOUNTPOINT,MOUNTPOINTS,SIZE,FSAVAIL,FSUSED,FSSIZE,RO,RM,TYPE,PATH,UUID,TRAN,HOTPLUG
    if let Ok(output) = Command::new("lsblk")
        .args([
            "--json",
            "-b",
            "-o",
            "NAME,LABEL,FSTYPE,MOUNTPOINT,MOUNTPOINTS,SIZE,FSAVAIL,FSUSED,FSSIZE,RO,RM,TYPE,PATH,UUID,TRAN,HOTPLUG",
        ])
        .output()
    {
        if output.status.success() {
            if let Ok(parsed) = serde_json::from_slice::<LsblkOutput>(&output.stdout) {
                if let Some(blk_devices) = parsed.blockdevices {
                    for dev in blk_devices {
                        process_lsblk_device(&dev, &mut devices);
                    }
                }
            }
        }
    }

    // 2. If lsblk produced no user drives or failed, inspect /proc/mounts + df -B1
    if devices.is_empty() {
        if let Ok(mounts_content) = fs::read_to_string("/proc/mounts") {
            for line in mounts_content.lines() {
                let parts: Vec<&str> = line.split_whitespace().collect();
                if parts.len() >= 3 {
                    let dev_path = parts[0];
                    let mount_point = parts[1];
                    let fstype = parts[2];

                    if PSEUDO_FSTYPES.contains(&fstype) {
                        continue;
                    }

                    if !dev_path.starts_with("/dev/") {
                        continue;
                    }

                    let (total, used, free, usage_pct) = get_df_stats(mount_point);

                    let is_system = mount_point == "/";
                    let display_name = if is_system {
                        "System Drive".to_string()
                    } else {
                        mount_point.split('/').last().unwrap_or("Mounted Disk").to_string()
                    };

                    devices.push(StorageDevice {
                        id: format!("drive_{}", dev_path.replace('/', "_")),
                        device_path: dev_path.to_string(),
                        display_name,
                        label: String::new(),
                        r#type: "internal".to_string(),
                        category: "internal".to_string(),
                        transport: "sata".to_string(),
                        filesystem: fstype.to_string(),
                        uuid: String::new(),
                        mount_point: Some(mount_point.to_string()),
                        is_mounted: true,
                        is_removable: false,
                        is_ejectable: false,
                        is_read_only: false,
                        is_encrypted: false,
                        is_system_drive: is_system,
                        total_bytes: total,
                        used_bytes: used,
                        free_bytes: free,
                        usage_percent: usage_pct,
                        health_status: "healthy".to_string(),
                        connection_state: "connected".to_string(),
                    });
                }
            }
        }
    }

    devices
}

fn process_lsblk_device(dev: &LsblkDevice, out: &mut Vec<StorageDevice>) {
    let fstype = dev.fstype.as_deref().unwrap_or("");
    let dev_type = dev.r#type.as_deref().unwrap_or("");

    // Recurse into children partitions if present
    if let Some(children) = &dev.children {
        for child in children {
            process_lsblk_device(child, out);
        }
    }

    // Skip pseudo filesystems
    if PSEUDO_FSTYPES.contains(&fstype) {
        return;
    }

    // Skip loop devices or ramdisks unless they hold root mount
    let mount = dev.mountpoint.as_deref().or_else(|| {
        dev.mountpoints.as_ref().and_then(|mps| {
            mps.iter().find_map(|m| m.as_deref())
        })
    });

    if dev_type == "loop" || dev_type == "ram" {
        if mount != Some("/") {
            return;
        }
    }

    // Only process disks, partitions, optical drives, or crypt
    if !["disk", "part", "rom", "crypt", "loop"].contains(&dev_type) && mount.is_none() {
        return;
    }

    let dev_path = dev
        .path
        .clone()
        .unwrap_or_else(|| format!("/dev/{}", dev.name.as_deref().unwrap_or("unknown")));

    let label = dev.label.clone().unwrap_or_default();
    let is_removable = dev.rm.unwrap_or(false) || dev.hotplug.unwrap_or(false) || dev.tran.as_deref() == Some("usb") || dev_type == "rom";
    let is_optical = dev_type == "rom";
    let is_system = mount == Some("/");

    let category = if is_removable {
        "removable"
    } else {
        "internal"
    };

    let drive_type = if is_optical {
        "optical"
    } else if dev.tran.as_deref() == Some("usb") {
        "usb"
    } else if dev_type == "crypt" {
        "encrypted"
    } else if dev_type == "part" {
        "partition"
    } else {
        "internal"
    };

    let display_name = if !label.is_empty() {
        label.clone()
    } else if is_system {
        "System Drive".to_string()
    } else if is_optical {
        "Live Optical Drive".to_string()
    } else {
        format!("Disk ({})", dev.name.as_deref().unwrap_or(&dev_path))
    };

    let total = dev.fssize.or(dev.size).unwrap_or(0);
    let mut free = dev.fsavail.unwrap_or(0);
    let mut used = dev.fsused.unwrap_or(0);

    // If mounted but lsblk didn't provide usage stats, query df -B1
    if let Some(mp) = mount {
        if free == 0 && used == 0 && total > 0 {
            let (df_total, df_used, df_free, _) = get_df_stats(mp);
            if df_total > 0 {
                used = df_used;
                free = df_free;
            }
        }
    }

    let usage_pct = if total > 0 {
        ((used as f64 / total as f64) * 100.0).min(100.0) as u8
    } else {
        0
    };

    let is_mounted = mount.is_some();
    let id = format!("drive_{}", dev_path.replace('/', "_"));

    out.push(StorageDevice {
        id,
        device_path: dev_path,
        display_name,
        label,
        r#type: drive_type.to_string(),
        category: category.to_string(),
        transport: dev.tran.clone().unwrap_or_else(|| "sata".to_string()),
        filesystem: fstype.to_string(),
        uuid: dev.uuid.clone().unwrap_or_default(),
        mount_point: mount.map(|s| s.to_string()),
        is_mounted,
        is_removable,
        is_ejectable: is_removable,
        is_read_only: dev.ro.unwrap_or(false),
        is_encrypted: dev_type == "crypt" || fstype.contains("crypto"),
        is_system_drive: is_system,
        total_bytes: total,
        used_bytes: used,
        free_bytes: free,
        usage_percent: usage_pct,
        health_status: "healthy".to_string(),
        connection_state: if is_mounted {
            "connected".to_string()
        } else {
            "disconnected".to_string()
        },
    });
}

fn get_df_stats(mount_point: &str) -> (u64, u64, u64, u8) {
    if let Ok(output) = Command::new("df").args(["-B1", mount_point]).output() {
        if output.status.success() {
            let text = String::from_utf8_lossy(&output.stdout);
            let lines: Vec<&str> = text.lines().collect();
            if lines.len() >= 2 {
                let parts: Vec<&str> = lines[1].split_whitespace().collect();
                if parts.len() >= 4 {
                    let total = parts[1].parse::<u64>().unwrap_or(0);
                    let used = parts[2].parse::<u64>().unwrap_or(0);
                    let free = parts[3].parse::<u64>().unwrap_or(0);
                    let pct = if total > 0 {
                        ((used as f64 / total as f64) * 100.0).min(100.0) as u8
                    } else {
                        0
                    };
                    return (total, used, free, pct);
                }
            }
        }
    }
    (0, 0, 0, 0)
}
