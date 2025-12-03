# variables.tf - Input Variables for Vercel Deployment

variable "project_name" {
  description = "Vercel project name"
  type        = string
  default     = "progresstracker"
}

variable "github_repo" {
  description = "GitHub repository (username/repo)"
  type        = string
  default     = "yourusername/progresstracker"
}

variable "vercel_region" {
  description = "Vercel serverless function region"
  type        = string
  default     = "iad1" # Washington, D.C.
  # Options: iad1 (US East), sfo1 (US West), hnd1 (Asia), fra1 (Europe)
}

# ==========================================
# DATABASE VARIABLES
# ==========================================

variable "database_url" {
  description = "PostgreSQL connection string (Production)"
  type        = string
  sensitive   = true
}

variable "database_url_preview" {
  description = "PostgreSQL connection string (Preview/Staging)"
  type        = string
  sensitive   = true
  default     = ""
}

# ==========================================
# NEXTAUTH VARIABLES
# ==========================================

variable "nextauth_url" {
  description = "NextAuth URL (Production)"
  type        = string
  default     = "https://progresstracker.vercel.app"
}

variable "nextauth_secret" {
  description = "NextAuth secret key (min 32 chars)"
  type        = string
  sensitive   = true
}

# ==========================================
# OAUTH VARIABLES
# ==========================================

variable "github_client_id" {
  description = "GitHub OAuth Client ID"
  type        = string
  sensitive   = true
}

variable "github_client_secret" {
  description = "GitHub OAuth Client Secret"
  type        = string
  sensitive   = true
}

variable "google_client_id" {
  description = "Google OAuth Client ID"
  type        = string
  sensitive   = true
}

variable "google_client_secret" {
  description = "Google OAuth Client Secret"
  type        = string
  sensitive   = true
}

variable "linkedin_client_id" {
  description = "LinkedIn OAuth Client ID"
  type        = string
  sensitive   = true
  default     = ""
}

variable "linkedin_client_secret" {
  description = "LinkedIn OAuth Client Secret"
  type        = string
  sensitive   = true
  default     = ""
}

# ==========================================
# REDIS VARIABLES (Upstash)
# ==========================================

variable "upstash_redis_url" {
  description = "Upstash Redis REST URL"
  type        = string
  sensitive   = true
}

variable "upstash_redis_token" {
  description = "Upstash Redis REST Token"
  type        = string
  sensitive   = true
}

# ==========================================
# EMAIL VARIABLES (SMTP)
# ==========================================

variable "smtp_host" {
  description = "SMTP server host"
  type        = string
  default     = "smtp.gmail.com"
}

variable "smtp_port" {
  description = "SMTP server port"
  type        = string
  default     = "587"
}

variable "smtp_user" {
  description = "SMTP username/email"
  type        = string
  sensitive   = true
}

variable "smtp_password" {
  description = "SMTP password/app password"
  type        = string
  sensitive   = true
}

variable "smtp_from" {
  description = "Email from address"
  type        = string
  default     = "CodeSync <noreply@progresstracker.app>"
}

# ==========================================
# MONITORING VARIABLES
# ==========================================

variable "sentry_dsn" {
  description = "Sentry DSN for error tracking"
  type        = string
  sensitive   = true
  default     = ""
}

variable "sentry_auth_token" {
  description = "Sentry auth token"
  type        = string
  sensitive   = true
  default     = ""
}

# ==========================================
# TRIGGER.DEV VARIABLES
# ==========================================

variable "trigger_api_key" {
  description = "Trigger.dev API key"
  type        = string
  sensitive   = true
  default     = ""
}

# ==========================================
# CLOUDFLARE R2 VARIABLES
# ==========================================

variable "r2_access_key_id" {
  description = "Cloudflare R2 Access Key ID"
  type        = string
  sensitive   = true
  default     = ""
}

variable "r2_secret_access_key" {
  description = "Cloudflare R2 Secret Access Key"
  type        = string
  sensitive   = true
  default     = ""
}

variable "r2_bucket_name" {
  description = "Cloudflare R2 bucket name"
  type        = string
  default     = "progresstracker-uploads"
}

variable "r2_endpoint" {
  description = "Cloudflare R2 endpoint"
  type        = string
  default     = "https://YOUR_ACCOUNT_ID.r2.cloudflarestorage.com"
}

# ==========================================
# CUSTOM DOMAIN VARIABLES
# ==========================================

variable "custom_domain" {
  description = "Custom domain (leave empty for none)"
  type        = string
  default     = ""
}

variable "enable_password_protection" {
  description = "Enable password protection for deployments"
  type        = bool
  default     = false
}