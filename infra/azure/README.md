# Azure infra — ProgressTracker

This folder contains reusable Bicep modules and top-level files to provision Azure resources needed to run ProgressTracker in a single-cloud Azure topology.

Structure

- `main.bicep` — top-level orchestrator referencing modules
- `modules/` — modular resources (networking, db, redis, storage, container apps, aks, function app)
- `parameters/` — sample parameter files for dev/staging/prod

The templates are intentionally concise and meant as a starting point — you'll need to add production-ready configuration (scaling / sizing / backup policies / private endpoints / Key Vault integration) before using in production.
