// Prevents additional console window on Windows in release
#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

mod system;

use system::{
    get_graphics_info, get_memory_info, get_storage_devices, get_system_info,
};

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            get_storage_devices,
            get_system_info,
            get_memory_info,
            get_graphics_info,
        ])
        .run(tauri::generate_context!())
        .expect("error while running Windroid OS desktop shell");
}

