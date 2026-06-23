$port = new-Object System.IO.Ports.SerialPort COM3,115200,'None',8,'one'
$port.Open()
for ($i=0; $i -lt 15; $i++) {
    $line = $port.ReadLine()
    Write-Host $line
}
$port.Close()
