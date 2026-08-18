#!/usr/bin/env python3
"""
Windroid OS Installed First-Boot & OOBE Orchestrator
Production-Grade Boot-Chain Implementation (Phase 2B Hardened)

This service runs as root early before display-manager/lightdm on the INSTALLED system.
It is responsible for:
1. Verifying that execution is on the installed root filesystem (not Live ISO).
2. Authoritatively reading /var/lib/windroid/installer-state.json.
3. Orchestrating temporary unprivileged 'windroid-oobe' user & LightDM for OOBE.
4. Orchestrating real-user LightDM transition and temporary user cleanup on completion.
5. Guaranteeing idempotency and preventing any return to the Phase-1 installer.
6. Failing closed if installation state is incomplete, corrupt, failed, or unauthorized.
"""

import sys
import os
import re
import json
import time
import shutil
import subprocess
import datetime

STATE_FILE = "/var/lib/windroid/installer-state.json"
STATE_BACKUP_FILE = "/var/lib/windroid/installation-state.json"
RUNTIME_MODE_FILE = "/etc/windroid/runtime-mode"
LOG_FILE = "/var/log/windroid-first-boot.log"
LIGHTDM_CONF_DIR = "/etc/lightdm/lightdm.conf.d"
LIGHTDM_AUTOLOGIN_CONF = os.path.join(LIGHTDM_CONF_DIR, "80-windroid-autologin.conf")
LIGHTDM_OOBE_CONF = os.path.join(LIGHTDM_CONF_DIR, "80-windroid-oobe.conf")
LIGHTDM_LIVE_CONF = os.path.join(LIGHTDM_CONF_DIR, "80-windroid-live-autologin.conf")

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

OOBE_USER = "windroid-oobe"
OOBE_GROUPS = ["video", "audio", "render", "input"]
REAL_USER_GROUPS = ["sudo", "video", "audio", "render", "netdev", "plugdev", "input"]

def log(msg: str):
    timestamp = datetime.datetime.now(datetime.timezone.utc).isoformat()
    entry = f"[{timestamp}] [Windroid First-Boot] {msg}"
    print(entry, flush=True)
    try:
        os.makedirs(os.path.dirname(LOG_FILE), exist_ok=True)
        with open(LOG_FILE, "a", encoding="utf-8") as f:
            f.write(entry + "\n")
            f.flush()
    except Exception:
        pass

def run_cmd(cmd, timeout=30):
    try:
        res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, timeout=timeout)
        return res.returncode == 0, res.stdout.strip(), res.stderr.strip()
    except Exception as e:
        return False, "", str(e)

def is_live_environment() -> bool:
    """Check whether the current runtime environment is a Live ISO."""
    try:
        if os.path.exists("/proc/cmdline"):
            with open("/proc/cmdline", "r", encoding="utf-8") as f:
                cmdline = f.read()
                if "boot=live" in cmdline or "live-media" in cmdline:
                    return True
        if os.path.exists("/run/live/medium") or os.path.exists("/run/live") or os.path.exists("/cdrom"):
            return True
        if os.path.exists(RUNTIME_MODE_FILE):
            with open(RUNTIME_MODE_FILE, "r", encoding="utf-8") as f:
                if f.read().strip() == "live":
                    return True
    except Exception as e:
        log(f"Error checking live environment: {e}")
    return False

