#!/usr/bin/env python3
"""
Windroid OS Authoritative State Management Module
=================================================
Single source of truth for Windroid OS installation state, lifecycle transitions,
atomic persistence, self-healing recovery, and validation.
"""

import os
import sys
import json
import time
import re
import datetime
import secrets
import subprocess
import shutil

STATE_VERSION = "windroid-installer-state-v1"
PRIMARY_STATE_FILE = "/var/lib/windroid/installer-state.json"
BACKUP_STATE_FILE = "/var/lib/windroid/installation-state.json"
RUNTIME_MODE_FILE = "/etc/windroid/runtime-mode"

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
    "INSTALLATION_IN_PROGRESS": ["INSTALLATION_IN_PROGRESS", "INSTALLATION_COMPLETE", "OOBE_PENDING", "FAILED"],
    "INSTALLATION_COMPLETE": ["INSTALLATION_COMPLETE", "OOBE_PENDING", "OOBE_IN_PROGRESS", "FAILED"],
    "OOBE_PENDING": ["OOBE_PENDING", "OOBE_IN_PROGRESS", "FAILED"],
    "OOBE_IN_PROGRESS": ["OOBE_IN_PROGRESS", "OOBE_COMPLETE", "DESKTOP_READY", "FAILED"],
    "OOBE_COMPLETE": ["OOBE_COMPLETE", "DESKTOP_READY", "FAILED"],
    "DESKTOP_READY": ["DESKTOP_READY", "FAILED"],
    "FAILED": ["INSTALLER", "INSTALLATION_IN_PROGRESS", "OOBE_PENDING", "FAILED"]
}

RESERVED_SYSTEM_USERNAMES = {
    "root", "bin", "daemon", "adm", "lp", "sync", "shutdown", "halt", "mail",
    "news", "uucp", "operator", "games", "gopher", "ftp", "nobody", "_apt",
    "systemd-coredump", "systemd-network", "systemd-resolve", "systemd-timesync",
    "messagebus", "sshd", "ssh", "syslog", "uuidd", "tcpdump", "rtkit", "pulse",
    "avahi-autoipd", "avahi", "usbmux", "dnsmasq", "kdm", "gdm", "lightdm",
    "nodm", "desktop", "guest", "live", "user", "windroid-pc", "windroid-oobe"
}

def log_state(msg: str):
    ts = datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%d %H:%M:%S")
    print(f"[{ts}] [Windroid State] {msg}", file=sys.stderr, flush=True)

def is_valid_state_transition(from_state: str, to_state: str) -> bool:
    """Returns True if transitioning from from_state to to_state is valid."""
    if not from_state or from_state not in ALLOWED_STATE_TRANSITIONS:
        return True
    return to_state in ALLOWED_STATE_TRANSITIONS[from_state]

