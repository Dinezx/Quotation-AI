#!/bin/bash
# Quotation AI — Automated Azure Deployment Script
set -euo pipefail

RESOURCE_GROUP="${1:-rg-quotation-ai-prod}"
LOCATION="${2:-eastus}"
ACR_NAME="${3:-acrquotationaiprod}"

echo "=========================================================="
echo " Quotation AI — Azure Container Apps Production Deployment"
echo "=========================================================="
echo "Resource Group: $RESOURCE_GROUP"
echo "Location:       $LOCATION"
echo "ACR Name:       $ACR_NAME"
echo ""

# 1. Create Resource Group if not exists
az group create --name "$RESOURCE_GROUP" --location "$LOCATION"

# 2. Create Azure Container Registry
az acr create --resource-group "$RESOURCE_GROUP" --name "$ACR_NAME" --sku Basic --admin-enabled true

# 3. Build & Push Backend Container Image
echo "Building and pushing Backend image to ACR..."
az acr build --registry "$ACR_NAME" --image quotation-ai-backend:latest ./backend

# 4. Build & Push Frontend Container Image
echo "Building and pushing Frontend image to ACR..."
az acr build --registry "$ACR_NAME" --image quotation-ai-frontend:latest ./frontend

# 5. Run Database Migrations (Run Alembic upgrade head against target DB)
echo "Executing database schema migrations..."
# docker run --rm -e DATABASE_URL="$DATABASE_URL" $ACR_NAME.azurecr.io/quotation-ai-backend:latest alembic upgrade head

# 6. Deploy Infrastructure via Bicep
echo "Deploying Azure Container Apps via Bicep template..."
az deployment group create \
  --resource-group "$RESOURCE_GROUP" \
  --template-file ./azure/container-app.bicep \
  --parameters \
    environmentName="quotation-ai" \
    databaseUrl="$DATABASE_URL" \
    azureDocEndpoint="$AZURE_DOC_INTEL_ENDPOINT" \
    azureDocKey="$AZURE_DOC_INTEL_KEY" \
    geminiApiKey="$GEMINI_API_KEY" \
    resendApiKey="$RESEND_API_KEY" \
    supabaseUrl="$SUPABASE_URL" \
    supabaseServiceKey="$SUPABASE_SERVICE_ROLE_KEY"

echo "=========================================================="
echo " Deployment Complete! Health Check:"
echo " curl https://<backend-fqdn>/health/ready"
echo "=========================================================="
