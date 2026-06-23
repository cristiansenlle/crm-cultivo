$port = new-Object System.IO.Ports.SerialPort COM3,115200,None,8,one; $port.open(); Start-Sleep -Milliseconds 500; $port.ReadExisting(); $port.Close()
