"""
Core docking logic — JSON in, JSON out.
Wraps AutoDock Vina CLI for receptor-ligand docking.
"""

import json
import os
import subprocess
import tempfile
import shutil
import re
import uuid
from pathlib import Path
from typing import Optional


class DockingError(Exception):
    pass


def _download_file(url: str, dest: str) -> str:
    """Download a file from URL to dest path."""
    import requests
    r = requests.get(url, timeout=120)
    r.raise_for_status()
    with open(dest, "wb") as f:
        f.write(r.content)
    return dest


def _convert_pdb_to_pdbqt(pdb_path: str, output_path: str, is_receptor: bool = True) -> str:
    """Convert PDB to PDBQT using Open Babel."""
    mode = "-xr" if is_receptor else "-xn"
    cmd = [
        "obabel", pdb_path,
        "-O", output_path,
        "-p", "7.4",  # Add hydrogens at pH 7.4
        mode,
    ]
    result = subprocess.run(cmd, capture_output=True, text=True, timeout=120)
    if result.returncode != 0 or not os.path.exists(output_path):
        raise DockingError(f"PDB→PDBQT conversion failed: {result.stderr}")
    return output_path


def _smiles_to_pdbqt(smiles: str, output_path: str) -> str:
    """Convert SMILES string to PDBQT via Open Babel (3D generation + PDBQT)."""
    # First generate 3D mol2
    mol2_path = output_path.replace(".pdbqt", ".mol2")
    cmd_3d = [
        "obabel", f"-:{smiles}",
        "-O", mol2_path,
        "--gen3d", "-p", "7.4",
    ]
    result = subprocess.run(cmd_3d, capture_output=True, text=True, timeout=60)
    if result.returncode != 0:
        raise DockingError(f"SMILES→3D failed: {result.stderr}")

    # Convert mol2 to pdbqt
    cmd_qt = ["obabel", mol2_path, "-O", output_path]
    result = subprocess.run(cmd_qt, capture_output=True, text=True, timeout=60)
    if result.returncode != 0:
        raise DockingError(f"MOL2→PDBQT failed: {result.stderr}")

    os.remove(mol2_path)
    return output_path


def _detect_binding_box(receptor_pdbqt: str) -> dict:
    """Auto-detect binding box from receptor center of mass."""
    xs, ys, zs = [], [], []
    with open(receptor_pdbqt) as f:
        for line in f:
            if line.startswith(("ATOM", "HETATM")):
                try:
                    xs.append(float(line[30:38]))
                    ys.append(float(line[38:46]))
                    zs.append(float(line[46:54]))
                except ValueError:
                    continue

    if not xs:
        raise DockingError("No atoms found in receptor file")

    return {
        "center_x": round(sum(xs) / len(xs), 3),
        "center_y": round(sum(ys) / len(ys), 3),
        "center_z": round(sum(zs) / len(zs), 3),
        "size_x": min(round(max(xs) - min(xs) + 10, 1), 126),
        "size_y": min(round(max(ys) - min(ys) + 10, 1), 126),
        "size_z": min(round(max(zs) - min(zs) + 10, 1), 126),
    }


def _parse_vina_output(output_pdbqt: str) -> list[dict]:
    """Parse Vina output PDBQT to extract poses and scores."""
    poses = []
    current_model = None
    current_lines = []

    with open(output_pdbqt) as f:
        for line in f:
            if line.startswith("MODEL"):
                current_model = int(line.split()[1])
                current_lines = []
            elif line.startswith("ENDMDL"):
                if current_model is not None:
                    poses.append({
                        "model": current_model,
                        "pdbqt": "".join(current_lines),
                    })
                current_model = None
            elif line.startswith("REMARK VINA RESULT"):
                parts = line.split()
                if len(parts) >= 4:
                    if current_lines is not None:
                        current_lines.append(line)
                    score = float(parts[3])
                    rmsd_lb = float(parts[4]) if len(parts) > 4 else 0.0
                    rmsd_ub = float(parts[5]) if len(parts) > 5 else 0.0
                    # Attach score to pose when ENDMDL comes
                    if poses or current_model == 1:
                        pass  # Will be handled below
                    poses_meta = {"score": score, "rmsd_lb": rmsd_lb, "rmsd_ub": rmsd_ub}
                continue
            else:
                if current_lines is not None:
                    current_lines.append(line)

    # Re-parse more robustly
    poses = []
    with open(output_pdbqt) as f:
        content = f.read()

    models = content.split("MODEL")
    for block in models[1:]:
        lines = block.strip().split("\n")
        model_num = int(lines[0].strip())
        score = None
        rmsd_lb = 0.0
        rmsd_ub = 0.0
        pdbqt_lines = []

        for line in lines[1:]:
            if line.startswith("ENDMDL"):
                break
            if line.startswith("REMARK VINA RESULT"):
                parts = line.split()
                score = float(parts[3])
                rmsd_lb = float(parts[4]) if len(parts) > 4 else 0.0
                rmsd_ub = float(parts[5]) if len(parts) > 5 else 0.0
            pdbqt_lines.append(line)

        poses.append({
            "model": model_num,
            "score_kcal_mol": score,
            "rmsd_lower_bound": rmsd_lb,
            "rmsd_upper_bound": rmsd_ub,
            "pdbqt": "\n".join(pdbqt_lines),
        })

    return poses


