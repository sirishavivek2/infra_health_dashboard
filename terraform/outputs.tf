output "resource_group" {
  description = "Name of the resource group everything lives in."
  value       = azurerm_resource_group.main.name
}

output "app_url" {
  description = "Public HTTPS URL of the deployed dashboard."
  value       = "https://${azurerm_container_app.web.ingress[0].fqdn}"
}