def validate_state_data(data: dict) -> tuple[bool, str | None]:
    """
    Validates state data integrity and strict schema invariants.
    """
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
    Formally validates all invariants for DESKTOP_READY state.
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
        try:
            res = subprocess.run(["getent", "passwd", username], stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
            if res.returncode != 0 or not res.stdout.strip():
                return False, f"Real user '{username}' does not exist in passwd database"
            
            parts = res.stdout.strip().split(":")
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
        except Exception as e:
            return False, f"System verification failed: {e}"

        # Check LightDM autologin configuration
        lightdm_conf = "/etc/lightdm/lightdm.conf.d/80-windroid-autologin.conf"
        if not os.path.exists(lightdm_conf):
            return False, f"LightDM autologin configuration missing at {lightdm_conf}"
            
        try:
            with open(lightdm_conf, "r", encoding="utf-8") as f:
                content = f.read()
                if f"autologin-user={username}" not in content:
                    return False, f"LightDM autologin config does not specify autologin-user={username}"
                if "autologin-user=windroid-oobe" in content:
                    return False, "LightDM autologin config incorrectly retains temporary windroid-oobe account"
        except Exception as e:
            return False, f"Could not read LightDM autologin config: {e}"

        # Ensure OOBE and Live configs are absent
        for old_cfg in ["/etc/lightdm/lightdm.conf.d/80-windroid-oobe.conf", "/etc/lightdm/lightdm.conf.d/80-windroid-live-autologin.conf"]:
            if os.path.exists(old_cfg):
                return False, f"Conflicting autologin configuration found at {old_cfg}"

    return True, None

def is_live_system() -> bool:
    """Check if the system is running in live ISO mode."""
    if os.path.exists("/run/live") or os.path.exists("/run/live/medium") or os.path.exists("/cdrom"):
        return True
    try:
        if os.path.exists("/proc/cmdline"):
            with open("/proc/cmdline", "r", encoding="utf-8") as f:
                cmd = f.read()
                if "boot=live" in cmd or "live-media" in cmd:
                    return True
    except Exception:
        pass
    return False

def get_runtime_mode(root_dir: str = "/") -> str:
    """Resolves authoritative runtime mode: live, installer, or installed."""
    clean_root = root_dir.rstrip("/") if root_dir != "/" else ""
    runtime_file = f"{clean_root}{RUNTIME_MODE_FILE}"
    
    if os.path.exists(runtime_file):
        try:
            with open(runtime_file, "r", encoding="utf-8") as f:
                val = f.read().strip()
                if val:
                    return val
        except Exception:
            pass

    if root_dir == "/" and is_live_system():
        try:
            if os.path.exists("/proc/cmdline"):
                with open("/proc/cmdline", "r", encoding="utf-8") as f:
                    cmd = f.read()
                    if "windroid.mode=installer" in cmd:
                        return "installer"
        except Exception:
            pass
        return "live"

    if root_dir != "/":
        return "live"

    return "installed"

def _write_single_file_atomic(filepath: str, data: dict):
    """Safely writes json data to filepath using write-to-tmp, fsync, and atomic replace."""
    os.makedirs(os.path.dirname(filepath), exist_ok=True)
    tmp_path = f"{filepath}.tmp.{os.getpid()}.{secrets.token_hex(4)}"
    try:
        with open(tmp_path, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2)
            f.flush()
            os.fsync(f.fileno())
        os.replace(tmp_path, filepath)
    except Exception:
        if os.path.exists(tmp_path):
            try:
                os.remove(tmp_path)
            except Exception:
                pass
        raise

def load_installer_state(root_dir: str = "/") -> dict:
    """
    Authoritative state loader with automatic self-healing and generation tracking.
    """
    clean_root = root_dir.rstrip("/") if root_dir != "/" else ""
    p_path = f"{clean_root}{PRIMARY_STATE_FILE}"
    b_path = f"{clean_root}{BACKUP_STATE_FILE}"

    p_data = None
    p_valid = False
    b_data = None
    b_valid = False

    if os.path.exists(p_path):
        try:
            with open(p_path, "r", encoding="utf-8") as f:
                p_data = json.load(f)
            p_valid, _ = validate_state_data(p_data)
        except Exception as e:
            log_state(f"Warning: Primary state file {p_path} corrupt or unreadable: {e}")

    if os.path.exists(b_path):
        try:
            with open(b_path, "r", encoding="utf-8") as f:
                b_data = json.load(f)
            b_valid, _ = validate_state_data(b_data)
        except Exception as e:
            log_state(f"Warning: Backup state file {b_path} corrupt or unreadable: {e}")

    # Self-healing logic
    if p_valid and not b_valid:
        log_state(f"Self-Healing: Primary state valid, recovering backup {b_path}")
        try:
            _write_single_file_atomic(b_path, p_data)
        except Exception:
            pass
        return p_data

    if b_valid and not p_valid:
        log_state(f"Self-Healing: Backup state valid, recovering primary {p_path}")
        try:
            _write_single_file_atomic(p_path, b_data)
        except Exception:
            pass
        return b_data

    if p_valid and b_valid:
        p_gen = int(p_data.get("generation", 0) or 0)
        b_gen = int(b_data.get("generation", 0) or 0)
        if b_gen > p_gen:
            log_state(f"Self-Healing: Backup state newer (gen {b_gen} > {p_gen}), syncing primary")
            try:
                _write_single_file_atomic(p_path, b_data)
            except Exception:
                pass
            return b_data
        elif p_gen > b_gen:
            try:
                _write_single_file_atomic(b_path, p_data)
            except Exception:
                pass
        return p_data

    # Neither valid
    if os.path.exists(p_path) or os.path.exists(b_path):
        log_state("Error: Neither primary nor backup installer-state is valid. Returning fail-closed state.")
        return {
            "version": STATE_VERSION,
            "state": "FAILED",
            "error": "CORRUPT_STATE: Neither primary nor backup state file is valid",
            "installationCompleted": False,
            "oobeCompleted": False,
            "updatedAt": datetime.datetime.now(datetime.timezone.utc).isoformat()
        }

    # Files do not exist (Live initial state or fresh environment)
    mode = get_runtime_mode(root_dir)
    initial_state = "INSTALLER" if mode in ["live", "installer"] else "FAILED"
    return {
        "version": STATE_VERSION,
        "state": initial_state,
        "updatedAt": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "installationCompleted": False,
        "oobeCompleted": False
    }

def save_installer_state_atomic(root_dir: str, new_state: str, extra_fields: dict = None) -> dict:
    """
    Authoritatively saves state to both primary and backup files atomically.
    Validates transition, increments generation, applies fsync, and performs read-back verification.
    """
    clean_root = root_dir.rstrip("/") if root_dir != "/" else ""
    p_path = f"{clean_root}{PRIMARY_STATE_FILE}"
    b_path = f"{clean_root}{BACKUP_STATE_FILE}"

    existing = load_installer_state(root_dir)
    current_state = existing.get("state", "INSTALLER")

    if not is_valid_state_transition(current_state, new_state):
        err_msg = f"Illegal state transition attempted from '{current_state}' to '{new_state}'"
        log_state(f"ERROR: {err_msg}")
        raise ValueError(err_msg)

    now_ts = datetime.datetime.now(datetime.timezone.utc).isoformat()
    gen = int(existing.get("generation", 0) or 0) + 1

    merged = dict(existing)
    merged["version"] = STATE_VERSION
    merged["state"] = new_state
    merged["updatedAt"] = now_ts
    merged["generation"] = gen

    if extra_fields:
        merged.update(extra_fields)

    # State-specific timestamps and booleans
    if new_state in ["OOBE_PENDING", "INSTALLATION_COMPLETE"]:
        merged["installationCompleted"] = True
        merged["installationCompletedAt"] = merged.get("installationCompletedAt") or now_ts
        merged["completedAt"] = merged.get("completedAt") or now_ts
        merged["oobeCompleted"] = False
        merged["error"] = None
    elif new_state in ["OOBE_COMPLETE", "DESKTOP_READY"]:
        merged["installationCompleted"] = True
        merged["oobeCompleted"] = True
        merged["oobeCompletedAt"] = merged.get("oobeCompletedAt") or now_ts
        merged["completedAt"] = merged.get("completedAt") or now_ts
        merged["error"] = None
    elif new_state == "FAILED":
        merged["failedAt"] = now_ts
        if "error" not in merged or not merged["error"]:
            merged["error"] = "Unknown failure occurred"

    # Schema validation before disk write
    valid, val_err = validate_state_data(merged)
    if not valid:
        err_msg = f"Cannot persist invalid state '{new_state}': {val_err}"
        log_state(f"ERROR: {err_msg}")
        raise ValueError(err_msg)

    # Atomic write to primary and backup
    _write_single_file_atomic(p_path, merged)
    _write_single_file_atomic(b_path, merged)

    # Read-back verification
    try:
        with open(p_path, "r", encoding="utf-8") as f:
            rb_p = json.load(f)
            ok_p, err_p = validate_state_data(rb_p)
            if not ok_p:
                raise RuntimeError(f"Primary read-back failed: {err_p}")

        with open(b_path, "r", encoding="utf-8") as f:
            rb_b = json.load(f)
            ok_b, err_b = validate_state_data(rb_b)
            if not ok_b:
                raise RuntimeError(f"Backup read-back failed: {err_b}")
    except Exception as e:
        log_state(f"CRITICAL: Read-back verification failed on {root_dir}: {e}")
        raise RuntimeError(f"State persistence read-back verification failed: {e}")

    try:
        subprocess.run(["sync"], timeout=10)
    except Exception:
        pass

    return merged

def evaluate_shell_state(root_dir: str = "/") -> tuple[str, str, bool]:
    """
    Evaluates state for desktop shell launcher.
    Returns (state, username, user_exists).
    """
    data = load_installer_state(root_dir)
    state = data.get("state", "FAILED")
    u_cfg = data.get("userConfig") or {}
    username = str(u_cfg.get("username", "")).strip()

    user_ok = False
    if username and username not in ["root", "user", "windroid-oobe"] and username not in RESERVED_SYSTEM_USERNAMES:
        try:
            res = subprocess.run(["getent", "passwd", username], stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
            if res.returncode == 0 and res.stdout.strip():
                parts = res.stdout.strip().split(":")
                if len(parts) >= 7:
                    uid = int(parts[2])
                    home_dir = parts[5]
                    if (uid >= 1000 or username == "root") and os.path.exists(home_dir):
                        user_ok = True
                elif os.path.exists(f"/home/{username}"):
                    user_ok = True
        except Exception:
            pass

    return state, username, user_ok

# CLI helper entry point
if __name__ == "__main__":
    args = sys.argv[1:]
    if not args or args[0] == "eval-shell":
        st, usr, u_ok = evaluate_shell_state()
        print(f"{st}|{usr}|{'yes' if u_ok else 'no'}")
        sys.exit(0)
    elif args[0] == "get":
        print(json.dumps(load_installer_state(), indent=2))
        sys.exit(0)
    elif args[0] == "validate":
        target = args[1] if len(args) > 1 else PRIMARY_STATE_FILE
        if not os.path.exists(target):
            print(f"File not found: {target}", file=sys.stderr)
            sys.exit(1)
        with open(target, "r", encoding="utf-8") as f:
            d = json.load(f)
        v, e = validate_state_data(d)
        if v:
            print("VALID")
            sys.exit(0)
        else:
            print(f"INVALID: {e}", file=sys.stderr)
            sys.exit(1)
    else:
        print(f"Usage: {sys.argv[0]} [eval-shell|get|validate <file>]")
        sys.exit(1)
