package main

import (
	"encoding/json"
	"fmt"
	"strconv"
	"time"

	"github.com/hyperledger/fabric-contract-api-go/contractapi"
)

// LandRegistry represents the smart contract for land registry
type LandRegistry struct {
	contractapi.Contract
}

// Deed represents a land deed
type Deed struct {
	ID              string    `json:"id"`
	DeedNumber      string    `json:"deedNumber"`
	OwnerID         string    `json:"ownerId"`
	PropertyAddress string    `json:"propertyAddress"`
	PropertyType    string    `json:"propertyType"`
	LandArea        float64   `json:"landArea"`
	LandAreaUnit    string    `json:"landAreaUnit"`
	IPFSHash        string    `json:"ipfsHash"`
	Status          string    `json:"status"`
	VerificationStatus string `json:"verificationStatus"`
	CreatedAt       time.Time `json:"createdAt"`
	UpdatedAt       time.Time `json:"updatedAt"`
	VerifiedAt      *time.Time `json:"verifiedAt,omitempty"`
	VerifiedBy      string    `json:"verifiedBy,omitempty"`
}

// Transfer represents a deed transfer
type Transfer struct {
	ID            string    `json:"id"`
	DeedID        string    `json:"deedId"`
	FromOwnerID   string    `json:"fromOwnerId"`
	ToOwnerID     string    `json:"toOwnerId"`
	TransferReason string   `json:"transferReason"`
	TransferDate  time.Time `json:"transferDate"`
	CreatedAt     time.Time `json:"createdAt"`
}

// CreateDeed creates a new land deed
func (c *LandRegistry) CreateDeed(ctx contractapi.TransactionContextInterface, deedData string) error {
	var deed Deed
	err := json.Unmarshal([]byte(deedData), &deed)
	if err != nil {
		return fmt.Errorf("failed to unmarshal deed data: %v", err)
	}

	// Check if deed already exists
	exists, err := c.DeedExists(ctx, deed.ID)
	if err != nil {
		return err
	}
	if exists {
		return fmt.Errorf("deed with ID %s already exists", deed.ID)
	}

	// Set timestamps
	now := time.Now()
	deed.CreatedAt = now
	deed.UpdatedAt = now
	deed.Status = "pending"
	deed.VerificationStatus = "pending"

	// Store deed
	deedJSON, err := json.Marshal(deed)
	if err != nil {
		return err
	}

	err = ctx.GetStub().PutState(deed.ID, deedJSON)
	if err != nil {
		return fmt.Errorf("failed to put deed: %v", err)
	}

	// Create composite key for deed number index
	deedNumberKey, err := ctx.GetStub().CreateCompositeKey("deedNumber", []string{deed.DeedNumber})
	if err != nil {
		return fmt.Errorf("failed to create composite key: %v", err)
	}

	err = ctx.GetStub().PutState(deedNumberKey, []byte(deed.ID))
	if err != nil {
		return fmt.Errorf("failed to put deed number index: %v", err)
	}

	return nil
}

// GetDeed retrieves a deed by ID
func (c *LandRegistry) GetDeed(ctx contractapi.TransactionContextInterface, deedID string) (*Deed, error) {
	deedJSON, err := ctx.GetStub().GetState(deedID)
	if err != nil {
		return nil, fmt.Errorf("failed to read from world state: %v", err)
	}
	if deedJSON == nil {
		return nil, fmt.Errorf("deed %s does not exist", deedID)
	}

	var deed Deed
	err = json.Unmarshal(deedJSON, &deed)
	if err != nil {
		return nil, err
	}

	return &deed, nil
}

