# PowerShell script to run the context_summary migration
# Update the MySQL path below to match your installation

$mysqlPath = "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe"

# If mysql is in PATH, you can use just "mysql"
# $mysqlPath = "mysql"

if (Test-Path $mysqlPath) {
    Write-Host "Running migration to add context_summary column..." -ForegroundColor Green
    Get-Content migration_add_context_summary.sql | & $mysqlPath -u root spa_management
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Migration completed successfully!" -ForegroundColor Green
    } else {
        Write-Host "Error running migration. Check MySQL connection." -ForegroundColor Red
    }
} else {
    Write-Host "MySQL not found at: $mysqlPath" -ForegroundColor Yellow
    Write-Host "Please update the mysqlPath variable in this script with your MySQL installation path." -ForegroundColor Yellow
    Write-Host "Or use MySQL Workbench/phpMyAdmin to run migration_add_context_summary.sql manually." -ForegroundColor Yellow
}

