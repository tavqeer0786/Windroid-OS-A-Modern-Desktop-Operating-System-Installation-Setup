use serde::{Deserialize, Serialize};
use std::fs;

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct MemoryInfo {
    pub total_bytes: u64,
    pub available_bytes: u64,
    pub used_bytes: u64,
    pub usage_percent: u8,
    pub formatted_total: String,
    pub formatted_available: String,
}

pub fn get_memory_info() -> MemoryInfo {
    let mut total_kb: u64 = 0;
    let mut avail_kb: u64 = 0;
    let mut free_kb: u64 = 0;
    let mut buffers_kb: u64 = 0;
    let mut cached_kb: u64 = 0;

    if let Ok(meminfo) = fs::read_to_string("/proc/meminfo") {
        for line in meminfo.lines() {
            let parts: Vec<&str> = line.split_whitespace().collect();
            if parts.len() >= 2 {
                let key = parts[0].trim_matches(':');
                let val = parts[1].parse::<u64>().unwrap_or(0);
                match key {
                    "MemTotal" => total_kb = val,
                    "MemAvailable" => avail_kb = val,
                    "MemFree" => free_kb = val,
                    "Buffers" => buffers_kb = val,
                    "Cached" => cached_kb = val,
                    _ => {}
                }
            }
        }
    }

    if avail_kb == 0 {
        avail_kb = free_kb + buffers_kb + cached_kb;
    }

    let total_bytes = total_kb * 1024;
    let available_bytes = avail_kb * 1024;
    let used_bytes = total_bytes.saturating_sub(available_bytes);

    let usage_percent = if total_bytes > 0 {
        ((used_bytes as f64 / total_bytes as f64) * 100.0).min(100.0) as u8
    } else {
        0
    };

    let formatted_total = format_bytes(total_bytes);
    let formatted_available = format!("{} free", format_bytes(available_bytes));

    MemoryInfo {
        total_bytes,
        available_bytes,
        used_bytes,
        usage_percent,
        formatted_total,
        formatted_available,
    }
}

fn format_bytes(bytes: u64) -> String {
    let gb = bytes as f64 / (1024.0 * 1024.0 * 1024.0);
    if gb >= 1.0 {
        format!("{:.2} GB", gb)
    } else {
        let mb = bytes as f64 / (1024.0 * 1024.0);
        format!("{:.0} MB", mb)
    }
}
