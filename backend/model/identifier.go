package model

import "encoding/json"

type CharID struct {
	Counter int    `json:"counter"`
	UserID  string `json:"userId"`
}
type Char struct {
	Value    string `json:"value"`
	Position []int  `json:"position"`
	ID       CharID `json:"id"`
	Deleted  bool   `json:"deleted"`
}
type Event struct {
	Type string          `json:"type"`
	Data json.RawMessage `json:"data"`
}

const Base = 65536

// ComparePositions returns pos1 - pos2 (lexicographical)
func ComparePositions(pos1, pos2 []int) int {
	minLen := len(pos1)
	if len(pos2) < minLen {
		minLen = len(pos2)
	}
	for i := 0; i < minLen; i++ {
		if pos1[i] != pos2[i] {
			return pos1[i] - pos2[i]
		}
	}
	return len(pos1) - len(pos2)
}

// GenerateMidPoint creates a new position between pos1 and pos2
func GenerateMidPoint(pos1, pos2 []int) []int {
	maxLength := len(pos1)
	if len(pos2) > maxLength {
		maxLength = len(pos2)
	}
	maxLength++ // Allow expansion

	newPos := make([]int, 0, maxLength)

	for i := 0; i < maxLength; i++ {
		val1 := 0
		if i < len(pos1) {
			val1 = pos1[i]
		}
		val2 := Base
		if i < len(pos2) {
			val2 = pos2[i]
		}

		if val1 == val2 {
			newPos = append(newPos, val1)
			continue
		}

		if val2-val1 > 1 {
			newPos = append(newPos, val1+(val2-val1)/2)
			break
		} else {
			newPos = append(newPos, val1)
			if i >= len(pos1)-1 {
				newPos = append(newPos, Base/2)
				break
			}
		}
	}
	return newPos
}

// IsLess sorts characters by position, then UserID, then Counter
func IsLess(char1, char2 Char) bool {
	posComp := ComparePositions(char1.Position, char2.Position)
	if posComp != 0 {
		return posComp < 0
	}
	if char1.ID.UserID != char2.ID.UserID {
		return char1.ID.UserID < char2.ID.UserID
	}
	return char1.ID.Counter < char2.ID.Counter
}
