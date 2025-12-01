@description('Azure Cache for Redis')
param location string = resourceGroup().location
param skuName string = 'Standard'
@description('Create private endpoint for Redis')
param createPrivateEndpoint bool = false
@description('Resource id of subnet to place private endpoint (e.g. network.outputs.peSubnetId)')
param privateEndpointSubnetId string = ''

resource redis 'Microsoft.Cache/Redis@2023-04-01' = {
  name: 'pt-redis-${uniqueString(resourceGroup().id)}'
  location: location
  sku: {
    name: skuName
    family: 'C'
    capacity: 1
  }
}

output redisHost string = redis.properties.hostName
output redisPort int = redis.properties.port

resource redisPrivateEndpoint 'Microsoft.Network/privateEndpoints@2021-03-01' = if (createPrivateEndpoint) {
  name: '${redis.name}-pe'
  location: location
  properties: {
    subnet: {
      id: privateEndpointSubnetId
    }
    privateLinkServiceConnections: [
      {
        name: '${redis.name}-pls'
        properties: {
          privateLinkServiceId: redis.id
          groupIds: [ 'redisCache' ]
        }
      }
    ]
  }
}
