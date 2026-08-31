variable "project_name" {
  description = "Short name used to prefix every resource."
  type        = string
  default     = "infra-health"
}

variable "location" {
  description = "Azure region to deploy into."
  type        = string
  default     = "westus2"
}

variable "environment" {
  description = "Deployment environment label (dev, staging, prod)."
  type        = string
  default     = "dev"
}

variable "container_image" {
  description = "Fully-qualified container image, e.g. myregistry.azurecr.io/infra-health-dashboard:latest"
  type        = string
  default     = "ghcr.io/OWNER/infra-health-dashboard:latest"
}

variable "db_connection_string" {
  description = "Postgres connection string. Passed at apply time; stored as a secret, never committed."
  type        = string
  sensitive   = true
}
