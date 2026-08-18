import unittest
import tempfile
import shutil
import os
import sys
import json

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "linux")))
import windroid_state

class TestWindroidStateEngine(unittest.TestCase):
    def setUp(self):
        self.test_dir = tempfile.mkdtemp(prefix="windroid_test_")

    def tearDown(self):
        shutil.rmtree(self.test_dir, ignore_errors=True)

    def test_default_state_when_missing(self):
        state = windroid_state.load_installer_state(self.test_dir)
        self.assertEqual(state["state"], "INSTALLER")
        self.assertFalse(state["installationCompleted"])
        self.assertFalse(state["oobeCompleted"])

    def test_valid_transitions_lifecycle(self):
        # 1. Start at INSTALLER
        s1 = windroid_state.save_installer_state_atomic(self.test_dir, "INSTALLER")
        self.assertEqual(s1["state"], "INSTALLER")
        self.assertEqual(s1["generation"], 1)

        # 2. Transition to INSTALLATION_IN_PROGRESS
        s2 = windroid_state.save_installer_state_atomic(self.test_dir, "INSTALLATION_IN_PROGRESS", extra_fields={"targetDisk": "/dev/sda"})
        self.assertEqual(s2["state"], "INSTALLATION_IN_PROGRESS")
        self.assertEqual(s2["generation"], 2)
        self.assertEqual(s2["targetDisk"], "/dev/sda")

        # 3. Transition to OOBE_PENDING
        s3 = windroid_state.save_installer_state_atomic(self.test_dir, "OOBE_PENDING", extra_fields={"installationCompleted": True})
        self.assertEqual(s3["state"], "OOBE_PENDING")
        self.assertEqual(s3["generation"], 3)

        # 4. Transition to OOBE_IN_PROGRESS
        s4 = windroid_state.save_installer_state_atomic(self.test_dir, "OOBE_IN_PROGRESS")
        self.assertEqual(s4["state"], "OOBE_IN_PROGRESS")
        self.assertEqual(s4["generation"], 4)

        # 5. Transition to OOBE_COMPLETE
        s5 = windroid_state.save_installer_state_atomic(self.test_dir, "OOBE_COMPLETE", extra_fields={
            "userConfig": {"username": "windroid", "fullName": "Windroid User", "deviceName": "Windroid-PC"}
        })
        self.assertEqual(s5["state"], "OOBE_COMPLETE")
        self.assertEqual(s5["generation"], 5)

        # 6. Transition to DESKTOP_READY
        s6 = windroid_state.save_installer_state_atomic(self.test_dir, "DESKTOP_READY", extra_fields={
            "userConfig": {"username": "windroid", "fullName": "Windroid User", "deviceName": "Windroid-PC"}
        })
        self.assertEqual(s6["state"], "DESKTOP_READY")
        self.assertEqual(s6["generation"], 6)

        # Invariant check
        valid, err = windroid_state.validate_desktop_ready(s6, check_system=False)
        self.assertTrue(valid, f"Validation failed: {err}")

    def test_invalid_transitions_rejected(self):
        windroid_state.save_installer_state_atomic(self.test_dir, "INSTALLER")
        with self.assertRaises(ValueError):
            # Cannot jump directly from INSTALLER to DESKTOP_READY
            windroid_state.save_installer_state_atomic(self.test_dir, "DESKTOP_READY")

    def test_dual_file_atomicity_and_sync(self):
        windroid_state.save_installer_state_atomic(self.test_dir, "INSTALLER")
        s = windroid_state.save_installer_state_atomic(self.test_dir, "INSTALLATION_IN_PROGRESS")
        
        p_path = os.path.join(self.test_dir, "var/lib/windroid/installer-state.json")
        b_path = os.path.join(self.test_dir, "var/lib/windroid/installation-state.json")

        self.assertTrue(os.path.exists(p_path))
        self.assertTrue(os.path.exists(b_path))

        with open(p_path, "r", encoding="utf-8") as f:
            p_data = json.load(f)
        with open(b_path, "r", encoding="utf-8") as f:
            b_data = json.load(f)

        self.assertEqual(p_data["state"], "INSTALLATION_IN_PROGRESS")
        self.assertEqual(b_data["state"], "INSTALLATION_IN_PROGRESS")
        self.assertEqual(p_data["generation"], b_data["generation"])

    def test_corrupt_primary_recovers_from_backup(self):
        windroid_state.save_installer_state_atomic(self.test_dir, "INSTALLER")
        windroid_state.save_installer_state_atomic(self.test_dir, "INSTALLATION_IN_PROGRESS")
        
        p_path = os.path.join(self.test_dir, "var/lib/windroid/installer-state.json")
        # Corrupt primary file with garbage
        with open(p_path, "w", encoding="utf-8") as f:
            f.write("{ CORRUPT TRUNCATED JSON DATA !!!")

        effective = windroid_state.load_installer_state(self.test_dir)
        self.assertEqual(effective["state"], "INSTALLATION_IN_PROGRESS")

        # Verify self-healing repaired primary
        with open(p_path, "r", encoding="utf-8") as f:
            repaired_p = json.load(f)
        self.assertEqual(repaired_p["state"], "INSTALLATION_IN_PROGRESS")

    def test_generation_arbitration(self):
        p_path = os.path.join(self.test_dir, "var/lib/windroid/installer-state.json")
        b_path = os.path.join(self.test_dir, "var/lib/windroid/installation-state.json")
        os.makedirs(os.path.dirname(p_path), exist_ok=True)

        # Primary has generation 5, backup has generation 8
        d5 = {
            "version": "windroid-installer-state-v1",
            "state": "INSTALLER",
            "generation": 5,
            "installationCompleted": False,
            "oobeCompleted": False
        }
        d8 = {
            "version": "windroid-installer-state-v1",
            "state": "OOBE_PENDING",
            "generation": 8,
            "installationCompleted": True,
            "oobeCompleted": False,
            "installationCompletedAt": "2026-08-18T00:00:00Z"
        }

        with open(p_path, "w", encoding="utf-8") as f:
            json.dump(d5, f)
        with open(b_path, "w", encoding="utf-8") as f:
            json.dump(d8, f)

        effective = windroid_state.load_installer_state(self.test_dir)
        self.assertEqual(effective["state"], "OOBE_PENDING")
        self.assertEqual(effective["generation"], 8)

    def test_desktop_ready_requires_valid_user(self):
        bad_state = {
            "version": "windroid-installer-state-v1",
            "state": "DESKTOP_READY",
            "generation": 10,
            "installationCompleted": True,
            "oobeCompleted": True,
            "completedAt": "2026-08-18T00:00:00Z",
            "userConfig": {"username": "root"}  # reserved username
        }
        valid, err = windroid_state.validate_desktop_ready(bad_state, check_system=False)
        self.assertFalse(valid)
        self.assertIn("reserved", err.lower())

if __name__ == "__main__":
    unittest.main()
