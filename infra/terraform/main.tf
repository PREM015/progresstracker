# main.tf - Complete Vercel Infrastructure for ProgressTracker

terraform {
  required_version = ">= 1.0"
  
  required_providers {
    vercel = {
      source  = "vercel/vercel"
      version = "~> 4.0"
    }
  }
}

# ==========================================
# VERCEL PROVIDER
# ==========================================

provider "vercel" {
  # Authentication via VERCEL_API_TOKEN environment variable
  # Get token from: https://vercel.com/account/tokens
}

# ==========================================
# VERCEL PROJECT
# ==========================================

resource "vercel_project" "progresstracker" {
  name      = var.project_name
  framework = "nextjs"
  
  git_repository = {
    type = "github"
    repo = var.github_repo # e.g., "username/progresstracker"
  }
  
  build_command    = "npm run build"
  install_command  = "npm install"
  output_directory = ".next"
  
  root_directory = "."
  
  # Auto-deploy on push
  auto_assign_custom_domains = true
  
  serverless_function_region = var.vercel_region
}

# ==========================================
# PRODUCTION ENVIRONMENT VARIABLES
# ==========================================

# Database
resource "vercel_project_environment_variable" "database_url" {
  project_id = vercel_project.progresstracker.id
  key        = "DATABASE_URL"
  value      = var.database_url
  target     = ["production"]
  type       = "secret"
}

# NextAuth
resource "vercel_project_environment_variable" "nextauth_url" {
  project_id = vercel_project.progresstracker.id
  key        = "NEXTAUTH_URL"
  value      = var.nextauth_url
  target     = ["production"]
  type       = "plain"
}

resource "vercel_project_environment_variable" "nextauth_secret" {
  project_id = vercel_project.progresstracker.id
  key        = "NEXTAUTH_SECRET"
  value      = var.nextauth_secret
  target     = ["production"]
  type       = "secret"
}

# GitHub OAuth
resource "vercel_project_environment_variable" "github_client_id" {
  project_id = vercel_project.progresstracker.id
  key        = "GITHUB_CLIENT_ID"
  value      = var.github_client_id
  target     = ["production"]
  type       = "plain"
}

resource "vercel_project_environment_variable" "github_client_secret" {
  project_id = vercel_project.progresstracker.id
  key        = "GITHUB_CLIENT_SECRET"
  value      = var.github_client_secret
  target     = ["production"]
  type       = "secret"
}

# Google OAuth
resource "vercel_project_environment_variable" "google_client_id" {
  project_id = vercel_project.progresstracker.id
  key        = "GOOGLE_CLIENT_ID"
  value      = var.google_client_id
  target     = ["production"]
  type       = "plain"
}

resource "vercel_project_environment_variable" "google_client_secret" {
  project_id = vercel_project.progresstracker.id
  key        = "GOOGLE_CLIENT_SECRET"
  value      = var.google_client_secret
  target     = ["production"]
  type       = "secret"
}

# LinkedIn OAuth
resource "vercel_project_environment_variable" "linkedin_client_id" {
  project_id = vercel_project.progresstracker.id
  key        = "LINKEDIN_CLIENT_ID"
  value      = var.linkedin_client_id
  target     = ["production"]
  type       = "plain"
}

resource "vercel_project_environment_variable" "linkedin_client_secret" {
  project_id = vercel_project.progresstracker.id
  key        = "LINKEDIN_CLIENT_SECRET"
  value      = var.linkedin_client_secret
  target     = ["production"]
  type       = "secret"
}

# Redis (Upstash)
resource "vercel_project_environment_variable" "upstash_redis_url" {
  project_id = vercel_project.progresstracker.id
  key        = "UPSTASH_REDIS_REST_URL"
  value      = var.upstash_redis_url
  target     = ["production"]
  type       = "secret"
}

resource "vercel_project_environment_variable" "upstash_redis_token" {
  project_id = vercel_project.progresstracker.id
  key        = "UPSTASH_REDIS_REST_TOKEN"
  value      = var.upstash_redis_token
  target     = ["production"]
  type       = "secret"
}

# Email (SMTP)
resource "vercel_project_environment_variable" "smtp_host" {
  project_id = vercel_project.progresstracker.id
  key        = "SMTP_HOST"
  value      = var.smtp_host
  target     = ["production"]
  type       = "plain"
}

resource "vercel_project_environment_variable" "smtp_port" {
  project_id = vercel_project.progresstracker.id
  key        = "SMTP_PORT"
  value      = var.smtp_port
  target     = ["production"]
  type       = "plain"
}

resource "vercel_project_environment_variable" "smtp_user" {
  project_id = vercel_project.progresstracker.id
  key        = "SMTP_USER"
  value      = var.smtp_user
  target     = ["production"]
  type       = "plain"
}

resource "vercel_project_environment_variable" "smtp_password" {
  project_id = vercel_project.progresstracker.id
  key        = "SMTP_PASSWORD"
  value      = var.smtp_password
  target     = ["production"]
  type       = "secret"
}

