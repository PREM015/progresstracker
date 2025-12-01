@description('Azure Key Vault for secrets and app config')
param location string = resourceGroup().location
param keyVaultName string = 'pt-kv-${uniqueString(resourceGroup().id)}'
param tenantId string = subscription().tenantId
@description('Array of objectIds (principals) that should be granted secret access via access policies')
param accessPolicyObjectIds array = []

resource kv 'Microsoft.KeyVault/vaults@2022-07-01' = {
  name: keyVaultName
  location: location
  properties: {
    tenantId: tenantId
    sku: {
      family: 'A'
      name: 'standard'
    }
    accessPolicies: [for id in accessPolicyObjectIds: {
      tenantId: tenantId
      objectId: id
      permissions: {
        secrets: [ 'get', 'list', 'set' ]
      }
    }]
    enableRbacAuthorization: false
    enabledForDeployment: true
    enabledForTemplateDeployment: true
  }
}

output keyVaultUri string = kv.properties.vaultUri
output keyVaultId string = kv.id
output keyVaultName string = kv.name
