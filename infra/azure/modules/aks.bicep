@description('Optional AKS cluster for scrapers / workers')
param location string = resourceGroup().location
param clusterName string = 'pt-aks-${uniqueString(resourceGroup().id)}'
param nodeCount int = 1
@description('Enable autoscaler on the default node pool')
param enableAutoscaler bool = false
@description('Autoscaler minimum node count')
param minCount int = 1
@description('Autoscaler maximum node count')
param maxCount int = 3
@description('Optional user assigned identity resource id for the cluster')
param userAssignedIdentityId string = ''

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
        enableAutoScaling: enableAutoscaler
        minCount: minCount
        maxCount: maxCount
      }
    ]
    dnsPrefix: clusterName
    enableRBAC: true
  }
  identity: if (empty(userAssignedIdentityId)) {} else {
    type: 'UserAssigned'
    userAssignedIdentities: {
      '${userAssignedIdentityId}': {}
    }
  }
  sku: {
    name: 'Basic'
  }
}

output aksName string = aks.name
output aksFqdn string = aks.properties.fqdn
