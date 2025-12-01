@description('Storage account for object storage')
param location string = resourceGroup().location
param skuName string = 'Standard_LRS'

resource sa 'Microsoft.Storage/storageAccounts@2022-09-01' = {
  name: toLower('ptstorage${uniqueString(resourceGroup().id)}')
  location: location
  sku: {
    name: skuName
  }
  kind: 'StorageV2'
  properties: {
    accessTier: 'Hot'
  }
}

output storageId string = sa.id
output storageName string = sa.name
