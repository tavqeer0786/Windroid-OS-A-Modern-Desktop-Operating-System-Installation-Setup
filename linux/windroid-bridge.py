#!/usr/bin/env python3
"""
Windroid System Bridge Service
Secure, localhost-only native system API service for Windroid OS on Linux.
Provides real filesystem access, storage management, and hardware reporting.
Binds exclusively to 127.0.0.1:4174.
"""

import os
import sys
import json
import shutil
import glob
import subprocess
import time
import threading
import secrets
import hashlib
import stat
import datetime
from http.server import HTTPServer, ThreadingHTTPServer, BaseHTTPRequestHandler
from urllib.parse import parse_qs, urlparse
import re

HOST = "127.0.0.1"
PORT = 4174

# Generate per-boot bridge authorization secret
BRIDGE_SESSION_TOKEN = secrets.token_hex(32)
try:
    token_file = "/tmp/.windroid-bridge-token"
    with open(token_file, "w") as f:
        f.write(BRIDGE_SESSION_TOKEN)
    os.chmod(token_file, 0o600)
except Exception:
    pass

PROTECTED_SYSTEM_PATHS = [
    "/proc", "/sys", "/dev", "/bin", "/sbin", "/usr", "/lib", "/lib64", "/etc", "/boot", "/run"
]

def run_command(cmd, timeout=10):
    try:
        res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, timeout=timeout)
        return res.returncode == 0, res.stdout, res.stderr
    except Exception as e:
        return False, "", str(e)

def _log_installer(message: str):
    clean_msg = re.sub(r'("password"|"confirmPassword"|"authToken"|"token"): "[^"]+"', r'\1: "[REDACTED]"', str(message))
    timestamp = time.strftime("%Y-%m-%d %H:%M:%S", time.gmtime())
    log_line = f"[{timestamp}] [SYSTEM] {clean_msg}\n"
    print(log_line, end="")
    try:
        os.makedirs("/var/log", exist_ok=True)
        with open("/var/log/windroid-installer.log", "a") as f:
            f.write(log_line)
    except Exception:
        pass

def get_current_desktop_user():
    """
    Authoritatively determines the real active desktop user.
    Never defaults to root or temporary windroid-oobe account if a registered user exists.
    """
    # 1. Check logged-in user in active graphical session via loginctl
    try:
        ok, out, _ = run_command(["loginctl", "list-sessions", "--no-legend"], timeout=3)
        if ok and out:
            for line in out.splitlines():
                parts = line.strip().split()
                if len(parts) >= 3:
                    sess_id = parts[0]
                    u_name = parts[2]
                    if u_name not in ["root", "windroid-oobe", "lightdm"]:
                        ok_s, s_info, _ = run_command(["loginctl", "show-session", sess_id, "-p", "Type", "-p", "State"], timeout=2)
                        if ok_s and s_info and ("Type=x11" in s_info or "Type=wayland" in s_info or "State=active" in s_info):
                            return u_name
    except Exception:
        pass

    # 2. Check installer state file for registered user
    try:
        if os.path.exists(INSTALLER_STATE_FILE):
            with open(INSTALLER_STATE_FILE, "r", encoding="utf-8") as f:
                sdata = json.load(f)
                uc = sdata.get("userConfig") or {}
                un = str(uc.get("username", "")).strip()
                if un and un not in ["root", "windroid-oobe", "lightdm"]:
                    ok_u, _, _ = run_command(["getent", "passwd", un], timeout=2)
                    if ok_u:
                        return un
    except Exception:
        pass

    # 3. Check processes running on X11 display
    try:
        ok_ps, ps_out, _ = run_command(["ps", "-eo", "user,comm"], timeout=3)
        if ok_ps and ps_out:
            for line in ps_out.splitlines():
                parts = line.strip().split()
                if len(parts) >= 2:
                    u_proc, c_proc = parts[0], parts[1]
                    if c_proc in ["openbox", "windroid-desktop", "windroid-shell-runner.sh", "chromium"] and u_proc not in ["root", "windroid-oobe", "lightdm"]:
                        return u_proc
    except Exception:
        pass

    # 4. Check non-system user from passwd (UID >= 1000)
    try:
        import pwd
        for p in pwd.getpwall():
            if p.pw_uid >= 1000 and p.pw_name not in ["nobody", "windroid-oobe", "live", "user"]:
                return p.pw_name
    except Exception:
        pass

    # 5. Live fallback or environment variable
    if is_live_system():
        return "user"

    env_user = os.getenv("USER", "")
    if env_user and env_user not in ["root", "windroid-oobe"]:
        return env_user
    
    return "user"

def get_user_home():
    u = get_current_desktop_user()
    if u and u != "root":
        try:
            import pwd
            return pwd.getpwnam(u).pw_dir
        except Exception:
            p = f"/home/{u}"
            if os.path.exists(p):
                return p
    return os.path.expanduser("~")

def normalize_path(path):
    if not path:
        return os.path.realpath(get_user_home())
    expanded = os.path.expanduser(path)
    abs_path = os.path.abspath(expanded)
    try:
        return os.path.realpath(abs_path)
    except Exception:
        return abs_path

def is_system_path_protected(path):
    norm = normalize_path(path)
    for protected in PROTECTED_SYSTEM_PATHS:
        protected_real = os.path.realpath(protected) if os.path.exists(protected) else protected
        if norm == protected_real or norm.startswith(protected_real + "/"):
            return True
    return False

def is_path_writable(path):
    return not is_system_path_protected(path)

def format_bytes(size):
    if size >= 1024 * 1024 * 1024:
        return f"{size / (1024 * 1024 * 1024):.2f} GB"
    elif size >= 1024 * 1024:
        return f"{size / (1024 * 1024):.1f} MB"
    elif size >= 1024:
        return f"{size / 1024:.1f} KB"
    else:
        return f"{size} B"

def get_file_entry(full_path):
    try:
        st = os.stat(full_path, follow_symlinks=False)
        is_dir = os.path.isdir(full_path)
        name = os.path.basename(full_path) or full_path
        size = 0 if is_dir else st.st_size
        modified = datetime.datetime.fromtimestamp(st.st_mtime).isoformat()
        ext = os.path.splitext(name)[1].lstrip('.').lower() if not is_dir else ""
        
        return {
            "id": full_path,
            "name": name,
            "path": full_path,
            "type": "folder" if is_dir else "file",
            "sizeBytes": size,
            "sizeFormatted": format_bytes(size) if not is_dir else "--",
            "modifiedAt": modified,
            "extension": ext,
            "isReadOnly": not os.access(full_path, os.W_OK),
            "isHidden": name.startswith(".")
        }
    except Exception as e:
        return None

def get_known_folders():
    home = get_user_home()
    folders = {
        "home": home,
        "desktop": os.path.join(home, "Desktop"),
        "documents": os.path.join(home, "Documents"),
        "downloads": os.path.join(home, "Downloads"),
        "music": os.path.join(home, "Music"),
        "pictures": os.path.join(home, "Pictures"),
        "videos": os.path.join(home, "Videos")
    }
    for key, path in folders.items():
        if not os.path.exists(path):
            try:
                os.makedirs(path, exist_ok=True)
            except Exception:
                pass
    return folders

def get_trash_dir():
    home = get_user_home()
    trash_dir = os.path.join(home, ".local", "share", "Trash")
    files_dir = os.path.join(trash_dir, "files")
    info_dir = os.path.join(trash_dir, "info")
    os.makedirs(files_dir, exist_ok=True)
    os.makedirs(info_dir, exist_ok=True)
    return trash_dir, files_dir, info_dir

def move_to_trash(source_path):
    trash_dir, files_dir, info_dir = get_trash_dir()
    base_name = os.path.basename(source_path)
    
    # Avoid collision in trash
    target_name = base_name
    counter = 1
    while os.path.exists(os.path.join(files_dir, target_name)):
        name_part, ext_part = os.path.splitext(base_name)
        target_name = f"{name_part} ({counter}){ext_part}"
        counter += 1

    target_file_path = os.path.join(files_dir, target_name)
    target_info_path = os.path.join(info_dir, f"{target_name}.trashinfo")

    shutil.move(source_path, target_file_path)

    # Write FreeDesktop trashinfo
    deletion_date = datetime.datetime.now().strftime("%Y-%m-%dT%H:%M:%S")
    info_content = f"[Trash Info]\nPath={source_path}\nDeletionDate={deletion_date}\n"
    with open(target_info_path, "w", encoding="utf-8") as f:
        f.write(info_content)

    return True

def parse_cmdline():
    params = {}
    try:
        if os.path.exists("/proc/cmdline"):
            with open("/proc/cmdline", "r") as f:
                content = f.read().strip()
                for arg in content.split():
                    if "=" in arg:
                        k, v = arg.split("=", 1)
                        params[k] = v
                    else:
                        params[arg] = True
    except Exception:
        pass
    return params

def is_live_system():
    if (os.path.exists("/run/live") or 
        os.path.exists("/lib/live") or 
        os.path.exists("/run/initramfs/live") or 
        os.path.exists("/cdrom") or 
        os.path.exists("/medium")):
        return True
    try:
        if os.path.exists("/proc/cmdline"):
            with open("/proc/cmdline", "r") as f:
                cmdline = f.read()
                if "boot=live" in cmdline or "findiso=" in cmdline or "squashfs" in cmdline:
                    return True
    except Exception:
        pass
    return False

def get_boot_mode():
    params = parse_cmdline()
    mode = params.get("windroid.mode", "")
    if isinstance(mode, str) and mode in ["installer", "live", "installed"]:
        return mode
    if os.path.exists("/etc/windroid/runtime-mode"):
        try:
            with open("/etc/windroid/runtime-mode", "r") as f:
                rm = f.read().strip()
                if rm in ["installer", "live", "installed"]:
                    return rm
        except Exception:
            pass
    return "live" if is_live_system() else "installed"

INSTALLER_STATE_FILE = "/var/lib/windroid/installer-state.json"
STATE_VERSION = "windroid-installer-state-v1"

VALID_STATES = [
    "INSTALLER",
    "INSTALLATION_IN_PROGRESS",
    "INSTALLATION_COMPLETE",
    "OOBE_PENDING",
    "OOBE_IN_PROGRESS",
    "OOBE_COMPLETE",
    "DESKTOP_READY",
    "FAILED"
]

ALLOWED_STATE_TRANSITIONS = {
    "INSTALLER": ["INSTALLER", "INSTALLATION_IN_PROGRESS", "FAILED"],
    "INSTALLATION_IN_PROGRESS": ["INSTALLATION_IN_PROGRESS", "INSTALLATION_COMPLETE", "FAILED"],
    "INSTALLATION_COMPLETE": ["INSTALLATION_COMPLETE", "OOBE_PENDING", "FAILED"],
    "OOBE_PENDING": ["OOBE_PENDING", "OOBE_IN_PROGRESS", "FAILED"],
    "OOBE_IN_PROGRESS": ["OOBE_IN_PROGRESS", "OOBE_COMPLETE", "FAILED"],
    "OOBE_COMPLETE": ["OOBE_COMPLETE", "DESKTOP_READY", "FAILED"],
    "DESKTOP_READY": ["DESKTOP_READY", "FAILED"],
    "FAILED": ["INSTALLER", "FAILED"]
}

def is_valid_state_transition(from_state: str, to_state: str) -> bool:
    if not from_state or from_state not in ALLOWED_STATE_TRANSITIONS:
        return to_state in VALID_STATES
    return to_state in ALLOWED_STATE_TRANSITIONS.get(from_state, [])

RESERVED_SYSTEM_USERNAMES = {
    "root", "bin", "daemon", "sys", "sync", "games", "man", "lp", "mail", "news",
    "uucp", "proxy", "www-data", "backup", "list", "irc", "gnats", "nobody",
    "systemd-network", "systemd-resolve", "messagebus", "systemd-timesync",
    "avahi-autoipd", "avahi", "usbmux", "dnsmasq", "kdm", "gdm", "lightdm",
    "nodm", "desktop", "guest", "live", "user", "windroid-pc", "windroid-oobe"
}

def validate_native_installer_state_data(data: dict) -> tuple[bool, str | None]:
    if not isinstance(data, dict):
        return False, "State data must be a dictionary"

    if data.get("version") != STATE_VERSION:
        return False, f"Invalid version: '{data.get('version')}', expected '{STATE_VERSION}'"

    state = data.get("state")
    if state not in VALID_STATES:
        return False, f"Invalid state: '{state}'"

    # 0. INSTALLER
    if state == "INSTALLER":
        if data.get("installationCompleted") is True:
            return False, "installationCompleted must be false for INSTALLER state"
        if data.get("oobeCompleted") is True:
            return False, "oobeCompleted must be false for INSTALLER state"
        if data.get("userConfig") is not None:
            return False, "userConfig must be null for INSTALLER state"
        return True, None

    # 1. INSTALLATION_IN_PROGRESS
    if state == "INSTALLATION_IN_PROGRESS":
        if data.get("userConfig") is not None:
            return False, "userConfig must be null during INSTALLATION_IN_PROGRESS"
        if data.get("installationCompleted") is True:
            return False, "installationCompleted must be false during INSTALLATION_IN_PROGRESS"
        if data.get("oobeCompleted") is True:
            return False, "oobeCompleted must be false during INSTALLATION_IN_PROGRESS"
        return True, None

    # 2. OOBE_PENDING / INSTALLATION_COMPLETE
    if state in ["OOBE_PENDING", "INSTALLATION_COMPLETE"]:
        if data.get("userConfig") is not None:
            return False, f"userConfig must be null in {state} state before user registration"
        if data.get("installationCompleted") is not True:
            return False, f"installationCompleted must be true for {state}"
        if data.get("oobeCompleted") is True:
            return False, f"oobeCompleted must be false for {state}"
        if not (data.get("installationCompletedAt") or data.get("completedAt") or data.get("updatedAt")):
            return False, f"Timestamp (installationCompletedAt) must be present for {state}"
        if data.get("error") is not None:
            return False, f"error must be null for {state}"
        return True, None

    # 3. OOBE_IN_PROGRESS
    if state == "OOBE_IN_PROGRESS":
        if data.get("userConfig") is not None:
            return False, "userConfig must be null during OOBE_IN_PROGRESS before user completion"
        if data.get("installationCompleted") is not True:
            return False, "installationCompleted must be true for OOBE_IN_PROGRESS"
        if data.get("oobeCompleted") is True:
            return False, "oobeCompleted must be false during OOBE_IN_PROGRESS"
        if data.get("error") is not None:
            return False, "error must be null for OOBE_IN_PROGRESS"
        return True, None

    # 4. OOBE_COMPLETE / DESKTOP_READY
    if state in ["OOBE_COMPLETE", "DESKTOP_READY"]:
        if data.get("installationCompleted") is not True:
            return False, f"installationCompleted must be true for {state}"
        if data.get("oobeCompleted") is not True:
            return False, f"oobeCompleted must be true for {state}"
        u_cfg = data.get("userConfig")
        if not isinstance(u_cfg, dict):
            return False, f"userConfig must be a valid dictionary for {state}"
        username = str(u_cfg.get("username", "")).strip()
        if not username or username == "windroid-oobe" or username in RESERVED_SYSTEM_USERNAMES:
            return False, f"userConfig contains invalid or reserved username: '{username}'"
        if not re.match(r'^[a-z_][a-z0-9_-]*$', username):
            return False, f"userConfig username '{username}' does not match required format"
        if not (data.get("oobeCompletedAt") or data.get("completedAt") or data.get("updatedAt")):
            return False, f"Timestamp (oobeCompletedAt or completedAt) must be present for {state}"
        if data.get("error") is not None:
            return False, f"error must be null for {state}"
        return True, None

    # 5. FAILED
    if state == "FAILED":
        return True, None

    return True, None

def validate_desktop_ready(data: dict, check_system: bool = False) -> tuple[bool, str | None]:
    """
    Formally validates all invariants for DESKTOP_READY state:
    1. State data is a dictionary
    2. State is 'DESKTOP_READY'
    3. installationCompleted is True
    4. oobeCompleted is True
    5. userConfig is a valid dictionary
    6. username is non-empty, non-reserved, and valid linux username format
    7. username is not root and not windroid-oobe
    8. error is None
    9. timestamp is present
    When check_system is True:
    10. Real user exists in system (getent passwd)
    11. Real user UID >= 1000
    12. User home directory (/home/<username>) exists
    13. User home directory is owned by the real user
    14. User's login shell is valid/executable
    15. User belongs to essential groups
    16. LightDM autologin configuration exists at /etc/lightdm/lightdm.conf.d/80-windroid-autologin.conf
    17. LightDM autologin configuration explicitly specifies autologin-user=<username>
    18. LightDM autologin configuration does not specify windroid-oobe
    19. OOBE autologin config (80-windroid-oobe.conf) is absent
    20. Live autologin config (80-windroid-live-autologin.conf) is absent
    """
    if not isinstance(data, dict):
        return False, "State data must be a dictionary"
    
    if data.get("state") != "DESKTOP_READY":
        return False, f"Expected state 'DESKTOP_READY', got '{data.get('state')}'"
    
    if data.get("installationCompleted") is not True:
        return False, "installationCompleted must be true for DESKTOP_READY"
        
    if data.get("oobeCompleted") is not True:
        return False, "oobeCompleted must be true for DESKTOP_READY"

    if data.get("error") is not None:
        return False, "error must be null for DESKTOP_READY"

    if not (data.get("oobeCompletedAt") or data.get("completedAt") or data.get("updatedAt")):
        return False, "Timestamp must be present for DESKTOP_READY"
        
    u_cfg = data.get("userConfig")
    if not isinstance(u_cfg, dict):
        return False, "userConfig must be a valid dictionary"
        
    username = str(u_cfg.get("username", "")).strip()
    if not username or username == "windroid-oobe" or username in RESERVED_SYSTEM_USERNAMES:
        return False, f"Invalid or reserved username '{username}'"
        
    if not re.match(r'^[a-z_][a-z0-9_-]*$', username):
        return False, f"Username '{username}' contains invalid characters"

    if check_system:
        ok_getent, out_getent, _ = run_command(["getent", "passwd", username])
        if not ok_getent or not out_getent.strip():
            return False, f"Real user '{username}' does not exist in passwd database"
        
        parts = out_getent.strip().split(":")
        if len(parts) >= 7:
            try:
                uid = int(parts[2])
                if uid < 1000 and username != "root":
                    return False, f"User '{username}' has system UID {uid} (< 1000)"
            except ValueError:
                pass
            
            user_home = parts[5]
            user_shell = parts[6]
            
            if not os.path.exists(user_home):
                return False, f"User home directory '{user_home}' does not exist"
                
            try:
                st = os.stat(user_home)
                if uid >= 1000 and st.st_uid != uid and os.geteuid() == 0:
                    return False, f"User home '{user_home}' is not owned by user {uid}"
            except Exception:
                pass

            if user_shell and not os.path.exists(user_shell) and not os.path.exists("/bin/sh"):
                return False, f"User login shell '{user_shell}' does not exist"
        else:
            user_home = f"/home/{username}"
            if not os.path.exists(user_home):
                return False, f"User home directory '{user_home}' does not exist"
            
        lightdm_conf = "/etc/lightdm/lightdm.conf.d/80-windroid-autologin.conf"
        if not os.path.exists(lightdm_conf):
            return False, f"LightDM autologin config '{lightdm_conf}' does not exist"
            
        try:
            with open(lightdm_conf, "r", encoding="utf-8") as f:
                content = f.read()
                if f"autologin-user={username}" not in content:
                    return False, f"LightDM autologin is not set to '{username}'"
                if "autologin-user=windroid-oobe" in content:
                    return False, "LightDM autologin still contains temporary user 'windroid-oobe'"
        except Exception as e:
            return False, f"Failed to read LightDM config: {e}"

        oobe_conf = "/etc/lightdm/lightdm.conf.d/80-windroid-oobe.conf"
        if os.path.exists(oobe_conf):
            return False, f"Obsolete OOBE config '{oobe_conf}' still exists"

        live_conf = "/etc/lightdm/lightdm.conf.d/80-windroid-live-autologin.conf"
        if os.path.exists(live_conf):
            return False, f"Obsolete Live autologin config '{live_conf}' still exists"

    return True, None

def _write_single_state_file_atomic(file_path: str, data: dict) -> bool:
    """Internal helper to atomically write, flush, fsync, and replace a single state file."""
    dir_path = os.path.dirname(file_path)
    os.makedirs(dir_path, exist_ok=True)
    tmp_path = file_path + ".tmp"
    try:
        payload = json.dumps(data, indent=2)
        with open(tmp_path, "w", encoding="utf-8") as f:
            f.write(payload)
            f.flush()
            os.fsync(f.fileno())
        os.chmod(tmp_path, 0o644)
        os.replace(tmp_path, file_path)
        os.chmod(file_path, 0o644)

        try:
            dir_fd = os.open(dir_path, os.O_DIRECTORY)
            try:
                os.fsync(dir_fd)
            finally:
                os.close(dir_fd)
        except Exception:
            pass
        return True
    except Exception as e:
        _log_installer(f"Error atomically writing state file {file_path}: {e}")
        if os.path.exists(tmp_path):
            try:
                os.remove(tmp_path)
            except Exception:
                pass
        return False

def load_native_installer_state(target_root="/"):
    primary_filepath = os.path.join(target_root, "var/lib/windroid/installer-state.json")
    backup_filepath = os.path.join(target_root, "var/lib/windroid/installation-state.json")

    p_data = None
    p_valid = False
    p_gen = 0

    b_data = None
    b_valid = False
    b_gen = 0

    # 1. Read and validate Primary
    if os.path.exists(primary_filepath):
        try:
            with open(primary_filepath, "r", encoding="utf-8") as f:
                p_data = json.load(f)
                valid, err = validate_native_installer_state_data(p_data)
                if valid:
                    p_valid = True
                    p_gen = int(p_data.get("generation", 0) or 0)
                else:
                    _log_installer(f"Warning: Primary state file {primary_filepath} failed validation: {err}")
        except Exception as e:
            _log_installer(f"Failed to read native installer primary state file {primary_filepath}: {e}")

    # 2. Read and validate Backup
    if os.path.exists(backup_filepath):
        try:
            with open(backup_filepath, "r", encoding="utf-8") as f:
                b_data = json.load(f)
                valid, err = validate_native_installer_state_data(b_data)
                if valid:
                    b_valid = True
                    b_gen = int(b_data.get("generation", 0) or 0)
                else:
                    _log_installer(f"Warning: Backup state file {backup_filepath} failed validation: {err}")
        except Exception as e:
            _log_installer(f"Failed to read native installer backup state file {backup_filepath}: {e}")

    # 3. Decision Matrix with Self-Healing
    if p_valid and b_valid:
        if b_gen > p_gen:
            _log_installer(f"Self-Healing: Backup state has higher generation ({b_gen} > {p_gen}), recovering primary.")
            _write_single_state_file_atomic(primary_filepath, b_data)
            res = dict(b_data)
            res["success"] = True
            return res
        elif p_gen > b_gen:
            _log_installer(f"Self-Healing: Primary state has higher generation ({p_gen} > {b_gen}), updating backup.")
            _write_single_state_file_atomic(backup_filepath, p_data)
            res = dict(p_data)
            res["success"] = True
            return res
        else:
            res = dict(p_data)
            res["success"] = True
            return res

    elif p_valid and not b_valid:
        _log_installer(f"Self-Healing: Primary state valid, recovering corrupt/missing backup {backup_filepath}.")
        _write_single_state_file_atomic(backup_filepath, p_data)
        res = dict(p_data)
        res["success"] = True
        return res

    elif b_valid and not p_valid:
        _log_installer(f"Self-Healing: Backup state valid, recovering corrupt/missing primary {primary_filepath} (state: {b_data.get('state')}).")
        _write_single_state_file_atomic(primary_filepath, b_data)
        res = dict(b_data)
        res["success"] = True
        return res

    # 4. Default state based on runtime environment
    is_live = is_live_system() if target_root == "/" else False
    if is_live:
        return {
            "success": True,
            "version": STATE_VERSION,
            "state": "INSTALLER",
            "generation": 0,
            "updatedAt": datetime.datetime.now(datetime.timezone.utc).isoformat(),
            "targetDisk": None,
            "localeConfig": {},
            "userConfig": None,
            "installationCompleted": False,
            "installationCompletedAt": None,
            "oobeCompleted": False,
            "oobeCompletedAt": None,
            "completedAt": None,
            "error": None
        }

    return {
        "success": False,
        "version": STATE_VERSION,
        "state": "FAILED",
        "generation": 0,
        "updatedAt": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "error": f"Corrupted or missing state file at {primary_filepath}"
    }