// GetDeedByNumber retrieves a deed by deed number
func (c *LandRegistry) GetDeedByNumber(ctx contractapi.TransactionContextInterface, deedNumber string) (*Deed, error) {
	deedNumberKey, err := ctx.GetStub().CreateCompositeKey("deedNumber", []string{deedNumber})
	if err != nil {
		return nil, fmt.Errorf("failed to create composite key: %v", err)
	}

	deedIDBytes, err := ctx.GetStub().GetState(deedNumberKey)
	if err != nil {
		return nil, fmt.Errorf("failed to read deed number index: %v", err)
	}
	if deedIDBytes == nil {
		return nil, fmt.Errorf("deed with number %s does not exist", deedNumber)
	}

	return c.GetDeed(ctx, string(deedIDBytes))
}

// UpdateDeed updates an existing deed
func (c *LandRegistry) UpdateDeed(ctx contractapi.TransactionContextInterface, deedID string, updates string) error {
	deed, err := c.GetDeed(ctx, deedID)
	if err != nil {
		return err
	}

	var updateData map[string]interface{}
	err = json.Unmarshal([]byte(updates), &updateData)
	if err != nil {
		return fmt.Errorf("failed to unmarshal update data: %v", err)
	}

	// Update fields
	if status, exists := updateData["status"]; exists {
		deed.Status = status.(string)
	}
	if verificationStatus, exists := updateData["verificationStatus"]; exists {
		deed.VerificationStatus = verificationStatus.(string)
	}
	if verifiedBy, exists := updateData["verifiedBy"]; exists {
		deed.VerifiedBy = verifiedBy.(string)
		now := time.Now()
		deed.VerifiedAt = &now
	}

	deed.UpdatedAt = time.Now()

	// Store updated deed
	deedJSON, err := json.Marshal(deed)
	if err != nil {
		return err
	}

	return ctx.GetStub().PutState(deedID, deedJSON)
}

// TransferDeed transfers ownership of a deed
func (c *LandRegistry) TransferDeed(ctx contractapi.TransactionContextInterface, transferData string) error {
	var transfer Transfer
	err := json.Unmarshal([]byte(transferData), &transfer)
	if err != nil {
		return fmt.Errorf("failed to unmarshal transfer data: %v", err)
	}

	// Get current deed
	deed, err := c.GetDeed(ctx, transfer.DeedID)
	if err != nil {
		return err
	}

	// Verify current owner
	if deed.OwnerID != transfer.FromOwnerID {
		return fmt.Errorf("current owner does not match transfer from owner")
	}

	// Update deed ownership
	deed.OwnerID = transfer.ToOwnerID
	deed.Status = "transferred"
	deed.UpdatedAt = time.Now()

	// Store updated deed
	deedJSON, err := json.Marshal(deed)
	if err != nil {
		return err
	}

	err = ctx.GetStub().PutState(transfer.DeedID, deedJSON)
	if err != nil {
		return fmt.Errorf("failed to update deed: %v", err)
	}

	// Store transfer record
	transfer.ID = fmt.Sprintf("transfer_%s_%d", transfer.DeedID, time.Now().Unix())
	transfer.CreatedAt = time.Now()

	transferJSON, err := json.Marshal(transfer)
	if err != nil {
		return err
	}

	err = ctx.GetStub().PutState(transfer.ID, transferJSON)
	if err != nil {
		return fmt.Errorf("failed to store transfer record: %v", err)
	}

	return nil
}

// GetDeedHistory returns the history of a deed
func (c *LandRegistry) GetDeedHistory(ctx contractapi.TransactionContextInterface, deedID string) ([]*Deed, error) {
	historyIterator, err := ctx.GetStub().GetHistoryForKey(deedID)
	if err != nil {
		return nil, fmt.Errorf("failed to get history: %v", err)
	}
	defer historyIterator.Close()

	var deeds []*Deed
	for historyIterator.HasNext() {
		modification, err := historyIterator.Next()
		if err != nil {
			return nil, fmt.Errorf("failed to iterate history: %v", err)
		}

		var deed Deed
		err = json.Unmarshal(modification.Value, &deed)
		if err != nil {
			return nil, fmt.Errorf("failed to unmarshal deed: %v", err)
		}

		deeds = append(deeds, &deed)
	}

	return deeds, nil
}

