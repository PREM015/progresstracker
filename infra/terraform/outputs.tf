# outputs.tf - Terraform Outputs

output "project_id" {
  description = "Vercel project ID"
  value       = vercel_project.progresstracker.id
}

output "project_name" {
  description = "Vercel project name"
  value       = vercel_project.progresstracker.name
}

output "deployment_url" {
  description = "Production deployment URL"
  value       = "https://${var.project_name}.vercel.app"
}

output "custom_domain_url" {
  description = "Custom domain URL (if configured)"
  value       = var.custom_domain != "" ? "https://${var.custom_domain}" : "Not configured"
}

output "preview_url" {
  description = "Preview deployment URL"
  value       = "https://${var.project_name}-preview.vercel.app"
}

output "github_repo" {
  description = "Connected GitHub repository"
  value       = var.github_repo
}

output "vercel_region" {
  description = "Serverless function region"
  value       = var.vercel_region
}

output "environment_variables_count" {
  description = "Number of environment variables configured"
  value       = 30
}