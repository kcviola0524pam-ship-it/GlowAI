# PowerShell script to run ai_chat_schema.sql
# Update the MySQL path below to match your installation

# Common MySQL installation paths:
# "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe"
# "C:\xampp\mysql\bin\mysql.exe"
# "C:\wamp64\bin\mysql\mysql8.0.xx\bin\mysql.exe"

$mysqlPath = "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe"

# If mysql is in PATH, you can use just "mysql"
# $mysqlPath = "mysql"

if (Test-Path $mysqlPath) {
    Write-Host "Running ai_chat_schema.sql..." -ForegroundColor Green
    Get-Content ai_chat_schema.sql | & $mysqlPath -u root spa_management
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Schema updated successfully!" -ForegroundColor Green
    } else {
        Write-Host "Error running schema. Check MySQL connection." -ForegroundColor Red
    }
} else {
    Write-Host "MySQL not found at: $mysqlPath" -ForegroundColor Yellow
    Write-Host "Please update the mysqlPath variable in this script with your MySQL installation path." -ForegroundColor Yellow
    Write-Host "Or use MySQL Workbench/phpMyAdmin to run the SQL file manually." -ForegroundColor Yellow
}

