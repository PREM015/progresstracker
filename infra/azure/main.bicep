// main.bicep - top-level orchestration for ProgressTracker Azure infra

param location string = resourceGroup().location
param environment string = 'dev'
param postgresAdmin string = 'pt_admin'
param postgresPassword string
param postgresSkuName string = 'Standard_B1ms'
param redisSkuName string = 'Standard'
param storageSkuName string = 'Standard_LRS'

targetScope = 'resourceGroup'


// Virtual Network and subnets (for AKS, services and private endpoints)
module network './modules/network.bicep' = {
  name: 'network-${environment}'
  params: {
    location: location
  }
}

// Pass networking ids to modules that may create private endpoints
var peSubnetId = network.outputs.peSubnetId
var servicesSubnetId = network.outputs.servicesSubnetId
var aksSubnetId = network.outputs.aksSubnetId

module postgres './modules/postgres.bicep' = {
  name: 'postgres-${environment}'
  params: {
    location: location
    adminUsername: postgresAdmin
    adminPassword: postgresPassword
    skuName: postgresSkuName
    createPrivateEndpoint: true
    privateEndpointSubnetId: peSubnetId
  }
}

module redis './modules/redis.bicep' = {
  name: 'redis-${environment}'
  params: {
    location: location
    skuName: redisSkuName
    createPrivateEndpoint: true
    privateEndpointSubnetId: peSubnetId
  }
}

// Store sensitive values in Key Vault (set by the deployment)
resource postgresSecret 'Microsoft.KeyVault/vaults/secrets@2019-09-01' = {
  name: '${keyVault.outputs.keyVaultName}/POSTGRES_ADMIN_PASSWORD'
  properties: {
    value: postgresPassword
  }
  dependsOn: [ keyVault, postgres ]
}

module storage './modules/storage.bicep' = {
  name: 'storage-${environment}'
  params: {
    location: location
    skuName: storageSkuName
  }
}

// Virtual Network and subnets (for AKS, services and private endpoints)
// network module already created above

// create a user assigned managed identity for services to use (AKS, Function App, Container Apps)
resource infraIdentity 'Microsoft.ManagedIdentity/userAssignedIdentities@2018-11-30' = {
  name: 'pt-identity-${environment}-${uniqueString(resourceGroup().id)}'
  location: location
}

// Key Vault (grant access to infraIdentity by objectId)
module keyVault './modules/keyvault.bicep' = {
  name: 'keyvault-${environment}'
  params: {
    location: location
    accessPolicyObjectIds: [ infraIdentity.properties.principalId ]
  }
}

// container apps environment for Trigger.dev and scrapers
module containerAppsEnv './modules/containerapps.bicep' = {
  name: 'containerapps-${environment}'
  params: {
    location: location
  }
}

// AKS option (for scrapers) - optional
module aks './modules/aks.bicep' = {
  name: 'aks-${environment}'
  params: {
    location: location
    userAssignedIdentityId: infraIdentity.id
    enableAutoscaler: true
    minCount: 1
    maxCount: 3
  }
}

// (Key Vault module already declared earlier with access policies)

// Optional Function App / Serverless for Trigger.dev
module functionApp './modules/functionapp.bicep' = {
  name: 'functions-${environment}'
  params: {
    location: location
    userAssignedIdentityId: infraIdentity.id
  }
}
