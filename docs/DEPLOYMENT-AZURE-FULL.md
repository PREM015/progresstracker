# Full Azure deployment instructions

This document explains how to deploy the Bicep infra in `infra/azure` using GitHub Actions or the Azure CLI.

Required Azure and GitHub setup

1. Create an Azure Service Principal and assign it the **Contributor** role for the target resource group (or use more limited RBAC in production):

```bash
# Login and set variables
az login
az account set -s <subscription-id>
az group create -l eastus -n progresstracker-rg

# create SP, limit permissions in production
az ad sp create-for-rbac --name "gh-action-progresstracker" --role Contributor --scopes /subscriptions/<subscription-id>/resourceGroups/progresstracker-rg
```

This prints JSON with `appId`, `tenant`, `password` — you must store these in GitHub secrets.

2. GitHub Secrets (set these in repository settings -> secrets):
- AZURE_CREDENTIALS — JSON from `az ad sp create-for-rbac` (as a full string)
- AZURE_SUBSCRIPTION_ID — your subscription id
- AZURE_RESOURCE_GROUP — the target resource group name (e.g. progresstracker-rg)
- POSTGRES_PASSWORD — secure DB admin password

Manual Azure CLI deployment

If you prefer to run locally, you can deploy with Azure CLI and the parameters file:

```bash
az deployment group create \
  --resource-group progresstracker-rg \
  --template-file infra/azure/main.bicep \
  --parameters @infra/azure/parameters/dev.parameters.json
```

GitHub Actions deployment (already included)

A workflow `.github/workflows/deploy-azure-infra.yml` has been added to this repo. You can either:

- Trigger it manually via the GitHub Actions "Run workflow" button, or
- Push to `main` to trigger the infra deploy step.

Post-deployment

- The workflow exposes template outputs (storage account name, postgres host) — check the workflow logs or `az` to inspect the resources.
- For production create appropriate Key Vault secrets, private endpoints and enable backups.

Production hardening (added by infra modules)
-------------------------------------------

This repository now includes an opinionated production-hardening scaffold in `infra/azure`:

- Virtual Network with subnets for AKS, services and an isolated subnet for private endpoints (used for Postgres and Redis). This limits public exposure of these services.
- Key Vault is created and the deployment stores the Postgres admin password in Key Vault. The infra also creates a user-assigned managed identity and grants it access to Key Vault; services (AKS, Function App) are configured to use this identity so workloads can fetch secrets securely.
- Postgres Flexible Server has configurable backup retention (default 7 days). Consider increasing to meet RTO/RPO needs and enable zone redundancy for high availability.
- AKS has optional autoscaler configuration to scale scraper workers automatically (default min=1, max=3). Use cluster autoscaler with horizontal pod autoscaler (HPA) for workload-level autoscaling.

Recommended production steps
---------------------------

1) Use Azure Key Vault for all secrets; rotate credentials regularly and integrate with managed identity (already in the templates).
2) Configure private endpoints for all managed services (DB, Redis, Storage) and lock down public network access.
3) Harden AKS: enable network policies, use pod identities / workload identities, configure RBAC for cluster and enable Azure Monitor for logs & metrics.
4) Configure redundancy: use multi-zone DB configuration and regional failover where required.
5) Enable backups and retention according to your SLAs.

Note: templates provide a base — review the `infra/azure` modules and tune SKUs, sizing, network CIDRs, and availability options before production rollout.

Next steps / production checklist

- Lock down the resource group RBAC and use managed identities for services where needed.
- Configure Azure Key Vault, store DB credentials and other secrets there, and use Key Vault references from App Service / Functions.
- Consider private endpoints for Azure DB and Redis to isolate traffic.
- Add monitoring and alerts (App Insights / Log Analytics) for production.

If you'd like, I can extend this with a complete Bicep-driven AKS + ingress + Helm chart for scrapers, or add Terraform equivalents. Which infra module would you like as the next step?