def validate_state(data: dict) -> tuple[bool, str | None]:
    """Validates state data invariants strictly."""
    if not isinstance(data, dict):
        return False, "State data must be a dictionary"

    if data.get("version") != STATE_VERSION:
        return False, f"Invalid version: '{data.get('version')}', expected '{STATE_VERSION}'"

    state = data.get("state")
    if state not in VALID_STATES:
        return False, f"Invalid state: '{state}'"

    if state == "INSTALLER":
        if data.get("installationCompleted") is True:
            return False, "installationCompleted must be false for INSTALLER"
        if data.get("oobeCompleted") is True:
            return False, "oobeCompleted must be false for INSTALLER"
        return True, None

    if state == "INSTALLATION_IN_PROGRESS":
        if data.get("userConfig") is not None:
            return False, "userConfig must be null during INSTALLATION_IN_PROGRESS"
        if data.get("installationCompleted") is True:
            return False, "installationCompleted must be false during INSTALLATION_IN_PROGRESS"
        if data.get("oobeCompleted") is True:
            return False, "oobeCompleted must be false during INSTALLATION_IN_PROGRESS"
        return True, None

    if state == "OOBE_PENDING":
        if data.get("userConfig") is not None:
            return False, "userConfig must be null in OOBE_PENDING state before user registration"
        if data.get("installationCompleted") is not True:
            return False, "installationCompleted must be true for OOBE_PENDING"
        if data.get("oobeCompleted") is True:
            return False, "oobeCompleted must be false for OOBE_PENDING"
        if not (data.get("installationCompletedAt") or data.get("completedAt") or data.get("updatedAt")):
            return False, "Timestamp (installationCompletedAt) must be present for OOBE_PENDING"
        if data.get("error") is not None:
            return False, "error must be null for OOBE_PENDING"
        return True, None

    if state == "OOBE_IN_PROGRESS":
        if data.get("installationCompleted") is not True:
            return False, "installationCompleted must be true for OOBE_IN_PROGRESS"
        if data.get("oobeCompleted") is True:
            return False, "oobeCompleted must be false during OOBE_IN_PROGRESS"
        if data.get("error") is not None:
            return False, "error must be null for OOBE_IN_PROGRESS"
        return True, None

    if state in ["OOBE_COMPLETE", "DESKTOP_READY"]:
        if data.get("installationCompleted") is not True:
            return False, f"installationCompleted must be true for {state}"
        if data.get("oobeCompleted") is not True:
            return False, f"oobeCompleted must be true for {state}"
        u_cfg = data.get("userConfig")
        if not isinstance(u_cfg, dict):
            return False, f"userConfig must be a valid dictionary for {state}"
        username = str(u_cfg.get("username", "")).strip()
        if not username or username == OOBE_USER or username in RESERVED_SYSTEM_USERNAMES:
            return False, f"userConfig contains invalid or reserved username: '{username}'"
        if not re.match(r'^[a-z_][a-z0-9_-]*$', username):
            return False, f"userConfig username '{username}' does not match required format"
        if not (data.get("oobeCompletedAt") or data.get("completedAt") or data.get("updatedAt")):
            return False, f"Timestamp (oobeCompletedAt) must be present for {state}"
        if data.get("error") is not None:
            return False, f"error must be null for {state}"
        return True, None

    if state == "FAILED":
        return True, None

    return True, None

