use serde::{Deserialize, Serialize};
use std::fs;
use std::process::Command;

use super::memory::{get_memory_info, MemoryInfo};

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct CpuInfo {
    pub model_name: String,
    pub logical_cores: u32,
    pub architecture: String,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct GraphicsInfo {
    pub adapter_name: String,
    pub driver: String,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct SystemHardwareInfo {
    pub hostname: String,
    pub os_name: String,
    pub os_version: String,
    pub kernel_version: String,
    pub architecture: String,
    pub cpu: CpuInfo,
    pub memory: MemoryInfo,
    pub graphics: GraphicsInfo,
    pub is_virtual_machine: bool,
    pub virtualization_provider: String,
    pub is_native: bool,
}

pub fn get_cpu_info() -> CpuInfo {
    let mut model_name = String::new();
    let mut logical_cores: u32 = 0;

    if let Ok(cpuinfo) = fs::read_to_string("/proc/cpuinfo") {
        for line in cpuinfo.lines() {
            if line.starts_with("processor") {
                logical_cores += 1;
            }
            if model_name.is_empty() && (line.starts_with("model name") || line.starts_with("Hardware")) {
                if let Some(pos) = line.find(':') {
                    model_name = line[pos + 1..].trim().to_string();
                }
            }
        }
    }

    if model_name.is_empty() {
        model_name = "Generic x86_64 Processor".to_string();
    }

    if logical_cores == 0 {
        logical_cores = 1;
    }

    let architecture = get_architecture();

    CpuInfo {
        model_name,
        logical_cores,
        architecture,
    }
}

pub fn get_graphics_info() -> GraphicsInfo {
    let mut adapter_name = String::new();

    // Check lspci output
    if let Ok(output) = Command::new("lspci").output() {
        if output.status.success() {
            let text = String::from_utf8_lossy(&output.stdout);
            for line in text.lines() {
                if line.contains("VGA compatible controller")
                    || line.contains("3D controller")
                    || line.contains("Display controller")
                {
                    if let Some(pos) = line.find(':') {
                        let rest = line[pos + 1..].trim();
                        if let Some(pos2) = rest.find(':') {
                            adapter_name = rest[pos2 + 1..].trim().to_string();
                        } else {
                            adapter_name = rest.to_string();
                        }
                        break;
                    }
                }
            }
        }
    }

    if adapter_name.is_empty() {
        if let Ok(vendor) = fs::read_to_string("/sys/class/dmi/id/sys_vendor") {
            let vendor_trim = vendor.trim();
            if vendor_trim.contains("innotek") || vendor_trim.contains("Oracle") {
                adapter_name = "VirtualBox Graphics Adapter".to_string();
            }
        }
    }

    if adapter_name.is_empty() {
        adapter_name = "Standard Linux DRM Display Adapter".to_string();
    }

    GraphicsInfo {
        adapter_name,
        driver: "i915/virtio_gpu/vboxvideo".to_string(),
    }
}

pub fn get_system_hardware_info() -> SystemHardwareInfo {
    let hostname = fs::read_to_string("/etc/hostname")
        .map(|s| s.trim().to_string())
        .unwrap_or_else(|_| "Windroid-OS".to_string());

    let (os_name, os_version) = get_os_release();
    let kernel_version = get_kernel_version();
    let architecture = get_architecture();
    let cpu = get_cpu_info();
    let memory = get_memory_info();
    let graphics = get_graphics_info();

    let (is_virtual_machine, virtualization_provider) = detect_virtualization();

    SystemHardwareInfo {
        hostname,
        os_name,
        os_version,
        kernel_version,
        architecture,
        cpu,
        memory,
        graphics,
        is_virtual_machine,
        virtualization_provider,
        is_native: true,
    }
}

fn get_architecture() -> String {
    if let Ok(output) = Command::new("uname").arg("-m").output() {
        if output.status.success() {
            return String::from_utf8_lossy(&output.stdout).trim().to_string();
        }
    }
    std::env::consts::ARCH.to_string()
}

fn get_kernel_version() -> String {
    if let Ok(output) = Command::new("uname").arg("-r").output() {
        if output.status.success() {
            return String::from_utf8_lossy(&output.stdout).trim().to_string();
        }
    }
    "Linux 6.12.0-windroid".to_string()
}

fn get_os_release() -> (String, String) {
    let mut name = "Windroid OS".to_string();
    let mut version = "1.0.0 (Bookworm)".to_string();

    if let Ok(os_release) = fs::read_to_string("/etc/os-release") {
        for line in os_release.lines() {
            if line.starts_with("NAME=") {
                name = line.trim_start_matches("NAME=").trim_matches('"').to_string();
            } else if line.starts_with("VERSION_ID=") {
                version = line.trim_start_matches("VERSION_ID=").trim_matches('"').to_string();
            } else if line.starts_with("PRETTY_NAME=") {
                let pretty = line.trim_start_matches("PRETTY_NAME=").trim_matches('"').to_string();
                if !pretty.is_empty() {
                    name = pretty;
                }
            }
        }
    }

    (name, version)
}

fn detect_virtualization() -> (bool, String) {
    let sys_vendor = fs::read_to_string("/sys/class/dmi/id/sys_vendor").unwrap_or_default().to_lowercase();
    let product_name = fs::read_to_string("/sys/class/dmi/id/product_name").unwrap_or_default().to_lowercase();

    if sys_vendor.contains("innotek") || product_name.contains("virtualbox") {
        return (true, "VirtualBox".to_string());
    }
    if sys_vendor.contains("vmware") || product_name.contains("vmware") {
        return (true, "VMware".to_string());
    }
    if sys_vendor.contains("qemu") || product_name.contains("qemu") || product_name.contains("bochs") || product_name.contains("kvm") {
        return (true, "QEMU / KVM".to_string());
    }
    if sys_vendor.contains("microsoft") || product_name.contains("virtual machine") {
        return (true, "Hyper-V".to_string());
    }

    if let Ok(cpuinfo) = fs::read_to_string("/proc/cpuinfo") {
        if cpuinfo.contains("hypervisor") {
            return (true, "Generic Hypervisor VM".to_string());
        }
    }

    (false, "Bare Metal".to_string())
}
