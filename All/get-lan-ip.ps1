function Get-LanIpv4Addresses {
  $ips = @()
  Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue |
    Where-Object {
      $_.IPAddress -notmatch '^(127\.|169\.254\.)' -and
      $_.PrefixOrigin -ne 'WellKnown'
    } |
    ForEach-Object {
      $ip = $_.IPAddress
      if ($ip -match '^(192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[0-1])\.)') {
        $ips += $ip
      }
    }

  if ($ips.Count -eq 0) {
    Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue |
      Where-Object {
        $_.IPAddress -notmatch '^(127\.|169\.254\.|198\.18\.)'
      } |
      ForEach-Object { $ips += $_.IPAddress }
  }

  return @($ips | Select-Object -Unique)
}

$addresses = @(Get-LanIpv4Addresses)
if ($addresses.Count -gt 0) {
  Write-Output $addresses[0]
}
