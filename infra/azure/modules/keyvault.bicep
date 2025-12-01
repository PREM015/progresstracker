@description('Azure Key Vault for secrets and app config')
param location string = resourceGroup().location
param keyVaultName string = 'pt-kv-${uniqueString(resourceGroup().id)}'
param tenantId string = subscription().tenantId

resource kv 'Microsoft.KeyVault/vaults@2022-07-01' = {
  name: keyVaultName
  location: location
  properties: {
    tenantId: tenantId
    sku: {
      family: 'A'
      name: 'standard'
    }
    accessPolicies: []
    enableRbacAuthorization: true
    enabledForDeployment: true
    enabledForTemplateDeployment: true
  }
}

output keyVaultUri string = kv.properties.vaultUri
