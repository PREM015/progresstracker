variable "location" {
  type    = string
  default = "eastus"
}

variable "resource_group_name" {
  type    = string
  default = "progresstracker-rg"
}

variable "postgres_admin" {
  type    = string
  default = "pt_admin"
}

variable "postgres_password" {
  type    = string
  default = "REPLACE_WITH_SECURE_PASSWORD"
}

variable "postgres_sku" {
  type    = string
  default = "Standard_B1ms"
}
