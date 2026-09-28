@description('Location for all resources.')
param location string = resourceGroup().location

@description('Environment name prefix')
param environmentName string = 'quotation-ai-prod'

@description('Supabase Database URL')
@secure()
param databaseUrl string

@description('Azure Document Intelligence Endpoint')
param azureDocEndpoint string

@description('Azure Document Intelligence Key')
@secure()
param azureDocKey string

@description('Google Gemini API Key')
@secure()
param geminiApiKey string

@description('Resend API Key for Email Dispatch')
@secure()
param resendApiKey string

@description('Supabase URL')
param supabaseUrl string

@description('Supabase Service Role Key')
@secure()
param supabaseServiceKey string

// Container Apps Environment
resource containerAppEnv 'Microsoft.App/managedEnvironments@2023-05-01' = {
  name: '${environmentName}-env'
  location: location
  properties: {
    appLogsConfiguration: {
      destination: 'log-analytics'
    }
  }
}

// Backend Container App
resource backendApp 'Microsoft.App/containerApps@2023-05-01' = {
  name: '${environmentName}-backend'
  location: location
  properties: {
    managedEnvironmentId: containerAppEnv.id
    configuration: {
      ingress: {
        external: true
        targetPort: 8000
        transport: 'auto'
      }
      secrets: [
        { name: 'db-url', value: databaseUrl }
        { name: 'doc-key', value: azureDocKey }
        { name: 'gemini-key', value: geminiApiKey }
        { name: 'resend-key', value: resendApiKey }
        { name: 'supabase-key', value: supabaseServiceKey }
      ]
    }
    template: {
      containers: [
        {
          name: 'backend'
          image: 'mcr.microsoft.com/azure-cli:latest' // Replace with your ACR backend image
          env: [
            { name: 'PORT', value: '8000' }
            { name: 'DATABASE_URL', secretRef: 'db-url' }
            { name: 'AZURE_DOC_INTEL_ENDPOINT', value: azureDocEndpoint }
            { name: 'AZURE_DOC_INTEL_KEY', secretRef: 'doc-key' }
            { name: 'GEMINI_API_KEY', secretRef: 'gemini-key' }
            { name: 'RESEND_API_KEY', secretRef: 'resend-key' }
            { name: 'SUPABASE_URL', value: supabaseUrl }
            { name: 'SUPABASE_SERVICE_ROLE_KEY', secretRef: 'supabase-key' }
            { name: 'CORS_ORIGINS', value: 'https://${environmentName}-frontend.${containerAppEnv.properties.defaultDomain}' }
          ]
          resources: {
            cpu: json('1.0')
            memory: '2.0Gi'
          }
          probes: [
            {
              type: 'Liveness'
              httpGet: {
                path: '/health/ready'
                port: 8000
              }
              periodSeconds: 30
            }
          ]
        }
      ]
      scale: {
        minReplicas: 1
        maxReplicas: 5
      }
    }
  }
}

// Frontend Container App
resource frontendApp 'Microsoft.App/containerApps@2023-05-01' = {
  name: '${environmentName}-frontend'
  location: location
  properties: {
    managedEnvironmentId: containerAppEnv.id
    configuration: {
      ingress: {
        external: true
        targetPort: 80
        transport: 'auto'
      }
    }
    template: {
      containers: [
        {
          name: 'frontend'
          image: 'mcr.microsoft.com/azure-cli:latest' // Replace with your ACR frontend image
          resources: {
            cpu: json('0.5')
            memory: '1.0Gi'
          }
        }
      ]
      scale: {
        minReplicas: 1
        maxReplicas: 3
      }
    }
  }
}

output backendFqdn string = backendApp.properties.configuration.ingress.fqdn
output frontendFqdn string = frontendApp.properties.configuration.ingress.fqdn
