"""
Flask HTTP API for AutoDock Vina docking.
Endpoints: /dock, /batch, /health
"""

import json
import time
import traceback
from flask import Flask, request, jsonify
from dock import run_docking, DockingError

app = Flask(__name__)


@app.route("/health", methods=["GET"])
def health():
    """Health check endpoint."""
    return jsonify({"status": "ok", "engine": "AutoDock Vina 1.2.5"})


@app.route("/dock", methods=["POST"])
def dock():
    """
    Single docking job.

    POST JSON:
    {
      "receptor": "1ABC" | URL | inline PDB/PDBQT,
      "ligand": "CC(=O)Oc1ccccc1C(=O)O" | URL | inline PDBQT,
      "center_x": 15.0,  (optional)
      "center_y": 10.0,  (optional)
      "center_z": 20.0,  (optional)
      "size_x": 20,      (optional, default 20)
      "size_y": 20,
      "size_z": 20,
      "exhaustiveness": 32, (optional)
      "n_poses": 9,         (optional)
    }

    Returns JSON with scores and poses.
    """
    try:
        params = request.get_json(force=True)
        if not params:
            return jsonify({"error": "Empty request body"}), 400

        if not params.get("receptor"):
            return jsonify({"error": "receptor is required"}), 400
        if not params.get("ligand") and not params.get("ligands"):
            return jsonify({"error": "ligand is required"}), 400

        start = time.time()
        result = run_docking(params)
        result["elapsed_seconds"] = round(time.time() - start, 2)

        return jsonify(result)

    except DockingError as e:
        return jsonify({"success": False, "error": str(e)}), 422
    except Exception as e:
        traceback.print_exc()
        return jsonify({"success": False, "error": f"Internal error: {str(e)}"}), 500


@app.route("/batch", methods=["POST"])
def batch():
    """
    Batch docking — same receptor, multiple ligands.

    POST JSON:
    {
      "receptor": "1ABC",
      "ligands": ["CCO", "c1ccccc1", "CC(=O)O"],
      "center_x": ..., (optional)
      ...
    }

    Returns array of results.
    """
    try:
        params = request.get_json(force=True)
        if not params:
            return jsonify({"error": "Empty request body"}), 400

        receptor = params.get("receptor")
        ligands = params.get("ligands", [])

        if not receptor:
            return jsonify({"error": "receptor is required"}), 400
        if not isinstance(ligands, list) or not ligands:
            return jsonify({"error": "ligands must be a non-empty array"}), 400

        results = []
        start = time.time()

        for i, lig in enumerate(ligands):
            try:
                single_params = {**params, "ligand": lig}
                single_params.pop("ligands", None)
                result = run_docking(single_params)
                result["ligand_index"] = i
                result["ligand_input"] = lig[:100]
                results.append(result)
            except DockingError as e:
                results.append({
                    "success": False,
                    "ligand_index": i,
                    "ligand_input": lig[:100],
                    "error": str(e),
                })

        return jsonify({
            "success": True,
            "receptor": receptor,
            "total": len(ligands),
            "completed": sum(1 for r in results if r.get("success")),
            "failed": sum(1 for r in results if not r.get("success")),
            "elapsed_seconds": round(time.time() - start, 2),
            "results": results,
        })

    except Exception as e:
        traceback.print_exc()
        return jsonify({"success": False, "error": f"Internal error: {str(e)}"}), 500


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8080, debug=False)
