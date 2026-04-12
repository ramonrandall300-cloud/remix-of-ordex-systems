UPDATE protein_prediction_jobs 
SET result_pdb_url = '/mock_test.pdb',
    plddt_score = 85.3,
    plddt_binding_domain = 72.1,
    result_metrics = '{"rmsd": 1.2, "tm_score": 0.89, "residues": 13, "model_confidence": "high"}'::jsonb
WHERE id = 'c6523f19-a073-43a3-a133-23a3de5d67e9';