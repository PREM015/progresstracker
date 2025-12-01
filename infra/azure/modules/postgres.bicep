@description('Create Azure Database for PostgreSQL Flexible Server')
param location string = resourceGroup().location
param adminUsername string
@secure()
param adminPassword string
param skuName string = 'Standard_B1ms'

resource postgres 'Microsoft.DBforPostgreSQL/flexibleServers@2023-03-01' = {
  name: 'pt-postgres-${uniqueString(resourceGroup().id)}'
  location: location
  properties: {
    administratorLogin: adminUsername
    administratorLoginPassword: adminPassword
    version: '14'
    storage: {
      storageSizeGB: 64
    }
    backup: {
      backupRetentionDays: 7
    }
  }
  sku: {
    name: skuName
    tier: 'Burstable'
  }
}

output postgresHost string = postgres.properties.fullyQualifiedDomainName
output postgresName string = postgres.name

