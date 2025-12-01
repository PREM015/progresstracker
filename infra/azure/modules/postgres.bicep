@description('Create Azure Database for PostgreSQL Flexible Server')
param location string = resourceGroup().location
param adminUsername string
@secure()
param adminPassword string
param skuName string = 'Standard_B1ms'
@description('Backup retention days for Postgres')
param backupRetentionDays int = 7
@description('Create private endpoint for the server')
param createPrivateEndpoint bool = false
@description('Resource id of subnet to place private endpoint (e.g. network.outputs.peSubnetId)')
param privateEndpointSubnetId string = ''

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
      backupRetentionDays: backupRetentionDays
    }
  }
  sku: {
    name: skuName
    tier: 'Burstable'
  }
}

output postgresHost string = postgres.properties.fullyQualifiedDomainName
// Optional private endpoint
resource postgresPrivateEndpoint 'Microsoft.Network/privateEndpoints@2021-03-01' = if (createPrivateEndpoint) {
  name: '${postgres.name}-pe'
  location: location
  properties: {
    subnet: {
      id: privateEndpointSubnetId
    }
    privateLinkServiceConnections: [
      {
        name: '${postgres.name}-pls-conn'
        properties: {
          privateLinkServiceId: postgres.id
          groupIds: [ 'postgresqlServer' ]
        }
      }
    ]
  }
}
output postgresName string = postgres.name