resource "vercel_project_environment_variable" "smtp_from" {
  project_id = vercel_project.progresstracker.id
  key        = "SMTP_FROM"
  value      = var.smtp_from
  target     = ["production"]
  type       = "plain"
}

# Sentry
resource "vercel_project_environment_variable" "sentry_dsn" {
  project_id = vercel_project.progresstracker.id
  key        = "SENTRY_DSN"
  value      = var.sentry_dsn
  target     = ["production"]
  type       = "secret"
}

resource "vercel_project_environment_variable" "sentry_auth_token" {
  project_id = vercel_project.progresstracker.id
  key        = "SENTRY_AUTH_TOKEN"
  value      = var.sentry_auth_token
  target     = ["production"]
  type       = "secret"
}

# Trigger.dev
resource "vercel_project_environment_variable" "trigger_api_key" {
  project_id = vercel_project.progresstracker.id
  key        = "TRIGGER_API_KEY"
  value      = var.trigger_api_key
  target     = ["production"]
  type       = "secret"
}

resource "vercel_project_environment_variable" "trigger_api_url" {
  project_id = vercel_project.progresstracker.id
  key        = "TRIGGER_API_URL"
  value      = "https://api.trigger.dev"
  target     = ["production"]
  type       = "plain"
}

# Cloudflare R2 (S3-compatible storage)
resource "vercel_project_environment_variable" "r2_access_key_id" {
  project_id = vercel_project.progresstracker.id
  key        = "R2_ACCESS_KEY_ID"
  value      = var.r2_access_key_id
  target     = ["production"]
  type       = "secret"
}

resource "vercel_project_environment_variable" "r2_secret_access_key" {
  project_id = vercel_project.progresstracker.id
  key        = "R2_SECRET_ACCESS_KEY"
  value      = var.r2_secret_access_key
  target     = ["production"]
  type       = "secret"
}

resource "vercel_project_environment_variable" "r2_bucket_name" {
  project_id = vercel_project.progresstracker.id
  key        = "R2_BUCKET_NAME"
  value      = var.r2_bucket_name
  target     = ["production"]
  type       = "plain"
}

resource "vercel_project_environment_variable" "r2_endpoint" {
  project_id = vercel_project.progresstracker.id
  key        = "R2_ENDPOINT"
  value      = var.r2_endpoint
  target     = ["production"]
  type       = "plain"
}

# Node Environment
resource "vercel_project_environment_variable" "node_env" {
  project_id = vercel_project.progresstracker.id
  key        = "NODE_ENV"
  value      = "production"
  target     = ["production"]
  type       = "plain"
}

# Public App URL
resource "vercel_project_environment_variable" "next_public_app_url" {
  project_id = vercel_project.progresstracker.id
  key        = "NEXT_PUBLIC_APP_URL"
  value      = var.nextauth_url
  target     = ["production"]
  type       = "plain"
}

# ==========================================
# PREVIEW ENVIRONMENT VARIABLES (for staging)
# ==========================================

resource "vercel_project_environment_variable" "database_url_preview" {
  project_id = vercel_project.progresstracker.id
  key        = "DATABASE_URL"
  value      = var.database_url_preview
  target     = ["preview"]
  type       = "secret"
}

resource "vercel_project_environment_variable" "nextauth_url_preview" {
  project_id = vercel_project.progresstracker.id
  key        = "NEXTAUTH_URL"
  value      = "https://${var.project_name}-preview.vercel.app"
  target     = ["preview"]
  type       = "plain"
}

resource "vercel_project_environment_variable" "nextauth_secret_preview" {
  project_id = vercel_project.progresstracker.id
  key        = "NEXTAUTH_SECRET"
  value      = var.nextauth_secret
  target     = ["preview"]
  type       = "secret"
}

# ==========================================
# DEVELOPMENT ENVIRONMENT VARIABLES
# ==========================================

resource "vercel_project_environment_variable" "database_url_dev" {
  project_id = vercel_project.progresstracker.id
  key        = "DATABASE_URL"
  value      = "file:./dev.db"
  target     = ["development"]
  type       = "plain"
}

resource "vercel_project_environment_variable" "nextauth_url_dev" {
  project_id = vercel_project.progresstracker.id
  key        = "NEXTAUTH_URL"
  value      = "http://localhost:3000"
  target     = ["development"]
  type       = "plain"
}

# ==========================================
# CUSTOM DOMAIN (Optional)
# ==========================================

resource "vercel_project_domain" "custom_domain" {
  count      = var.custom_domain != "" ? 1 : 0
  project_id = vercel_project.progresstracker.id
  domain     = var.custom_domain
}

# ==========================================
# DEPLOYMENT PROTECTION (Production only)
# ==========================================

resource "vercel_project_deployment_protection" "production" {
  project_id            = vercel_project.progresstracker.id
  deployment_type       = "prod_deployment_urls_and_all_previews"
  password_protection   = var.enable_password_protection
}