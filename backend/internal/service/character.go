package service

import (
	"encoding/json"
	"live-collaborative/internal/database"
	"live-collaborative/internal/model"
	"log"
	"sort"
)

type DocumentService struct{}

func (s *DocumentService) InsertCharacter(char model.Char) {
	dbChar := model.Characters{
		UserId:    char.ID.UserID,
		Counter:   char.ID.Counter,
		CharValue: char.Value,
		Position:  model.JSONB{},
		Clock:     model.JSONB{},
		IsDeleted: char.Deleted,
	}

	// Map position and clock
	posBytes, _ := json.Marshal(char.Position)
	json.Unmarshal(posBytes, &dbChar.Position)

	clockBytes, _ := json.Marshal(char.Clock)
	json.Unmarshal(clockBytes, &dbChar.Clock)

	result := database.DB.Save(&dbChar)
	if result.Error != nil {
		log.Println("Insert Failed:", result.Error)
	}
}

func (s *DocumentService) DeleteCharacter(position []int, id model.CharID) {
	result := database.DB.Model(&model.Characters{}).
		Where("user_id = ? AND counter = ?", id.UserID, id.Counter).
		Update("is_deleted", true)
	if result.Error != nil {
		log.Println("Delete Failed:", result.Error)
	}
}

func (s *DocumentService) DeleteTombstones() {
	result := database.DB.Where("is_deleted = ?", true).Delete(&model.Characters{})
	if result.Error != nil {
		log.Println("Tombstone cleanup failed:", result.Error)
	} else {
		log.Printf("Cleaned up %d tombstones from database", result.RowsAffected)
	}
}

func (s *DocumentService) LoadDocument() ([]model.Char, error) {
	var dbChars []model.Characters
	result := database.DB.Where("is_deleted = ?", false).Find(&dbChars)
	if result.Error != nil {
		return nil, result.Error
	}

	var chars []model.Char
	for _, dbc := range dbChars {
		char := model.Char{
			Value: dbc.CharValue,
			ID: model.CharID{
				UserID:  dbc.UserId,
				Counter: dbc.Counter,
			},
			Deleted: dbc.IsDeleted,
		}

		// Convert JSONB back to slices/maps
		posBytes, _ := json.Marshal(dbc.Position)
		json.Unmarshal(posBytes, &char.Position)

		clockBytes, _ := json.Marshal(dbc.Clock)
		json.Unmarshal(clockBytes, &char.Clock)

		chars = append(chars, char)
	}

	// Sort document based on CRDT rules
	sort.Slice(chars, func(i, j int) bool {
		return model.IsLess(chars[i], chars[j])
	})

	return chars, nil
}
