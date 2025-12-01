@description('Create Azure Container Apps Environment')
param location string = resourceGroup().location

resource containerAppEnv 'Microsoft.Web/kubeEnvironments@2022-03-01' = {
  name: 'pt-containerapps-env-${uniqueString(resourceGroup().id)}'
  location: location
  properties: {
    virtualNetworkConfiguration: null
    configuration: {}
  }
}

output containerAppEnvName string = containerAppEnv.name