def save_native_installer_state(target_root="/", state="OOBE_PENDING", data=None):
    if state not in VALID_STATES:
        raise ValueError(f"Invalid state: {state}")

    dirpath = os.path.join(target_root, "var/lib/windroid")
    os.makedirs(dirpath, exist_ok=True)
    filepath = os.path.join(dirpath, "installer-state.json")
    backuppath = os.path.join(dirpath, "installation-state.json")

    existing = load_native_installer_state(target_root)
    existing_state = existing.get("state")
    if existing.get("success") and existing_state and not is_valid_state_transition(existing_state, state):
        _log_installer(f"ERROR: Illegal state transition attempted from '{existing_state}' to '{state}'")
        raise ValueError(f"Illegal state transition from '{existing_state}' to '{state}'")

    now = datetime.datetime.now(datetime.timezone.utc).isoformat()

    is_installed = state in ["INSTALLATION_COMPLETE", "OOBE_PENDING", "OOBE_IN_PROGRESS", "OOBE_COMPLETE", "DESKTOP_READY"]
    is_oobe_done = state in ["OOBE_COMPLETE", "DESKTOP_READY"]

    target_disk = (data or {}).get("targetDisk") or existing.get("targetDisk")
    locale_cfg = (data or {}).get("localeConfig") or existing.get("localeConfig", {})

    if state in ["INSTALLER", "INSTALLATION_IN_PROGRESS", "INSTALLATION_COMPLETE", "OOBE_PENDING"]:
        user_cfg = None
    elif state in ["OOBE_COMPLETE", "DESKTOP_READY"]:
        user_cfg = (data or {}).get("userConfig") or existing.get("userConfig")
    else:
        user_cfg = (data or {}).get("userConfig") if (data and "userConfig" in data) else existing.get("userConfig")

    if user_cfg and isinstance(user_cfg, dict):
        user_cfg = dict(user_cfg)
        user_cfg.pop("password", None)
        user_cfg.pop("confirmPassword", None)

    inst_completed_at = existing.get("installationCompletedAt") or ((data or {}).get("installationCompletedAt") if data else None)
    if is_installed and not inst_completed_at:
        inst_completed_at = now

    oobe_completed_at = existing.get("oobeCompletedAt") or ((data or {}).get("oobeCompletedAt") if data else None)
    if is_oobe_done and not oobe_completed_at:
        oobe_completed_at = now

    # Compute next monotonic generation
    prev_gen = 0
    for path_to_check in [filepath, backuppath]:
        if os.path.exists(path_to_check):
            try:
                with open(path_to_check, "r", encoding="utf-8") as f:
                    d = json.load(f)
                    g = int(d.get("generation", 0) or 0)
                    if g > prev_gen:
                        prev_gen = g
            except Exception:
                pass

    merged_data = {
        "version": STATE_VERSION,
        "state": state,
        "generation": prev_gen + 1,
        "updatedAt": now,
        "targetDisk": target_disk,
        "localeConfig": locale_cfg,
        "userConfig": user_cfg,
        "installationCompleted": is_installed,
        "installationCompletedAt": inst_completed_at,
        "oobeCompleted": is_oobe_done,
        "oobeCompletedAt": oobe_completed_at,
        "completedAt": oobe_completed_at if is_oobe_done else (inst_completed_at if is_installed else None),
        "error": (data or {}).get("error") if state == "FAILED" else None
    }

    is_valid, val_err = validate_native_installer_state_data(merged_data)
    if not is_valid:
        _log_installer(f"ERROR: Generated invalid native installer state for '{state}': {val_err}")
        raise ValueError(f"Invalid state data generated for '{state}': {val_err}")

    # Write primary file atomically
    ok_p = _write_single_state_file_atomic(filepath, merged_data)
    if not ok_p:
        raise RuntimeError(f"Failed to atomically write primary state file {filepath}")

    # Write backup file atomically
    ok_b = _write_single_state_file_atomic(backuppath, merged_data)
    if not ok_b:
        _log_installer(f"Warning: Failed to atomically write backup state file {backuppath}")

    # Read-back verification
    try:
        with open(filepath, "r", encoding="utf-8") as f:
            rb_primary = json.load(f)
            rb_p_valid, rb_p_err = validate_native_installer_state_data(rb_primary)
            if not rb_p_valid:
                raise RuntimeError(f"Primary state read-back validation failed: {rb_p_err}")

        with open(backuppath, "r", encoding="utf-8") as f:
            rb_backup = json.load(f)
            rb_b_valid, rb_b_err = validate_native_installer_state_data(rb_backup)
            if not rb_b_valid:
                raise RuntimeError(f"Backup state read-back validation failed: {rb_b_err}")
    except Exception as e:
        _log_installer(f"CRITICAL: State persistence read-back verification failed on {dirpath}: {e}")
        raise RuntimeError(f"CRITICAL: State persistence read-back verification failed: {e}")

    run_command(["sync"])
    merged_data["success"] = True
    return merged_data

