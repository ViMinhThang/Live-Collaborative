package model

import (
	"sort"
	"testing"
)

func TestGenerateMidPoint_BetweenZeroAndBase(t *testing.T) {
	pos := GenerateMidPoint([]int{}, []int{Base})
	if len(pos) != 1 || pos[0] != Base/2 {
		t.Errorf("expected [%d], got %v", Base/2, pos)
	}
}

func TestGenerateMidPoint_Consecutive(t *testing.T) {
	pos := GenerateMidPoint([]int{5}, []int{6})
	if len(pos) != 2 || pos[0] != 5 || pos[1] != Base/2 {
		t.Errorf("expected [5, %d], got %v", Base/2, pos)
	}
}

func TestGenerateMidPoint_NeedsDepth(t *testing.T) {
	pos := GenerateMidPoint([]int{5}, []int{5})
	if len(pos) != 2 || pos[0] != 5 || pos[1] != Base/2 {
		t.Errorf("expected [5, %d], got %v", Base/2, pos)
	}
}

func TestGenerateMidPoint_EmptyRight(t *testing.T) {
	pos := GenerateMidPoint([]int{Base/2}, []int{})
	if len(pos) != 1 || pos[0] != Base/2+Base/4 {
		t.Errorf("expected midpoint, got %v", pos)
	}
}

func TestComparePositions_Equal(t *testing.T) {
	if c := ComparePositions([]int{1, 2, 3}, []int{1, 2, 3}); c != 0 {
		t.Errorf("expected 0, got %d", c)
	}
}

func TestComparePositions_Less(t *testing.T) {
	if c := ComparePositions([]int{1, 2}, []int{1, 3}); c >= 0 {
		t.Errorf("expected negative, got %d", c)
	}
}

func TestComparePositions_Greater(t *testing.T) {
	if c := ComparePositions([]int{2, 1}, []int{1, 3}); c <= 0 {
		t.Errorf("expected positive, got %d", c)
	}
}

func TestComparePositions_ShorterIsLess(t *testing.T) {
	if c := ComparePositions([]int{1}, []int{1, 0}); c >= 0 {
		t.Errorf("expected negative (shorter is less), got %d", c)
	}
}

func TestIsLess_Position(t *testing.T) {
	a := Char{Position: []int{1}, ID: CharID{Counter: 1, UserID: "a"}}
	b := Char{Position: []int{2}, ID: CharID{Counter: 1, UserID: "b"}}
	if !IsLess(a, b) {
		t.Error("expected a < b by position")
	}
	if IsLess(b, a) {
		t.Error("expected b > a by position")
	}
}

func TestIsLess_TieBreakByUserID(t *testing.T) {
	a := Char{Position: []int{1}, ID: CharID{Counter: 1, UserID: "a"}}
	b := Char{Position: []int{1}, ID: CharID{Counter: 1, UserID: "b"}}
	if !IsLess(a, b) {
		t.Error("expected a < b by userId")
	}
}

func TestIsLess_TieBreakByCounter(t *testing.T) {
	a := Char{Position: []int{1}, ID: CharID{Counter: 1, UserID: "a"}}
	b := Char{Position: []int{1}, ID: CharID{Counter: 2, UserID: "a"}}
	if !IsLess(a, b) {
		t.Error("expected a < b by counter")
	}
}

func TestInsertOrder(t *testing.T) {
	chars := []Char{
		{Value: "b", Position: []int{Base / 2}, ID: CharID{Counter: 1, UserID: "user1"}},
		{Value: "a", Position: []int{Base / 4}, ID: CharID{Counter: 2, UserID: "user2"}},
		{Value: "c", Position: []int{Base * 3 / 4}, ID: CharID{Counter: 3, UserID: "user3"}},
	}
	sort.Slice(chars, func(i, j int) bool {
		return IsLess(chars[i], chars[j])
	})
	result := ""
	for _, c := range chars {
		result += c.Value
	}
	if result != "abc" {
		t.Errorf("expected 'abc', got '%s'", result)
	}
}

func TestConcurrentInsertOrdering(t *testing.T) {
	// Simulate two users inserting at the same position
	user1chars := []Char{
		{Value: "a", Position: []int{5, Base / 2}, ID: CharID{Counter: 1, UserID: "user1"}},
		{Value: "c", Position: []int{5, Base / 4}, ID: CharID{Counter: 2, UserID: "user1"}},
	}
	user2chars := []Char{
		{Value: "b", Position: []int{5, Base / 2}, ID: CharID{Counter: 1, UserID: "user2"}},
		{Value: "d", Position: []int{5, Base / 4}, ID: CharID{Counter: 2, UserID: "user2"}},
	}

	all := append(user1chars, user2chars...)
	sort.Slice(all, func(i, j int) bool {
		return IsLess(all[i], all[j])
	})

	// Verify total order is deterministic
	prev := all[0]
	for i := 1; i < len(all); i++ {
		if !IsLess(prev, all[i]) {
			t.Errorf("order violation at %d: %+v >= %+v", i, prev, all[i])
		}
		prev = all[i]
	}
}

func TestMergeClocks(t *testing.T) {
	local := VectorClock{"a": 1, "b": 2}
	remote := VectorClock{"b": 3, "c": 1}
	merged := MergeClocks(local, remote)
	if merged["a"] != 1 || merged["b"] != 3 || merged["c"] != 1 {
		t.Errorf("unexpected merged clock: %v", merged)
	}
}
