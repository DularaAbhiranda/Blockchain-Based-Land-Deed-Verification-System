@echo off
REM Hyperledger Fabric Network Setup Script for Windows

setlocal enabledelayedexpansion

echo 🚀 Setting up Hyperledger Fabric Network...

REM Check if Docker is running
docker info >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Docker is not running. Please start Docker Desktop and try again.
    pause
    exit /b 1
)

REM Check if Docker Compose is available
docker-compose --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Docker Compose is not available. Please install Docker Compose and try again.
    pause
    exit /b 1
)

REM Function to check if command exists
:check_command
set "command=%~1"
where %command% >nul 2>&1
if errorlevel 1 (
    echo [ERROR] %command% is not installed or not in PATH.
    echo Please install %command% and try again.
    pause
    exit /b 1
)
goto :eof

REM Check prerequisites
call :check_command curl
call :check_command jq

REM Set Fabric version
set FABRIC_VERSION=2.4.7
set CA_VERSION=1.5.5

echo [INFO] Using Fabric version: %FABRIC_VERSION%
echo [INFO] Using CA version: %CA_VERSION%

REM Create necessary directories
if not exist "crypto-config" mkdir crypto-config
if not exist "channel-artifacts" mkdir channel-artifacts
if not exist "wallet" mkdir wallet

REM Download Fabric binaries if not exists
if not exist "bin\configtxgen.exe" (
    echo [INFO] Downloading Fabric binaries...
    powershell -Command "Invoke-WebRequest -Uri 'https://github.com/hyperledger/fabric/releases/download/v%FABRIC_VERSION%/hyperledger-fabric-windows-amd64-%FABRIC_VERSION%.tar.gz' -OutFile 'fabric.tar.gz'"
    tar -xzf fabric.tar.gz
    del fabric.tar.gz
)

REM Generate crypto materials
echo [INFO] Generating crypto materials...
bin\cryptogen.exe generate --config=crypto-config.yaml

REM Generate genesis block
echo [INFO] Generating genesis block...
bin\configtxgen.exe -profile TwoOrgsOrdererGenesis -channelID system-channel -outputBlock channel-artifacts\genesis.block -configPath .

REM Generate channel configuration
echo [INFO] Generating channel configuration...
bin\configtxgen.exe -profile TwoOrgsChannel -outputCreateChannelTx channel-artifacts\channel.tx -channelID mychannel -configPath .

REM Generate anchor peer updates
echo [INFO] Generating anchor peer updates...
bin\configtxgen.exe -profile TwoOrgsChannel -outputAnchorPeersUpdate channel-artifacts\Org1MSPanchors.tx -channelID mychannel -asOrg Org1MSP -configPath .

REM Start the network
echo [INFO] Starting Fabric network...
docker-compose up -d

REM Wait for services to be ready
echo [INFO] Waiting for services to be ready...
timeout /t 30 /nobreak >nul

REM Create channel
echo [INFO] Creating channel...
docker exec land-registry-fabric-peer peer channel create -o land-registry-fabric-orderer:7050 -c mychannel -f /etc/hyperledger/channel-artifacts/channel.tx

REM Join channel
echo [INFO] Joining channel...
docker exec land-registry-fabric-peer peer channel join -b mychannel.block

REM Update anchor peers
echo [INFO] Updating anchor peers...
docker exec land-registry-fabric-peer peer channel update -o land-registry-fabric-orderer:7050 -c mychannel -f /etc/hyperledger/channel-artifacts/Org1MSPanchors.tx

REM Package chaincode
echo [INFO] Packaging chaincode...
docker exec land-registry-fabric-peer peer lifecycle chaincode package land-registry.tar.gz --path /opt/gopath/src/github.com/hyperledger/fabric/chaincode/land-registry --lang golang --label land-registry_1.0

REM Install chaincode
echo [INFO] Installing chaincode...
docker exec land-registry-fabric-peer peer lifecycle chaincode install land-registry.tar.gz

REM Get package ID
for /f "tokens=*" %%i in ('docker exec land-registry-fabric-peer peer lifecycle chaincode queryinstalled') do (
    set "line=%%i"
    if "!line:~0,1!"=="Package ID:" (
        set "package_id=!line:Package ID:=!"
        set "package_id=!package_id: =!"
        goto :found_package
    )
)
:found_package

REM Approve chaincode
echo [INFO] Approving chaincode...
docker exec land-registry-fabric-peer peer lifecycle chaincode approveformyorg -o land-registry-fabric-orderer:7050 --channelID mychannel --name land-registry --version 1.0 --package-id %package_id% --sequence 1

REM Commit chaincode
echo [INFO] Committing chaincode...
docker exec land-registry-fabric-peer peer lifecycle chaincode commit -o land-registry-fabric-orderer:7050 --channelID mychannel --name land-registry --version 1.0 --sequence 1

echo.
echo [SUCCESS] 🎉 Hyperledger Fabric network is ready!
echo.
echo 📋 Network Information:
echo    Orderer: localhost:7050
echo    Peer: localhost:7051
echo    CA: localhost:7054
echo    Channel: mychannel
echo    Chaincode: land-registry
echo.
echo 🔧 Useful Commands:
echo    View logs: docker-compose logs -f
echo    Stop network: docker-compose down
echo    Restart: docker-compose restart
echo.
pause