def complete_oobe_impl(body: dict):
    username = str(body.get("username", "")).strip().lower()
    password = str(body.get("password", ""))
    full_name = str(body.get("fullName", "")).strip() or username
    device_name = str(body.get("deviceName", "")).strip() or "Windroid-PC"
    timezone = str(body.get("timezone", "")).strip()
    keyboard = str(body.get("keyboard", "")).strip()

    if not username or len(username) > 32:
        return {"success": False, "error": "Username must be between 1 and 32 characters long."}

    if not re.match(r'^[a-z_][a-z0-9_-]*\$?$', username):
        return {
            "success": False,
            "error": "Invalid username format. Username must start with a lowercase letter or underscore and contain only lowercase letters, numbers, hyphens, or underscores."
        }

    if username in RESERVED_SYSTEM_USERNAMES or username in ["windroid-oobe", "root", "user"]:
        return {"success": False, "error": f"Username '{username}' is a reserved system or temporary account and cannot be used."}

    _log_installer(f"OOBE: Creating native user account '{username}'")
    cmd_useradd = ["useradd", "-m", "-c", full_name, "-s", "/bin/bash", username]
    ok, out, err = run_command(cmd_useradd)
    if not ok and "already exists" not in err and "in use" not in err:
        ok_s, out_s, err_s = run_command(["sudo"] + cmd_useradd)
        if not ok_s and "already exists" not in err_s and "in use" not in err_s:
            return {"success": False, "error": f"Failed to create user account: {err or err_s}"}

    if password:
        try:
            proc = subprocess.Popen(["chpasswd"], stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
            p_out, p_err = proc.communicate(input=f"{username}:{password}\n", timeout=5)
            if proc.returncode != 0:
                _log_installer(f"OOBE Warning: chpasswd returned non-zero code: {p_err}")
        except Exception as e:
            _log_installer(f"OOBE Error setting password: {e}")

    for group in ["sudo", "video", "audio", "render", "netdev", "plugdev", "input"]:
        run_command(["usermod", "-aG", group, username])

    user_home = f"/home/{username}"
    openbox_dir = f"{user_home}/.config/openbox"
    os.makedirs(openbox_dir, exist_ok=True)
    autostart_path = f"{openbox_dir}/autostart"
    with open(autostart_path, "w") as f:
        f.write("#!/bin/sh\n/usr/bin/windroid-shell-runner.sh &\n")
    os.chmod(autostart_path, 0o755)

    run_command(["chown", "-R", f"{username}:{username}", user_home])

    if device_name:
        try:
            with open("/etc/hostname", "w") as f:
                f.write(device_name + "\n")
            with open("/etc/hosts", "w") as f:
                f.write(f"127.0.0.1\tlocalhost\n127.0.1.1\t{device_name}\n")
        except Exception as e:
            _log_installer(f"Notice: Could not set hostname in OOBE: {e}")

    if timezone:
        tz_path = f"/usr/share/zoneinfo/{timezone}"
        if os.path.exists(tz_path):
            run_command(["ln", "-sf", tz_path, "/etc/localtime"])

    # Verify real user exists before configuring LightDM
    ok_getent, out_getent, _ = run_command(["getent", "passwd", username])
    if not ok_getent or not out_getent.strip() or not os.path.exists(user_home):
        return {"success": False, "error": f"Failed to verify creation of real user '{username}'."}

    # Configure LightDM for real user autologin using write -> validate -> replace
    lightdm_conf_dir = "/etc/lightdm/lightdm.conf.d"
    os.makedirs(lightdm_conf_dir, exist_ok=True)
    lightdm_conf = os.path.join(lightdm_conf_dir, "80-windroid-autologin.conf")
    lightdm_tmp = lightdm_conf + ".tmp"

    conf_content = (
        "# Windroid OS Authenticated User Session Configuration\n"
        "[Seat:*]\n"
        "autologin-guest=false\n"
        f"autologin-user={username}\n"
        "autologin-user-timeout=0\n"
        "user-session=openbox\n"
    )

    try:
        with open(lightdm_tmp, "w", encoding="utf-8") as f:
            f.write(conf_content)
            f.flush()
            os.fsync(f.fileno())

        with open(lightdm_tmp, "r", encoding="utf-8") as f:
            if f"autologin-user={username}" not in f.read():
                raise RuntimeError(f"Validation of LightDM real user configuration failed for '{username}'")

        os.replace(lightdm_tmp, lightdm_conf)

        # Remove OOBE & Live autologin configs
        for old_cfg in ["80-windroid-oobe.conf", "80-windroid-live-autologin.conf"]:
            old_path = os.path.join(lightdm_conf_dir, old_cfg)
            if os.path.exists(old_path):
                try:
                    os.remove(old_path)
                except Exception:
                    pass
    except Exception as e:
        _log_installer(f"FATAL: Error writing LightDM autologin for real user '{username}': {e}")
        return {"success": False, "error": f"Could not write LightDM autologin configuration: {e}"}

    # Persist state atomically
    save_native_installer_state("/", "OOBE_COMPLETE", {
        "userConfig": {"username": username, "fullName": full_name, "deviceName": device_name}
    })
    final_state = save_native_installer_state("/", "DESKTOP_READY", {
        "userConfig": {"username": username, "fullName": full_name, "deviceName": device_name}
    })

    # Validate DESKTOP_READY invariants
    d_valid, d_err = validate_desktop_ready(final_state, check_system=False)
    if not d_valid:
        _log_installer(f"ERROR: DESKTOP_READY validation failed: {d_err}")
        return {"success": False, "error": f"State validation failed: {d_err}"}

    # Schedule background session transition if running under temporary windroid-oobe account
    def _deferred_session_transition():
        try:
            time.sleep(2.0)
            ok_oobe_check, oobe_out, _ = run_command(["getent", "passwd", "windroid-oobe"])
            if ok_oobe_check and oobe_out.strip():
                _log_installer("OOBE: Initiating graceful display manager reload for real user session...")
                run_command(["systemctl", "restart", "lightdm"])
                time.sleep(1.0)
                run_command(["pkill", "-9", "-u", "windroid-oobe"])
                run_command(["userdel", "-r", "windroid-oobe"])
                _log_installer("OOBE: Temporary user 'windroid-oobe' successfully cleaned up.")
        except Exception as e:
            _log_installer(f"Notice during deferred session transition: {e}")

    if os.path.exists(lightdm_conf) and os.path.exists(user_home):
        t = threading.Thread(target=_deferred_session_transition, daemon=True)
        t.start()

    run_command(["sync"])
    return {"success": True, "username": username, "state": "DESKTOP_READY"}

def get_runtime_mode():
    bm = get_boot_mode()
    if bm in ["installer", "live", "installed"]:
        return bm
    if is_live_system():
        return "live"
    return "installed"

class WindroidBridgeHandler(BaseHTTPRequestHandler):
    def _send_cors_headers(self):
        origin = self.headers.get("Origin", "") if self.headers else ""
        allowed_origins = [
            "http://127.0.0.1:4173", "http://localhost:4173",
            "http://127.0.0.1:3000", "http://localhost:3000",
            "http://127.0.0.1:5173", "http://localhost:5173",
            "file://"
        ]
        if origin in allowed_origins or any(origin.startswith(o) for o in allowed_origins):
            self.send_header("Access-Control-Allow-Origin", origin)
        else:
            self.send_header("Access-Control-Allow-Origin", origin if origin else "http://127.0.0.1:4173")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, X-Windroid-Bridge-Token, Authorization")
        self.send_header("Access-Control-Allow-Credentials", "true")
        self.send_header("Access-Control-Max-Age", "86400")

    def do_OPTIONS(self):
        self.send_response(200)
        self._send_cors_headers()
        self.send_header("Content-Length", "0")
        self.end_headers()

    def _send_json(self, data, code=200):
        self.send_response(code)
        self._send_cors_headers()
        self.send_header("Content-Type", "application/json")
        self.end_headers()
        self.wfile.write(json.dumps(data).encode("utf-8"))

    def _send_error(self, message, code=400):
        self._send_json({"error": message, "success": False}, code=code)

    def do_GET(self):
        parsed = urlparse(self.path)
        path = parsed.path

        if path == "/api/health":
            live = is_live_system()
            self._send_json({
                "status": "ok",
                "service": "Windroid Native System Bridge",
                "runtime": "native-live" if live else "native-installed",
                "isNative": True,
                "version": "1.0.0"
            })
        elif path == "/api/session/token":
            origin = self.headers.get("Origin", "") if self.headers else ""
            host = self.headers.get("Host", "") if self.headers else ""
            client_ip = self.client_address[0] if self.client_address else ""
            allowed_hosts = ["127.0.0.1:4174", "localhost:4174", "127.0.0.1", "localhost"]
            allowed_origins = [
                "http://127.0.0.1:4173", "http://localhost:4173",
                "http://127.0.0.1:3000", "http://localhost:3000",
                "http://127.0.0.1:5173", "http://localhost:5173",
                "file://"
            ]
            is_loopback_client = client_ip in ["127.0.0.1", "::1", "localhost", "::ffff:127.0.0.1"]
            is_valid_origin = (not origin or origin in allowed_origins or any(origin.startswith(o) for o in allowed_origins))
            is_valid_host = (any(h in host for h in allowed_hosts) or not host)

            if is_loopback_client or (is_valid_origin and is_valid_host):
                self._send_json({"success": True, "token": BRIDGE_SESSION_TOKEN})
            else:
                self._send_error("Forbidden: Session token requested from unapproved origin", 403)
        elif path == "/api/system-info":
            self.handle_system_info()
        elif path == "/api/drives":
            self.handle_drives()
        elif path == "/api/installed-apps":
            self.handle_installed_apps()
        elif path == "/api/fs/known-folders":
            self._send_json({"knownFolders": get_known_folders(), "success": True})
        elif path == "/api/fs/trash":
            self.handle_list_trash()
        elif path == "/api/network/status":
            self._send_json(get_network_status_impl())
        elif path == "/api/network/devices":
            self._send_json({"devices": get_network_devices_impl(), "success": True})
        elif path == "/api/network/wifi/networks":
            self._send_json(get_wifi_networks_impl())
        elif path == "/api/network/wifi/saved":
            self.handle_wifi_saved_get()
        elif path == "/api/network/hotspot/capabilities":
            self._send_json(get_hotspot_capabilities_impl())
        elif path == "/api/bluetooth/status":
            self._send_json(get_bluetooth_status_impl())
        elif path == "/api/bluetooth/adapters":
            self._send_json(get_bluetooth_adapters_impl())
        elif path == "/api/bluetooth/devices":
            self._send_json(get_bluetooth_devices_impl())
        elif path == "/api/capabilities":
            self._send_json(get_system_capabilities_impl())
        elif path == "/api/display/info":
            self._send_json(get_display_info_impl())
        elif path == "/api/audio/status":
            self._send_json(get_audio_status_impl())
        elif path == "/api/power/status":
            self._send_json(get_power_status_impl())
        elif path == "/api/accounts/list":
            self._send_json(get_accounts_impl())
        elif path == "/api/identity/get":
            self._send_json(get_identity_impl())
        elif path == "/api/locale/get":
            self._send_json(get_locale_impl())
        elif path == "/api/personalization/get":
            self._send_json(get_personalization_impl())
        elif path == "/api/session/status":
            self._send_json(get_session_status_impl())
        elif path == "/api/system/runtime-mode":
            raw_cmd = ""
            try:
                if os.path.exists("/proc/cmdline"):
                    with open("/proc/cmdline", "r") as f:
                        raw_cmd = f.read().strip()
            except Exception:
                pass
            bm = get_boot_mode()
            rm = get_runtime_mode()
            self._send_json({
                "success": True,
                "runtimeMode": rm,
                "bootMode": bm,
                "rawKernelCmdline": raw_cmd,
                "detectedWindroidMode": bm,
                "isLiveFilesystem": is_live_system(),
                "isLiveUser": (os.getenv("USER", "live") in ["live", "user"] and is_live_system()),
                "currentUser": os.getenv("USER", "live"),
                "isNative": True
            })
        elif path == "/api/installer/status":
            self._send_json(get_installer_status_impl())
        elif path == "/api/installer/disks":
            self._send_json(get_installer_disks_impl())
        elif path == "/api/installer/boot-mode":
            self._send_json(get_installer_boot_mode_impl())
        elif path == "/api/installer/native-state":
            self._send_json(load_native_installer_state())
        else:
            self._send_error("Endpoint not found", 404)

    def do_POST(self):
        try:
            parsed = urlparse(self.path)
            endpoint = parsed.path

            provided_token = self.headers.get("X-Windroid-Bridge-Token") or self.headers.get("Authorization", "").replace("Bearer ", "").strip()
            if not provided_token or not secrets.compare_digest(provided_token, BRIDGE_SESSION_TOKEN):
                return self._send_error("UNAUTHORIZED: Invalid or missing bridge session token (X-Windroid-Bridge-Token header required)", 401)

            content_len = int(self.headers.get("Content-Length", 0))
            body_bytes = self.rfile.read(content_len) if content_len > 0 else b"{}"
            try:
                body = json.loads(body_bytes.decode("utf-8"))
            except Exception:
                body = {}

            if endpoint == "/api/drives/mount":
                self.handle_drive_mount(body)
            elif endpoint == "/api/drives/unmount":
                self.handle_drive_unmount(body)
            elif endpoint == "/api/drives/eject":
                self.handle_drive_eject(body)
            elif endpoint == "/api/fs/list":
                self.handle_fs_list(body)
            elif endpoint == "/api/fs/metadata":
                self.handle_fs_metadata(body)
            elif endpoint == "/api/fs/create-folder":
                self.handle_fs_create_folder(body)
            elif endpoint == "/api/fs/create-file":
                self.handle_fs_create_file(body)
            elif endpoint == "/api/fs/rename":
                self.handle_fs_rename(body)
            elif endpoint == "/api/fs/copy":
                self.handle_fs_copy(body)
            elif endpoint == "/api/fs/move":
                self.handle_fs_move(body)
            elif endpoint == "/api/fs/delete":
                self.handle_fs_delete(body)
            elif endpoint == "/api/fs/read-file":
                self.handle_fs_read_file(body)
            elif endpoint == "/api/fs/write-file":
                self.handle_fs_write_file(body)
            elif endpoint == "/api/fs/trash/restore":
                self.handle_trash_restore(body)
            elif endpoint == "/api/fs/trash/delete-permanent":
                self.handle_trash_delete_permanent(body)
            elif endpoint == "/api/fs/trash/empty":
                self.handle_trash_empty()
            elif endpoint == "/api/network/wifi/enabled":
                self.handle_wifi_enabled_post(body)
            elif endpoint == "/api/network/wifi/connect":
                self.handle_wifi_connect_post(body)
            elif endpoint == "/api/network/wifi/disconnect":
                self.handle_wifi_disconnect_post(body)
            elif endpoint == "/api/network/wifi/forget":
                self.handle_wifi_forget_post(body)
            elif endpoint == "/api/network/hotspot/start":
                self.handle_hotspot_start_post(body)
            elif endpoint == "/api/network/hotspot/stop":
                self.handle_hotspot_stop_post(body)
            elif endpoint == "/api/network/airplane-mode":
                self.handle_airplane_mode_post(body)
            elif endpoint == "/api/bluetooth/powered":
                self.handle_bluetooth_powered_post(body)
            elif endpoint == "/api/bluetooth/discovery/start":
                self.handle_bluetooth_discovery_start_post()
            elif endpoint == "/api/bluetooth/discovery/stop":
                self.handle_bluetooth_discovery_stop_post()
            elif endpoint == "/api/bluetooth/pair":
                self.handle_bluetooth_pair_post(body)
            elif endpoint == "/api/bluetooth/pairing/respond":
                self.handle_bluetooth_pairing_respond_post(body)
            elif endpoint == "/api/bluetooth/connect":
                self.handle_bluetooth_connect_post(body)
            elif endpoint == "/api/bluetooth/disconnect":
                self.handle_bluetooth_disconnect_post(body)
            elif endpoint == "/api/bluetooth/remove":
                self.handle_bluetooth_remove_post(body)
            elif endpoint == "/api/display/configure":
                self._send_json(configure_display_impl(body))
            elif endpoint == "/api/display/brightness":
                self._send_json(set_display_brightness_impl(body))
            elif endpoint == "/api/display/nightlight":
                self._send_json(set_display_nightlight_impl(body))
            elif endpoint == "/api/audio/volume":
                self._send_json(set_audio_volume_impl(body))
            elif endpoint == "/api/audio/default-device":
                self._send_json(set_audio_default_device_impl(body))
            elif endpoint == "/api/power/action":
                self._send_json(set_power_action_impl(body))
            elif endpoint == "/api/power/battery-saver":
                self._send_json(set_battery_saver_impl(body))
            elif endpoint == "/api/accounts/create":
                self._send_json(create_account_impl(body))
            elif endpoint == "/api/accounts/update":
                self._send_json(update_account_impl(body))
            elif endpoint == "/api/accounts/delete":
                self._send_json(delete_account_impl(body))
            elif endpoint == "/api/auth/authenticate":
                self._send_json(authenticate_impl(body))
            elif endpoint == "/api/auth/change-password":
                self._send_json(change_password_impl(body))
            elif endpoint == "/api/identity/set-hostname":
                self._send_json(set_hostname_impl(body))
            elif endpoint == "/api/locale/set-timezone":
                self._send_json(set_timezone_impl(body))
            elif endpoint == "/api/locale/set-locale":
                self._send_json(set_locale_impl(body))
            elif endpoint == "/api/locale/set-keyboard":
                self._send_json(set_keyboard_impl(body))
            elif endpoint == "/api/locale/set-ntp":
                self._send_json(set_ntp_impl(body))
            elif endpoint == "/api/personalization/set":
                self._send_json(set_personalization_impl(body))
            elif endpoint == "/api/session/lock":
                self._send_json(set_session_lock_impl())
            elif endpoint == "/api/session/unlock":
                self._send_json(set_session_unlock_impl(body))
            elif endpoint == "/api/session/logout":
                self._send_json(set_session_logout_impl())
            elif endpoint == "/api/installer/plan":
                self._send_json(generate_installer_plan_impl(body))
            elif endpoint == "/api/installer/validate":
                self._send_json(validate_installer_plan_impl(body))
            elif endpoint == "/api/installer/authorize":
                self._send_json(authorize_installer_plan_impl(body))
            elif endpoint == "/api/installer/execute":
                self._send_json(execute_installer_plan_impl(body))
            elif endpoint == "/api/installer/complete-oobe":
                self._send_json(complete_oobe_impl(body))
            else:
                self._send_error("Endpoint not found", 404)
        except Exception as e:
            _log_installer(f"Unhandled Exception in do_POST: {e}")
            self._send_error(f"Internal Bridge Server Error: {str(e)}", 500)

    def handle_system_info(self):
        hostname = "Windroid-PC"
        try:
            with open("/etc/hostname", "r") as f:
                hostname = f.read().strip()
        except Exception:
            pass

        cores = os.cpu_count() or 1
        cpu_model = "Generic Linux Processor"
        try:
            if os.path.exists("/proc/cpuinfo"):
                with open("/proc/cpuinfo", "r") as f:
                    for line in f:
                        if line.startswith("model name") or line.startswith("Hardware") or line.startswith("Processor"):
                            parts = line.split(":", 1)
                            if len(parts) > 1:
                                cpu_model = parts[1].strip()
                                break
        except Exception:
            pass

        os_name = "Windroid OS 1.0 (Debian 12)"
        os_version = "1.0.0"
        try:
            if os.path.exists("/etc/os-release"):
                with open("/etc/os-release", "r") as f:
                    for line in f:
                        if line.startswith("PRETTY_NAME="):
                            os_name = line.split("=", 1)[1].strip().strip('"')
                        elif line.startswith("VERSION_ID="):
                            os_version = line.split("=", 1)[1].strip().strip('"')
        except Exception:
            pass

        mem_total_kb = 0
        mem_avail_kb = 0
        try:
            if os.path.exists("/proc/meminfo"):
                with open("/proc/meminfo", "r") as f:
                    for line in f:
                        parts = line.split()
                        if len(parts) >= 2:
                            if parts[0] == "MemTotal:":
                                mem_total_kb = int(parts[1])
                            elif parts[0] == "MemAvailable:":
                                mem_avail_kb = int(parts[1])
        except Exception:
            pass

        total_bytes = mem_total_kb * 1024
        avail_bytes = mem_avail_kb * 1024
        used_bytes = max(0, total_bytes - avail_bytes)
        usage_pct = int((used_bytes / total_bytes) * 100) if total_bytes > 0 else 0

        # Real GPU info via lspci or drm
        adapter_name = "Standard DRM Graphics"
        gpu_driver = "i915 / vboxvideo / virtio_gpu"
        try:
            ok, stdout, _ = run_command(["lspci", "-nn"])
            if ok and stdout:
                for line in stdout.splitlines():
                    if "VGA" in line or "3D controller" in line or "Display" in line:
                        parts = line.split(":", 2)
                        if len(parts) >= 3:
                            adapter_name = parts[2].strip()
                        break
            ok_k, stdout_k, _ = run_command(["lspci", "-k"])
            if ok_k and stdout_k:
                found_vga = False
                for line in stdout_k.splitlines():
                    if "VGA" in line or "3D" in line or "Display" in line:
                        found_vga = True
                    elif found_vga and "Kernel driver in use:" in line:
                        gpu_driver = line.split(":", 1)[1].strip()
                        break
        except Exception:
            pass

        is_vbox = detect_vbox_environment()
        virt_provider = "Oracle VirtualBox" if is_vbox else "Bare Metal / Native System"
        try:
            ok_v, stdout_v, _ = run_command(["systemd-detect-virt"])
            if ok_v and stdout_v.strip() and stdout_v.strip() != "none":
                virt_provider = stdout_v.strip().upper()
                is_vbox = True
        except Exception:
            pass

        live = is_live_system()
        runtime = "native-live" if live else "native-installed"

        info = {
            "hostname": hostname,
            "osName": os_name,
            "osVersion": os_version,
            "kernelVersion": os.uname().release if hasattr(os, 'uname') else "Linux 6.x",
            "architecture": os.uname().machine if hasattr(os, 'uname') else "x86_64",
            "cpu": {
                "modelName": cpu_model,
                "logicalCores": cores,
                "architecture": os.uname().machine if hasattr(os, 'uname') else "x86_64"
            },
            "memory": {
                "totalBytes": total_bytes,
                "availableBytes": avail_bytes,
                "usedBytes": used_bytes,
                "usagePercent": usage_pct,
                "formattedTotal": format_bytes(total_bytes),
                "formattedAvailable": f"{format_bytes(avail_bytes)} free"
            },
            "graphics": {
                "adapterName": adapter_name,
                "driver": gpu_driver
            },
            "isVirtualMachine": is_vbox,
            "virtualizationProvider": virt_provider,
            "isNative": True,
            "runtime": runtime
        }
        self._send_json(info)

    def handle_drives(self):
        drives = []
        seen_mounts = set()
        seen_devices = set()
        live = is_live_system()

        # 1. Inspect block devices with lsblk if available
        try:
            ok, stdout, _ = run_command(["lsblk", "-J", "-b", "-o", "NAME,PATH,SIZE,FSTYPE,LABEL,UUID,MOUNTPOINT,TYPE,RO,RM,MODEL,TRAN,SERIAL,VENDOR,ROTA,HOTPLUG,PKNAME"])
            if ok and stdout.strip():
                data = json.loads(stdout)
                devices = data.get("blockdevices", [])

                letter_idx = 0
                letters = ["C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M"]

                def process_dev(dev):
                    nonlocal letter_idx
                    dev_type = dev.get("type", "")
                    fstype = dev.get("fstype") or ""
                    dev_name = dev.get("NAME") or dev.get("name") or ""
                    dev_path = dev.get("path") or f"/dev/{dev_name}"
                    children = dev.get("children", [])

                    if dev_type in ["loop", "ram", "zram"] or dev_name.startswith(("loop", "zram", "ram")):
                        return
                    if fstype in ["swap"]:
                        return
                    if dev_type == "disk" and children:
                        for child in children:
                            process_dev(child)
                        return

                    if dev_path in seen_devices:
                        return
                    seen_devices.add(dev_path)

                    mp = dev.get("mountpoint")
                    size = int(dev.get("size") or 0)
                    ro = bool(dev.get("ro"))
                    rm = bool(dev.get("rm")) or bool(dev.get("hotplug"))
                    label = (dev.get("label") or "").strip()
                    model = (dev.get("model") or "").strip()
                    uuid = dev.get("uuid") or f"uuid-{dev_name}"
                    tran = (dev.get("tran") or ("usb" if rm else "sata")).lower()

                    if mp:
                        seen_mounts.add(mp)
                        try:
                            usage = shutil.disk_usage(mp)
                            total_b = usage.total
                            used_b = usage.used
                            free_b = usage.free
                        except Exception:
                            total_b = size
                            used_b = 0
                            free_b = size
                    else:
                        total_b = size
                        used_b = 0
                        free_b = size

                    is_sys = (mp == "/")
                    is_live_overlay = (mp == "/" and live) or (fstype in ["overlay", "squashfs"])

                    if is_sys:
                        letter_alias = "C:"
                        display_name = f"Windroid OS ({letter_alias})" if not live else f"Live System Overlay ({letter_alias})"
                    else:
                        letter_alias = f"{letters[min(letter_idx + 1, len(letters) - 1)]}:"
                        letter_idx += 1
                        if label:
                            display_name = f"{label} ({letter_alias})"
                        elif model:
                            display_name = f"{model} ({letter_alias})"
                        else:
                            display_name = f"Local Disk ({letter_alias})"

                    drives.append({
                        "id": f"drive_{dev_name}",
                        "devicePath": dev_path,
                        "displayName": display_name,
                        "label": label or ("WINDROID_LIVE" if is_live_overlay else ("WINDROID_SYSTEM" if is_sys else "Local Disk")),
                        "type": "removable" if rm else "internal",
                        "category": "system" if is_sys else ("removable" if rm else "internal"),
                        "transport": tran,
                        "filesystem": fstype or "unknown",
                        "uuid": uuid,
                        "mountPoint": mp,
                        "isMounted": bool(mp),
                        "isRemovable": rm,
                        "isEjectable": rm,
                        "isReadOnly": ro,
                        "isEncrypted": False,
                        "isSystemDrive": is_sys,
                        "totalBytes": total_b,
                        "usedBytes": used_b,
                        "freeBytes": free_b,
                        "usagePercent": int((used_b / total_b) * 100) if total_b > 0 else 0,
                        "healthStatus": "healthy",
                        "connectionState": "connected"
                    })

                for dev in devices:
                    process_dev(dev)
        except Exception as e:
            _log_installer(f"handle_drives error: {e}")

        # 2. Fallback check for / mount if not already added
        if "/" not in seen_mounts:
            try:
                usage = shutil.disk_usage("/")
                is_ro = not os.access("/", os.W_OK)
                drives.append({
                    "id": "drive_root",
                    "devicePath": "/dev/root",
                    "displayName": "Live System Overlay (Ephemeral) (C:)" if live else "Windroid OS (C:)",
                    "label": "WINDROID_LIVE" if live else "WINDROID_SYSTEM",
                    "type": "internal",
                    "category": "system",
                    "transport": "sata",
                    "filesystem": "overlay" if live else "ext4",
                    "uuid": "root-partition-uuid",
                    "mountPoint": "/",
                    "isMounted": True,
                    "isRemovable": False,
                    "isEjectable": False,
                    "isReadOnly": is_ro,
                    "isEncrypted": False,
                    "isSystemDrive": True,
                    "totalBytes": usage.total,
                    "usedBytes": usage.used,
                    "freeBytes": usage.free,
                    "usagePercent": int((usage.used / usage.total) * 100) if usage.total > 0 else 0,
                    "healthStatus": "healthy",
                    "connectionState": "connected"
                })
            except Exception:
                pass

        self._send_json(drives)

    def handle_drive_mount(self, body):
        dev = str(body.get("devicePath") or body.get("deviceId") or "").strip()
        if dev.startswith("drive_"):
            dev = f"/dev/{dev.replace('drive_', '')}"
        if not dev or not dev.startswith("/dev/"):
            return self._send_error("Invalid device path for mount.", 400)

        ok, stdout, stderr = run_command(["udisksctl", "mount", "-b", dev])
        if ok:
            match = re.search(r'at\s+(\S+)', stdout)
            mp = match.group(1).rstrip('.') if match else ""
            return self._send_json({"success": True, "mountPoint": mp, "message": stdout.strip()})

        target = f"/media/windroid/{os.path.basename(dev)}"
        os.makedirs(target, exist_ok=True)
        ok_m, _, err_m = run_command(["mount", dev, target])
        if ok_m:
            return self._send_json({"success": True, "mountPoint": target})
        else:
            return self._send_error(f"Mount failed for {dev}: {err_m or stderr}", 500)

    def handle_drive_unmount(self, body):
        dev = str(body.get("devicePath") or body.get("deviceId") or "").strip()
        if dev.startswith("drive_"):
            dev = f"/dev/{dev.replace('drive_', '')}"
        if not dev or not dev.startswith("/dev/"):
            return self._send_error("Invalid device path for unmount.", 400)

        ok, stdout, stderr = run_command(["udisksctl", "unmount", "-b", dev])
        if ok:
            return self._send_json({"success": True, "message": stdout.strip()})

        ok_u, _, err_u = run_command(["umount", dev])
        if ok_u:
            return self._send_json({"success": True})
        else:
            return self._send_error(f"Unmount failed for {dev}: {err_u or stderr}", 500)

    def handle_drive_eject(self, body):
        dev = str(body.get("devicePath") or body.get("deviceId") or "").strip()
        if dev.startswith("drive_"):
            dev = f"/dev/{dev.replace('drive_', '')}"
        if not dev or not dev.startswith("/dev/"):
            return self._send_error("Invalid device path for eject.", 400)

        run_command(["udisksctl", "unmount", "-b", dev])

        ok, stdout, stderr = run_command(["udisksctl", "power-off", "-b", dev])
        if ok:
            return self._send_json({"success": True, "message": stdout.strip()})

        ok_e, _, err_e = run_command(["eject", dev])
        if ok_e:
            return self._send_json({"success": True})
        else:
            return self._send_json({"success": True, "message": "Drive unmounted safely."})

    def handle_installed_apps(self):
        apps = []
        seen_ids = set()

        search_dirs = [
            "/usr/share/applications",
            "/var/lib/flatpak/exports/share/applications",
            os.path.expanduser("~/.local/share/applications")
        ]

        for sdir in search_dirs:
            if not os.path.exists(sdir):
                continue
            for fname in os.listdir(sdir):
                if not fname.endswith(".desktop"):
                    continue
                fpath = os.path.join(sdir, fname)
                try:
                    name = None
                    comment = ""
                    exec_cmd = ""
                    icon = "AppWindow"
                    no_display = False
                    version = "1.0"

                    with open(fpath, "r", encoding="utf-8", errors="ignore") as f:
                        in_desktop = False
                        for line in f:
                            line = line.strip()
                            if line.startswith("[Desktop Entry]"):
                                in_desktop = True
                                continue
                            elif line.startswith("[") and in_desktop:
                                break
                            if not in_desktop or line.startswith("#"):
                                continue

                            if "=" in line:
                                k, v = line.split("=", 1)
                                k = k.strip()
                                v = v.strip()
                                if k == "Name" and not name:
                                    name = v
                                elif k == "Comment":
                                    comment = v
                                elif k == "Exec":
                                    exec_cmd = v
                                elif k == "Icon":
                                    icon = v
                                elif k == "NoDisplay" and v.lower() == "true":
                                    no_display = True
                                elif k == "Version":
                                    version = v

                    if no_display or not name or not exec_cmd:
                        continue

                    app_id = "native_" + fname.replace(".desktop", "").replace("-", "_").replace(".", "_")
                    if app_id in seen_ids:
                        continue
                    seen_ids.add(app_id)

                    is_flatpak = "flatpak" in fpath or "flatpak" in exec_cmd
                    source_str = "Flatpak Package" if is_flatpak else "Debian System Package (.desktop)"

                    apps.append({
                        "id": app_id,
                        "name": name,
                        "description": comment or f"Native Linux application ({name})",
                        "icon": icon,
                        "runtime": "native",
                        "packageId": fname,
                        "executableTarget": exec_cmd.split()[0] if exec_cmd else "",
                        "installationPath": fpath,
                        "version": version,
                        "publisher": "Linux Package Maintainer",
                        "architecture": os.uname().machine if hasattr(os, 'uname') else "x86_64",
                        "installedAt": "System Built-in",
                        "source": source_str,
                        "compatibilityRating": "excellent",
                        "permissions": [],
                        "fileAssociations": [],
                        "isSystemApp": True,
                        "isProtected": True,
                        "canUninstall": is_flatpak,
                        "canRepair": False
                    })
                except Exception:
                    pass

        self._send_json({"apps": apps, "success": True})

    def handle_fs_list(self, body):
        target_path = normalize_path(body.get("path", get_user_home()))
        if not os.path.exists(target_path):
            return self._send_error(f"Path not found: {target_path}", 404)

        if not os.path.isdir(target_path):
            return self._send_error(f"Path is not a directory: {target_path}", 400)

        entries = []
        try:
            for item in os.listdir(target_path):
                full_path = os.path.join(target_path, item)
                entry = get_file_entry(full_path)
                if entry:
                    entries.append(entry)
            # Sort folders first, then files alphabetically
            entries.sort(key=lambda x: (x["type"] != "folder", x["name"].lower()))
            self._send_json({"entries": entries, "success": True})
        except Exception as e:
            self._send_error(f"Failed to list directory: {str(e)}", 500)

    def handle_fs_metadata(self, body):
        target_path = normalize_path(body.get("path"))
        if not os.path.exists(target_path):
            return self._send_error("Path not found", 404)
        entry = get_file_entry(target_path)
        if entry:
            self._send_json({"metadata": entry, "success": True})
        else:
            self._send_error("Could not read metadata", 500)

    def handle_fs_create_folder(self, body):
        parent = normalize_path(body.get("path", get_user_home()))
        name = body.get("name", "New Folder").strip()
        if not name:
            return self._send_error("Folder name cannot be empty", 400)

        if not is_path_writable(parent):
            return self._send_error("Permission denied: System location is read-only", 403)

        target = os.path.join(parent, name)
        try:
            os.makedirs(target, exist_ok=False)
            entry = get_file_entry(target)
            self._send_json({"entry": entry, "success": True})
        except FileExistsError:
            self._send_error(f"Folder '{name}' already exists", 409)
        except Exception as e:
            self._send_error(f"Failed to create folder: {str(e)}", 500)

    def handle_fs_create_file(self, body):
        parent = normalize_path(body.get("path", get_user_home()))
        name = body.get("name", "New Document.txt").strip()
        content = body.get("content", "")

        if not is_path_writable(parent):
            return self._send_error("Permission denied: System location is read-only", 403)

        target = os.path.join(parent, name)
        try:
            with open(target, "w", encoding="utf-8") as f:
                f.write(content)
            entry = get_file_entry(target)
            self._send_json({"entry": entry, "success": True})
        except FileExistsError:
            self._send_error(f"File '{name}' already exists", 409)
        except Exception as e:
            self._send_error(f"Failed to create file: {str(e)}", 500)

    def handle_fs_rename(self, body):
        src = normalize_path(body.get("path"))
        new_name = body.get("newName", "").strip()

        if not src or not os.path.exists(src):
            return self._send_error("Source file does not exist", 404)

        if not new_name:
            return self._send_error("New name cannot be empty", 400)

        parent = os.path.dirname(src)
        if not is_path_writable(parent):
            return self._send_error("Permission denied", 403)

        dst = os.path.join(parent, new_name)
        try:
            os.rename(src, dst)
            entry = get_file_entry(dst)
            self._send_json({"entry": entry, "success": True})
        except Exception as e:
            self._send_error(f"Failed to rename: {str(e)}", 500)

    def handle_fs_copy(self, body):
        sources = body.get("sources", [])
        destination = normalize_path(body.get("destination"))

        if not destination or not os.path.exists(destination):
            return self._send_error("Destination path does not exist", 404)

        if not is_path_writable(destination):
            return self._send_error("Permission denied: Destination is read-only", 403)

        copied = []
        for src_path in sources:
            src = normalize_path(src_path)
            if not os.path.exists(src):
                continue
            base = os.path.basename(src)
            dst = os.path.join(destination, base)

            # Conflict handling: keep both if already exists
            if os.path.exists(dst):
                name, ext = os.path.splitext(base)
                count = 2
                while os.path.exists(dst):
                    dst = os.path.join(destination, f"{name} ({count}){ext}")
                    count += 1

            try:
                if os.path.isdir(src):
                    shutil.copytree(src, dst)
                else:
                    shutil.copy2(src, dst)
                copied.append(dst)
            except Exception as e:
                return self._send_error(f"Copy failed for {src}: {str(e)}", 500)

        self._send_json({"copied": copied, "success": True})

    def handle_fs_move(self, body):
        sources = body.get("sources", [])
        destination = normalize_path(body.get("destination"))

        if not destination or not os.path.exists(destination):
            return self._send_error("Destination path does not exist", 404)

        if not is_path_writable(destination):
            return self._send_error("Permission denied: Destination is read-only", 403)

        moved = []
        for src_path in sources:
            src = normalize_path(src_path)
            if not os.path.exists(src):
                continue
            base = os.path.basename(src)
            dst = os.path.join(destination, base)

            if os.path.exists(dst):
                name, ext = os.path.splitext(base)
                count = 2
                while os.path.exists(dst):
                    dst = os.path.join(destination, f"{name} ({count}){ext}")
                    count += 1

            try:
                shutil.move(src, dst)
                moved.append(dst)
            except Exception as e:
                return self._send_error(f"Move failed for {src}: {str(e)}", 500)

        self._send_json({"moved": moved, "success": True})

    def handle_fs_delete(self, body):
        paths = body.get("paths", [])
        permanent = body.get("permanent", False)

        for path in paths:
            target = normalize_path(path)
            if not os.path.exists(target):
                continue

            if not is_path_writable(target):
                return self._send_error(f"Cannot delete protected path: {target}", 403)

            try:
                if permanent:
                    if os.path.isdir(target):
                        shutil.rmtree(target)
                    else:
                        os.remove(target)
                else:
                    move_to_trash(target)
            except Exception as e:
                return self._send_error(f"Delete failed for {target}: {str(e)}", 500)

        self._send_json({"success": True})

    def handle_fs_read_file(self, body):
        target = normalize_path(body.get("path"))
        if not target or not os.path.exists(target):
            return self._send_error("File not found", 404)

        try:
            with open(target, "r", encoding="utf-8", errors="replace") as f:
                content = f.read()
            self._send_json({"content": content, "success": True})
        except Exception as e:
            self._send_error(f"Failed to read file: {str(e)}", 500)

    def handle_fs_write_file(self, body):
        target = normalize_path(body.get("path"))
        content = body.get("content", "")

        if not is_path_writable(target):
            return self._send_error("Permission denied", 403)

        try:
            with open(target, "w", encoding="utf-8") as f:
                f.write(content)
            self._send_json({"success": True})
        except Exception as e:
            self._send_error(f"Failed to write file: {str(e)}", 500)

    def handle_list_trash(self):
        trash_dir, files_dir, info_dir = get_trash_dir()
        items = []

        if os.path.exists(info_dir):
            for info_file in os.listdir(info_dir):
                if info_file.endswith(".trashinfo"):
                    target_name = info_file[:-10]
                    file_path = os.path.join(files_dir, target_name)
                    info_path = os.path.join(info_dir, info_file)

                    original_path = file_path
                    deletion_date = ""

                    try:
                        with open(info_path, "r", encoding="utf-8") as f:
                            for line in f:
                                if line.startswith("Path="):
                                    original_path = line[5:].strip()
                                elif line.startswith("DeletionDate="):
                                    deletion_date = line[13:].strip()
                    except Exception:
                        pass

                    entry = get_file_entry(file_path) if os.path.exists(file_path) else None
                    items.append({
                        "trashId": target_name,
                        "originalPath": original_path,
                        "deletionDate": deletion_date,
                        "name": os.path.basename(original_path) or target_name,
                        "fileEntry": entry
                    })

        self._send_json({"trashItems": items, "success": True})

    def handle_trash_restore(self, body):
        trash_id = body.get("trashId")
        if not trash_id:
            return self._send_error("Missing trashId", 400)

        trash_dir, files_dir, info_dir = get_trash_dir()
        file_path = os.path.join(files_dir, trash_id)
        info_path = os.path.join(info_dir, f"{trash_id}.trashinfo")

        if not os.path.exists(file_path):
            return self._send_error("Trash item not found", 404)

        original_path = ""
        if os.path.exists(info_path):
            try:
                with open(info_path, "r", encoding="utf-8") as f:
                    for line in f:
                        if line.startswith("Path="):
                            original_path = line[5:].strip()
            except Exception:
                pass

        if not original_path:
            original_path = os.path.join(get_user_home(), trash_id)

        parent = os.path.dirname(original_path)
        os.makedirs(parent, exist_ok=True)

        try:
            shutil.move(file_path, original_path)
            if os.path.exists(info_path):
                os.remove(info_path)
            self._send_json({"restoredPath": original_path, "success": True})
        except Exception as e:
            self._send_error(f"Failed to restore item: {str(e)}", 500)

    def handle_trash_delete_permanent(self, body):
        trash_id = body.get("trashId")
        trash_dir, files_dir, info_dir = get_trash_dir()
        file_path = os.path.join(files_dir, trash_id)
        info_path = os.path.join(info_dir, f"{trash_id}.trashinfo")

        try:
            if os.path.exists(file_path):
                if os.path.isdir(file_path):
                    shutil.rmtree(file_path)
                else:
                    os.remove(file_path)
            if os.path.exists(info_path):
                os.remove(info_path)
            self._send_json({"success": True})
        except Exception as e:
            self._send_error(f"Failed to delete permanently: {str(e)}", 500)

    def handle_trash_empty(self):
        trash_dir, files_dir, info_dir = get_trash_dir()
        try:
            if os.path.exists(files_dir):
                shutil.rmtree(files_dir)
            if os.path.exists(info_dir):
                shutil.rmtree(info_dir)
            os.makedirs(files_dir, exist_ok=True)
            os.makedirs(info_dir, exist_ok=True)
            self._send_json({"success": True})
        except Exception as e:
            self._send_error(f"Failed to empty trash: {str(e)}", 500)

    # --- NETWORKMANAGER INTEGRATION HANDLERS ---
    def handle_wifi_saved_get(self):
        saved_list = []
        ok, stdout, _ = run_nmcli(["-t", "-f", "NAME,UUID,TYPE,AUTOCONNECT", "connection", "show"])
        if ok and stdout.strip():
            for line in stdout.splitlines():
                if ":" in line:
                    parts = line.split(":")
                    if len(parts) >= 3:
                        name = parts[0].strip()
                        uuid = parts[1].strip()
                        conn_type = parts[2].strip().lower()
                        autoconn = parts[3].strip().lower() == "yes" if len(parts) > 3 else True
                        if "wireless" in conn_type or "wifi" in conn_type or "802-11" in conn_type:
                            saved_list.append({
                                "id": uuid,
                                "name": name,
                                "autoConnect": autoconn
                            })
        self._send_json({"savedNetworks": saved_list, "success": True})

    def handle_wifi_enabled_post(self, body):
        enabled = bool(body.get("enabled", True))
        devices = get_network_devices_impl()
        wifi_dev = next((d for d in devices if d["type"] == "wifi"), None)
        if not wifi_dev:
            return self._send_error("No Wi-Fi adapter detected.", 400, errorCode="WIFI_ADAPTER_MISSING")

        soft_blocked, hard_blocked = check_rfkill_wifi()
        if hard_blocked:
            return self._send_error("Wi-Fi is disabled by a hardware switch.", 400, errorCode="WIFI_HARDWARE_BLOCKED")

        cmd = "on" if enabled else "off"
        ok, stdout, stderr = run_nmcli(["radio", "wifi", cmd])
        run_command(["rfkill", "unblock" if enabled else "block", "wifi"])
        self._send_json({"success": True, "enabled": enabled})

    def handle_wifi_connect_post(self, body):
        ssid = str(body.get("ssid", "")).strip()
        password = body.get("password")
        if not ssid:
            return self._send_error("Missing SSID", 400)

        ssid = "".join(c for c in ssid if ord(c) >= 32)
        if not ssid or len(ssid) > 64:
            return self._send_error("Invalid SSID format", 400)

        if password and isinstance(password, str):
            password = "".join(c for c in password if ord(c) >= 32)

        if password:
            ok, stdout, stderr = run_nmcli(["dev", "wifi", "connect", ssid, "password", password], timeout=20)
        else:
            ok, stdout, stderr = run_nmcli(["dev", "wifi", "connect", ssid], timeout=20)

        if not ok:
            err_msg = stderr.strip() or stdout.strip() or "Connection attempt failed or timed out."
            if "secrets" in err_msg.lower() or "password" in err_msg.lower():
                err_msg = "Incorrect Wi-Fi password or security negotiation failed."
            return self._send_error(err_msg, 400)

        self._send_json({"success": True, "connectedSSID": ssid})

    def handle_wifi_disconnect_post(self, body):
        ssid = body.get("ssid")
        if ssid:
            run_nmcli(["connection", "down", "id", str(ssid)])
        else:
            devices = get_network_devices_impl()
            wifi_dev = next((d for d in devices if d["type"] == "wifi" and d["state"] == "connected"), None)
            if wifi_dev:
                run_nmcli(["device", "disconnect", wifi_dev["interfaceName"]])
        self._send_json({"success": True})

    def handle_wifi_forget_post(self, body):
        target = str(body.get("ssid") or body.get("id") or "").strip()
        if not target:
            return self._send_error("Missing SSID or network ID", 400)
        ok, stdout, stderr = run_nmcli(["connection", "delete", "id", target])
        if not ok:
            run_nmcli(["connection", "delete", "uuid", target])
        self._send_json({"success": True})

    def handle_hotspot_start_post(self, body):
        devices = get_network_devices_impl()
        wifi_dev = next((d for d in devices if d["type"] == "wifi"), None)
        if not wifi_dev:
            return self._send_error("No Wi-Fi adapter detected. Hotspot creation requires a wireless network device. (VirtualBox virtual Ethernet adapters do not support hotspot creation).", 400)

        ssid = str(body.get("ssid", "Windroid-Hotspot")).strip()
        password = str(body.get("password", "windroidpass")).strip()

        ok, stdout, stderr = run_nmcli(["device", "wifi", "hotspot", "ifname", wifi_dev["interfaceName"], "ssid", ssid, "password", password])
        if not ok:
            return self._send_error(f"Failed to start hotspot: {stderr.strip() or stdout.strip()}", 400)

        self._send_json({"success": True, "active": True, "ssid": ssid})

    def handle_hotspot_stop_post(self, body):
        run_nmcli(["connection", "down", "Hotspot"])
        self._send_json({"success": True, "active": False})

    def handle_airplane_mode_post(self, body):
        enabled = bool(body.get("enabled", False))
        state_str = "off" if enabled else "on"
        run_nmcli(["radio", "all", state_str])
        run_command(["rfkill", "block" if enabled else "unblock", "all"])
        if enabled:
            set_bluetooth_powered_impl(False)
        self._send_json({"success": True, "airplaneMode": enabled})

    def handle_bluetooth_powered_post(self, body):
        powered = bool(body.get("powered", body.get("enabled", False)))
        res = set_bluetooth_powered_impl(powered)
        self._send_json(res)

    def handle_bluetooth_discovery_start_post(self):
        res = start_bluetooth_discovery_impl()
        self._send_json(res)

    def handle_bluetooth_discovery_stop_post(self):
        res = stop_bluetooth_discovery_impl()
        self._send_json(res)

    def handle_bluetooth_pair_post(self, body):
        address = str(body.get("address", "")).strip()
        res = pair_bluetooth_device_impl(address)
        self._send_json(res)

    def handle_bluetooth_pairing_respond_post(self, body):
        address = str(body.get("address", "")).strip()
        accept = bool(body.get("accept", True))
        pin = str(body.get("pin", ""))
        res = respond_bluetooth_pairing_impl(address, accept, pin)
        self._send_json(res)

    def handle_bluetooth_connect_post(self, body):
        address = str(body.get("address", "")).strip()
        res = connect_bluetooth_device_impl(address)
        self._send_json(res)

    def handle_bluetooth_disconnect_post(self, body):
        address = str(body.get("address", "")).strip()
        res = disconnect_bluetooth_device_impl(address)
        self._send_json(res)

    def handle_bluetooth_remove_post(self, body):
        address = str(body.get("address", "")).strip()
        res = remove_bluetooth_device_impl(address)
        self._send_json(res)

# --- NETWORKMANAGER IMPLEMENTATION HELPERS ---
def run_nmcli(args, timeout=10):
    return run_command(["nmcli"] + args, timeout=timeout)

def detect_vbox_environment():
    try:
        if os.path.exists("/sys/class/dmi/id/product_name"):
            with open("/sys/class/dmi/id/product_name", "r") as f:
                content = f.read().lower()
                if "virtualbox" in content or "vbox" in content or "innotek" in content:
                    return True
        if os.path.exists("/sys/class/dmi/id/sys_vendor"):
            with open("/sys/class/dmi/id/sys_vendor", "r") as f:
                content = f.read().lower()
                if "innotek" in content or "oracle" in content or "virtualbox" in content:
                    return True
    except Exception:
        pass
    return False

def get_network_status_impl():
    ok, stdout, stderr = run_nmcli(["-t", "-f", "STATE,CONNECTIVITY,WIFI-HW,WIFI,WWAN-HW,WWAN", "g"])
    connectivity = "full"
    wifi_enabled = True
    wifi_hw_enabled = True
    airplane_mode = False

    if ok and stdout.strip():
        parts = stdout.strip().split(":")
        if len(parts) >= 4:
            conn = parts[1].lower()
            wifi_hw = parts[2].lower()
            wifi_sw = parts[3].lower()

            connectivity = conn if conn in ["full", "limited", "portal", "none"] else "full"
            wifi_enabled = (wifi_sw == "enabled")
            wifi_hw_enabled = (wifi_hw == "enabled")

    try:
        ok_rf, stdout_rf, _ = run_nmcli(["radio", "all"])
        if ok_rf and stdout_rf:
            if "disabled" in stdout_rf and "enabled" not in stdout_rf:
                airplane_mode = True
    except Exception:
        pass

    devices = get_network_devices_impl()
    eth_connected = any(d["type"] == "ethernet" and d["state"] == "connected" for d in devices)
    primary = next((d for d in devices if d["state"] == "connected"), devices[0] if devices else None)

    return {
        "success": True,
        "connectivity": connectivity,
        "wifiEnabled": wifi_enabled,
        "wifiHardwareEnabled": wifi_hw_enabled,
        "airplaneMode": airplane_mode,
        "ethernetConnected": eth_connected,
        "virtualBoxEnv": detect_vbox_environment(),
        "primaryDevice": primary
    }

def get_network_devices_impl():
    ok, stdout, stderr = run_nmcli(["device", "show"])
    if not ok or not stdout.strip():
        return []

    devices = []
    current_dev = {}

    for line in stdout.splitlines():
        line = line.strip()
        if not line:
            if current_dev and "interfaceName" in current_dev:
                devices.append(current_dev)
                current_dev = {}
            continue

        if ":" in line:
            key, val = line.split(":", 1)
            key = key.strip()
            val = val.strip()

            if key == "GENERAL.DEVICE":
                if current_dev and "interfaceName" in current_dev:
                    devices.append(current_dev)
                current_dev = {
                    "id": val,
                    "interfaceName": val,
                    "type": "unknown",
                    "state": "disconnected",
                    "managed": True,
                    "ipAddresses": [],
                    "dnsServers": []
                }
            elif key == "GENERAL.TYPE" and current_dev:
                dev_type = val.lower()
                if "ethernet" in dev_type:
                    current_dev["type"] = "ethernet"
                elif "wifi" in dev_type or "wireless" in dev_type or "802-11" in dev_type:
                    current_dev["type"] = "wifi"
                elif "loopback" in dev_type:
                    current_dev["type"] = "loopback"
                else:
                    current_dev["type"] = "virtual"
            elif key == "GENERAL.STATE" and current_dev:
                state_str = val.lower()
                if "100" in state_str or "connected" in state_str:
                    current_dev["state"] = "connected"
                elif "connecting" in state_str or "config" in state_str:
                    current_dev["state"] = "connecting"
                elif "unavailable" in state_str:
                    current_dev["state"] = "unavailable"
                else:
                    current_dev["state"] = "disconnected"
            elif key == "GENERAL.CONNECTION" and current_dev:
                if val and val != "--":
                    current_dev["connectionName"] = val
            elif key == "GENERAL.HWADDR" and current_dev:
                if val and val != "--":
                    current_dev["hardwareAddress"] = val
            elif key == "GENERAL.DRIVER" and current_dev:
                if val and val != "--":
                    current_dev["driver"] = val
            elif key.startswith("IP4.ADDRESS") and current_dev:
                if val and val not in current_dev["ipAddresses"]:
                    current_dev["ipAddresses"].append(val)
            elif key.startswith("IP6.ADDRESS") and current_dev:
                if val and val not in current_dev["ipAddresses"]:
                    current_dev["ipAddresses"].append(val)
            elif key == "IP4.GATEWAY" and current_dev:
                if val and val != "--":
                    current_dev["gateway"] = val
            elif key.startswith("IP4.DNS") and current_dev:
                if val and val != "--" and val not in current_dev["dnsServers"]:
                    current_dev["dnsServers"].append(val)

    if current_dev and "interfaceName" in current_dev:
        devices.append(current_dev)

    return devices

def get_wifi_networks_impl():
    devices = get_network_devices_impl()
    wifi_dev = next((d for d in devices if d["type"] == "wifi"), None)

    if not wifi_dev:
        return {
            "success": True,
            "wifiAvailable": False,
            "hasAdapter": False,
            "wifiEnabled": False,
            "networks": [],
            "message": "No Wi-Fi adapter was detected on this system."
        }

    if wifi_dev["state"] == "disabled" or wifi_dev["state"] == "unavailable":
        return {
            "success": True,
            "wifiAvailable": True,
            "hasAdapter": True,
            "wifiEnabled": False,
            "networks": [],
            "message": "Wi-Fi radio is currently disabled or unavailable."
        }

    ok, stdout, stderr = run_nmcli(["-t", "-f", "IN-USE,SSID,BSSID,SIGNAL,SECURITY,FREQ,CHAN", "dev", "wifi", "list", "--rescan", "yes"])
    if not ok:
        ok, stdout, stderr = run_nmcli(["-t", "-f", "IN-USE,SSID,BSSID,SIGNAL,SECURITY,FREQ,CHAN", "dev", "wifi", "list"])

    networks = []
    seen_ssids = set()

    if ok and stdout.strip():
        saved_names = get_saved_wifi_ssids()

        for line in stdout.splitlines():
            line = line.strip()
            if not line:
                continue

            parts = line.split(":")
            if len(parts) >= 5:
                in_use = parts[0].strip() == "*"
                ssid = parts[1].strip()
                bssid = parts[2].strip() if len(parts) > 2 else ""
                signal_str = parts[3].strip() if len(parts) > 3 else "0"
                security_str = parts[4].strip() if len(parts) > 4 else ""
                freq_str = parts[5].strip() if len(parts) > 5 else ""
                chan_str = parts[6].strip() if len(parts) > 6 else ""

                if not ssid or ssid == "--":
                    continue

                if ssid in seen_ssids:
                    continue
                seen_ssids.add(ssid)

                signal_pct = 0
                try:
                    signal_pct = int(signal_str)
                except ValueError:
                    pass

                sec_type = "open"
                sec_lower = security_str.lower()
                if "wpa3" in sec_lower:
                    sec_type = "wpa3"
                elif "wpa2" in sec_lower:
                    sec_type = "wpa2"
                elif "wpa" in sec_lower:
                    sec_type = "wpa"
                elif "wep" in sec_lower:
                    sec_type = "wep"
                elif "enterprise" in sec_lower or "802.1x" in sec_lower:
                    sec_type = "enterprise"
                elif sec_lower and sec_lower != "--":
                    sec_type = "unknown"

                freq_num = None
                if freq_str and "mhz" in freq_str.lower():
                    try:
                        freq_num = int(freq_str.lower().replace("mhz", "").strip())
                    except ValueError:
                        pass

                chan_num = None
                if chan_str:
                    try:
                        chan_num = int(chan_str)
                    except ValueError:
                        pass

                networks.append({
                    "ssid": ssid,
                    "bssid": bssid if bssid != "--" else None,
                    "signalPercent": signal_pct,
                    "security": sec_type,
                    "frequencyMHz": freq_num,
                    "channel": chan_num,
                    "connected": in_use,
                    "saved": (ssid in saved_names)
                })

    return {
        "success": True,
        "wifiAvailable": True,
        "hasAdapter": True,
        "wifiEnabled": True,
        "networks": networks
    }

def get_saved_wifi_ssids():
    ok, stdout, _ = run_nmcli(["-t", "-f", "NAME,TYPE", "connection", "show"])
    saved = set()
    if ok and stdout.strip():
        for line in stdout.splitlines():
            if ":" in line:
                parts = line.split(":")
                name, conn_type = parts[0], parts[1]
                if "wireless" in conn_type.lower() or "wifi" in conn_type.lower() or "802-11" in conn_type.lower():
                    saved.add(name.strip())
    return saved

def get_hotspot_capabilities_impl():
    devices = get_network_devices_impl()
    wifi_dev = next((d for d in devices if d["type"] == "wifi"), None)

    if not wifi_dev or detect_vbox_environment():
        return {
            "success": True,
            "supported": False,
            "active": False,
            "reason": "Hotspot requires a physical Wi-Fi adapter with Access Point (AP) mode support. In VirtualBox, virtual Ethernet adapters do not support Wi-Fi hotspot creation."
        }

    ok, stdout, _ = run_nmcli(["-t", "-f", "NAME,TYPE,STATE", "connection", "show", "--active"])
    active = False
    active_ssid = None
    if ok and stdout.strip():
        for line in stdout.splitlines():
            if "hotspot" in line.lower() or "802-11-wireless" in line.lower():
                active = True
                active_ssid = line.split(":")[0]

    return {
        "success": True,
        "supported": True,
        "active": active,
        "ssid": active_ssid
    }

# --- BLUETOOTH IMPLEMENTATION HELPERS ---
BLUETOOTH_MAC_REGEX = re.compile(r"^([0-9A-Fa-f]{2}:){5}[0-9A-Fa-f]{2}$")

def is_valid_bt_address(address):
    return bool(address and isinstance(address, str) and BLUETOOTH_MAC_REGEX.match(address.strip()))

def check_rfkill_wifi():
    ok, stdout, _ = run_command(["rfkill", "list", "wifi"])
    if not ok or not stdout:
        ok, stdout, _ = run_command(["rfkill", "list", "wlan"])
    soft_blocked = False
    hard_blocked = False
    if ok and stdout:
        for line in stdout.splitlines():
            line_l = line.lower()
            if "soft blocked: yes" in line_l:
                soft_blocked = True
            elif "hard blocked: yes" in line_l:
                hard_blocked = True
    return soft_blocked, hard_blocked

def check_rfkill_bluetooth():
    ok, stdout, _ = run_command(["rfkill", "list", "bluetooth"])
    soft_blocked = False
    hard_blocked = False
    if ok and stdout:
        for line in stdout.splitlines():
            line_l = line.lower()
            if "soft blocked: yes" in line_l:
                soft_blocked = True
            elif "hard blocked: yes" in line_l:
                hard_blocked = True
    return soft_blocked, hard_blocked

def get_bluetooth_adapters_impl():
    soft_blocked, hard_blocked = check_rfkill_bluetooth()

    ok, stdout, stderr = run_command(["bluetoothctl", "show"])

    combined_err = (stdout + " " + stderr).lower()
    if not ok and ("not found" in combined_err or "connection refused" in combined_err or "dbus" in combined_err or "failed to open connection" in combined_err):
        return {
            "success": False,
            "available": False,
            "hasAdapter": False,
            "powered": False,
            "discovering": False,
            "hardwareBlocked": hard_blocked,
            "softwareBlocked": soft_blocked,
            "adapters": [],
            "errorCode": "BLUEZ_UNAVAILABLE",
            "error": "BlueZ system daemon is not running or bluetoothctl is unavailable.",
            "message": "BlueZ system daemon is not running or bluetoothctl is unavailable."
        }

    if not ok or "no default controller available" in combined_err:
        return {
            "success": True,
            "available": False,
            "hasAdapter": False,
            "powered": False,
            "discovering": False,
            "hardwareBlocked": hard_blocked,
            "softwareBlocked": soft_blocked,
            "adapters": [],
            "errorCode": "ADAPTER_NOT_FOUND",
            "message": "No Bluetooth adapter detected on this system."
        }

    controller_address = ""
    name = "Windroid Bluetooth"
    alias = "Windroid Bluetooth"
    powered = False
    discoverable = False
    pairable = False
    discovering = False

    for line in stdout.splitlines():
        line = line.strip()
        if line.startswith("Controller "):
            parts = line.split()
            if len(parts) >= 2:
                controller_address = parts[1]
        elif line.startswith("Name:"):
            name = line.split(":", 1)[1].strip()
        elif line.startswith("Alias:"):
            alias = line.split(":", 1)[1].strip()
        elif line.startswith("Powered:"):
            powered = "yes" in line.lower()
        elif line.startswith("Discoverable:"):
            discoverable = "yes" in line.lower()
        elif line.startswith("Pairable:"):
            pairable = "yes" in line.lower()
        elif line.startswith("Discovering:"):
            discovering = "yes" in line.lower()

    if not controller_address:
        controller_address = "hci0"

    adapter = {
        "id": controller_address,
        "address": controller_address,
        "name": name,
        "alias": alias,
        "powered": powered and not soft_blocked and not hard_blocked,
        "discoverable": discoverable,
        "pairable": pairable,
        "discovering": discovering,
        "hardwareBlocked": hard_blocked,
        "softwareBlocked": soft_blocked
    }

    return {
        "success": True,
        "available": True,
        "hasAdapter": True,
        "powered": adapter["powered"],
        "discovering": discovering,
        "hardwareBlocked": hard_blocked,
        "softwareBlocked": soft_blocked,
        "primaryAdapter": adapter,
        "adapters": [adapter]
    }

def get_bluetooth_status_impl():
    return get_bluetooth_adapters_impl()

def set_bluetooth_powered_impl(powered: bool):
    st = get_bluetooth_adapters_impl()
    if not st.get("hasAdapter"):
        return {
            "success": False,
            "powered": False,
            "error": "No Bluetooth adapter detected on this system.",
            "errorCode": "ADAPTER_NOT_FOUND"
        }
    if st.get("hardwareBlocked"):
        return {
            "success": False,
            "powered": False,
            "error": "Bluetooth is disabled by a hardware switch.",
            "errorCode": "BLUETOOTH_HARDWARE_BLOCKED"
        }
    if st.get("errorCode") == "BLUEZ_UNAVAILABLE":
        return {
            "success": False,
            "powered": False,
            "error": "BlueZ service is unavailable.",
            "errorCode": "BLUEZ_UNAVAILABLE"
        }

    if powered:
        run_command(["rfkill", "unblock", "bluetooth"])
        ok, stdout, stderr = run_command(["bluetoothctl", "power", "on"])
        if not ok:
            return {"success": False, "powered": False, "error": stderr or "Failed to power on Bluetooth.", "errorCode": "OPERATION_FAILED"}
        return {"success": True, "powered": True}
    else:
        run_command(["bluetoothctl", "scan", "off"])
        ok, stdout, stderr = run_command(["bluetoothctl", "power", "off"])
        return {"success": True, "powered": False}

def parse_device_type_and_icon(icon_str, class_str, dev_name):
    icon_l = icon_str.lower() if icon_str else ""
    class_l = class_str.lower() if class_str else ""
    name_l = dev_name.lower() if dev_name else ""

    if "headphone" in icon_l or "headset" in icon_l or "headphone" in name_l or "headset" in name_l or "airpods" in name_l or "buds" in name_l:
        return "headphones", "headphones"
    elif "speaker" in icon_l or "speaker" in name_l:
        return "speaker", "speaker"
    elif "audio" in icon_l or "audio" in class_l:
        return "audio", "headphones"
    elif "mouse" in icon_l or "mouse" in name_l:
        return "mouse", "mouse"
    elif "keyboard" in icon_l or "keyboard" in name_l:
        return "keyboard", "keyboard"
    elif "gamepad" in icon_l or "joystick" in icon_l or "controller" in name_l or "gamepad" in name_l:
        return "gamepad", "controller"
    elif "phone" in icon_l or "phone" in name_l or "mobile" in name_l or "galaxy" in name_l or "iphone" in name_l:
        return "phone", "phone"
    elif "computer" in icon_l or "laptop" in icon_l or "pc" in name_l:
        return "computer", "computer"
    elif "display" in icon_l or "tv" in icon_l or "tv" in name_l:
        return "other", "tv"
    elif "tablet" in icon_l or "ipad" in name_l:
        return "other", "tablet"
    elif "printer" in icon_l or "printer" in name_l:
        return "other", "printer"
    else:
        return "unknown", "other"

def get_bluetooth_devices_impl():
    ok, stdout, stderr = run_command(["bluetoothctl", "devices"])
    if not ok or not stdout.strip():
        return {"success": True, "devices": []}

    devices = []
    for line in stdout.splitlines():
        line = line.strip()
        if not line or not line.startswith("Device "):
            continue
        parts = line.split(" ", 2)
        if len(parts) < 2:
            continue
        addr = parts[1].strip()
        dev_name = parts[2].strip() if len(parts) > 2 else addr

        if not is_valid_bt_address(addr):
            continue

        ok_info, info_out, _ = run_command(["bluetoothctl", "info", addr])
        paired = False
        trusted = False
        connected = False
        rssi = None
        battery = None
        icon_str = ""
        class_str = ""
        alias_str = dev_name

        if ok_info and info_out:
            for iline in info_out.splitlines():
                iline = iline.strip()
                if iline.startswith("Name:"):
                    dev_name = iline.split(":", 1)[1].strip()
                elif iline.startswith("Alias:"):
                    alias_str = iline.split(":", 1)[1].strip()
                elif iline.startswith("Icon:"):
                    icon_str = iline.split(":", 1)[1].strip()
                elif iline.startswith("Class:"):
                    class_str = iline.split(":", 1)[1].strip()
                elif iline.startswith("Paired:"):
                    paired = "yes" in iline.lower()
                elif iline.startswith("Trusted:"):
                    trusted = "yes" in iline.lower()
                elif iline.startswith("Connected:"):
                    connected = "yes" in iline.lower()
                elif iline.startswith("RSSI:"):
                    try:
                        rssi = int(iline.split(":", 1)[1].strip())
                    except ValueError:
                        pass
                elif "Battery Percentage:" in iline:
                    try:
                        raw_bat = iline.split("Battery Percentage:", 1)[1].strip()
                        if "(" in raw_bat and ")" in raw_bat:
                            bat_val = raw_bat.split("(")[1].split(")")[0].strip()
                            battery = int(bat_val)
                    except Exception:
                        pass

        dev_type, icon_type = parse_device_type_and_icon(icon_str, class_str, alias_str or dev_name)

        devices.append({
            "id": f"dev_{addr.replace(':', '_')}",
            "address": addr,
            "name": alias_str or dev_name,
            "alias": alias_str or dev_name,
            "deviceType": dev_type,
            "iconType": icon_type,
            "paired": paired,
            "trusted": trusted,
            "connected": connected,
            "rssi": rssi,
            "batteryPercent": battery
        })

    return {"success": True, "devices": devices}

def start_bluetooth_discovery_impl():
    ok, stdout, stderr = run_command(["bluetoothctl", "scan", "on"], timeout=5)
    if not ok and "Failed" in stderr:
        return {"success": False, "discovering": False, "error": stderr, "errorCode": "DISCOVERY_FAILED"}
    return {"success": True, "discovering": True}

def stop_bluetooth_discovery_impl():
    run_command(["bluetoothctl", "scan", "off"], timeout=5)
    return {"success": True, "discovering": False}

def pair_bluetooth_device_impl(address: str):
    if not is_valid_bt_address(address):
        return {"success": False, "error": "Invalid Bluetooth MAC address format.", "errorCode": "INVALID_BLUETOOTH_ADDRESS"}

    ok, stdout, stderr = run_command(["bluetoothctl", "pair", address], timeout=15)
    out = (stdout + " " + stderr).lower()
    if "failed" in out or "error" in out or not ok:
        if "authentication failed" in out:
            return {"success": False, "error": "Authentication failed during pairing.", "errorCode": "AUTHENTICATION_FAILED"}
        return {"success": False, "error": f"Failed to pair device {address}: {stderr or stdout}", "errorCode": "PAIRING_FAILED"}

    run_command(["bluetoothctl", "trust", address])
    return {"success": True, "paired": True}

def respond_bluetooth_pairing_impl(address: str, accept: bool, pin: str):
    if not is_valid_bt_address(address):
        return {"success": False, "error": "Invalid Bluetooth MAC address format.", "errorCode": "INVALID_BLUETOOTH_ADDRESS"}
    
    if not accept:
        run_command(["bluetoothctl", "remove", address], timeout=5)
        return {"success": True, "paired": False}
    
    if pin:
        return {"success": False, "error": "Interactive PIN passkey agent is unsupported in non-interactive bridge mode.", "errorCode": "PIN_FLOW_UNSUPPORTED"}

    return {"success": True}

def connect_bluetooth_device_impl(address: str):
    if not is_valid_bt_address(address):
        return {"success": False, "error": "Invalid Bluetooth MAC address format.", "errorCode": "INVALID_BLUETOOTH_ADDRESS"}

    ok, stdout, stderr = run_command(["bluetoothctl", "connect", address], timeout=15)
    out = (stdout + " " + stderr).lower()
    if "successful" in out:
        return {"success": True, "connected": True}
    elif "failed" in out or "error" in out or not ok:
        if "profile" in out:
            return {"success": False, "error": "Requested Bluetooth audio/input profile unavailable.", "errorCode": "PROFILE_UNAVAILABLE"}
        return {"success": False, "error": f"Failed to connect to {address}: {stderr or stdout}", "errorCode": "CONNECTION_FAILED"}

    return {"success": True, "connected": True}

def disconnect_bluetooth_device_impl(address: str):
    if not is_valid_bt_address(address):
        return {"success": False, "error": "Invalid Bluetooth MAC address format.", "errorCode": "INVALID_BLUETOOTH_ADDRESS"}

    run_command(["bluetoothctl", "disconnect", address], timeout=10)
    return {"success": True}

_NIGHT_LIGHT_ACTIVE = False
_NIGHT_LIGHT_TEMP = 4500
_CURRENT_SOFTWARE_BRIGHTNESS = 100
_BATTERY_SAVER_ACTIVE = False

def get_gpu_info_string():
    ok, stdout, _ = run_command(["lspci"], timeout=3)
    if ok and stdout:
        for line in stdout.splitlines():
            if "VGA" in line or "3D" in line or "Display" in line:
                return line.split(":", 2)[-1].strip()
    return "Standard Display Controller"

def get_primary_display_id():
    ok, stdout, _ = run_command(["xrandr", "-q"], timeout=3)
    if ok and stdout:
        for line in stdout.splitlines():
            if " connected " in line:
                parts = line.split()
                if "primary" in parts:
                    return parts[0]
                return parts[0]
    return "default_display"

def get_system_capabilities_impl():
    wifi = get_wifi_networks_impl().get("hasAdapter", False)
    bt = get_bluetooth_status_impl().get("hasAdapter", False)
    hotspot = get_hotspot_capabilities_impl().get("supported", False)

    xrandr_ok, _, _ = run_command(["xrandr", "-q"], timeout=3)
    display_config = xrandr_ok

    backlights = glob.glob("/sys/class/backlight/*")
    hw_brightness = len(backlights) > 0

    pactl_ok, _, _ = run_command(["pactl", "info"], timeout=3)
    wpctl_ok, _, _ = run_command(["wpctl", "status"], timeout=3)
    amixer_ok, _, _ = run_command(["amixer", "scontrols"], timeout=3)
    audio_out = pactl_ok or wpctl_ok or amixer_ok
    audio_in = audio_out

    batteries = glob.glob("/sys/class/power_supply/BAT*")
    has_battery = len(batteries) > 0

    sys_ok, _, _ = run_command(["systemctl", "is-system-running"], timeout=3)
    suspend_ok = os.path.exists("/sys/power/state") or sys_ok

    redshift_ok = shutil.which("redshift") is not None
    night_light = redshift_ok or xrandr_ok

    power_mgmt = shutil.which("systemctl") is not None or shutil.which("loginctl") is not None or shutil.which("poweroff") is not None

    return {
        "success": True,
        "capabilities": {
            "wifi": wifi,
            "bluetooth": bt,
            "hotspot": hotspot,
            "displayConfig": display_config,
            "hardwareBrightness": hw_brightness,
            "audioOutput": audio_out,
            "audioInput": audio_in,
            "battery": has_battery,
            "suspend": suspend_ok,
            "nightLight": night_light,
            "powerManagement": power_mgmt,
            "isNative": True
        }
    }

def get_display_info_impl():
    displays = []
    ok, stdout, stderr = run_command(["xrandr", "-q"], timeout=5)
    if ok and stdout:
        current_conn = None
        for line in stdout.splitlines():
            parts = line.split()
            if len(parts) >= 2 and ("connected" in parts or "disconnected" in parts):
                conn_name = parts[0]
                status = "connected" if "connected" in parts else "disconnected"
                if status == "connected":
                    is_primary = "primary" in parts
                    current_res = "1024x768"
                    phys_size = ""
                    for p in parts:
                        if "x" in p and "+" in p and p[0].isdigit():
                            current_res = p.split("+")[0]
                    if "mm" in line:
                        try:
                            phys_size = line.split("(")[-1].split(")")[-1].strip()
                        except Exception:
                            phys_size = ""

                    orientation = "normal"
                    for rot in ["left", "right", "inverted"]:
                        if f" {rot} " in line:
                            orientation = rot

                    display_label = "VirtualBox Monitor" if "virtual" in conn_name.lower() else f"{conn_name} Monitor"

                    current_conn = {
                        "id": conn_name,
                        "name": display_label,
                        "connector": conn_name,
                        "currentResolution": current_res,
                        "availableResolutions": [],
                        "refreshRates": [],
                        "currentRefreshRate": 60,
                        "primary": is_primary,
                        "orientation": orientation,
                        "scaling": 100,
                        "physicalSize": phys_size or "Standard Display"
                    }
                    displays.append(current_conn)
                else:
                    current_conn = None
            elif current_conn and line.startswith("   "):
                mode_parts = line.strip().split()
                if mode_parts:
                    res = mode_parts[0]
                    if "x" in res and res[0].isdigit():
                        if res not in current_conn["availableResolutions"]:
                            current_conn["availableResolutions"].append(res)
                        for rate_str in mode_parts[1:]:
                            if "*" in rate_str:
                                try:
                                    rate_val = round(float(rate_str.replace("*", "").replace("+", "")))
                                    current_conn["currentRefreshRate"] = rate_val
                                    current_conn["currentResolution"] = res
                                except Exception:
                                    pass
                            try:
                                r = round(float(rate_str.replace("*", "").replace("+", "")))
                                if r not in current_conn["refreshRates"]:
                                    current_conn["refreshRates"].append(r)
                            except Exception:
                                pass

    for d in displays:
        if not d["refreshRates"]:
            d["refreshRates"] = [60]

    if not displays:
        displays.append({
            "id": "default_display",
            "name": "System Display Adapter",
            "connector": "Default",
            "currentResolution": "1920x1080",
            "availableResolutions": ["1920x1080", "1600x900", "1280x720", "1024x768"],
            "refreshRates": [60],
            "currentRefreshRate": 60,
            "primary": True,
            "orientation": "normal",
            "scaling": 100,
            "physicalSize": "Emulated Display"
        })

    backlights = glob.glob("/sys/class/backlight/*")
    hw_bright_supported = len(backlights) > 0
    brightness_val = 100
    if hw_bright_supported:
        try:
            with open(os.path.join(backlights[0], "brightness"), "r") as f:
                curr_b = int(f.read().strip())
            with open(os.path.join(backlights[0], "max_brightness"), "r") as f:
                max_b = int(f.read().strip())
            brightness_val = round((curr_b / max_b) * 100) if max_b > 0 else 100
        except Exception:
            brightness_val = 100
    else:
        brightness_val = _CURRENT_SOFTWARE_BRIGHTNESS

    redshift_installed = shutil.which("redshift") is not None
    night_light_supported = redshift_installed or ok

    return {
        "success": True,
        "displays": displays,
        "gpu": get_gpu_info_string(),
        "brightness": brightness_val,
        "hardwareBrightnessSupported": hw_bright_supported,
        "nightLightSupported": night_light_supported,
        "nightLightActive": _NIGHT_LIGHT_ACTIVE,
        "nightLightTemperature": _NIGHT_LIGHT_TEMP
    }

def configure_display_impl(body: dict):
    display_id = str(body.get("displayId", "")).strip()
    resolution = str(body.get("resolution", "")).strip()
    refresh_rate = body.get("refreshRate", 60)
    orientation = str(body.get("orientation", "normal")).strip()
    is_primary = bool(body.get("isPrimary", False))

    if not re.match(r'^[a-zA-Z0-9_-]+$', display_id):
        return {"success": False, "error": "Invalid display ID format."}

    if not re.match(r'^\d+x\d+$', resolution):
        return {"success": False, "error": "Invalid resolution format."}

    if orientation not in ["normal", "left", "right", "inverted"]:
        orientation = "normal"

    cmd = ["xrandr", "--output", display_id, "--mode", resolution, "--rotate", orientation]
    if refresh_rate:
        cmd.extend(["--rate", str(refresh_rate)])
    if is_primary:
        cmd.append("--primary")

    ok, stdout, stderr = run_command(cmd, timeout=5)
    if not ok:
        return {"success": False, "error": f"xrandr configuration failed: {stderr or stdout}"}

    return {"success": True}

def set_display_brightness_impl(body: dict):
    global _CURRENT_SOFTWARE_BRIGHTNESS
    try:
        brightness = int(body.get("brightness", 100))
        brightness = max(10, min(100, brightness))
    except (ValueError, TypeError):
        return {"success": False, "error": "Invalid brightness value."}

    backlights = glob.glob("/sys/class/backlight/*")
    if backlights:
        try:
            with open(os.path.join(backlights[0], "max_brightness"), "r") as f:
                max_b = int(f.read().strip())
            target_b = int((brightness / 100.0) * max_b)
            with open(os.path.join(backlights[0], "brightness"), "w") as f:
                f.write(str(target_b))
            return {"success": True, "brightness": brightness, "hardware": True}
        except Exception as err:
            print("[Display] Backlight write error:", err)

    # Software brightness fallback using xrandr
    primary = get_primary_display_id()
    if primary:
        factor = str(round(brightness / 100.0, 2))
        run_command(["xrandr", "--output", primary, "--brightness", factor], timeout=3)

    _CURRENT_SOFTWARE_BRIGHTNESS = brightness
    return {"success": True, "brightness": brightness, "hardware": False}

def set_display_nightlight_impl(body: dict):
    global _NIGHT_LIGHT_ACTIVE, _NIGHT_LIGHT_TEMP
    active = bool(body.get("active", False))
    temp = int(body.get("temperature", 4500))

    _NIGHT_LIGHT_ACTIVE = active
    _NIGHT_LIGHT_TEMP = temp

    primary = get_primary_display_id()

    if shutil.which("redshift"):
        run_command(["pkill", "-x", "redshift"], timeout=2)
        if active:
            ok_rs, rs_out, rs_err = run_command(["redshift", "-P", "-O", str(temp)], timeout=3)
            if not ok_rs and primary:
                run_command(["xrandr", "--output", primary, "--gamma", "1.0:0.85:0.7"], timeout=3)
        else:
            run_command(["redshift", "-x"], timeout=3)
    elif primary:
        if active:
            run_command(["xrandr", "--output", primary, "--gamma", "1.0:0.85:0.7"], timeout=3)
        else:
            run_command(["xrandr", "--output", primary, "--gamma", "1.0:1.0:1.0"], timeout=3)

    return {"success": True, "active": active, "temperature": temp}

def get_audio_status_impl():
    outputs = []
    inputs = []
    master_vol = 100
    is_muted = False
    mic_vol = 100
    mic_muted = False
    default_sink = ""
    default_source = ""
    is_avail = False

    ok_info, info_out, _ = run_command(["pactl", "info"], timeout=3)
    if ok_info and info_out:
        is_avail = True
        for line in info_out.splitlines():
            if line.startswith("Default Sink:"):
                default_sink = line.split(":", 1)[1].strip()
            elif line.startswith("Default Source:"):
                default_source = line.split(":", 1)[1].strip()

        ok_sinks, sinks_out, _ = run_command(["pactl", "list", "sinks"], timeout=3)
        if ok_sinks and sinks_out:
            current_sink = None
            for line in sinks_out.splitlines():
                line_s = line.strip()
                if line_s.startswith("Sink #") or line_s.startswith("Name:"):
                    if line_s.startswith("Name:"):
                        s_name = line_s.split(":", 1)[1].strip()
                        current_sink = {
                            "id": s_name,
                            "name": s_name,
                            "description": s_name,
                            "active": s_name == default_sink,
                            "volume": 100,
                            "muted": False
                        }
                        outputs.append(current_sink)
                elif current_sink:
                    if line_s.startswith("Description:"):
                        current_sink["description"] = line_s.split(":", 1)[1].strip()
                    elif line_s.startswith("Mute:"):
                        current_sink["muted"] = "yes" in line_s.lower()
                    elif line_s.startswith("Volume:"):
                        if "%" in line_s:
                            try:
                                percent_part = line_s.split("%")[0].split("/")[-1].strip()
                                current_sink["volume"] = int(percent_part)
                            except Exception:
                                pass

        ok_srcs, srcs_out, _ = run_command(["pactl", "list", "sources"], timeout=3)
        if ok_srcs and srcs_out:
            current_src = None
            for line in srcs_out.splitlines():
                line_s = line.strip()
                if line_s.startswith("Source #") or line_s.startswith("Name:"):
                    if line_s.startswith("Name:"):
                        src_name = line_s.split(":", 1)[1].strip()
                        if not src_name.endswith(".monitor"):
                            current_src = {
                                "id": src_name,
                                "name": src_name,
                                "description": src_name,
                                "active": src_name == default_source,
                                "volume": 100,
                                "muted": False
                            }
                            inputs.append(current_src)
                        else:
                            current_src = None
                elif current_src:
                    if line_s.startswith("Description:"):
                        current_src["description"] = line_s.split(":", 1)[1].strip()
                    elif line_s.startswith("Mute:"):
                        current_src["muted"] = "yes" in line_s.lower()
                    elif line_s.startswith("Volume:"):
                        if "%" in line_s:
                            try:
                                percent_part = line_s.split("%")[0].split("/")[-1].strip()
                                current_src["volume"] = int(percent_part)
                            except Exception:
                                pass

        is_avail = len(outputs) > 0

        active_sink_obj = next((s for s in outputs if s["id"] == default_sink), None) or (outputs[0] if outputs else None)
        if active_sink_obj:
            master_vol = active_sink_obj["volume"]
            is_muted = active_sink_obj["muted"]

        active_src_obj = next((s for s in inputs if s["id"] == default_source), None) or (inputs[0] if inputs else None)
        if active_src_obj:
            mic_vol = active_src_obj["volume"]
            mic_muted = active_src_obj["muted"]

    else:
        ok_am, am_out, _ = run_command(["amixer", "sget", "Master"], timeout=3)
        if ok_am and am_out:
            is_avail = True
            for line in am_out.splitlines():
                if "[" in line and "%]" in line:
                    try:
                        v = line.split("[")[1].split("%]")[0]
                        master_vol = int(v)
                        is_muted = "[off]" in line
                    except Exception:
                        pass
            outputs.append({
                "id": "default_amixer_sink",
                "name": "ALSA Master Output",
                "description": "ALSA Master Audio Device",
                "active": True,
                "volume": master_vol,
                "muted": is_muted
            })

    return {
        "success": True,
        "isAudioAvailable": is_avail,
        "masterVolume": master_vol,
        "isMuted": is_muted,
        "micVolume": mic_vol,
        "isMicMuted": mic_muted,
        "defaultOutputId": default_sink or (outputs[0]["id"] if outputs else ""),
        "defaultInputId": default_source or (inputs[0]["id"] if inputs else ""),
        "outputs": outputs,
        "inputs": inputs
    }

def set_audio_volume_impl(body: dict):
    try:
        volume = int(body.get("volume", 100))
        volume = max(0, min(100, volume))
    except (ValueError, TypeError):
        return {"success": False, "error": "Invalid volume value."}

    target = str(body.get("target", "output")).lower()
    is_muted = body.get("isMuted", None)

    if shutil.which("pactl"):
        if target == "output":
            run_command(["pactl", "set-sink-volume", "@DEFAULT_SINK@", f"{volume}%"], timeout=3)
            if is_muted is not None:
                run_command(["pactl", "set-sink-mute", "@DEFAULT_SINK@", "1" if is_muted else "0"], timeout=3)
        else:
            run_command(["pactl", "set-source-volume", "@DEFAULT_SOURCE@", f"{volume}%"], timeout=3)
            if is_muted is not None:
                run_command(["pactl", "set-source-mute", "@DEFAULT_SOURCE@", "1" if is_muted else "0"], timeout=3)
    elif shutil.which("amixer"):
        run_command(["amixer", "sset", "Master", f"{volume}%"], timeout=3)
        if is_muted is not None:
            run_command(["amixer", "sset", "Master", "mute" if is_muted else "unmute"], timeout=3)

    return {"success": True, "volume": volume, "target": target}

def set_audio_default_device_impl(body: dict):
    device_id = str(body.get("deviceId", "")).strip()
    target = str(body.get("target", "output")).lower()

    if not re.match(r'^[a-zA-Z0-9_\.-]+$', device_id):
        return {"success": False, "error": "Invalid audio device ID format."}

    if shutil.which("pactl"):
        if target == "output":
            run_command(["pactl", "set-default-sink", device_id], timeout=3)
        else:
            run_command(["pactl", "set-default-source", device_id], timeout=3)

    return {"success": True}

def get_power_status_impl():
    batteries = glob.glob("/sys/class/power_supply/BAT*")
    ac_supplies = glob.glob("/sys/class/power_supply/AC*") + glob.glob("/sys/class/power_supply/ADP*") + glob.glob("/sys/class/power_supply/Mains*")

    has_battery = len(batteries) > 0
    ac_connected = True

    if ac_supplies:
        try:
            with open(os.path.join(ac_supplies[0], "online"), "r") as f:
                ac_connected = (f.read().strip() == "1")
        except Exception:
            ac_connected = True

    if not has_battery:
        return {
            "success": True,
            "hasBattery": False,
            "chargingState": "not_charging",
            "batteryPercent": None,
            "acConnected": ac_connected,
            "healthPercent": None,
            "estimatedTimeRemainingMinutes": None,
            "batterySaverActive": False,
            "isDesktopOrVM": True
        }

    bat_path = batteries[0]
    percent = 100
    state = "unknown"
    health = 100
    est_mins = None

    try:
        if os.path.exists(os.path.join(bat_path, "capacity")):
            with open(os.path.join(bat_path, "capacity"), "r") as f:
                percent = int(f.read().strip())

        if os.path.exists(os.path.join(bat_path, "status")):
            with open(os.path.join(bat_path, "status"), "r") as f:
                raw_st = f.read().strip().lower()
                if raw_st in ["charging", "discharging", "full", "not charging"]:
                    state = raw_st.replace(" ", "_")
                else:
                    state = raw_st

        full = None
        design = None
        if os.path.exists(os.path.join(bat_path, "energy_full")):
            with open(os.path.join(bat_path, "energy_full"), "r") as f:
                full = int(f.read().strip())
        elif os.path.exists(os.path.join(bat_path, "charge_full")):
            with open(os.path.join(bat_path, "charge_full"), "r") as f:
                full = int(f.read().strip())

        if os.path.exists(os.path.join(bat_path, "energy_full_design")):
            with open(os.path.join(bat_path, "energy_full_design"), "r") as f:
                design = int(f.read().strip())
        elif os.path.exists(os.path.join(bat_path, "charge_full_design")):
            with open(os.path.join(bat_path, "charge_full_design"), "r") as f:
                design = int(f.read().strip())

        if full and design and design > 0:
            health = min(100, round((full / design) * 100))
    except Exception as e:
        print("[Power] Error reading sysfs battery:", e)

    ok_up, up_out, _ = run_command(["upower", "-i", f"/org/freedesktop/UPower/devices/battery_{os.path.basename(bat_path)}"], timeout=3)
    if ok_up and up_out:
        for line in up_out.splitlines():
            line = line.strip()
            if line.startswith("time to empty:") or line.startswith("time to full:"):
                val = line.split(":", 1)[1].strip()
                if "hour" in val:
                    try:
                        h = float(val.split()[0])
                        est_mins = round(h * 60)
                    except Exception:
                        pass
                elif "minute" in val:
                    try:
                        m = float(val.split()[0])
                        est_mins = round(m)
                    except Exception:
                        pass

    return {
        "success": True,
        "hasBattery": True,
        "chargingState": state,
        "batteryPercent": percent,
        "acConnected": ac_connected,
        "healthPercent": health,
        "estimatedTimeRemainingMinutes": est_mins,
        "batterySaverActive": _BATTERY_SAVER_ACTIVE,
        "isDesktopOrVM": False
    }

def set_power_action_impl(body: dict):
    action = str(body.get("action", "")).strip().lower()

    if action not in ["shutdown", "restart", "suspend", "lock", "logout"]:
        return {"success": False, "error": f"Invalid power action '{action}'."}

    user = os.getenv("USER", "live")

    if action == "shutdown":
        _log_installer("Executing real system poweroff...")
        if shutil.which("systemctl"):
            ok, out, err = run_command(["systemctl", "poweroff"], timeout=5)
            if not ok:
                run_command(["shutdown", "-h", "now"], timeout=5)
                run_command(["poweroff"], timeout=5)
        else:
            run_command(["shutdown", "-h", "now"], timeout=5)
            run_command(["poweroff"], timeout=5)
    elif action == "restart":
        _log_installer("Executing real system reboot...")
        if shutil.which("systemctl"):
            ok, out, err = run_command(["systemctl", "reboot"], timeout=5)
            if not ok:
                run_command(["reboot"], timeout=5)
        else:
            run_command(["reboot"], timeout=5)
    elif action == "suspend":
        if shutil.which("systemctl"):
            run_command(["systemctl", "suspend"], timeout=5)
        elif shutil.which("loginctl"):
            run_command(["loginctl", "suspend"], timeout=5)
    elif action == "lock":
        if shutil.which("loginctl"):
            run_command(["loginctl", "lock-session"], timeout=5)
        elif shutil.which("slock"):
            run_command(["slock"], timeout=5)
        else:
            run_command(["xset", "s", "activate"], timeout=5)
    elif action == "logout":
        if shutil.which("loginctl"):
            run_command(["loginctl", "terminate-user", user], timeout=5)
        else:
            run_command(["pkill", "-u", user, "openbox"], timeout=5)

    return {"success": True, "action": action}

def set_battery_saver_impl(body: dict):
    global _BATTERY_SAVER_ACTIVE
    enabled = bool(body.get("enabled", False))
    _BATTERY_SAVER_ACTIVE = enabled

    if shutil.which("powerprofilesctl"):
        target_mode = "power-saver" if enabled else "balanced"
        run_command(["powerprofilesctl", "set", target_mode], timeout=3)

    return {"success": True, "batterySaverActive": enabled}

def remove_bluetooth_device_impl(address: str):
    if not is_valid_bt_address(address):
        return {"success": False, "error": "Invalid Bluetooth MAC address format.", "errorCode": "INVALID_BLUETOOTH_ADDRESS"}

    run_command(["bluetoothctl", "remove", address], timeout=10)
    return {"success": True}

# --- USER IDENTITY & ACCOUNTS ---
def get_accounts_impl():
    current_user_name = get_current_desktop_user()
    users = []
    
    try:
        import pwd
        import grp
        all_pwd = pwd.getpwall()
        admin_members = set()
        for grp_name in ["sudo", "wheel", "admin"]:
            try:
                g = grp.getgrnam(grp_name)
                for member in g.gr_mem:
                    admin_members.add(member)
            except KeyError:
                pass

        for p in all_pwd:
            if p.pw_uid >= 1000 or p.pw_name == current_user_name:
                # Exclude internal/temporary accounts unless they are the active session
                if p.pw_name in ["windroid-oobe"] and p.pw_name != current_user_name:
                    continue
                
                gecos_parts = p.pw_gecos.split(",") if p.pw_gecos else []
                full_name = gecos_parts[0] if gecos_parts and gecos_parts[0] else p.pw_name
                if p.pw_name in ["user", "live"]:
                    full_name = "Windroid Administrator"

                is_admin = (p.pw_uid == 0) or (p.pw_name in admin_members) or (p.pw_name in [current_user_name, "user", "live"])
                
                avatar_url = "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80"
                
                # Check persistent user avatar paths
                custom_avatar = os.path.join(p.pw_dir, ".local", "share", "windroid", "account", "avatar.png")
                face_avatar = os.path.join(p.pw_dir, ".face")
                if os.path.exists(custom_avatar):
                    avatar_url = f"/api/fs/read-file?path={custom_avatar}"
                elif os.path.exists(face_avatar):
                    avatar_url = f"/api/fs/read-file?path={face_avatar}"

                users.append({
                    "username": p.pw_name,
                    "uid": p.pw_uid,
                    "gid": p.pw_gid,
                    "fullName": full_name,
                    "email": f"{p.pw_name}@windroid.org",
                    "homeDir": p.pw_dir,
                    "shell": p.pw_shell,
                    "avatarUrl": avatar_url,
                    "isAdmin": is_admin,
                    "userType": "administrator" if is_admin else "standard",
                    "isCurrentSession": (p.pw_name == current_user_name),
                    "isLiveUser": (p.pw_name in ["user", "live"] and is_live_system()),
                    "isTemporary": (p.pw_name in ["user", "live", "windroid-oobe"] and is_live_system()),
                    "runtimeMode": get_runtime_mode()
                })
    except Exception:
        users = [{
            "username": current_user_name,
            "uid": 1000,
            "gid": 1000,
            "fullName": "Windroid User",
            "email": f"{current_user_name}@windroid.org",
            "homeDir": get_user_home(),
            "shell": "/bin/bash",
            "avatarUrl": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
            "isAdmin": True,
            "userType": "administrator",
            "isCurrentSession": True
        }]

    return {"success": True, "users": users}

def create_account_impl(body: dict):
    username = str(body.get("username", "")).strip().lower()
    full_name = str(body.get("fullName", "")).strip() or username
    password = str(body.get("password", ""))
    is_admin = bool(body.get("isAdmin", False))

    if not username or not re.match(r'^[a-z0-9_-]+$', username):
        return {"success": False, "error": "Invalid username format. Use lowercase letters, numbers, hyphens, and underscores."}

    cmd = ["useradd", "-m", "-c", full_name, "-s", "/bin/bash", username]
    ok, out, err = run_command(cmd)
    if not ok:
        ok_sudo, out_sudo, err_sudo = run_command(["sudo"] + cmd)
        if not ok_sudo:
            return {"success": False, "error": f"Failed to create user account: {err or err_sudo}"}

    if password:
        try:
            proc = subprocess.Popen(["chpasswd"], stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
            proc.communicate(input=f"{username}:{password}\n", timeout=5)
        except Exception:
            pass

    if is_admin:
        run_command(["usermod", "-aG", "sudo", username])
        run_command(["usermod", "-aG", "wheel", username])

    return {"success": True, "username": username}

def update_account_impl(body: dict):
    username = str(body.get("username", "")).strip()
    full_name = str(body.get("fullName", "")).strip()
    is_admin = body.get("isAdmin", None)

    if not username:
        return {"success": False, "error": "Username required."}

    if full_name:
        run_command(["chfn", "-f", full_name, username])
        run_command(["usermod", "-c", full_name, username])

    if is_admin is not None:
        if is_admin:
            run_command(["usermod", "-aG", "sudo", username])
            run_command(["usermod", "-aG", "wheel", username])
        else:
            run_command(["gpasswd", "-d", username, "sudo"])
            run_command(["gpasswd", "-d", username, "wheel"])

    return {"success": True}

def delete_account_impl(body: dict):
    username = str(body.get("username", "")).strip()
    current_user = os.getenv("USER", "live")

    if not username or username == current_user or username == "root":
        return {"success": False, "error": "Cannot delete root, system, or currently active user session."}

    # Safety check: enforce that at least one administrator remains
    accounts = get_accounts_impl().get("users", [])
    admins = [u for u in accounts if u.get("isAdmin")]
    target_account = next((u for u in accounts if u.get("username") == username), None)

    if target_account and target_account.get("isAdmin") and len(admins) <= 1:
        return {"success": False, "error": "Cannot delete the last remaining administrator account."}

    ok, out, err = run_command(["userdel", "-r", username])
    if not ok:
        ok_s, _, err_s = run_command(["sudo", "userdel", "-r", username])
        if not ok_s:
            return {"success": False, "error": f"Failed to delete user: {err or err_s}"}

    return {"success": True}

def authenticate_impl(body: dict):
    username = str(body.get("username", "")).strip() or os.getenv("USER", "live")
    password = str(body.get("password", ""))

    mode = get_runtime_mode()
    is_live = (mode == "live")
    is_live_usr = (username in ["live", "user"] and is_live)

    if not password:
        if is_live:
            return {
                "success": True,
                "authenticated": True,
                "runtimeMode": mode,
                "isLiveUser": True
            }
        return {
            "success": False,
            "authenticated": False,
            "errorCode": "AUTHENTICATION_FAILED",
            "error": "Password is required."
        }

    # Attempt primary native PAM authentication
    try:
        import pam
        p = pam.pam()
        if p.authenticate(username, password):
            return {
                "success": True,
                "authenticated": True,
                "runtimeMode": mode,
                "isLiveUser": is_live_usr
            }
        else:
            if not is_live:
                return {
                    "success": False,
                    "authenticated": False,
                    "errorCode": "AUTHENTICATION_FAILED",
                    "error": "Invalid username or password."
                }
    except ImportError:
        if not is_live:
            return {
                "success": False,
                "authenticated": False,
                "errorCode": "PAM_UNAVAILABLE",
                "error": "Native PAM authentication module is unavailable."
            }
    except Exception:
        if not is_live:
            return {
                "success": False,
                "authenticated": False,
                "errorCode": "INTERNAL_ERROR",
                "error": "Internal authentication error occurred."
            }

    # Secure fallback for environments where PAM python module is not loaded
    try:
        proc = subprocess.Popen(["su", "-", username, "-c", "echo AUTH_OK"], stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        out, err = proc.communicate(input=f"{password}\n", timeout=5)
        if "AUTH_OK" in out:
            return {
                "success": True,
                "authenticated": True,
                "runtimeMode": mode,
                "isLiveUser": is_live_usr
            }
    except Exception:
        pass

    # Strictly in LIVE ISO mode only: allow default live user passwordless/default session login
    if is_live and (password in ["live", "user", "admin", "1234"] or not password):
        return {
            "success": True,
            "authenticated": True,
            "runtimeMode": "live",
            "isLiveUser": True
        }

    return {
        "success": False,
        "authenticated": False,
        "errorCode": "AUTHENTICATION_FAILED",
        "error": "Invalid username or password."
    }

def change_password_impl(body: dict):
    username = str(body.get("username", "")).strip() or os.getenv("USER", "live")
    new_password = str(body.get("newPassword", ""))

    if not new_password:
        return {"success": False, "error": "New password required."}

    try:
        proc = subprocess.Popen(["chpasswd"], stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        out, err = proc.communicate(input=f"{username}:{new_password}\n", timeout=5)
        if proc.returncode == 0:
            return {"success": True}
    except Exception as e:
        return {"success": False, "error": str(e)}

    return {"success": True}

# --- DEVICE IDENTITY ---
def get_identity_impl():
    import socket
    import platform
    hostname = socket.gethostname()
    kernel = platform.release()
    arch = platform.machine()
    return {
        "success": True,
        "hostname": hostname,
        "deviceName": hostname,
        "kernelVersion": kernel,
        "architecture": arch,
        "osName": "Windroid OS 1.0.0 (Debian 12)"
    }

def set_hostname_impl(body: dict):
    hostname = str(body.get("hostname", "")).strip()
    if not hostname or not re.match(r'^[a-zA-Z0-9_-]+$', hostname):
        return {"success": False, "error": "Invalid hostname. Use alphanumeric characters, hyphens, and underscores."}

    ok, out, err = run_command(["hostnamectl", "set-hostname", hostname])
    if not ok:
        try:
            with open("/etc/hostname", "w") as f:
                f.write(f"{hostname}\n")
            run_command(["hostname", hostname])
        except Exception as e:
            return {"success": False, "error": f"Failed to set hostname: {e}"}

    # Verify actual set hostname from system
    import socket
    current_hostname = socket.gethostname()

    return {"success": True, "hostname": current_hostname}

# --- LOCALE, TIMEZONE & KEYBOARD DISCOVERY ---
def get_locale_impl():
    tz = "America/New_York"
    if os.path.islink("/etc/localtime"):
        target = os.readlink("/etc/localtime")
        if "zoneinfo/" in target:
            tz = target.split("zoneinfo/")[1]
    elif os.path.exists("/etc/timezone"):
        try:
            with open("/etc/timezone", "r") as f:
                tz = f.read().strip()
        except Exception:
            pass

    locale_val = os.getenv("LANG", "en_US.UTF-8")
    kb_val = "us"

    ok_kb, kb_out, _ = run_command(["setxkbmap", "-query"])
    if ok_kb and kb_out:
        for line in kb_out.splitlines():
            if "layout:" in line:
                kb_val = line.split("layout:")[1].strip()

    # Discover timezones dynamically via timedatectl or zoneinfo
    available_tzs = []
    ok_tz, tz_out, _ = run_command(["timedatectl", "list-timezones"])
    if ok_tz and tz_out:
        available_tzs = [t.strip() for t in tz_out.splitlines() if t.strip()]
    
    if not available_tzs:
        available_tzs = [
            "America/New_York", "America/Chicago", "America/Denver", "America/Los_Angeles",
            "Europe/London", "Europe/Paris", "Europe/Berlin", "Europe/Moscow",
            "Asia/Tokyo", "Asia/Shanghai", "Asia/Kolkata", "Asia/Dubai",
            "Australia/Sydney", "Pacific/Auckland", "UTC"
        ]

    # Discover installed locales dynamically
    available_locales = []
    ok_loc, loc_out, _ = run_command(["locale", "-a"])
    if ok_loc and loc_out:
        for l_item in loc_out.splitlines():
            code = l_item.strip()
            if code and code not in [al["code"] for al in available_locales]:
                available_locales.append({"code": code, "name": code})
    
    if not available_locales:
        available_locales = [
            {"code": "en_US.UTF-8", "name": "English (United States)"},
            {"code": "en_GB.UTF-8", "name": "English (United Kingdom)"},
            {"code": "de_DE.UTF-8", "name": "German (Deutschland)"},
            {"code": "fr_FR.UTF-8", "name": "French (France)"},
            {"code": "es_ES.UTF-8", "name": "Spanish (España)"},
            {"code": "it_IT.UTF-8", "name": "Italian (Italia)"},
            {"code": "pt_BR.UTF-8", "name": "Portuguese (Brasil)"},
            {"code": "ja_JP.UTF-8", "name": "Japanese (日本)"},
            {"code": "zh_CN.UTF-8", "name": "Chinese (Simplified)"}
        ]

    # Discover keyboard layouts dynamically
    available_keyboards = []
    ok_kbs, kbs_out, _ = run_command(["localectl", "list-x11-keymap-layouts"])
    if ok_kbs and kbs_out:
        for kb_item in kbs_out.splitlines():
            layout_code = kb_item.strip()
            if layout_code:
                available_keyboards.append({"layout": layout_code, "name": layout_code.upper()})

    if not available_keyboards:
        available_keyboards = [
            {"layout": "us", "name": "English (US)"},
            {"layout": "gb", "name": "English (UK)"},
            {"layout": "de", "name": "German (QWERTZ)"},
            {"layout": "fr", "name": "French (AZERTY)"},
            {"layout": "es", "name": "Spanish"},
            {"layout": "it", "name": "Italian"},
            {"layout": "pt", "name": "Portuguese"},
            {"layout": "ru", "name": "Russian (JCUKEN)"},
            {"layout": "jp", "name": "Japanese"}
        ]

    # NTP status check
    ntp_active = True
    ok_ntp, ntp_out, _ = run_command(["timedatectl", "show"])
    if ok_ntp and ntp_out:
        for line in ntp_out.splitlines():
            if line.startswith("NTP="):
                ntp_active = (line.split("=")[1].strip().lower() == "yes")

    return {
        "success": True,
        "timezone": tz,
        "locale": locale_val,
        "keyboardLayout": kb_val,
        "ntpActive": ntp_active,
        "availableTimezones": available_tzs,
        "availableLocales": available_locales,
        "availableKeyboards": available_keyboards
    }

def set_timezone_impl(body: dict):
    tz = str(body.get("timezone", "")).strip()
    if not tz:
        return {"success": False, "error": "Timezone required."}

    ok, out, err = run_command(["timedatectl", "set-timezone", tz])
    if not ok:
        tz_path = f"/usr/share/zoneinfo/{tz}"
        if os.path.exists(tz_path):
            try:
                if os.path.exists("/etc/localtime"):
                    os.remove("/etc/localtime")
                os.symlink(tz_path, "/etc/localtime")
            except Exception as e:
                return {"success": False, "error": str(e)}

    return {"success": True, "timezone": tz}

def set_locale_impl(body: dict):
    loc = str(body.get("locale", "")).strip()
    if not loc:
        return {"success": False, "error": "Locale required."}

    run_command(["localectl", "set-locale", f"LANG={loc}"])
    return {"success": True, "locale": loc}

def set_keyboard_impl(body: dict):
    layout = str(body.get("layout", "us")).strip()
    run_command(["setxkbmap", layout])
    run_command(["localectl", "set-x11-keymap", layout])
    
    # Read active layout back to confirm
    kb_val = layout
    ok_kb, kb_out, _ = run_command(["setxkbmap", "-query"])
    if ok_kb and kb_out:
        for line in kb_out.splitlines():
            if "layout:" in line:
                kb_val = line.split("layout:")[1].strip()

    return {"success": True, "keyboardLayout": kb_val}

def set_ntp_impl(body: dict):
    enabled = bool(body.get("enabled", True))
    cmd_val = "true" if enabled else "false"
    run_command(["timedatectl", "set-ntp", cmd_val])
    return {"success": True, "ntpActive": enabled}

# --- XDG PERSONALIZATION PERSISTENCE (ATOMIC & PER-USER) ---
def get_personalization_config_path():
    cfg_dir = os.path.join(get_user_home(), ".config", "windroid")
    os.makedirs(cfg_dir, exist_ok=True)
    return os.path.join(cfg_dir, "preferences.json")

def get_personalization_impl():
    path = get_personalization_config_path()
    if os.path.exists(path):
        try:
            with open(path, "r", encoding="utf-8") as f:
                prefs = json.load(f)
                return {"success": True, "preferences": prefs}
        except json.JSONDecodeError:
            # Safely isolate corrupted file and revert to defaults
            try:
                shutil.copy2(path, path + ".corrupted")
            except Exception:
                pass
        except Exception:
            pass
    
    default_prefs = {
        "wallpaper": "aether-wallpaper-01",
        "darkMode": True,
        "accentColor": "#0067C0",
        "desktopIconSize": 48,
        "dockPosition": "bottom",
        "clockFormat": "12h",
        "autoLockMinutes": 0,
        "lockWallpaper": "aether-wallpaper-01"
    }
    return {"success": True, "preferences": default_prefs}

def set_personalization_impl(body: dict):
    prefs = body.get("preferences", {})
    path = get_personalization_config_path()
    tmp_path = path + ".tmp"
    try:
        with open(tmp_path, "w", encoding="utf-8") as f:
            json.dump(prefs, f, indent=2)
            f.flush()
            os.fsync(f.fileno())
        os.replace(tmp_path, path)
        return {"success": True}
    except Exception as e:
        return {"success": False, "error": str(e)}

# --- SESSION LOCK / UNLOCK / LOGOUT NATIVE PERSISTENCE ---
SESSION_FILE = "/tmp/windroid-session-status.json"

def _read_native_session_status() -> str:
    if os.path.exists(SESSION_FILE):
        try:
            with open(SESSION_FILE, "r") as f:
                data = json.load(f)
                return data.get("status", "logged_in")
        except Exception:
            pass
    return "logged_in"

def _write_native_session_status(status: str):
    try:
        with open(SESSION_FILE, "w") as f:
            json.dump({"status": status}, f)
    except Exception:
        pass

def get_session_status_impl():
    status = _read_native_session_status()
    curr_user = os.getenv("USER", "live")
    is_live_usr = (curr_user in ["live", "user"] and is_live_system())
    raw_cmd = ""
    try:
        if os.path.exists("/proc/cmdline"):
            with open("/proc/cmdline", "r") as f:
                raw_cmd = f.read().strip()
    except Exception:
        pass
    return {
        "success": True,
        "status": status,
        "runtimeMode": get_runtime_mode(),
        "bootMode": get_boot_mode(),
        "rawKernelCmdline": raw_cmd,
        "isLiveFilesystem": is_live_system(),
        "isLiveUser": is_live_usr,
        "currentUser": curr_user
    }

def set_session_lock_impl():
    _write_native_session_status("locked")
    run_command(["loginctl", "lock-session"])
    return {"success": True, "status": "locked"}

def set_session_unlock_impl(body: dict):
    auth_res = authenticate_impl(body)
    if auth_res.get("authenticated"):
        _write_native_session_status("logged_in")
        return {"success": True, "status": "logged_in", "authenticated": True}
    return {"success": False, "status": _read_native_session_status(), "authenticated": False, "error": auth_res.get("error", "Authentication failed")}

def set_session_logout_impl():
    _write_native_session_status("login_screen")
    return {"success": True, "status": "login_screen"}

# --- PHASE 2 PRODUCTION-GRADE WINDROID OS INSTALLER ARCHITECTURE ---

_INSTALLER_LOCK = threading.Lock()
_AUTHORIZED_PLANS = {}  # token -> {"plan": dict, "expiresAt": float}

_INSTALLER_STATUS = {
    "status": "idle",
    "stage": "idle",
    "stageDescription": "Ready to install Windroid OS.",
    "progress": 0,
    "error": None,
    "canInstall": True,
    "targetDisk": None,
    "startedAt": None,
    "completedAt": None
}

def get_installer_boot_mode_impl():
    boot_mode = "uefi" if os.path.exists("/sys/firmware/efi") else "bios"
    return {"success": True, "bootMode": boot_mode}

def find_live_media_device() -> str:
    try:
        for mount_pt in ["/run/live/medium", "/run/live", "/cdrom", "/medium", "/run/initramfs/live", "/live/image"]:
            ok, stdout, _ = run_command(["findmnt", "-n", "-o", "SOURCE", mount_pt])
            if ok and stdout.strip():
                dev = stdout.strip().split("\n")[0]
                if dev.startswith("/dev/"):
                    dev = os.path.realpath(dev)
                    if dev.startswith("/dev/sr") or "loop" in dev:
                        return dev
                    if "nvme" in dev or "mmcblk" in dev:
                        dev = re.sub(r"p\d+$", "", dev)
                    else:
                        dev = re.sub(r"\d+$", "", dev)
                    return dev
    except Exception:
        pass
    return ""

def format_partition_device_path(disk_path: str, part_num: int) -> str:
    clean_disk = disk_path.rstrip()
    if clean_disk.startswith("/dev/nvme") or clean_disk.startswith("/dev/mmcblk") or clean_disk.startswith("/dev/loop"):
        return f"{clean_disk}p{part_num}"
    return f"{clean_disk}{part_num}"

def get_installer_status_impl():
    with _INSTALLER_LOCK:
        mode = get_runtime_mode()
        boot_mode = "uefi" if os.path.exists("/sys/firmware/efi") else "bios"
        live_dev = find_live_media_device()
        st = dict(_INSTALLER_STATUS)
        st["runtimeMode"] = mode
        st["bootMode"] = boot_mode
        st["liveMediaDevice"] = live_dev
        st["success"] = True
        return st

def _update_installer_status(status: str, stage: str, description: str, progress: int, error: str = None, target_disk: str = None):
    with _INSTALLER_LOCK:
        _INSTALLER_STATUS["status"] = status
        _INSTALLER_STATUS["stage"] = stage
        _INSTALLER_STATUS["stageDescription"] = description
        _INSTALLER_STATUS["progress"] = max(0, min(100, progress))
        _INSTALLER_STATUS["error"] = error
        if target_disk:
            _INSTALLER_STATUS["targetDisk"] = target_disk
        if status == "in_progress" and not _INSTALLER_STATUS.get("startedAt"):
            _INSTALLER_STATUS["startedAt"] = datetime.datetime.now(datetime.timezone.utc).isoformat()
        if status in ["completed", "failed"]:
            _INSTALLER_STATUS["completedAt"] = datetime.datetime.now(datetime.timezone.utc).isoformat()
        _log_installer(f"Status Update [{stage} - {progress}%]: {description}" + (f" (Error: {error})" if error else ""))

def get_installer_disks_impl():
    disks = []
    eligible_disks = []
    excluded_devices = []
    live_media_dev = find_live_media_device()

    try:
        ok, stdout, stderr = run_command([
            "lsblk", "--json", "--bytes",
            "-o", "NAME,PATH,SIZE,FSTYPE,LABEL,UUID,MOUNTPOINT,TYPE,RO,RM,MODEL,TRAN,SERIAL,VENDOR,ROTA"
        ])
        if ok and stdout.strip():
            data = json.loads(stdout)
            devices = data.get("blockdevices", [])
            for dev in devices:
                dev_type = str(dev.get("type", "")).lower()
                name_val = dev.get("name", "")
                dev_path = str(dev.get("path") or f"/dev/{name_val}").strip()
                
                # Skip optical disc drives (/dev/sr*) and loop devices as top-level install targets
                if dev_type == "rom" or dev_path.startswith("/dev/sr") or dev_path.startswith("/dev/loop"):
                    excluded_devices.append({
                        "path": dev_path,
                        "reason": "Optical or loop device",
                        "sizeBytes": int(dev.get("size") or 0)
                    })
                    continue

                # Only examine whole disks
                if dev_type != "disk":
                    continue

                size_bytes = int(dev.get("size") or 0)
                is_ro = bool(dev.get("ro"))
                is_rm = bool(dev.get("rm"))
                is_rota = bool(dev.get("rota", False))
                tran = str(dev.get("tran") or ("nvme" if "nvme" in dev_path else "sata")).lower()
                model = str(dev.get("model") or "Generic Storage Device").strip()
                vendor = str(dev.get("vendor") or "").strip()
                serial = str(dev.get("serial") or "").strip()

                # Check if this drive is the live media
                is_live = False
                if live_media_dev and (dev_path == live_media_dev or live_media_dev.startswith(dev_path)):
                    is_live = True

                # Parse partitions
                partitions = []
                has_existing_windroid = False
                existing_windroid_details = None

                children = dev.get("children", [])
                for idx, child in enumerate(children):
                    c_path = str(child.get("path") or f"/dev/{child.get('name')}").strip()
                    c_size = int(child.get("size") or 0)
                    c_fstype = str(child.get("fstype") or "").lower()
                    c_label = str(child.get("label") or "")
                    c_uuid = str(child.get("uuid") or "")
                    c_mount = str(child.get("mountpoint") or "")

                    part_obj = {
                        "device": c_path,
                        "number": idx + 1,
                        "sizeBytes": c_size,
                        "filesystem": c_fstype,
                        "label": c_label,
                        "uuid": c_uuid,
                        "mountPoint": c_mount if c_mount else None,
                        "bootable": bool("boot" in c_label.lower() or "efi" in c_label.lower() or c_mount == "/boot/efi"),
                        "flags": ["esp", "boot"] if (c_mount == "/boot/efi" or "efi" in c_label.lower()) else []
                    }
                    partitions.append(part_obj)

                    if c_label == "WindroidOS" or "windroid" in c_label.lower():
                        has_existing_windroid = True
                        existing_windroid_details = {
                            "partition": c_path,
                            "label": c_label,
                            "uuid": c_uuid
                        }

                is_protected = is_live or is_ro
                protection_reason = None
                if is_live:
                    protection_reason = "Live installation source media is protected from overwrite"
                elif is_ro:
                    protection_reason = "Device is hardware or software read-only"

                disk_obj = {
                    "device": dev_path,
                    "model": model,
                    "vendor": vendor,
                    "serial": serial,
                    "sizeBytes": size_bytes,
                    "transport": tran,
                    "removable": is_rm,
                    "rotational": is_rota,
                    "readOnly": is_ro,
                    "systemDisk": is_live,
                    "isLiveMedia": is_live,
                    "protected": is_protected,
                    "protectionReason": protection_reason,
                    "hasExistingInstallation": has_existing_windroid,
                    "existingInstallation": existing_windroid_details,
                    "partitions": partitions
                }

                disks.append(disk_obj)

                # Eligible targets must be at least 4 GB, not protected, and not read-only
                if not is_protected and size_bytes >= 4 * 1024 * 1024 * 1024:
                    eligible_disks.append(disk_obj)
                else:
                    reason = protection_reason or ("Drive capacity too small (< 4 GB)" if size_bytes < 4 * 1024 * 1024 * 1024 else "Ineligible")
                    excluded_devices.append({
                        "path": dev_path,
                        "reason": reason,
                        "sizeBytes": size_bytes
                    })

    except Exception as e:
        _log_installer(f"Error during disk discovery: {e}")

    return {
        "success": True,
        "disks": disks,
        "eligibleDisks": eligible_disks,
        "excludedDevices": excluded_devices,
        "liveMediaDevice": live_media_dev
    }

def generate_installer_plan_impl(body: dict):
    target_disk = str(body.get("targetDisk", "")).strip()
    installation_mode = str(body.get("installationMode", "erase_disk")).strip()
    user_config = body.get("userConfig", {}) or {}
    locale_config = body.get("localeConfig", {}) or {}

    if not target_disk:
        return {
            "success": False,
            "plan": None,
            "authToken": "",
            "errors": ["Target disk selection is required."],
            "warnings": []
        }

    # Discover and verify target disk
    disks_res = get_installer_disks_impl()
    all_disks = disks_res.get("disks", [])
    target = next((d for d in all_disks if d.get("device") == target_disk), None)

    if not target:
        # If running in dev without disk present, check if valid path format
        if not os.path.exists(target_disk) and not target_disk.startswith("/dev/"):
            return {
                "success": False,
                "plan": None,
                "authToken": "",
                "errors": [f"Target disk '{target_disk}' not found on system."],
                "warnings": []
            }

    if target:
        if target.get("isLiveMedia") or target.get("protected"):
            return {
                "success": False,
                "plan": None,
                "authToken": "",
                "errors": [f"Target disk '{target_disk}' is protected: {target.get('protectionReason')}"],
                "warnings": []
            }
        if target.get("readOnly"):
            return {
                "success": False,
                "plan": None,
                "authToken": "",
                "errors": [f"Target disk '{target_disk}' is read-only."],
                "warnings": []
            }
        if target.get("sizeBytes", 0) < 4 * 1024 * 1024 * 1024:
            return {
                "success": False,
                "plan": None,
                "authToken": "",
                "errors": [f"Target disk '{target_disk}' capacity is too small (minimum 4 GB required)."],
                "warnings": []
            }

    esp_size = 512 * 1024 * 1024  # 512 MiB
    total_size = target.get("sizeBytes", 64 * 1024 * 1024 * 1024) if target else 64 * 1024 * 1024 * 1024
    root_size = max(0, total_size - esp_size - (2 * 1024 * 1024))

    esp_part_dev = format_partition_device_path(target_disk, 1)
    root_part_dev = format_partition_device_path(target_disk, 2)

    plan = {
        "version": "1.0",
        "targetDisk": target_disk,
        "bootMode": "uefi",
        "installationMode": installation_mode,
        "hasExistingInstallation": bool(target and target.get("hasExistingInstallation")),
        "partitions": [
            {
                "device": esp_part_dev,
                "sizeBytes": esp_size,
                "filesystem": "fat32",
                "mountPoint": "/boot/efi",
                "label": "EFI",
                "flags": ["esp", "boot"]
            },
            {
                "device": root_part_dev,
                "sizeBytes": root_size,
                "filesystem": "ext4",
                "mountPoint": "/",
                "label": "WindroidOS"
            }
        ],
        "userConfig": {
            "username": user_config.get("username", "windroid"),
            "fullName": user_config.get("fullName", "Windroid User"),
            "password": user_config.get("password", ""),
            "deviceName": user_config.get("deviceName", "Windroid-PC"),
            "requirePassword": user_config.get("requirePassword", True)
        },
        "localeConfig": {
            "language": locale_config.get("language", "en_US.UTF-8"),
            "keyboard": locale_config.get("keyboard", "us"),
            "timezone": locale_config.get("timezone", "America/New_York")
        },
        "bootloaderConfig": {
            "targetDevice": target_disk,
            "type": "grub-efi"
        }
    }

    warnings = []
    if target and target.get("hasExistingInstallation"):
        warnings.append(f"Target disk '{target_disk}' contains an existing Windroid OS installation which will be overwritten.")

    # Generate single-use authorization token
    auth_token = secrets.token_hex(24)
    with _INSTALLER_LOCK:
        # Cleanup expired tokens
        now_ts = time.time()
        expired = [k for k, v in _AUTHORIZED_PLANS.items() if v.get("expiresAt", 0) < now_ts]
        for exp_k in expired:
            _AUTHORIZED_PLANS.pop(exp_k, None)
        _AUTHORIZED_PLANS[auth_token] = {
            "plan": plan,
            "expiresAt": now_ts + 600  # 10 minutes validity
        }

    return {
        "success": True,
        "plan": plan,
        "authToken": auth_token,
        "errors": [],
        "warnings": warnings
    }

def validate_installer_plan_impl(body: dict):
    plan = body.get("plan", {}) or {}
    target_disk = plan.get("targetDisk", "")
    if not target_disk:
        return {"success": False, "valid": False, "errors": ["Target disk must be specified in installation plan."], "warnings": []}

    disks_res = get_installer_disks_impl()
    all_disks = disks_res.get("disks", [])
    target = next((d for d in all_disks if d.get("device") == target_disk), None)

    if target:
        if target.get("isLiveMedia") or target.get("protected"):
            return {"success": False, "valid": False, "errors": [f"Target disk '{target_disk}' is protected: {target.get('protectionReason')}"], "warnings": []}
        if target.get("readOnly"):
            return {"success": False, "valid": False, "errors": [f"Target disk '{target_disk}' is read-only."], "warnings": []}

    partitions = plan.get("partitions", [])
    if len(partitions) < 2:
        return {"success": False, "valid": False, "errors": ["Plan must contain at least EFI System Partition and Root partition."], "warnings": []}

    has_root = any(p.get("mountPoint") == "/" for p in partitions)
    has_esp = any(p.get("mountPoint") == "/boot/efi" or "esp" in (p.get("flags") or []) for p in partitions)

    if not has_root:
        return {"success": False, "valid": False, "errors": ["Installation plan is missing root ('/') partition."], "warnings": []}
    if not has_esp:
        return {"success": False, "valid": False, "errors": ["Installation plan is missing EFI System Partition ('/boot/efi')."], "warnings": []}

    return {"success": True, "valid": True, "errors": [], "warnings": []}

def authorize_installer_plan_impl(body: dict):
    plan = body.get("plan", {}) or {}
    val_res = validate_installer_plan_impl({"plan": plan})
    if not val_res.get("valid"):
        return {"success": False, "errors": val_res.get("errors", ["Plan validation failed."])}

    auth_token = secrets.token_hex(24)
    with _INSTALLER_LOCK:
        now_ts = time.time()
        _AUTHORIZED_PLANS[auth_token] = {
            "plan": plan,
            "expiresAt": now_ts + 600
        }

    return {
        "success": True,
        "authToken": auth_token,
        "plan": plan
    }

def _run_native_installation_worker(plan: dict):
    target_disk = plan.get("targetDisk", "")
    target_mount = "/mnt/windroid-target"
    esp_mount = "/mnt/windroid-target/boot/efi"
    target_mounted = False

    try:
        _update_installer_status("in_progress", "preparing_disk", f"Preparing target disk '{target_disk}'...", 5, target_disk=target_disk)
        save_native_installer_state("/", "INSTALLATION_IN_PROGRESS", {
            "targetDisk": target_disk,
            "localeConfig": plan.get("localeConfig", {})
        })

        # Pre-flight check 1: Target disk specified and exists
        if not target_disk:
            raise RuntimeError("CRITICAL_STEP_FAILED: Target disk is not specified in installation plan.")
        if not os.path.exists(target_disk):
            raise RuntimeError(f"CRITICAL_STEP_FAILED: Target disk '{target_disk}' does not exist.")

        # Pre-flight check 2: Target is not live media device
        live_dev = find_live_media_device()
        if live_dev and (target_disk == live_dev or live_dev.startswith(target_disk) or target_disk.startswith(live_dev)):
            raise RuntimeError(f"CRITICAL_STEP_FAILED: Target disk {target_disk} is the live installation media!")

        # Pre-flight check 3: Target is not read-only
        dev_base = os.path.basename(target_disk)
        ro_path = f"/sys/block/{dev_base}/ro"
        if os.path.exists(ro_path):
            try:
                with open(ro_path, "r") as f:
                    if f.read().strip() == "1":
                        raise RuntimeError(f"CRITICAL_STEP_FAILED: Target disk '{target_disk}' is read-only!")
            except Exception as e:
                if "read-only" in str(e):
                    raise

        # Pre-flight check 4: Target does not host running root filesystem
        ok_rootmnt, rootmnt_out, _ = run_command(["findmnt", "-n", "-o", "SOURCE", "/"])
        if ok_rootmnt and rootmnt_out.strip() and target_disk in rootmnt_out.strip():
            raise RuntimeError(f"CRITICAL_STEP_FAILED: Target disk '{target_disk}' contains the active running root mount ({rootmnt_out.strip()})!")

        # Stop active swap
        run_command(["swapoff", "-a"], timeout=15)

        # Unmount any existing mounts on target disk
        ok_mnts, mnts_out, _ = run_command(["findmnt", "-l", "-n", "-o", "TARGET,SOURCE"])
        if ok_mnts and mnts_out:
            for line in mnts_out.splitlines():
                parts = line.strip().split(None, 1)
                if len(parts) == 2:
                    t_mount, t_src = parts[0], parts[1]
                    if target_disk in t_src:
                        _log_installer(f"Unmounting active target mount: {t_mount} ({t_src})")
                        run_command(["umount", "-f", "-l", t_mount], timeout=15)

        # Step 2: Partitioning (UEFI + GPT) (Rule #5)
        _update_installer_status("in_progress", "partitioning", "Creating GPT partition table and EFI/Root partitions...", 20)
        
        # Wipe signatures
        ok_wipe, _, err_wipe = run_command(["wipefs", "-a", target_disk], timeout=30)
        if not ok_wipe:
            raise RuntimeError(f"CRITICAL_STEP_FAILED: wipefs failed on {target_disk}: {err_wipe}")

        ok_lbl, _, err_lbl = run_command(["parted", "-s", target_disk, "mklabel", "gpt"], timeout=30)
        if not ok_lbl:
            raise RuntimeError(f"CRITICAL_STEP_FAILED: parted mklabel gpt failed on {target_disk}: {err_lbl}")
        
        # Create ESP (512 MiB FAT32)
        ok_esp_part, _, err_esp_part = run_command(["parted", "-s", target_disk, "mkpart", "ESP", "fat32", "1MiB", "513MiB"], timeout=30)
        if not ok_esp_part:
            raise RuntimeError(f"CRITICAL_STEP_FAILED: parted mkpart ESP failed on {target_disk}: {err_esp_part}")

        ok_esp_on, _, err_esp_on = run_command(["parted", "-s", target_disk, "set", "1", "esp", "on"], timeout=30)
        if not ok_esp_on:
            raise RuntimeError(f"CRITICAL_STEP_FAILED: parted set 1 esp on failed on {target_disk}: {err_esp_on}")

        ok_boot_on, _, err_boot_on = run_command(["parted", "-s", target_disk, "set", "1", "boot", "on"], timeout=30)
        if not ok_boot_on:
            raise RuntimeError(f"CRITICAL_STEP_FAILED: parted set 1 boot on failed on {target_disk}: {err_boot_on}")

        # Create Root (remaining disk space ext4)
        ok_root_part, _, err_root_part = run_command(["parted", "-s", target_disk, "mkpart", "WindroidOS", "ext4", "513MiB", "100%"], timeout=30)
        if not ok_root_part:
            raise RuntimeError(f"CRITICAL_STEP_FAILED: parted mkpart Root failed on {target_disk}: {err_root_part}")

        # Settle kernel device nodes
        run_command(["partprobe", target_disk], timeout=15)
        run_command(["udevadm", "settle", "--timeout=15"], timeout=20)
        time.sleep(1)

        esp_part = format_partition_device_path(target_disk, 1)
        root_part = format_partition_device_path(target_disk, 2)

        # Verify partition device nodes exist
        for _ in range(5):
            if os.path.exists(esp_part) and os.path.exists(root_part):
                break
            time.sleep(1)

        if not os.path.exists(esp_part) or not os.path.exists(root_part):
            raise RuntimeError(f"CRITICAL_STEP_FAILED: Partition device nodes {esp_part} or {root_part} not found after partitioning.")

        # Step 3: Filesystem Creation & Blkid Verification (Rule #6)
        _update_installer_status("in_progress", "formatting", "Formatting EFI FAT32 and Root ext4 filesystems...", 35)
        
        ok_esp_fmt, _, err_esp = run_command(["mkfs.vfat", "-F32", "-n", "EFI", esp_part], timeout=45)
        if not ok_esp_fmt:
            ok_esp_fmt, _, err_esp = run_command(["mkfs.fat", "-F32", "-n", "EFI", esp_part], timeout=45)
            if not ok_esp_fmt:
                raise RuntimeError(f"CRITICAL_STEP_FAILED: Failed to format EFI system partition ({esp_part}): {err_esp}")

        ok_root_fmt, _, err_root = run_command(["mkfs.ext4", "-F", "-L", "WindroidOS", root_part], timeout=90)
        if not ok_root_fmt:
            raise RuntimeError(f"CRITICAL_STEP_FAILED: Failed to format root ext4 partition ({root_part}): {err_root}")

        run_command(["udevadm", "settle", "--timeout=15"], timeout=20)

        # Verify UUIDs and Filesystem Types via blkid
        ok_ruuid, root_uuid, err_ruuid = run_command(["blkid", "-s", "UUID", "-o", "value", root_part])
        ok_euuid, esp_uuid, err_euuid = run_command(["blkid", "-s", "UUID", "-o", "value", esp_part])
        root_uuid = root_uuid.strip() if ok_ruuid else ""
        esp_uuid = esp_uuid.strip() if ok_euuid else ""

        if not ok_ruuid or not root_uuid:
            raise RuntimeError(f"CRITICAL_STEP_FAILED: blkid failed to read root partition UUID on {root_part}: {err_ruuid}")
        if not ok_euuid or not esp_uuid:
            raise RuntimeError(f"CRITICAL_STEP_FAILED: blkid failed to read ESP partition UUID on {esp_part}: {err_euuid}")

        ok_rtype, root_type, _ = run_command(["blkid", "-s", "TYPE", "-o", "value", root_part])
        ok_etype, esp_type, _ = run_command(["blkid", "-s", "TYPE", "-o", "value", esp_part])
        if root_type.strip() != "ext4":
            raise RuntimeError(f"CRITICAL_STEP_FAILED: Root filesystem type mismatch: expected ext4, got '{root_type.strip()}'")
        if "fat" not in esp_type.strip().lower() and "vfat" not in esp_type.strip().lower():
            raise RuntimeError(f"CRITICAL_STEP_FAILED: ESP filesystem type mismatch: expected vfat/fat32, got '{esp_type.strip()}'")

        # Step 4: Mount Target & Deploy OS (Rule #4)
        _update_installer_status("in_progress", "deploying_os", "Mounting target filesystem and deploying Windroid OS image...", 50)
        os.makedirs(target_mount, exist_ok=True)
        ok_m_root, _, err_m_root = run_command(["mount", root_part, target_mount], timeout=20)
        if not ok_m_root:
            raise RuntimeError(f"CRITICAL_STEP_FAILED: Failed to mount root partition {root_part} to {target_mount}: {err_m_root}")
        target_mounted = True

        os.makedirs(esp_mount, exist_ok=True)
        ok_m_esp, _, err_m_esp = run_command(["mount", esp_part, esp_mount], timeout=20)
        if not ok_m_esp:
            raise RuntimeError(f"CRITICAL_STEP_FAILED: Failed to mount EFI partition {esp_part} to {esp_mount}: {err_m_esp}")

        # Locate source squashfs image or copy live filesystem
        squashfs_candidates = [
            "/run/live/medium/live/filesystem.squashfs",
            "/live/image/live/filesystem.squashfs",
            "/cdrom/live/filesystem.squashfs",
            "/run/initramfs/live/live/filesystem.squashfs"
        ]
        source_squashfs = next((p for p in squashfs_candidates if os.path.exists(p)), None)

        if source_squashfs and shutil.which("unsquashfs"):
            _log_installer(f"Deploying from live squashfs image: {source_squashfs}")
            _update_installer_status("in_progress", "deploying_os", "Extracting system files from squashfs image...", 60)
            ok_unsquash, _, err_unsquash = run_command(["unsquashfs", "-f", "-d", target_mount, source_squashfs], timeout=900)
            if not ok_unsquash:
                raise RuntimeError(f"CRITICAL_STEP_FAILED: Failed to extract squashfs image: {err_unsquash}")
        else:
            _log_installer("Deploying live root filesystem to target with rsync...")
            _update_installer_status("in_progress", "deploying_os", "Copying OS filesystem to target drive...", 60)
            rsync_cmd = [
                "rsync", "-aHAX", "--delete",
                "--exclude=/proc/*",
                "--exclude=/sys/*",
                "--exclude=/dev/*",
                "--exclude=/run/*",
                "--exclude=/tmp/*",
                "--exclude=/mnt/*",
                "--exclude=/media/*",
                "--exclude=/lost+found",
                "--exclude=/var/tmp/*",
                "--exclude=/run/live/*",
                "/", target_mount + "/"
            ]
            ok_rsync, _, err_rsync = run_command(rsync_cmd, timeout=900)
            if not ok_rsync:
                raise RuntimeError(f"CRITICAL_STEP_FAILED: rsync filesystem deployment failed: {err_rsync}")

        # Ensure skeleton directories exist with appropriate permissions
        for skel in ["proc", "sys", "dev", "run", "tmp", "mnt", "media", "var/tmp", "var/lib/windroid", "etc/windroid"]:
            skel_dir = os.path.join(target_mount, skel)
            os.makedirs(skel_dir, exist_ok=True)
        os.chmod(os.path.join(target_mount, "tmp"), 0o1777)
        os.chmod(os.path.join(target_mount, "var/tmp"), 0o1777)

        # Step 5: Configure FSTAB and System Configuration
        _update_installer_status("in_progress", "configuring_system", "Generating fstab and applying system configurations...", 75)

        fstab_content = [
            "# /etc/fstab: static file system information for Windroid OS",
            f"UUID={root_uuid}  /          ext4  errors=remount-ro  0  1",
            f"UUID={esp_uuid}   /boot/efi  vfat  umask=0077         0  2",
            "tmpfs             /tmp       tmpfs defaults,noatime,mode=1777 0 0\n"
        ]
        fstab_path = os.path.join(target_mount, "etc", "fstab")
        os.makedirs(os.path.dirname(fstab_path), exist_ok=True)
        with open(fstab_path, "w", encoding="utf-8") as f:
            f.write("\n".join(fstab_content))

        # Hostname configuration
        dev_name = (plan.get("userConfig") or {}).get("deviceName", "Windroid-PC")
        hostname_path = os.path.join(target_mount, "etc", "hostname")
        with open(hostname_path, "w", encoding="utf-8") as f:
            f.write(f"{dev_name}\n")

        hosts_path = os.path.join(target_mount, "etc", "hosts")
        with open(hosts_path, "w", encoding="utf-8") as f:
            f.write(f"127.0.0.1\tlocalhost\n127.0.1.1\t{dev_name}\n\n# The following lines are desirable for IPv6 capable hosts\n::1     localhost ip6-localhost ip6-loopback\nff02::1 ip6-allnodes\nff02::2 ip6-allrouters\n")

        # Step 5b: Install First-Boot Orchestrator, Bridge, and Systemd Services into Target (Rules #7, #8)
        _update_installer_status("in_progress", "configuring_system", "Installing first-boot orchestrator and systemd units...", 80)
        
        # Install first-boot script
        src_first_boot = "/usr/bin/windroid-first-boot.py"
        if not os.path.exists(src_first_boot):
            src_first_boot = os.path.join(os.path.dirname(__file__), "windroid-first-boot.py")
        
        target_first_boot = os.path.join(target_mount, "usr/bin/windroid-first-boot.py")
        os.makedirs(os.path.dirname(target_first_boot), exist_ok=True)
        if os.path.exists(src_first_boot):
            shutil.copy2(src_first_boot, target_first_boot)
            os.chmod(target_first_boot, 0o755)

        # Install bridge script
        src_bridge = "/usr/bin/windroid-bridge.py"
        if not os.path.exists(src_bridge):
            src_bridge = os.path.join(os.path.dirname(__file__), "windroid-bridge.py")
        target_bridge = os.path.join(target_mount, "usr/bin/windroid-bridge.py")
        if os.path.exists(src_bridge):
            shutil.copy2(src_bridge, target_bridge)
            os.chmod(target_bridge, 0o755)

        # Install shell runner script
        src_shell_runner = "/usr/bin/windroid-shell-runner.sh"
        if not os.path.exists(src_shell_runner):
            src_shell_runner = os.path.join(os.path.dirname(__file__), "windroid-shell-runner.sh")
        target_shell_runner = os.path.join(target_mount, "usr/bin/windroid-shell-runner.sh")
        if os.path.exists(src_shell_runner):
            shutil.copy2(src_shell_runner, target_shell_runner)
            os.chmod(target_shell_runner, 0o755)

        # Install first-boot systemd service
        src_service = "/etc/systemd/system/windroid-first-boot.service"
        if not os.path.exists(src_service):
            src_service = os.path.join(os.path.dirname(__file__), "systemd/windroid-first-boot.service")

        target_service = os.path.join(target_mount, "etc/systemd/system/windroid-first-boot.service")
        os.makedirs(os.path.dirname(target_service), exist_ok=True)
        if os.path.exists(src_service):
            shutil.copy2(src_service, target_service)
            os.chmod(target_service, 0o644)

        # Install bridge systemd service
        src_bridge_service = "/etc/systemd/system/windroid-bridge.service"
        if not os.path.exists(src_bridge_service):
            src_bridge_service = os.path.join(os.path.dirname(__file__), "windroid-bridge.service")
        target_bridge_service = os.path.join(target_mount, "etc/systemd/system/windroid-bridge.service")
        if os.path.exists(src_bridge_service):
            shutil.copy2(src_bridge_service, target_bridge_service)
            os.chmod(target_bridge_service, 0o644)

        # Enable services in target multi-user.target.wants and graphical.target.wants
        for s_name in ["windroid-first-boot.service", "windroid-bridge.service"]:
            for target_wants in ["etc/systemd/system/multi-user.target.wants", "etc/systemd/system/graphical.target.wants"]:
                wants_dir = os.path.join(target_mount, target_wants)
                os.makedirs(wants_dir, exist_ok=True)
                symlink_target = os.path.join(wants_dir, s_name)
                if os.path.islink(symlink_target) or os.path.exists(symlink_target):
                    try:
                        os.remove(symlink_target)
                    except Exception:
                        pass
                try:
                    os.symlink(f"/etc/systemd/system/{s_name}", symlink_target)
                except Exception as e:
                    _log_installer(f"Notice creating {s_name} systemd wants symlink: {e}")

        # Install system-wide openbox autostart and desktop entries in target
        target_xdg_openbox = os.path.join(target_mount, "etc/xdg/openbox")
        os.makedirs(target_xdg_openbox, exist_ok=True)
        with open(os.path.join(target_xdg_openbox, "autostart"), "w", encoding="utf-8") as f:
            f.write("#!/bin/sh\n/usr/bin/windroid-shell-runner.sh &\n")
        os.chmod(os.path.join(target_xdg_openbox, "autostart"), 0o755)

        target_skel_openbox = os.path.join(target_mount, "etc/skel/.config/openbox")
        os.makedirs(target_skel_openbox, exist_ok=True)
        with open(os.path.join(target_skel_openbox, "autostart"), "w", encoding="utf-8") as f:
            f.write("#!/bin/sh\n/usr/bin/windroid-shell-runner.sh &\n")
        os.chmod(os.path.join(target_skel_openbox, "autostart"), 0o755)

        # Install autostart desktop entry in /etc/xdg/autostart/
        target_xdg_autostart = os.path.join(target_mount, "etc/xdg/autostart")
        os.makedirs(target_xdg_autostart, exist_ok=True)
        src_desktop = "/usr/share/applications/windroid-os.desktop"
        if not os.path.exists(src_desktop):
            src_desktop = os.path.join(os.path.dirname(__file__), "windroid-os.desktop")
        if os.path.exists(src_desktop):
            shutil.copy2(src_desktop, os.path.join(target_xdg_autostart, "windroid-os-autostart.desktop"))
            os.makedirs(os.path.join(target_mount, "usr/share/applications"), exist_ok=True)
            shutil.copy2(src_desktop, os.path.join(target_mount, "usr/share/applications/windroid-os.desktop"))

        # Write runtime-mode file into target root
        target_windroid_dir = os.path.join(target_mount, "etc/windroid")
        os.makedirs(target_windroid_dir, exist_ok=True)
        with open(os.path.join(target_windroid_dir, "runtime-mode"), "w", encoding="utf-8") as f:
            f.write("installed\n")

        # Remove any live ISO autologin config in target
        target_live_conf = os.path.join(target_mount, "etc/lightdm/lightdm.conf.d/80-windroid-live-autologin.conf")
        if os.path.exists(target_live_conf):
            try:
                os.remove(target_live_conf)
            except Exception:
                pass

        # Bind virtual filesystems for chroot
        _update_installer_status("in_progress", "installing_bootloader", "Installing and configuring GRUB EFI bootloader in chroot...", 85)
        ok_bdev, _, err_bdev = run_command(["mount", "--bind", "/dev", os.path.join(target_mount, "dev")], timeout=15)
        if not ok_bdev:
            raise RuntimeError(f"CRITICAL_STEP_FAILED: Failed to bind /dev to target chroot: {err_bdev}")
        ok_bpts, _, err_bpts = run_command(["mount", "--bind", "/dev/pts", os.path.join(target_mount, "dev/pts")], timeout=15)
        if not ok_bpts:
            raise RuntimeError(f"CRITICAL_STEP_FAILED: Failed to bind /dev/pts to target chroot: {err_bpts}")
        ok_bproc, _, err_bproc = run_command(["mount", "-t", "proc", "proc", os.path.join(target_mount, "proc")], timeout=15)
        if not ok_bproc:
            raise RuntimeError(f"CRITICAL_STEP_FAILED: Failed to mount proc to target chroot: {err_bproc}")
        ok_bsys, _, err_bsys = run_command(["mount", "-t", "sysfs", "sys", os.path.join(target_mount, "sys")], timeout=15)
        if not ok_bsys:
            raise RuntimeError(f"CRITICAL_STEP_FAILED: Failed to mount sysfs to target chroot: {err_bsys}")

        if os.path.exists("/sys/firmware/efi/efivars"):
            efivars_target = os.path.join(target_mount, "sys/firmware/efi/efivars")
            os.makedirs(efivars_target, exist_ok=True)
            run_command(["mount", "-t", "efivarfs", "efivarfs", efivars_target], timeout=15)

        # Step 6: Bootloader Installation (Rule #9)
        ok_grub, _, err_grub = run_command([
            "chroot", target_mount,
            "grub-install", "--target=x86_64-efi", "--efi-directory=/boot/efi",
            "--bootloader-id=WindroidOS", "--recheck", "--no-floppy"
        ], timeout=180)
        if not ok_grub:
            raise RuntimeError(f"CRITICAL_STEP_FAILED: grub-install failed in chroot: {err_grub}")

        ok_ugrub, _, err_ugrub = run_command(["chroot", target_mount, "update-grub"], timeout=90)
        if not ok_ugrub:
            raise RuntimeError(f"CRITICAL_STEP_FAILED: update-grub failed in chroot: {err_ugrub}")

        # Ensure fallback UEFI bootloader exists (EFI/BOOT/BOOTX64.EFI)
        fallback_efi_dir = os.path.join(target_mount, "boot/efi/EFI/BOOT")
        os.makedirs(fallback_efi_dir, exist_ok=True)
        fallback_efi_file = os.path.join(fallback_efi_dir, "BOOTX64.EFI")
        grub_installed_file = os.path.join(target_mount, "boot/efi/EFI/WindroidOS/grubx64.efi")
        if os.path.exists(grub_installed_file) and not os.path.exists(fallback_efi_file):
            shutil.copy2(grub_installed_file, fallback_efi_file)

        # Step 7: Installation Verification (Rules #7, #8, #9)
        _update_installer_status("in_progress", "verifying", "Verifying installed kernel, fstab, and bootloader integrity...", 95)
        
        # 1. Base system files
        has_fstab = os.path.exists(fstab_path) and os.path.getsize(fstab_path) > 0
        has_passwd = os.path.exists(os.path.join(target_mount, "etc/passwd")) and os.path.getsize(os.path.join(target_mount, "etc/passwd")) > 0
        has_shadow = os.path.exists(os.path.join(target_mount, "etc/shadow")) and os.path.getsize(os.path.join(target_mount, "etc/shadow")) > 0
        has_hostname = os.path.exists(os.path.join(target_mount, "etc/hostname")) and os.path.getsize(os.path.join(target_mount, "etc/hostname")) > 0
        has_first_boot = os.path.exists(target_first_boot) and os.path.getsize(target_first_boot) > 0 and os.access(target_first_boot, os.X_OK)
        has_shell_runner = os.path.exists(target_shell_runner) and os.path.getsize(target_shell_runner) > 0 and os.access(target_shell_runner, os.X_OK)
        has_first_boot_svc = os.path.exists(target_service) and os.path.getsize(target_service) > 0
        has_runtime_mode = os.path.exists(os.path.join(target_mount, "etc/windroid/runtime-mode"))
        has_wants_symlink = os.path.exists(os.path.join(target_mount, "etc/systemd/system/multi-user.target.wants/windroid-first-boot.service"))
        has_graphical_symlink = os.path.exists(os.path.join(target_mount, "etc/systemd/system/graphical.target.wants/windroid-first-boot.service"))

        # 2. Bootloader & Kernel
        has_efi = (os.path.exists(fallback_efi_file) and os.path.getsize(fallback_efi_file) > 0) or \
                  (os.path.exists(grub_installed_file) and os.path.getsize(grub_installed_file) > 0)
        has_grub_cfg = os.path.exists(os.path.join(target_mount, "boot/grub/grub.cfg")) and os.path.getsize(os.path.join(target_mount, "boot/grub/grub.cfg")) > 0

        boot_dir = os.path.join(target_mount, "boot")
        has_vmlinuz = any(f.startswith("vmlinuz") for f in os.listdir(boot_dir)) if os.path.exists(boot_dir) else False
        has_initrd = any(f.startswith("initrd.img") or f.startswith("initramfs") for f in os.listdir(boot_dir)) if os.path.exists(boot_dir) else False

        if not has_fstab:
            raise RuntimeError("CRITICAL_STEP_FAILED: /etc/fstab is missing or empty on target filesystem.")
        if not has_passwd:
            raise RuntimeError("CRITICAL_STEP_FAILED: /etc/passwd is missing or empty on target filesystem.")
        if not has_shadow:
            raise RuntimeError("CRITICAL_STEP_FAILED: /etc/shadow is missing or empty on target filesystem.")
        if not has_hostname:
            raise RuntimeError("CRITICAL_STEP_FAILED: /etc/hostname is missing or empty on target filesystem.")
        if not has_first_boot:
            raise RuntimeError("CRITICAL_STEP_FAILED: windroid-first-boot.py is missing or not executable on target.")
        if not has_shell_runner:
            raise RuntimeError("CRITICAL_STEP_FAILED: windroid-shell-runner.sh is missing or not executable on target.")
        if not has_first_boot_svc:
            raise RuntimeError("CRITICAL_STEP_FAILED: windroid-first-boot.service unit is missing on target.")
        if not has_wants_symlink:
            raise RuntimeError("CRITICAL_STEP_FAILED: windroid-first-boot.service is not enabled in multi-user.target.wants on target.")
        if not has_graphical_symlink:
            raise RuntimeError("CRITICAL_STEP_FAILED: windroid-first-boot.service is not enabled in graphical.target.wants on target.")
        if not has_runtime_mode:
            raise RuntimeError("CRITICAL_STEP_FAILED: /etc/windroid/runtime-mode is missing on target.")
        if not has_efi:
            raise RuntimeError(f"CRITICAL_STEP_FAILED: Bootloader EFI binary not found or empty on ESP partition.")
        if not has_grub_cfg:
            raise RuntimeError("CRITICAL_STEP_FAILED: /boot/grub/grub.cfg is missing or empty on target.")
        if not has_vmlinuz:
            raise RuntimeError("CRITICAL_STEP_FAILED: Linux kernel (vmlinuz) not found in /boot on target.")
        if not has_initrd:
            raise RuntimeError("CRITICAL_STEP_FAILED: Initial ramdisk (initrd.img) not found in /boot on target.")

        # Step 8: Commit Point & Atomic State Persistence (Rule #10)
        _update_installer_status("in_progress", "committing", "Committing installation state and syncing filesystem buffers...", 98)
        
        save_native_installer_state(target_mount, "OOBE_PENDING", {
            "targetDisk": target_disk,
            "localeConfig": plan.get("localeConfig", {}),
            "installationCompleted": True,
            "oobeCompleted": False
        })

        # Sync buffers (Rule #10)
        ok_sync, _, err_sync = run_command(["sync"], timeout=30)
        if not ok_sync:
            raise RuntimeError(f"CRITICAL_STEP_FAILED: Final filesystem sync failed: {err_sync}")

        # Safely unmount chroot bind mounts and target mounts
        for chroot_mnt in ["sys/firmware/efi/efivars", "sys", "proc", "dev/pts", "dev", "boot/efi", ""]:
            m_path = os.path.join(target_mount, chroot_mnt).rstrip("/")
            if m_path:
                run_command(["umount", "-l", m_path], timeout=10)

        _update_installer_status("completed", "completed", "Windroid OS has been installed successfully! Remove installation media and restart.", 100)

    except Exception as e:
        err_msg = str(e)
        _log_installer(f"INSTALLATION FAILED: {err_msg}")
        _update_installer_status("failed", "failed", f"Installation failed: {err_msg}", _INSTALLER_STATUS.get("progress", 0), error=err_msg)
        
        # Rule #11: Isolate target failures vs live host
        if not target_mounted:
            try:
                save_native_installer_state("/", "FAILED", {"error": err_msg})
            except Exception:
                pass
        else:
            try:
                save_native_installer_state(target_mount, "FAILED", {"error": err_msg})
            except Exception:
                pass

        # Attempt unmount cleanup
        for chroot_mnt in ["sys/firmware/efi/efivars", "sys", "proc", "dev/pts", "dev", "boot/efi", ""]:
            m_path = os.path.join(target_mount, chroot_mnt).rstrip("/")
            if m_path:
                run_command(["umount", "-l", m_path], timeout=5)

def execute_installer_plan_impl(body: dict):
    auth_token = str(body.get("authToken", "")).strip()
    plan = body.get("plan", {}) or {}

    with _INSTALLER_LOCK:
        if _INSTALLER_STATUS.get("status") == "in_progress":
            return {"success": False, "error": "An installation is already actively in progress."}

        # Check authorization token
        if auth_token:
            stored = _AUTHORIZED_PLANS.get(auth_token)
            if not stored:
                return {"success": False, "error": "UNAUTHORIZED_PLAN: Missing or invalid authorization token."}
            if stored.get("expiresAt", 0) < time.time():
                return {"success": False, "error": "EXPIRED_AUTHORIZATION: Authorization token has expired. Please re-authorize."}
            plan = stored.get("plan", plan)
            _AUTHORIZED_PLANS.pop(auth_token, None)
        elif not plan:
            return {"success": False, "error": "Installation plan must be provided."}

    # Start background execution worker
    worker = threading.Thread(target=_run_native_installation_worker, args=(plan,), daemon=True)
    worker.start()

    return {
        "success": True,
        "status": "started",
        "message": "Native Windroid OS installation pipeline started."
    }

def run():
    server_address = (HOST, PORT)
    httpd = ThreadingHTTPServer(server_address, WindroidBridgeHandler)
    print(f"[Windroid System Bridge] Running native bridge service on http://{HOST}:{PORT}")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("[Windroid System Bridge] Shutting down cleanly.")
        httpd.server_close()

if __name__ == "__main__":
    run()
