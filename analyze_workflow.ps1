$jsonPath = "C:\Users\crist\Downloads\CRM Cannabis (V16 OpenRouter Paid).json"
$workflow = Get-Content $jsonPath | ConvertFrom-Json

Write-Host "=== NODES ==="
foreach ($node in $workflow.nodes) {
    Write-Host "- $($node.name) ($($node.type))"
    if ($node.name -match "Memory|Groq|Audio|Agent") {
        Write-Host "  Parameters: $($node.parameters | ConvertTo-Json -Depth 2 -Compress)"
    }
}

Write-Host "`n=== CONNECTIONS ==="
foreach ($connSource in $workflow.connections.psobject.properties.name) {
    $targets = $workflow.connections.$connSource.main[0]
    foreach ($target in $targets) {
        Write-Host "$connSource -> $($target.node)"
    }
}
