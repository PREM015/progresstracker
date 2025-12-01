@description('Create a VNet with subnets for AKS, container apps and private endpoints')
param location string = resourceGroup().location
param vnetName string = 'pt-vnet-${uniqueString(resourceGroup().id)}'
param addressPrefix string = '10.0.0.0/16'
param aksSubnetPrefix string = '10.0.0.0/24'
param servicesSubnetPrefix string = '10.0.1.0/24'
param peSubtotalPrefix string = '10.0.2.0/24'

resource vnet 'Microsoft.Network/virtualNetworks@2021-05-01' = {
  name: vnetName
  location: location
  properties: {
    addressSpace: {
      addressPrefixes: [ addressPrefix ]
    }
    subnets: [
      {
        name: 'aks-subnet'
        properties: {
          addressPrefix: aksSubnetPrefix
          delegations: []
        }
      }
      {
        name: 'services-subnet'
        properties: {
          addressPrefix: servicesSubnetPrefix
        }
      }
      {
        name: 'private-endpoints'
        properties: {
          addressPrefix: peSubtotalPrefix
        }
      }
    ]
  }
}

output vnetId string = vnet.id
output aksSubnetId string = '${vnet.id}/subnets/aks-subnet'
output servicesSubnetId string = '${vnet.id}/subnets/services-subnet'
output peSubnetId string = '${vnet.id}/subnets/private-endpoints'
