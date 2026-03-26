package model

type CharID struct {
	Counter int    `json:"value"`
	UserID  string `json:"userId"`
}
type Char struct {
	Value    string `json:"value"`
	Position []int  `json:"position"`
	ID       CharID `json:"id"`
}

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
		val2 := 10
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
func (h *Hub) isLess(charA, charB Char) bool {
	// 1. Compare the fractional positions first
	for i := 0; i < len(charA.Position) && i < len(charB.Position); i++ {
		if charA.Position[i] != charB.Position[i] {
			return charA.Position[i] < charB.Position[i]
		}
	}

	// 2. If positions are identical lengths (e.g., [1,5] vs [1,5]), check lengths
	if len(charA.Position) != len(charB.Position) {
		return len(charA.Position) < len(charB.Position)
	}

	// 3. Tie-break with Counter
	if charA.ID.Counter != charB.ID.Counter {
		return charA.ID.Counter < charB.ID.Counter
	}

	// 4. Final tie-break with UserID string
	return charA.ID.UserID < charB.ID.UserID
}
