$port = new-Object System.IO.Ports.SerialPort COM3,115200,'None',8,'one'
$port.DtrEnable = $true
$port.RtsEnable = $true
$port.Open()
Start-Sleep -Milliseconds 100
$port.DtrEnable = $false
$port.RtsEnable = $false
Start-Sleep -Milliseconds 500

$endTime = (Get-Date).AddSeconds(15)
$output = ""
while ((Get-Date) -lt $endTime) {
    if ($port.BytesToRead -gt 0) {
        $output += $port.ReadExisting()
    }
    Start-Sleep -Milliseconds 100
}
$port.Close()
Write-Host $output
