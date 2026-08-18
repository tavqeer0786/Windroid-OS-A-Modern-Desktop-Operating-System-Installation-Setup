pub mod hardware;
pub mod memory;
pub mod storage;

use hardware::{get_system_hardware_info, SystemHardwareInfo, GraphicsInfo, get_graphics_info};
use memory::{get_memory_info, MemoryInfo};
use storage::{discover_storage_devices, StorageDevice};

#[tauri::command]
pub fn get_storage_devices() -> Vec<StorageDevice> {
    discover_storage_devices()
}

#[tauri::command]
pub fn get_system_info() -> SystemHardwareInfo {
    get_system_hardware_info()
}

#[tauri::command]
pub fn get_memory_info() -> MemoryInfo {
    get_memory_info()
}

#[tauri::command]
pub fn get_graphics_info() -> GraphicsInfo {
    get_graphics_info()
}
