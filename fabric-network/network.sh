#!/bin/bash

# Hyperledger Fabric Network Setup Script
# This script sets up a basic Fabric network for the Land Registry system

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if required tools are installed
check_prerequisites() {
    print_status "Checking prerequisites..."
    
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed. Please install Docker first."
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        print_error "Docker Compose is not installed. Please install Docker Compose first."
        exit 1
    fi
    
    if ! command -v curl &> /dev/null; then
        print_error "curl is not installed. Please install curl first."
        exit 1
    fi
    
    print_status "Prerequisites check passed."
}

# Download Fabric binaries and samples
download_fabric() {
    print_status "Downloading Fabric binaries and samples..."
    
    if [ ! -d "bin" ]; then
        curl -sSL https://bit.ly/2ysbOFE | bash -s -- 2.4.0 1.5.0
        print_status "Fabric binaries downloaded successfully."
    else
        print_status "Fabric binaries already exist."
    fi
}

# Generate crypto materials
generate_crypto() {
    print_status "Generating crypto materials..."
    
    if [ ! -d "crypto-config" ]; then
        ./bin/cryptogen generate --config=./crypto-config.yaml
        print_status "Crypto materials generated successfully."
    else
        print_status "Crypto materials already exist."
    fi
}

# Generate genesis block
generate_genesis() {
    print_status "Generating genesis block..."
    
    if [ ! -d "channel-artifacts" ]; then
        mkdir -p channel-artifacts
    fi
    
    if [ ! -f "channel-artifacts/genesis.block" ]; then
        ./bin/configtxgen -profile TwoOrgsOrdererGenesis -channelID system-channel -outputBlock ./channel-artifacts/genesis.block
        print_status "Genesis block generated successfully."
    else
        print_status "Genesis block already exists."
    fi
}

# Generate channel configuration
generate_channel() {
    print_status "Generating channel configuration..."
    
    if [ ! -f "channel-artifacts/mychannel.tx" ]; then
        ./bin/configtxgen -profile TwoOrgsChannel -outputCreateChannelTx ./channel-artifacts/mychannel.tx -channelID mychannel
        print_status "Channel configuration generated successfully."
    else
        print_status "Channel configuration already exists."
    fi
}

# Generate anchor peer updates
generate_anchors() {
    print_status "Generating anchor peer updates..."
    
    if [ ! -f "channel-artifacts/Org1MSPanchors.tx" ]; then
        ./bin/configtxgen -profile TwoOrgsChannel -outputAnchorPeersUpdate ./channel-artifacts/Org1MSPanchors.tx -channelID mychannel -asOrg Org1MSP
        print_status "Org1 anchor peer update generated successfully."
    else
        print_status "Org1 anchor peer update already exists."
    fi
    
    if [ ! -f "channel-artifacts/Org2MSPanchors.tx" ]; then
        ./bin/configtxgen -profile TwoOrgsChannel -outputAnchorPeersUpdate ./channel-artifacts/Org2MSPanchors.tx -channelID mychannel -asOrg Org2MSP
        print_status "Org2 anchor peer update generated successfully."
    else
        print_status "Org2 anchor peer update already exists."
    fi
}

# Start the network
start_network() {
    print_status "Starting Fabric network..."
    
    docker-compose up -d
    
    # Wait for network to be ready
    print_status "Waiting for network to be ready..."
    sleep 30
    
    print_status "Fabric network started successfully."
}

# Create and join channel
setup_channel() {
    print_status "Setting up channel..."
    
    # Wait for orderer to be ready
    sleep 10
    
    # Create channel
    docker exec cli peer channel create -o orderer.example.com:7050 -c mychannel -f ./channel-artifacts/mychannel.tx
    
    # Join channel for Org1
    docker exec cli peer channel join -b mychannel.block
    
    # Update anchor peers for Org1
    docker exec cli peer channel update -o orderer.example.com:7050 -c mychannel -f ./channel-artifacts/Org1MSPanchors.tx
    
    # Join channel for Org2
    docker exec -e CORE_PEER_LOCALMSPID=Org2MSP -e CORE_PEER_MSPCONFIGPATH=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/org2.example.com/users/Admin@org2.example.com/msp -e CORE_PEER_ADDRESS=peer0.org2.example.com:8051 cli peer channel join -b mychannel.block
    
    # Update anchor peers for Org2
    docker exec -e CORE_PEER_LOCALMSPID=Org2MSP -e CORE_PEER_MSPCONFIGPATH=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/org2.example.com/users/Admin@org2.example.com/msp -e CORE_PEER_ADDRESS=peer0.org2.example.com:8051 cli peer channel update -o orderer.example.com:7050 -c mychannel -f ./channel-artifacts/Org2MSPanchors.tx
    
    print_status "Channel setup completed successfully."
}

