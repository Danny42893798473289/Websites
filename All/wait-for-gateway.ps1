param(
  [string]$Url = "http://127.0.0.1:5500/health",
  [int]$TimeoutSec = 45
)

$deadline = (Get-Date).AddSeconds($TimeoutSec)
while ((Get-Date) -lt $deadline) {
  try {
    $response = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 2
    if ($response.StatusCode -eq 200) {
      exit 0
    }
  } catch {
    Start-Sleep -Milliseconds 500
  }
}

Write-Error "Gateway did not become ready in ${TimeoutSec}s"
exit 1
