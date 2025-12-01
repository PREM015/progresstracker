// main.bicep - top-level orchestration for ProgressTracker Azure infra

param location string = resourceGroup().location
param environment string = 'dev'
param postgresAdmin string = 'pt_admin'
param postgresPassword string
param postgresSkuName string = 'Standard_B1ms'
param redisSkuName string = 'Standard'
param storageSkuName string = 'Standard_LRS'

targetScope = 'resourceGroup'

module postgres './modules/postgres.bicep' = {
  name: 'postgres-${environment}'
  params: {
    location: location
    adminUsername: postgresAdmin
    adminPassword: postgresPassword
    skuName: postgresSkuName
  }
}

module redis './modules/redis.bicep' = {
  name: 'redis-${environment}'
  params: {
    location: location
    skuName: redisSkuName
  }
}

module storage './modules/storage.bicep' = {
  name: 'storage-${environment}'
  params: {
    location: location
    skuName: storageSkuName
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
  }
}

// Key Vault
module keyVault './modules/keyvault.bicep' = {
  name: 'keyvault-${environment}'
  params: {
    location: location
  }
}

// Optional Function App / Serverless for Trigger.dev
module functionApp './modules/functionapp.bicep' = {
  name: 'functions-${environment}'
  params: {
    location: location
  }
}
