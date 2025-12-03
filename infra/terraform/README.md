# ProgressTracker - Vercel Terraform Deployment

Complete infrastructure-as-code for deploying ProgressTracker to Vercel.

## 🚀 Quick Start

### Prerequisites

1. **Terraform** >= 1.0
```bash
winget install HashiCorp.Terraform
Vercel Account with API token
Go to: https://vercel.com/account/tokens
Create new token with Full Access
Required Services:
PostgreSQL database (Neon, Supabase, or Railway)
Redis (Upstash free tier)
GitHub/Google OAuth apps
Setup
Set Vercel API Token:
Bash

# Windows PowerShell
$env:VERCEL_API_TOKEN="your-vercel-api-token"

# Linux/Mac
export VERCEL_API_TOKEN="your-vercel-api-token"
Initialize Terraform:
Bash

cd D:\code\projects\progresstracker\infra\terraform
terraform init
Create terraform.tfvars:
hcl

project_name = "progresstracker"
github_repo  = "yourusername/progresstracker"

database_url    = "postgresql://..."
nextauth_url    = "https://progresstracker.vercel.app"
nextauth_secret = "your-secret-32-chars-min"

github_client_id     = "your-github-client-id"
github_client_secret = "your-github-client-secret"
google_client_id     = "your-google-client-id"
google_client_secret = "your-google-client-secret"

upstash_redis_url   = "https://..."
upstash_redis_token = "your-token"

smtp_user     = "your-email@gmail.com"
smtp_password = "your-app-password"
Plan deployment:
Bash

terraform plan
Deploy:
Bash

terraform apply
Get outputs:
Bash

terraform output deployment_url
📊 What Gets Deployed
✅ Vercel Project with Next.js 16 framework
✅ GitHub repository integration
✅ 30+ environment variables (production, preview, development)
✅ Custom domain (optional)
✅ Password protection (optional)
✅ Auto-deploy on Git push
🔧 Environment Variables
Production
DATABASE_URL - PostgreSQL connection
NEXTAUTH_URL - App URL
NEXTAUTH_SECRET - Auth secret
OAuth credentials (GitHub, Google, LinkedIn)
Redis credentials (Upstash)
SMTP settings
Sentry DSN
Trigger.dev API key
Cloudflare R2 credentials
Preview/Staging
Separate database URL
Dynamic preview URL
Development
SQLite database (file:./dev.db)
Localhost URL
🎯 Commands
Bash

# Initialize
terraform init

# Format code
terraform fmt

# Validate
terraform validate

# Plan changes
terraform plan

# Apply changes
terraform apply

# Destroy everything
terraform destroy

# Show outputs
terraform output

# Import existing project
terraform import vercel_project.progresstracker prj_xxxxxxxxxxxxx
🔒 Security
All secrets stored as Vercel secret variables
Sensitive variables marked in Terraform
.tfvars file in .gitignore
Password protection available
📝 Free Tier Resources
Vercel (Free Tier)
✅ Unlimited deployments
✅ 100 GB bandwidth/month
✅ Automatic SSL
✅ Edge network
Neon PostgreSQL (Free Tier)
✅ 512 MB storage
✅ 1 database
✅ Automatic backups
Upstash Redis (Free Tier)
✅ 10,000 commands/day
✅ 256 MB storage
✅ Global edge caching
Cloudflare R2 (Free Tier)
✅ 10 GB storage/month
✅ 1 million Class A operations
✅ Zero egress fees
Total Cost: $0/month 🎉

🚨 Troubleshooting
Error: "Invalid API token"
Bash

# Set token correctly
$env:VERCEL_API_TOKEN="vtk_xxxxxxxxxxxxx"
terraform init -reconfigure
Error: "Project already exists"
Bash

# Import existing project
terraform import vercel_project.progresstracker prj_xxxxxxxxxxxxx
Error: "Domain not verified"
Bash

# Add domain in Vercel dashboard first
vercel domains add progresstracker.com
📚 Resources
Vercel Terraform Provider
Vercel Documentation
Neon PostgreSQL
Upstash Redis
🤝 Contributing
Fork the repository
Create feature branch
Make changes
Run terraform fmt and terraform validate
Submit pull request
📄 License
MIT License

text


---

## 📁 **FILE 6: `.gitignore`** (Important!)

```gitignore
# .gitignore for Terraform

# Terraform state files
*.tfstate
*.tfstate.*
*.tfstate.backup

# Terraform variable files with secrets
terraform.tfvars
*.auto.tfvars

# Terraform lock file (keep this if using version control)
# .terraform.lock.hcl

# Terraform directory
.terraform/
.terraform.lock.hcl

# Crash log files
crash.log
crash.*.log

# Environment variables
.env
.env.local
.env.*.local

# IDE files
.idea/
.vscode/
*.swp
*.swo
*~

# OS files
.DS_Store
Thumbs.db
🚀 DEPLOYMENT GUIDE
Step 1: Get Vercel API Token
Bash

# Go to: https://vercel.com/account/tokens
# Click "Create Token"
# Give it a name: "Terraform"
# Scope: "Full Access"
# Copy the token (starts with vtk_)
Step 2: Set Environment Variable
PowerShell

# Windows PowerShell
$env:VERCEL_API_TOKEN="vtk_your_token_here"

# Verify
echo $env:VERCEL_API_TOKEN
Step 3: Initialize Terraform
Bash

cd D:\code\projects\progresstracker\infra\terraform
terraform init
Expected output:

text

Initializing the backend...
Initializing provider plugins...
- Installing vercel/vercel v4.0.1...
Terraform has been successfully initialized!
Step 4: Create terraform.tfvars
Copy the template above and fill in your values.

Step 5: Deploy
Bash

# Preview changes
terraform plan

# Apply changes
terraform apply

# Type 'yes' when prompted
Step 6: Verify Deployment
Bash

# Get deployment URL
terraform output deployment_url

# Visit the URL
start https://progresstracker.vercel.app
✅ VERIFICATION CHECKLIST
 Vercel API token set
 terraform init successful
 terraform.tfvars created with secrets
 terraform plan shows no errors
 terraform apply completes
 Deployment URL accessible
 Environment variables visible in Vercel dashboard
📊 COMPLETE FILE STRUCTURE
text

D:\code\projects\progresstracker\infra\terraform\
├── .gitignore
├── .terraform.lock.hcl
├── main.tf
├── variables.tf
├── outputs.tf
├── terraform.tfvars (DO NOT COMMIT)
├── README.md
└── .terraform/
    └── providers/
        └── vercel/