def run_docking(params: dict) -> dict:
    """
    Run AutoDock Vina docking.

    params:
      - receptor: PDB ID, URL, or inline PDB/PDBQT content
      - ligand: SMILES string, URL, or inline PDBQT content
      - center_x/y/z: optional binding site center
      - size_x/y/z: optional search box size (default 20Å)
      - exhaustiveness: search thoroughness (default 32)
      - n_poses: number of poses to generate (default 9)
      - energy_range: max energy diff from best (default 3)

    Returns dict with scores, poses, and metadata.
    """
    job_id = str(uuid.uuid4())[:8]
    work_dir = tempfile.mkdtemp(prefix=f"vina_{job_id}_")

    try:
        # ── Prepare receptor ──
        receptor_input = params.get("receptor", "")
        receptor_pdbqt = os.path.join(work_dir, "receptor.pdbqt")

        if receptor_input.startswith("http"):
            pdb_path = os.path.join(work_dir, "receptor.pdb")
            _download_file(receptor_input, pdb_path)
            _convert_pdb_to_pdbqt(pdb_path, receptor_pdbqt, is_receptor=True)
        elif receptor_input.strip().endswith(".pdbqt") or "ROOT" in receptor_input[:200]:
            with open(receptor_pdbqt, "w") as f:
                f.write(receptor_input)
        elif re.match(r"^\d[A-Za-z0-9]{3}$", receptor_input.strip()):
            pdb_id = receptor_input.strip().upper()
            url = f"https://files.rcsb.org/download/{pdb_id}.pdb"
            pdb_path = os.path.join(work_dir, "receptor.pdb")
            _download_file(url, pdb_path)
            _convert_pdb_to_pdbqt(pdb_path, receptor_pdbqt, is_receptor=True)
        else:
            pdb_path = os.path.join(work_dir, "receptor.pdb")
            with open(pdb_path, "w") as f:
                f.write(receptor_input)
            _convert_pdb_to_pdbqt(pdb_path, receptor_pdbqt, is_receptor=True)

        # ── Prepare ligand ──
        ligand_input = params.get("ligand", params.get("ligands", ""))
        ligand_pdbqt = os.path.join(work_dir, "ligand.pdbqt")

        if ligand_input.startswith("http"):
            lig_path = os.path.join(work_dir, "ligand_dl")
            _download_file(ligand_input, lig_path)
            if lig_path.endswith(".pdbqt"):
                shutil.move(lig_path, ligand_pdbqt)
            else:
                _convert_pdb_to_pdbqt(lig_path, ligand_pdbqt, is_receptor=False)
        elif re.search(r"[()=#@\[\]]", ligand_input):
            # Looks like SMILES
            _smiles_to_pdbqt(ligand_input, ligand_pdbqt)
        elif "ROOT" in ligand_input[:200] or "ATOM" in ligand_input[:200]:
            with open(ligand_pdbqt, "w") as f:
                f.write(ligand_input)
        else:
            # Try as SMILES anyway
            _smiles_to_pdbqt(ligand_input, ligand_pdbqt)

        # ── Binding box ──
        if all(k in params for k in ("center_x", "center_y", "center_z")):
            box = {
                "center_x": float(params["center_x"]),
                "center_y": float(params["center_y"]),
                "center_z": float(params["center_z"]),
                "size_x": float(params.get("size_x", 20)),
                "size_y": float(params.get("size_y", 20)),
                "size_z": float(params.get("size_z", 20)),
            }
        else:
            box = _detect_binding_box(receptor_pdbqt)
            # Constrain box to reasonable size for docking
            for dim in ("size_x", "size_y", "size_z"):
                box[dim] = min(box[dim], 40)
                box[dim] = max(box[dim], 20)

        # ── Run Vina ──
        output_pdbqt = os.path.join(work_dir, "output.pdbqt")
        log_path = os.path.join(work_dir, "vina.log")

        exhaustiveness = int(params.get("exhaustiveness", 32))
        n_poses = int(params.get("n_poses", 9))
        energy_range = float(params.get("energy_range", 3))

        cmd = [
            "vina",
            "--receptor", receptor_pdbqt,
            "--ligand", ligand_pdbqt,
            "--center_x", str(box["center_x"]),
            "--center_y", str(box["center_y"]),
            "--center_z", str(box["center_z"]),
            "--size_x", str(box["size_x"]),
            "--size_y", str(box["size_y"]),
            "--size_z", str(box["size_z"]),
            "--exhaustiveness", str(exhaustiveness),
            "--num_modes", str(n_poses),
            "--energy_range", str(energy_range),
            "--out", output_pdbqt,
            "--log", log_path,
        ]

        result = subprocess.run(
            cmd, capture_output=True, text=True,
            timeout=600,  # 10 min max
        )

        if result.returncode != 0:
            raise DockingError(f"Vina failed (exit {result.returncode}): {result.stderr}")

        if not os.path.exists(output_pdbqt):
            raise DockingError("Vina produced no output file")

        # ── Parse results ──
        poses = _parse_vina_output(output_pdbqt)
        best_score = poses[0]["score_kcal_mol"] if poses else None

        # Read log
        log_content = ""
        if os.path.exists(log_path):
            with open(log_path) as f:
                log_content = f.read()

        return {
            "success": True,
            "job_id": job_id,
            "best_score": best_score,
            "num_poses": len(poses),
            "poses": poses,
            "binding_box": box,
            "parameters": {
                "exhaustiveness": exhaustiveness,
                "n_poses": n_poses,
                "energy_range": energy_range,
            },
            "log": log_content[-2000:],  # Last 2K of log
        }

    except DockingError:
        raise
    except subprocess.TimeoutExpired:
        raise DockingError("Docking timed out after 10 minutes")
    except Exception as e:
        raise DockingError(f"Unexpected error: {str(e)}")
    finally:
        shutil.rmtree(work_dir, ignore_errors=True)
