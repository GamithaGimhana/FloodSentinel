# -------------------------------------------------------------
# FloodSentinel GCP Cloud Run One-Click Deployment Script
# -------------------------------------------------------------
param (
    [string]$ProjectId = "flood-sentinel-sl",
    [string]$Region = "asia-south1",
    [string]$ServiceName = "floodsentinel"
)

Write-Host "🌊 [FloodSentinel] Deploying to Google Cloud Run..." -ForegroundColor Cyan

# Ensure active project
gcloud config set project $ProjectId --quiet

# Deploy container image via Cloud Run source deploy
gcloud run deploy $ServiceName `
    --source . `
    --region $Region `
    --allow-unauthenticated `
    --memory 512Mi `
    --cpu 1 `
    --min-instances 0 `
    --max-instances 2 `
    --port 8080 `
    --quiet

if ($LASTEXITCODE -eq 0) {
    $ServiceUrl = gcloud run services describe $ServiceName --region $Region --format 'value(status.url)'
    Write-Host "`n🚀 [FloodSentinel] Live Deployment Ready!" -ForegroundColor Green
    Write-Host "🌐 URL: $ServiceUrl" -ForegroundColor Green
    Write-Host "📖 API Docs: $ServiceUrl/docs" -ForegroundColor Yellow
} else {
    Write-Host "`n❌ Deployment failed. Check the logs above." -ForegroundColor Red
}
