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

Next steps / production checklist

- Lock down the resource group RBAC and use managed identities for services where needed.
- Configure Azure Key Vault, store DB credentials and other secrets there, and use Key Vault references from App Service / Functions.
- Consider private endpoints for Azure DB and Redis to isolate traffic.
- Add monitoring and alerts (App Insights / Log Analytics) for production.

If you'd like, I can extend this with a complete Bicep-driven AKS + ingress + Helm chart for scrapers, or add Terraform equivalents. Which infra module would you like as the next step?