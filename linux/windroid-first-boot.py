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

# Ensure local and standard windroid module paths are in sys.path
_MODULE_DIRS = [
    os.path.dirname(os.path.abspath(__file__)),
    "/usr/lib/windroid",
    "/usr/lib/python3/dist-packages",
    "/usr/bin"
]
for _d in _MODULE_DIRS:
    if _d not in sys.path and os.path.exists(_d):
        sys.path.insert(0, _d)

import windroid_state

STATE_FILE = windroid_state.PRIMARY_STATE_FILE
STATE_BACKUP_FILE = windroid_state.BACKUP_STATE_FILE
RUNTIME_MODE_FILE = windroid_state.RUNTIME_MODE_FILE
LOG_FILE = "/var/log/windroid-first-boot.log"
LIGHTDM_CONF_DIR = "/etc/lightdm/lightdm.conf.d"
LIGHTDM_AUTOLOGIN_CONF = os.path.join(LIGHTDM_CONF_DIR, "80-windroid-autologin.conf")
LIGHTDM_OOBE_CONF = os.path.join(LIGHTDM_CONF_DIR, "80-windroid-oobe.conf")
LIGHTDM_LIVE_CONF = os.path.join(LIGHTDM_CONF_DIR, "80-windroid-live-autologin.conf")

STATE_VERSION = windroid_state.STATE_VERSION
VALID_STATES = windroid_state.VALID_STATES
ALLOWED_STATE_TRANSITIONS = windroid_state.ALLOWED_STATE_TRANSITIONS
RESERVED_SYSTEM_USERNAMES = windroid_state.RESERVED_SYSTEM_USERNAMES

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
    return windroid_state.is_live_system()

def validate_state(data: dict) -> tuple[bool, str | None]:
    """Validates state data invariants strictly."""
    return windroid_state.validate_state_data(data)

def validate_desktop_ready(data: dict, check_system: bool = True) -> tuple[bool, str | None]:
    """Formally validates all invariants for DESKTOP_READY state."""
    return windroid_state.validate_desktop_ready(data, check_system=check_system)

def load_installer_state(state_file_path: str = None) -> dict:
    """Safely loads authoritative installer state via windroid_state module."""
    if state_file_path and state_file_path != STATE_FILE:
        target_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(state_file_path))))
        return windroid_state.load_installer_state(target_root)
    return windroid_state.load_installer_state("/")

def save_installer_state_atomic(state_data: dict, target_root: str = "/") -> bool:
    """Persists installer state using windroid_state authoritative atomic writer."""
    try:
        state_name = state_data.get("state", "FAILED")
        windroid_state.save_installer_state_atomic(target_root, state_name, extra_fields=state_data)
        return True
    except Exception as e:
        log(f"Error saving installer state: {e}")
        return False

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
