param(
  [int]$Port = 5500
)

$ruleName = "Websites All Gateway (TCP $Port)"
$existing = Get-NetFirewallRule -DisplayName $ruleName -ErrorAction SilentlyContinue

if ($existing) {
  Write-Host "Firewall: rule already exists for TCP $Port"
  exit 0
}

try {
  New-NetFirewallRule `
    -DisplayName $ruleName `
    -Direction Inbound `
    -Action Allow `
    -Protocol TCP `
    -LocalPort $Port `
    -Profile Private, Public `
    -ErrorAction Stop | Out-Null
  Write-Host "Firewall: allowed inbound TCP $Port (Private + Public networks)"
  exit 0
} catch {
  Write-Warning "Could not add firewall rule automatically."
  Write-Warning "Right-click All\open-firewall.bat and choose Run as administrator (one time only)."
  exit 0
}
