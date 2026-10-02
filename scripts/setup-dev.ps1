# Instala y arranca el entorno de desarrollo con Docker Compose.
# Conserva el .env existente y los volumenes de PostgreSQL entre ejecuciones.
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function New-RandomHex {
    $bytes = New-Object byte[] 32
    $generator = [Security.Cryptography.RandomNumberGenerator]::Create()
    try {
        $generator.GetBytes($bytes)
    }
    finally {
        $generator.Dispose()
    }
    return [BitConverter]::ToString($bytes).Replace('-', '').ToLowerInvariant()
}

function Invoke-Compose {
    param([Parameter(Mandatory = $true)][string[]]$Arguments)

    & docker compose -f docker-compose.dev.yml @Arguments
    if ($LASTEXITCODE -ne 0) {
        throw "Fallo docker compose en el paso: $($Arguments[0])."
    }
}

$root = Split-Path -Parent $PSScriptRoot
$envPath = Join-Path $root '.env'
$examplePath = Join-Path $root '.env.example'

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    throw 'Instala e inicia Docker Desktop antes de ejecutar este script.'
}

Push-Location $root
try {
    if (-not (Test-Path -LiteralPath $envPath)) {
        $databasePassword = New-RandomHex
        $jwtSecret = New-RandomHex
        $mailOutboxKey = New-RandomHex
        $template = [IO.File]::ReadAllText($examplePath)
        $configuration = $template.Replace('REPLACE_WITH_THE_DATABASE_PASSWORD', $databasePassword).
            Replace('REPLACE_WITH_A_RANDOM_SECRET_OF_AT_LEAST_32_CHARACTERS', $jwtSecret).
            Replace('REPLACE_WITH_64_HEXADECIMAL_CHARACTERS', $mailOutboxKey)
        [IO.File]::WriteAllText($envPath, $configuration, [Text.UTF8Encoding]::new($false))
        Write-Host 'Se creo .env con credenciales locales aleatorias.'
    }
    else {
        Write-Host 'Se conserva el .env existente.'
    }

    $configuration = [IO.File]::ReadAllText($envPath)
    $values = @{}
    foreach ($key in @('DATABASE_URL', 'POSTGRES_DB', 'POSTGRES_USER', 'POSTGRES_PASSWORD', 'JWT_SECRET', 'MAIL_OUTBOX_KEY')) {
        if ($configuration -notmatch "(?m)^$key=(.+)\r?$") {
            throw "Falta $key en .env."
        }
        $value = $Matches[1].Trim().Trim('"').Trim("'")
        if ($value.StartsWith('REPLACE_')) {
            throw "Debes configurar $key en .env."
        }
        if ($key -eq 'JWT_SECRET' -and $value.Length -lt 32) {
            throw 'JWT_SECRET debe tener al menos 32 caracteres.'
        }
        if ($key -eq 'MAIL_OUTBOX_KEY' -and $value -notmatch '^[0-9a-fA-F]{64}$') {
            throw 'MAIL_OUTBOX_KEY debe tener 64 caracteres hexadecimales.'
        }
        $values[$key] = $value
    }

    try {
        $databaseUrl = [Uri]::new($values['DATABASE_URL'])
    }
    catch {
        throw 'DATABASE_URL no es una URL valida.'
    }
    if ($databaseUrl.Host -ne 'postgres' -or $databaseUrl.Port -ne 5432) {
        throw 'DATABASE_URL debe apuntar al servicio local postgres:5432 de Docker Compose.'
    }
    if ($databaseUrl.UserInfo -notmatch '^([^:]+):(.+)$') {
        throw 'DATABASE_URL debe incluir el usuario y la contrasena de PostgreSQL.'
    }
    $databaseUser = [Uri]::UnescapeDataString($Matches[1])
    $databasePassword = [Uri]::UnescapeDataString($Matches[2])
    $databaseName = [Uri]::UnescapeDataString($databaseUrl.AbsolutePath.TrimStart('/'))
    if ($databaseUser -ne $values['POSTGRES_USER'] -or
        $databasePassword -cne $values['POSTGRES_PASSWORD'] -or
        $databaseName -ne $values['POSTGRES_DB']) {
        throw 'DATABASE_URL y las variables POSTGRES_* de .env deben coincidir.'
    }

    Invoke-Compose @('build')
    Invoke-Compose @('up', '-d', '--wait', 'postgres')
    Invoke-Compose @('run', '--rm', '--no-deps', 'backend', 'npm', 'run', 'prisma:generate')
    Invoke-Compose @('run', '--rm', '--no-deps', 'backend', 'npm', 'run', 'prisma:deploy')
    Invoke-Compose @('run', '--rm', '--no-deps', 'backend', 'npm', 'run', 'prisma:seed')
    Invoke-Compose @('up', '-d')
    Invoke-Compose @('ps')

    Write-Host 'Aplicacion: http://localhost:5173'
    Write-Host 'API: http://localhost:3000/api/health'
    Write-Host 'Correo de desarrollo: http://localhost:8025'
}
finally {
    Pop-Location
}
