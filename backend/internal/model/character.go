package model

import (
	"database/sql/driver"
	"encoding/json"
	"fmt"

	"gorm.io/gorm"
)

type JSONB map[string]interface{}

func (j JSONB) Value() (driver.Value, error) {
	return json.Marshal(j)
}

func (j *JSONB) Scan(value interface{}) error {
	bytes, ok := value.([]byte)
	if !ok {
		return fmt.Errorf("Failed to unmarshal JSONB: %v", value)
	}
	return json.Unmarshal(bytes, j)
}

type Characters struct {
	gorm.Model
	UserId    string `gorm:"column:user_id;primaryKey"`
	Counter   int    `gorm:"primaryKey"`
	CharValue string `gorm:"column:char_value"`
	Position  JSONB  `gorm:"type:jsonb"`
	Clock     JSONB  `gorm:"type:jsonb"`
	IsDeleted bool   `gorm:"column:is_deleted"`
}
