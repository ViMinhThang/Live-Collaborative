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

const DefaultMaxPosition = 10

func GenerateMidPoint(pos1, pos2 []int) []int {
	maxLength := len(pos1)
	if len(pos2) > maxLength {
		maxLength = len(pos2)
	}
	newPos := make([]int, 0, maxLength)

	for i := 0; i < maxLength; i++ {
		val1 := 0
		if i < len(pos1) {
			val1 = pos1[i]
		}
		val2 := DefaultMaxPosition
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
			newPos = append(newPos, 5)
			break
		}
	}
	return newPos
}