# Package and install chaincode
setup_chaincode() {
    print_status "Setting up chaincode..."
    
    # Package chaincode
    docker exec cli peer lifecycle chaincode package land-registry.tar.gz --path /opt/gopath/src/github.com/hyperledger/fabric/chaincode/land-registry --lang golang --label land-registry_1.0
    
    # Install chaincode on Org1
    docker exec cli peer lifecycle chaincode install land-registry.tar.gz
    
    # Install chaincode on Org2
    docker exec -e CORE_PEER_LOCALMSPID=Org2MSP -e CORE_PEER_MSPCONFIGPATH=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/org2.example.com/users/Admin@org2.example.com/msp -e CORE_PEER_ADDRESS=peer0.org2.example.com:8051 cli peer lifecycle chaincode install land-registry.tar.gz
    
    # Approve chaincode for Org1
    docker exec cli peer lifecycle chaincode approveformyorg -o orderer.example.com:7050 --channelID mychannel --name land-registry --version 1.0 --package-id land-registry_1.0:$(docker exec cli peer lifecycle chaincode queryinstalled | grep land-registry_1.0 | awk '{print $3}' | sed 's/,//') --sequence 1
    
    # Approve chaincode for Org2
    docker exec -e CORE_PEER_LOCALMSPID=Org2MSP -e CORE_PEER_MSPCONFIGPATH=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/org2.example.com/users/Admin@org2.example.com/msp -e CORE_PEER_ADDRESS=peer0.org2.example.com:8051 cli peer lifecycle chaincode approveformyorg -o orderer.example.com:7050 --channelID mychannel --name land-registry --version 1.0 --package-id land-registry_1.0:$(docker exec -e CORE_PEER_LOCALMSPID=Org2MSP -e CORE_PEER_MSPCONFIGPATH=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/org2.example.com/users/Admin@org2.example.com/msp -e CORE_PEER_ADDRESS=peer0.org2.example.com:8051 cli peer lifecycle chaincode queryinstalled | grep land-registry_1.0 | awk '{print $3}' | sed 's/,//') --sequence 1
    
    # Commit chaincode
    docker exec cli peer lifecycle chaincode commit -o orderer.example.com:7050 --channelID mychannel --name land-registry --version 1.0 --sequence 1
    
    print_status "Chaincode setup completed successfully."
}

# Stop the network
stop_network() {
    print_status "Stopping Fabric network..."
    docker-compose down
    print_status "Fabric network stopped successfully."
}

# Clean up everything
cleanup() {
    print_status "Cleaning up Fabric network..."
    docker-compose down -v
    rm -rf crypto-config channel-artifacts
    print_status "Cleanup completed successfully."
}

# Main function
main() {
    case "$1" in
        "up")
            check_prerequisites
            download_fabric
            generate_crypto
            generate_genesis
            generate_channel
            generate_anchors
            start_network
            setup_channel
            setup_chaincode
            print_status "Fabric network is ready!"
            ;;
        "down")
            stop_network
            ;;
        "clean")
            cleanup
            ;;
        "restart")
            stop_network
            start_network
            setup_channel
            setup_chaincode
            ;;
        *)
            echo "Usage: $0 {up|down|clean|restart}"
            echo "  up      - Start the Fabric network"
            echo "  down    - Stop the Fabric network"
            echo "  clean   - Clean up everything"
            echo "  restart - Restart the Fabric network"
            exit 1
            ;;
    esac
}

# Run main function
main "$@"