// QueryDeedsByOwner returns all deeds owned by a specific owner
func (c *LandRegistry) QueryDeedsByOwner(ctx contractapi.TransactionContextInterface, ownerID string) ([]*Deed, error) {
	queryString := fmt.Sprintf(`{"selector":{"ownerId":"%s"}}`, ownerID)
	return c.queryDeeds(ctx, queryString)
}

// QueryDeedsByStatus returns all deeds with a specific status
func (c *LandRegistry) QueryDeedsByStatus(ctx contractapi.TransactionContextInterface, status string) ([]*Deed, error) {
	queryString := fmt.Sprintf(`{"selector":{"status":"%s"}}`, status)
	return c.queryDeeds(ctx, queryString)
}

// QueryAllDeeds returns all deeds
func (c *LandRegistry) QueryAllDeeds(ctx contractapi.TransactionContextInterface) ([]*Deed, error) {
	queryString := `{"selector":{}}`
	return c.queryDeeds(ctx, queryString)
}

// queryDeeds is a helper function to query deeds
func (c *LandRegistry) queryDeeds(ctx contractapi.TransactionContextInterface, queryString string) ([]*Deed, error) {
	resultsIterator, err := ctx.GetStub().GetQueryResult(queryString)
	if err != nil {
		return nil, fmt.Errorf("failed to execute query: %v", err)
	}
	defer resultsIterator.Close()

	var deeds []*Deed
	for resultsIterator.HasNext() {
		queryResult, err := resultsIterator.Next()
		if err != nil {
			return nil, fmt.Errorf("failed to iterate query results: %v", err)
		}

		var deed Deed
		err = json.Unmarshal(queryResult.Value, &deed)
		if err != nil {
			return nil, fmt.Errorf("failed to unmarshal deed: %v", err)
		}

		deeds = append(deeds, &deed)
	}

	return deeds, nil
}

// DeedExists checks if a deed exists
func (c *LandRegistry) DeedExists(ctx contractapi.TransactionContextInterface, deedID string) (bool, error) {
	deedJSON, err := ctx.GetStub().GetState(deedID)
	if err != nil {
		return false, fmt.Errorf("failed to read from world state: %v", err)
	}

	return deedJSON != nil, nil
}

// GetDeedCount returns the total number of deeds
func (c *LandRegistry) GetDeedCount(ctx contractapi.TransactionContextInterface) (int, error) {
	queryString := `{"selector":{}}`
	resultsIterator, err := ctx.GetStub().GetQueryResult(queryString)
	if err != nil {
		return 0, fmt.Errorf("failed to execute query: %v", err)
	}
	defer resultsIterator.Close()

	count := 0
	for resultsIterator.HasNext() {
		_, err := resultsIterator.Next()
		if err != nil {
			return 0, fmt.Errorf("failed to iterate query results: %v", err)
		}
		count++
	}

	return count, nil
}

// GetDeedStats returns statistics about deeds
func (c *LandRegistry) GetDeedStats(ctx contractapi.TransactionContextInterface) (map[string]interface{}, error) {
	stats := make(map[string]interface{})

	// Get total count
	totalCount, err := c.GetDeedCount(ctx)
	if err != nil {
		return nil, err
	}
	stats["totalDeeds"] = totalCount

	// Get count by status
	statuses := []string{"pending", "verified", "rejected", "transferred"}
	for _, status := range statuses {
		deeds, err := c.QueryDeedsByStatus(ctx, status)
		if err != nil {
			return nil, err
		}
		stats[fmt.Sprintf("deeds_%s", status)] = len(deeds)
	}

	return stats, nil
}

func main() {
	chaincode, err := contractapi.NewChaincode(&LandRegistry{})
	if err != nil {
		fmt.Printf("Error creating land registry chaincode: %s", err.Error())
		return
	}

	if err := chaincode.Start(); err != nil {
		fmt.Printf("Error starting land registry chaincode: %s", err.Error())
	}
}
