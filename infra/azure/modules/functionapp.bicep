@description('Create an Azure Function App (consumption plan) for Trigger.dev short tasks')
param location string = resourceGroup().location
param functionAppName string = 'pt-func-${uniqueString(resourceGroup().id)}'
@description('Optional userAssigned identity resource id to assign to the Function App')
param userAssignedIdentityId string = ''

resource storageAccount 'Microsoft.Storage/storageAccounts@2022-09-01' = {
  name: toLower('funcsa${uniqueString(resourceGroup().id)}')
  location: location
  sku: {
    name: 'Standard_LRS'
  }
  kind: 'StorageV2'
}

resource plan 'Microsoft.Web/serverfarms@2022-03-01' = {
  name: '${functionAppName}-plan'
  location: location
  sku: {
    name: 'Y1'
    tier: 'Dynamic'
  }
  properties: {}
}

resource functionApp 'Microsoft.Web/sites@2022-03-01' = {
  name: functionAppName
  location: location
  kind: 'functionapp'
  identity: if (empty(userAssignedIdentityId)) {} else {
    type: 'UserAssigned'
    userAssignedIdentities: {
      '${userAssignedIdentityId}': {}
    }
  }
  properties: {
    serverFarmId: plan.id
    siteConfig: {
      appSettings: [
        {
          name: 'FUNCTIONS_EXTENSION_VERSION'
          value: '~4'
        }
        {
          name: 'WEBSITE_RUN_FROM_PACKAGE'
          value: '1'
        }
      ]
    }
  }
  dependsOn: [ plan, storageAccount ]
}

output functionAppName string = functionApp.name