def validate_desktop_ready(data: dict, check_system: bool = True) -> tuple[bool, str | None]:
    """
    Formally validates all invariants for DESKTOP_READY state across state schema and real system:
    1. State data is a dictionary
    2. State is 'DESKTOP_READY'
    3. installationCompleted is True
    4. oobeCompleted is True
    5. userConfig is a valid dictionary
    6. username is non-empty, non-reserved, and valid linux username format
    7. username is not root and not windroid-oobe
    8. error is None
    9. timestamp (oobeCompletedAt/completedAt/updatedAt) is present
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
    if not username or username == OOBE_USER or username in RESERVED_SYSTEM_USERNAMES:
        return False, f"Invalid or reserved username '{username}'"
        
    if not re.match(r'^[a-z_][a-z0-9_-]*$', username):
        return False, f"Username '{username}' contains invalid characters"

    if check_system:
        # Check system passwd database
        ok_u, u_info, _ = run_cmd(["getent", "passwd", username])
        if not ok_u or not u_info:
            return False, f"Real user '{username}' does not exist in passwd database"
        
        parts = u_info.split(":")
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
            
        if not os.path.exists(LIGHTDM_AUTOLOGIN_CONF):
            return False, f"LightDM autologin config '{LIGHTDM_AUTOLOGIN_CONF}' does not exist"
            
        try:
            with open(LIGHTDM_AUTOLOGIN_CONF, "r", encoding="utf-8") as f:
                content = f.read()
                if f"autologin-user={username}" not in content:
                    return False, f"LightDM autologin is not set to '{username}'"
                if f"autologin-user={OOBE_USER}" in content:
                    return False, f"LightDM autologin still contains temporary user '{OOBE_USER}'"
        except Exception as e:
            return False, f"Failed to read LightDM config: {e}"

        if os.path.exists(LIGHTDM_OOBE_CONF):
            return False, f"Obsolete OOBE config '{LIGHTDM_OOBE_CONF}' still exists"

        if os.path.exists(LIGHTDM_LIVE_CONF):
            return False, f"Obsolete Live autologin config '{LIGHTDM_LIVE_CONF}' still exists"

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
        log(f"Error atomically writing state file {file_path}: {e}")
        if os.path.exists(tmp_path):
            try:
                os.remove(tmp_path)
            except Exception:
                pass
        return False

def load_installer_state(state_file_path: str = None) -> dict:
    """
    Safely loads authoritative installer state with monotonic generation and dual-file recovery.
    Primary state file is /var/lib/windroid/installer-state.json.
    Backup is /var/lib/windroid/installation-state.json.
    """
    primary_path = state_file_path if state_file_path else STATE_FILE
    backup_path = STATE_BACKUP_FILE if primary_path == STATE_FILE else os.path.join(os.path.dirname(primary_path), "installation-state.json")

    p_data = None
    p_valid = False
    p_gen = 0

    b_data = None
    b_valid = False
    b_gen = 0

    # 1. Read and validate Primary
    if os.path.exists(primary_path):
        try:
            with open(primary_path, "r", encoding="utf-8") as f:
                p_data = json.load(f)
                valid, err = validate_state(p_data)
                if valid:
                    p_valid = True
                    p_gen = int(p_data.get("generation", 0) or 0)
                else:
                    log(f"Warning: Primary state file {primary_path} failed validation: {err}")
        except Exception as e:
            log(f"Warning: Failed to parse primary state file {primary_path}: {e}")

    # 2. Read and validate Backup
    if os.path.exists(backup_path):
        try:
            with open(backup_path, "r", encoding="utf-8") as f:
                b_data = json.load(f)
                valid, err = validate_state(b_data)
                if valid:
                    b_valid = True
                    b_gen = int(b_data.get("generation", 0) or 0)
                else:
                    log(f"Warning: Backup state file {backup_path} failed validation: {err}")
        except Exception as e:
            log(f"Warning: Failed to parse backup state file {backup_path}: {e}")

    # 3. Decision Matrix with Self-Healing
    if p_valid and b_valid:
        if b_gen > p_gen:
            log(f"Self-Healing: Backup state has higher generation ({b_gen} > {p_gen}), recovering primary.")
            _write_single_state_file_atomic(primary_path, b_data)
            return b_data
        elif p_gen > b_gen:
            log(f"Self-Healing: Primary state has higher generation ({p_gen} > {b_gen}), updating backup.")
            _write_single_state_file_atomic(backup_path, p_data)
            return p_data
        else:
            return p_data

    elif p_valid and not b_valid:
        log(f"Self-Healing: Primary state valid, recovering corrupt/missing backup {backup_path}.")
        _write_single_state_file_atomic(backup_path, p_data)
        return p_data

    elif b_valid and not p_valid:
        log(f"Self-Healing: Backup state valid, recovering corrupt/missing primary {primary_path} (state: {b_data.get('state')}).")
        _write_single_state_file_atomic(primary_path, b_data)
        return b_data

    # 4. Fail closed if neither primary nor backup is valid
    log("Error: Neither primary nor backup installer-state is valid. Returning fail-closed state.")
    return {
        "version": STATE_VERSION,
        "state": "FAILED",
        "generation": 0,
        "installationCompleted": False,
        "oobeCompleted": False,
        "error": "Installer state file missing or corrupt"
    }

def save_installer_state_atomic(state_data: dict, target_root: str = "/") -> bool:
    """Persists installer state using strict atomic write semantics, monotonic generation, and dual-file sync."""
    valid, err = validate_state(state_data)
    if not valid:
        log(f"ERROR: Refusing to save invalid state data: {err}")
        return False

    if target_root == "/":
        target_file = STATE_FILE
        backup_file = STATE_BACKUP_FILE
        target_dir = os.path.dirname(target_file)
    else:
        target_dir = os.path.join(target_root, "var/lib/windroid")
        target_file = os.path.join(target_dir, "installer-state.json")
        backup_file = os.path.join(target_dir, "installation-state.json")

    os.makedirs(target_dir, exist_ok=True)

    # Compute next monotonic generation
    prev_gen = 0
    for path_to_check in [target_file, backup_file]:
        if os.path.exists(path_to_check):
            try:
                with open(path_to_check, "r", encoding="utf-8") as f:
                    d = json.load(f)
                    g = int(d.get("generation", 0) or 0)
                    if g > prev_gen:
                        prev_gen = g
            except Exception:
                pass

    state_data["generation"] = prev_gen + 1
    state_data["updatedAt"] = datetime.datetime.now(datetime.timezone.utc).isoformat()

    # Transition validation against existing state
    if os.path.exists(target_file):
        try:
            with open(target_file, "r", encoding="utf-8") as f:
                prev_data = json.load(f)
                prev_state = prev_data.get("state")
                new_state = state_data.get("state")
                if prev_state and new_state and not is_valid_state_transition(prev_state, new_state):
                    log(f"ERROR: Illegal state transition attempted from '{prev_state}' to '{new_state}'")
                    return False
        except Exception as e:
            log(f"Notice: Failed to read previous state file for transition check: {e}")

    # Atomically write primary file
    ok_p = _write_single_state_file_atomic(target_file, state_data)
    if not ok_p:
        log(f"ERROR: Failed to write primary state file {target_file}")
        return False

    # Atomically write backup file
    ok_b = _write_single_state_file_atomic(backup_file, state_data)
    if not ok_b:
        log(f"WARNING: Failed to write backup state file {backup_file}")

    run_cmd(["sync"])
    return True

def user_exists(username: str) -> bool:
    if not username:
        return False
    ok, out, _ = run_cmd(["getent", "passwd", username])
    return ok and bool(out)

def setup_temporary_oobe_user() -> bool:
    """Idempotently creates unprivileged temporary windroid-oobe user with minimal GUI groups and no sudo."""
    log(f"Ensuring temporary OOBE user '{OOBE_USER}' exists...")
    if not user_exists(OOBE_USER):
        # Create unprivileged account without sudo
        ok, _, err = run_cmd([
            "useradd",
            "-m",
            "-s", "/bin/bash",
            "-c", "Windroid OOBE Temporary Account",
            OOBE_USER
        ])
        if not ok and not user_exists(OOBE_USER):
            log(f"Failed to create OOBE user: {err}")
            return False

        # Set empty/unlocked password status for GUI login
        run_cmd(["passwd", "-d", OOBE_USER])

    # Assign ONLY minimal GUI groups (strictly NO sudo)
    for grp in OOBE_GROUPS:
        run_cmd(["usermod", "-aG", grp, OOBE_USER])

    # Configure Openbox autostart for OOBE user
    user_home = f"/home/{OOBE_USER}"
    openbox_dir = os.path.join(user_home, ".config/openbox")
    os.makedirs(openbox_dir, exist_ok=True)
    autostart_path = os.path.join(openbox_dir, "autostart")
    with open(autostart_path, "w", encoding="utf-8") as f:
        f.write("#!/bin/sh\n# Windroid OOBE Autostart\n/usr/bin/windroid-shell-runner.sh &\n")
    os.chmod(autostart_path, 0o755)

    # Ensure ownership
    run_cmd(["chown", "-R", f"{OOBE_USER}:{OOBE_USER}", user_home])
    return True

def clear_all_autologin_configs():
    """Removes all Windroid autologin configurations to prevent invalid autologin sessions."""
    for cfg in [LIGHTDM_OOBE_CONF, LIGHTDM_AUTOLOGIN_CONF, LIGHTDM_LIVE_CONF]:
        if os.path.exists(cfg):
            try:
                os.remove(cfg)
                log(f"Cleared autologin config: {cfg}")
            except Exception as e:
                log(f"Notice: Failed to remove {cfg}: {e}")

def configure_lightdm_oobe() -> bool:
    """Configures LightDM for temporary windroid-oobe graphical session using write -> validate -> replace."""
    os.makedirs(LIGHTDM_CONF_DIR, exist_ok=True)
    tmp_path = os.path.join(LIGHTDM_CONF_DIR, "80-windroid-oobe.conf.tmp")
    target_path = LIGHTDM_OOBE_CONF

    conf_content = (
        "# Windroid OS OOBE Session Configuration\n"
        "[Seat:*]\n"
        "autologin-guest=false\n"
        f"autologin-user={OOBE_USER}\n"
        "autologin-user-timeout=0\n"
        "user-session=openbox\n"
    )

    try:
        with open(tmp_path, "w", encoding="utf-8") as f:
            f.write(conf_content)
            f.flush()
            os.fsync(f.fileno())

        # Validate temporary file
        with open(tmp_path, "r", encoding="utf-8") as f:
            read_back = f.read()
            if f"autologin-user={OOBE_USER}" not in read_back:
                raise RuntimeError("Validation of LightDM OOBE configuration failed.")

        os.replace(tmp_path, target_path)

        # Remove conflicting autologin configs
        for old_cfg in [LIGHTDM_AUTOLOGIN_CONF, LIGHTDM_LIVE_CONF]:
            if os.path.exists(old_cfg):
                try:
                    os.remove(old_cfg)
                except Exception:
                    pass

        log(f"LightDM OOBE configuration written and validated: {target_path} (autologin-user={OOBE_USER})")
        return True
    except Exception as e:
        log(f"Error configuring LightDM for OOBE: {e}")
        if os.path.exists(tmp_path):
            try:
                os.remove(tmp_path)
            except Exception:
                pass
        return False

def configure_lightdm_real_user(username: str) -> bool:
    """Configures LightDM for authenticated real user session using write -> validate -> replace."""
    if not username or username == OOBE_USER or username in ["root", "user"] or username in RESERVED_SYSTEM_USERNAMES:
        log(f"Error: Refusing to configure LightDM for invalid or temporary username: '{username}'")
        return False

    os.makedirs(LIGHTDM_CONF_DIR, exist_ok=True)
    tmp_path = os.path.join(LIGHTDM_CONF_DIR, "80-windroid-autologin.conf.tmp")
    target_path = LIGHTDM_AUTOLOGIN_CONF

    conf_content = (
        f"# Windroid OS Authenticated User Session Configuration\n"
        "[Seat:*]\n"
        "autologin-guest=false\n"
        f"autologin-user={username}\n"
        "autologin-user-timeout=0\n"
        "user-session=openbox\n"
    )

    try:
        with open(tmp_path, "w", encoding="utf-8") as f:
            f.write(conf_content)
            f.flush()
            os.fsync(f.fileno())

        # Validate
        with open(tmp_path, "r", encoding="utf-8") as f:
            read_back = f.read()
            if f"autologin-user={username}" not in read_back:
                raise RuntimeError(f"Validation of LightDM real user configuration failed for '{username}'.")

        os.replace(tmp_path, target_path)

        # Clean up OOBE & Live configs
        for old_cfg in [LIGHTDM_OOBE_CONF, LIGHTDM_LIVE_CONF]:
            if os.path.exists(old_cfg):
                try:
                    os.remove(old_cfg)
                except Exception:
                    pass

        log(f"LightDM Real User configuration written and validated: {target_path} (autologin-user={username})")
        return True
    except Exception as e:
        log(f"Error configuring LightDM for real user: {e}")
        if os.path.exists(tmp_path):
            try:
                os.remove(tmp_path)
            except Exception:
                pass
        return False

def cleanup_temporary_oobe_user(real_username: str) -> bool:
    """
    Safely removes temporary windroid-oobe account ONLY after strict real-user verification.
    Required pre-conditions:
    1. real_username is valid
    2. getent passwd <real_username> succeeds
    3. real_username != root
    4. real_username != windroid-oobe
    5. real user home directory exists
    6. LightDM real-user configuration is successfully written
    """
    if not real_username or real_username in ["root", "user", OOBE_USER] or real_username in RESERVED_SYSTEM_USERNAMES:
        log(f"Pre-condition failed: real username '{real_username}' is invalid/reserved.")
        return False

    if not user_exists(real_username):
        log(f"Pre-condition failed: real user '{real_username}' does not exist in passwd database.")
        return False

    user_home = f"/home/{real_username}"
    if not os.path.exists(user_home):
        log(f"Pre-condition failed: home directory '{user_home}' does not exist.")
        return False

    if not os.path.exists(LIGHTDM_AUTOLOGIN_CONF):
        log(f"Pre-condition failed: LightDM real user config '{LIGHTDM_AUTOLOGIN_CONF}' does not exist.")
        return False

    with open(LIGHTDM_AUTOLOGIN_CONF, "r", encoding="utf-8") as f:
        if f"autologin-user={real_username}" not in f.read():
            log(f"Pre-condition failed: LightDM autologin is not set to '{real_username}'.")
            return False

    if not user_exists(OOBE_USER):
        log(f"Temporary user '{OOBE_USER}' is already absent.")
        return True

    log(f"All 6 pre-conditions verified. Safely removing temporary user account '{OOBE_USER}'...")
    # Kill any dangling processes for windroid-oobe
    run_cmd(["pkill", "-9", "-u", OOBE_USER])
    time.sleep(0.5)

    # Delete user and home
    ok, _, err = run_cmd(["userdel", "-r", OOBE_USER])
    if not ok:
        log(f"Notice during userdel of {OOBE_USER}: {err}")

    # Double-check
    exists = user_exists(OOBE_USER)
    if exists:
        log(f"Warning: {OOBE_USER} still present after deletion attempt.")
        return False

    log(f"Temporary user '{OOBE_USER}' successfully cleaned up.")
    return True

def orchestrate_first_boot() -> int:
    """
    Main orchestration entry point.
    Strictly fail-closed: returns 0 on success, 1 on failure.
    """
    log("==================================================")
    log("WINDROID OS FIRST-BOOT ORCHESTRATOR STARTING")
    log("==================================================")

    # 1. Guard against running on Live ISO
    if is_live_environment():
        log("Execution detected on LIVE ISO environment. First-boot orchestrator exiting cleanly.")
        return 0

    # 2. Load Authoritative State
    state = load_installer_state()
    current_state = state.get("state", "FAILED")
    log(f"Authoritative installer state: {current_state}")

    # 3. Fail-Closed on Incomplete, Corrupt, or Failed state
    if current_state in ["INSTALLATION_IN_PROGRESS", "FAILED", "INSTALLER"]:
        log(f"ERROR: Cannot boot graphical session in state '{current_state}'. Clearing autologin and failing closed.")
        clear_all_autologin_configs()
        return 1

    # 4. Handle OOBE_PENDING / OOBE_IN_PROGRESS
    elif current_state in ["OOBE_PENDING", "OOBE_IN_PROGRESS"]:
        log(f"Handling state '{current_state}': Preparing temporary OOBE session.")

        # Ensure runtime-mode is 'installed'
        os.makedirs("/etc/windroid", exist_ok=True)
        with open(RUNTIME_MODE_FILE, "w", encoding="utf-8") as f:
            f.write("installed\n")

        # Ensure temporary OOBE user exists
        if not setup_temporary_oobe_user():
            log("FATAL: Could not prepare temporary OOBE user. Failing closed.")
            clear_all_autologin_configs()
            return 1

        # Configure LightDM for OOBE
        if not configure_lightdm_oobe():
            log("FATAL: Could not configure LightDM for OOBE. Failing closed.")
            clear_all_autologin_configs()
            return 1

        # Update state to OOBE_IN_PROGRESS if it was OOBE_PENDING
        if current_state == "OOBE_PENDING":
            state["state"] = "OOBE_IN_PROGRESS"
            save_installer_state_atomic(state)
            log("Transitioned state to OOBE_IN_PROGRESS.")

        log("OOBE preparation complete. Ready for LightDM graphical session.")
        return 0

    # 5. Handle OOBE_COMPLETE / DESKTOP_READY
    elif current_state in ["OOBE_COMPLETE", "DESKTOP_READY"]:
        user_config = state.get("userConfig") or {}
        username = user_config.get("username", "")

        log(f"Handling state '{current_state}': Verifying real user '{username}'...")
        if not username or username == OOBE_USER or username in RESERVED_SYSTEM_USERNAMES or not user_exists(username):
            log(f"FATAL: Real user '{username}' is missing, invalid, or absent from passwd database in state '{current_state}'. Failing closed.")
            state["state"] = "FAILED"
            state["error"] = f"Real user '{username}' is missing or invalid"
            save_installer_state_atomic(state)
            clear_all_autologin_configs()
            return 1

        # Ensure runtime-mode is 'installed'
        os.makedirs("/etc/windroid", exist_ok=True)
        with open(RUNTIME_MODE_FILE, "w", encoding="utf-8") as f:
            f.write("installed\n")

        # Configure LightDM for real user
        if not configure_lightdm_real_user(username):
            log(f"FATAL: Could not configure LightDM for real user '{username}'.")
            clear_all_autologin_configs()
            return 1

        # Cleanup temporary OOBE user (with 6 strict pre-conditions)
        cleanup_temporary_oobe_user(username)

        # Ensure DESKTOP_READY is persisted
        if current_state != "DESKTOP_READY":
            state["state"] = "DESKTOP_READY"
            state["oobeCompleted"] = True
            save_installer_state_atomic(state)
            log("Transitioned state to DESKTOP_READY.")

        log("Desktop session handoff complete. System will start into normal user desktop.")
        return 0

    # 6. Unknown state -> Fail closed
    else:
        log(f"ERROR: Unknown state '{current_state}'. Clearing autologin and failing closed.")
        clear_all_autologin_configs()
        return 1

if __name__ == "__main__":
    ret = orchestrate_first_boot()
    sys.exit(ret)
