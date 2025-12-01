# Deploy Next.js app to Azure App Service

This document shows how to deploy the Next.js application to Azure App Service using GitHub Actions (workflow provided: `.github/workflows/deploy-appservice.yml`).

Steps:

1) Create an Azure App Service for Node (Linux) and an App Service Plan:

```bash
az webapp up --name <YOUR_APP_NAME> --resource-group <RESOURCE_GROUP> --runtime "NODE|20-lts"
```

2) Configure environment variables on the App Service, including:
- DATABASE_URL
- REDIS_URL
- S3 credentials (if using S3)
- ANY other environment secrets

3) Create Service Principal and set GitHub secrets (see `docs/DEPLOYMENT-AZURE-FULL.md` for SP creation). Then add these secrets in the repository settings:
- `AZURE_CREDENTIALS` — JSON from `az ad sp create-for-rbac` or using `az login` and `az ad sp create-for-rbac`.
- `AZURE_WEBAPP_NAME` — your app service name

4) Trigger the `Deploy Next.js to Azure App Service` workflow manually in Actions or push to `main`.

Notes:
- The included workflow zips `.next`, `node_modules`, `package.json`, and `next.config.js` and deploys it to App Service. Adjust packaging steps as required for your runtime and build output.
- For production use, consider using container-based deployment (Docker) and/or Azure Container Registry + Web App for Containers.
