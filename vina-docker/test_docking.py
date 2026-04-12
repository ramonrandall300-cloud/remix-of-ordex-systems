"""
Unit tests (mocked) + HTTP integration tests for Vina JSON API.
"""

import json
import os
import unittest
from unittest.mock import patch, MagicMock


class TestDockingUnit(unittest.TestCase):
    """Unit tests with mocked Vina calls."""

    def test_detect_binding_box(self):
        from dock import _detect_binding_box
        import tempfile

        pdbqt = """ATOM      1  N   ALA A   1       1.000   2.000   3.000  1.00  0.00
ATOM      2  CA  ALA A   1      11.000  12.000  13.000  1.00  0.00
"""
        with tempfile.NamedTemporaryFile(mode="w", suffix=".pdbqt", delete=False) as f:
            f.write(pdbqt)
            f.flush()
            box = _detect_binding_box(f.name)

        self.assertAlmostEqual(box["center_x"], 6.0, places=1)
        self.assertAlmostEqual(box["center_y"], 7.0, places=1)
        self.assertAlmostEqual(box["center_z"], 8.0, places=1)
        self.assertGreater(box["size_x"], 0)
        os.unlink(f.name)

    def test_parse_vina_output(self):
        from dock import _parse_vina_output
        import tempfile

        content = """MODEL 1
REMARK VINA RESULT:    -8.5      0.000      0.000
ATOM      1  C   LIG     1       1.0   2.0   3.0
ENDMDL
MODEL 2
REMARK VINA RESULT:    -7.2      1.234      2.345
ATOM      1  C   LIG     1       4.0   5.0   6.0
ENDMDL
"""
        with tempfile.NamedTemporaryFile(mode="w", suffix=".pdbqt", delete=False) as f:
            f.write(content)
            f.flush()
            poses = _parse_vina_output(f.name)

        self.assertEqual(len(poses), 2)
        self.assertEqual(poses[0]["model"], 1)
        self.assertAlmostEqual(poses[0]["score_kcal_mol"], -8.5)
        self.assertAlmostEqual(poses[1]["score_kcal_mol"], -7.2)
        os.unlink(f.name)


class TestServerHTTP(unittest.TestCase):
    """HTTP integration tests (requires running server)."""

    BASE_URL = os.environ.get("VINA_API_URL", "http://localhost:8080")

    @unittest.skipUnless(
        os.environ.get("INTEGRATION_TEST"),
        "Set INTEGRATION_TEST=1 to run HTTP tests"
    )
    def test_health(self):
        import requests
        r = requests.get(f"{self.BASE_URL}/health")
        self.assertEqual(r.status_code, 200)
        data = r.json()
        self.assertEqual(data["status"], "ok")

    @unittest.skipUnless(
        os.environ.get("INTEGRATION_TEST"),
        "Set INTEGRATION_TEST=1 to run HTTP tests"
    )
    def test_dock_aspirin(self):
        import requests
        payload = {
            "receptor": "1EQG",
            "ligand": "CC(=O)Oc1ccccc1C(=O)O",
            "exhaustiveness": 8,
            "n_poses": 3,
        }
        r = requests.post(f"{self.BASE_URL}/dock", json=payload, timeout=300)
        self.assertEqual(r.status_code, 200)
        data = r.json()
        self.assertTrue(data["success"])
        self.assertIsNotNone(data["best_score"])
        self.assertGreater(len(data["poses"]), 0)

    @unittest.skipUnless(
        os.environ.get("INTEGRATION_TEST"),
        "Set INTEGRATION_TEST=1 to run HTTP tests"
    )
    def test_dock_missing_receptor(self):
        import requests
        r = requests.post(f"{self.BASE_URL}/dock", json={"ligand": "CCO"})
        self.assertEqual(r.status_code, 400)


if __name__ == "__main__":
    unittest.main()
