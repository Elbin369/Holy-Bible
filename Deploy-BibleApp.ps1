# Deploy-BibleApp.ps1
# Automated script to build and install the Bible app on an Android device using Capacitor.
# Run this script from PowerShell with Administrator rights.

function Write-Log { param([string]$msg) Write-Host "[Deploy] $msg" }

Write-Log "Starting deployment script..."

# -----------------------------------------------------------------------------
# 1. Ensure Node.js is installed (download and silent install if missing)
# -----------------------------------------------------------------------------
$nodeExe = Get-Command node -ErrorAction SilentlyContinue
if (-not $nodeExe) {
    Write-Log "Node.js not found. Downloading installer..."
    $nodeUrl = "https://nodejs.org/dist/v20.12.2/node-v20.12.2-x64.msi"
    $installer = "$env:TEMP\node-installer.msi"
    Invoke-WebRequest -Uri $nodeUrl -OutFile $installer -UseBasicParsing
    Write-Log "Installing Node.js..."
    # Silent install, no restart
    Start-Process msiexec.exe -ArgumentList "/i `"$installer`" /quiet /norestart" -Wait
    Remove-Item $installer -Force
    # Node typically installs to "C:\Program Files\nodejs"
    $nodePath = "${env:ProgramFiles}\nodejs"
    if (Test-Path $nodePath) {
        $env:PATH = "$nodePath;$env:PATH"
        Write-Log "Added Node path to current session: $nodePath"
    } else {
        Write-Log "Node installation path not found. You may need to restart PowerShell."
    }
} else {
    Write-Log "Node.js is already installed: $(node -v)"
}

# Refresh the environment for the current session (machine-wide PATH)
# After installing Node, reload PATH from the system and prepend the Node installation folder if needed
# Refresh the environment for the current session (machine-wide PATH)
# After installing Node, reload PATH from the system and prepend the Node folder if it exists
$env:PATH = [System.Environment]::GetEnvironmentVariable('PATH','Machine')
$nodePath = "${env:ProgramFiles}\nodejs"
if (Test-Path $nodePath) { $env:PATH = "$nodePath;$env:PATH" }
$nodePath = "${env:ProgramFiles}\nodejs"
if (Test-Path $nodePath) { $env:PATH = "$nodePath;$env:PATH" }

# -----------------------------------------------------------------------------
# 2. Verify npm is available
# -----------------------------------------------------------------------------
if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
    Write-Log "npm not found after Node install. Exiting."
    exit 1
} else {
    Write-Log "npm is available: $(npm -v)"
}

# -----------------------------------------------------------------------------
# 3. Install Capacitor CLI globally if missing
# -----------------------------------------------------------------------------
if (-not (npm list -g @capacitor/cli --depth=0 2>$null)) {
    Write-Log "Installing Capacitor CLI globally..."
    npm install -g @capacitor/cli
} else {
    Write-Log "Capacitor CLI already installed."
}

# -----------------------------------------------------------------------------
# 4. Initialise Capacitor (skip if already initialised)
# -----------------------------------------------------------------------------
if (-not (Test-Path "capacitor.config.json")) {
    Write-Log "Initialising Capacitor..."
    npx cap init "BibleApp" com.example.bibleapp
} else {
    Write-Log "Capacitor already initialised."
}

# -----------------------------------------------------------------------------
# 5. Add Android platform (skip if already present)
# -----------------------------------------------------------------------------
if (-not (Test-Path "android")) {
    Write-Log "Adding Android platform..."
    npx cap add android
} else {
    Write-Log "Android platform already added."
}

# -----------------------------------------------------------------------------
# 6. Copy web assets into the www folder (adjust if you have a build step)
# -----------------------------------------------------------------------------
Write-Log "Copying web assets..."
if (-not (Test-Path "www")) { New-Item -ItemType Directory -Path "www" | Out-Null }
Copy-Item -Path "index.html" -Destination "www" -Force
if (Test-Path "css") { Copy-Item -Path "css" -Destination "www" -Recurse -Force }
if (Test-Path "js")  { Copy-Item -Path "js"  -Destination "www" -Recurse -Force }

# -----------------------------------------------------------------------------
# 7. Sync Capacitor assets to Android project
# -----------------------------------------------------------------------------
Write-Log "Synchronising Capacitor assets..."
npx cap sync android

# -----------------------------------------------------------------------------
# 8. Open Android Studio (adjust path if you installed it elsewhere)
# -----------------------------------------------------------------------------
$studioPath = "${env:ProgramFiles}\Android\Android Studio\bin\studio64.exe"
if (Test-Path $studioPath) {
    Write-Log "Launching Android Studio..."
    Start-Process -FilePath $studioPath -ArgumentList "android"
} else {
    Write-Log "Android Studio not found at $studioPath. Please open the 'android' folder manually in Android Studio."
}

Write-Log "Deployment script finished. In Android Studio, select your connected device and click Run (▶) to install the app."
