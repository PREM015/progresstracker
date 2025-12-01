output "postgres_fqdn" {
  value = azurerm_postgresql_flexible_server.postgres.fqdn
}

output "redis_hostname" {
  value = azurerm_redis_cache.redis.hostname
}

output "storage_account_name" {
  value = azurerm_storage_account.storage.name
}

output "aks_name" {
  value = azurerm_kubernetes_cluster.aks.name
}
