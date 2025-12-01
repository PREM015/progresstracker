@description('Optional AKS cluster for scrapers / workers')
param location string = resourceGroup().location
param clusterName string = 'pt-aks-${uniqueString(resourceGroup().id)}'
param nodeCount int = 1

resource aks 'Microsoft.ContainerService/managedClusters@2023-05-01' = {
  name: clusterName
  location: location
  properties: {
    agentPoolProfiles: [
      {
        name: 'agentpool'
        count: nodeCount
        vmSize: 'Standard_DS2_v2'
        osType: 'Linux'
        mode: 'System'
      }
    ]
    dnsPrefix: clusterName
    enableRBAC: true
  }
  sku: {
    name: 'Basic'
  }
}

output aksName string = aks.name
output aksFqdn string = aks.properties.fqdn
