@description('Azure Cache for Redis')
param location string = resourceGroup().location
param skuName string = 'Standard'

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
