# Terraform infra — ProgressTracker

This contains a starter Terraform implementation for Azure resources used by ProgressTracker. These are templates/skeletons for reference and will need to be tuned for production use (size, backup, networking, private endpoints, RBAC).

Files:
- main.tf — provider and resource skeleton
- variables.tf — variable definitions
- outputs.tf — outputs

To use:
1) Install Terraform.
2) Set required environment variables (ARM_SUBSCRIPTION_ID, ARM_CLIENT_ID, ARM_CLIENT_SECRET, ARM_TENANT_ID).
3) Run terraform init, plan and apply.

This is a starting reference — tailor it to your requirements before production deployment.
