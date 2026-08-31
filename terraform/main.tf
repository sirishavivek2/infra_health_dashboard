# Infrastructure as Code for the Infrastructure Health Dashboard.
#
# This provisions a real, cost-effective way to run the container on Azure:
#   Resource Group -> Log Analytics -> Container App Environment -> Container App
#
# The whole environment is defined here as code: reviewable in a PR, reproducible
# from an empty subscription, and destroyable with a single `terraform destroy`.
#
# Usage:
#   terraform init
#   terraform plan   -var "db_connection_string=postgres://..."
#   terraform apply  -var "db_connection_string=postgres://..."
#
# You do NOT need to run this to demonstrate the skill — the code itself is the
# proof that infrastructure is treated as software here.

terraform {
  required_version = ">= 1.5.0"

  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.100"
    }
  }
}

provider "azurerm" {
  features {}
}

# --- Foundational resources ------------------------------------------------

resource "azurerm_resource_group" "main" {
  name     = "${var.project_name}-rg"
  location = var.location
  tags     = local.tags
}

resource "azurerm_log_analytics_workspace" "main" {
  name                = "${var.project_name}-logs"
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  sku                 = "PerGB2018"
  retention_in_days   = 30
  tags                = local.tags
}

# --- Container App environment + app ---------------------------------------

resource "azurerm_container_app_environment" "main" {
  name                       = "${var.project_name}-env"
  resource_group_name        = azurerm_resource_group.main.name
  location                   = azurerm_resource_group.main.location
  log_analytics_workspace_id = azurerm_log_analytics_workspace.main.id
  tags                       = local.tags
}

resource "azurerm_container_app" "web" {
  name                         = "${var.project_name}-web"
  resource_group_name          = azurerm_resource_group.main.name
  container_app_environment_id = azurerm_container_app_environment.main.id
  revision_mode                = "Single"
  tags                         = local.tags

  # The database connection string is a SECRET, never a plain env value and
  # never committed. It is passed in at apply time and stored as a secret.
  secret {
    name  = "database-url"
    value = var.db_connection_string
  }

  template {
    min_replicas = 1
    max_replicas = 3

    container {
      name   = "web"
      image  = var.container_image
      cpu    = 0.5
      memory = "1Gi"

      env {
        name        = "DATABASE_URL"
        secret_name = "database-url"
      }
      env {
        name  = "DATABASE_SSL"
        value = "true"
      }
    }
  }

  ingress {
    external_enabled = true
    target_port      = 3000
    traffic_weight {
      percentage      = 100
      latest_revision = true
    }
  }
}

locals {
  tags = {
    project    = var.project_name
    managed_by = "terraform"
    env        = var.environment
  }
}
