# AutoDock Vina JSON API

A Docker-based HTTP API wrapping AutoDock Vina 1.2.5 for molecular docking.

## Quick Start

```bash
docker build -t vina-json-api .
docker run -d -p 8080:8080 -v $(pwd)/data:/data -v $(pwd)/out:/out vina-json-api
```

## API Endpoints

### `GET /health`
Health check. Returns `{"status": "ok", "engine": "AutoDock Vina 1.2.5"}`.

### `POST /dock`
Single receptor-ligand docking.

```json
{
  "receptor": "2HYY",
  "ligand": "CC1=C(C=C(C=C1)NC(=O)C2=CC=C(C=C2)CN3CCN(CC3)C)NC4=NC=CC(=N4)C5=CN=CC=C5",
  "exhaustiveness": 32,
  "n_poses": 9
}
```

**Receptor** accepts:
- PDB ID (e.g. `"2HYY"`) — auto-downloaded from RCSB
- URL to `.pdb` or `.pdbqt` file
- Inline PDB/PDBQT content

**Ligand** accepts:
- SMILES string (e.g. `"CC(=O)Oc1ccccc1C(=O)O"` for aspirin)
- URL to `.pdbqt` file
- Inline PDBQT content

**Optional parameters:**
| Parameter | Default | Description |
|-----------|---------|-------------|
| `center_x/y/z` | auto-detect | Binding site center (Å) |
| `size_x/y/z` | 20 | Search box dimensions (Å) |
| `exhaustiveness` | 32 | Search thoroughness |
| `n_poses` | 9 | Max number of poses |
| `energy_range` | 3 | Max energy difference from best (kcal/mol) |

**Response:**
```json
{
  "success": true,
  "best_score": -8.5,
  "num_poses": 9,
  "poses": [
    {
      "model": 1,
      "score_kcal_mol": -8.5,
      "rmsd_lower_bound": 0.0,
      "rmsd_upper_bound": 0.0,
      "pdbqt": "ATOM ..."
    }
  ],
  "binding_box": { "center_x": 15.2, ... },
  "elapsed_seconds": 45.3
}
```

### `POST /batch`
Same receptor, multiple ligands.

```json
{
  "receptor": "2HYY",
  "ligands": ["CCO", "c1ccccc1", "CC(=O)O"],
  "exhaustiveness": 16
}
```

## Modes

```bash
# HTTP API server (default)
docker run -p 8080:8080 vina-json-api

# Interactive shell
docker run -it vina-json-api shell
```

## Testing

```bash
# Unit tests (no server needed)
python -m pytest test_docking.py -v

# Integration tests (requires running server)
INTEGRATION_TEST=1 python -m pytest test_docking.py -v
```

## Deploy on RunPod

1. Push image to Docker Hub / GHCR
2. Create a RunPod Serverless endpoint with this image
3. Set `RUNPOD_ENDPOINT_ID` and `RUNPOD_API_KEY` in your app secrets
4. The app's edge functions will dispatch docking jobs to this endpoint

## Example

```bash
curl -X POST http://localhost:8080/dock \
  -H "Content-Type: application/json" \
  -d @example_input.json
```
