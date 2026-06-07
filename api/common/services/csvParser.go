package services

import (
	"bytes"
	"encoding/csv"
	"fmt"
	"log"
	"strings"
	"time"

	"github.com/xuri/excelize/v2"
)

type RawTransaction struct {
	Date        time.Time
	Amount      float64
	Description string
	Type        string // "income" or "expense"
}

var dateFormats = []string{
	// with time component (try first — more specific)
	"02 Jan 2006 15:04:05",
	"2 Jan 2006 15:04:05",
	"2006-01-02 15:04:05",
	"01/02/2006 15:04:05",
	"02/01/2006 15:04:05",
	"2006-01-02T15:04:05",
	// date only
	"2006-01-02",
	"01/02/2006",
	"02/01/2006",
	"2006/01/02",
	"Jan 2, 2006",
	"Jan 2 2006",
	"2 Jan 2006",
	"02-Jan-2006",
	"02/Jan/2006",
	"02-Jan-06",
	"02/Jan/06",
	"1/2/2006",
	"2/1/2006",
	"01-02-2006",
	"02-01-2006",
}

// isXLSX detects Excel files by their ZIP magic bytes (PK\x03\x04).
func isXLSX(data []byte) bool {
	return len(data) >= 4 && data[0] == 'P' && data[1] == 'K' && data[2] == 0x03 && data[3] == 0x04
}

// ParseCSV handles both true CSV files and Excel (.xlsx) files.
func ParseCSV(data []byte) ([]RawTransaction, error) {
	var records [][]string
	var err error

	if isXLSX(data) {
		records, err = readXLSX(data)
	} else {
		records, err = readCSV(data)
	}
	if err != nil {
		return nil, err
	}

	return parseRecords(records)
}

func readCSV(data []byte) ([][]string, error) {
	delimiter := detectDelimiter(data)

	r := csv.NewReader(bytes.NewReader(data))
	r.Comma = delimiter
	r.TrimLeadingSpace = true
	r.LazyQuotes = true
	r.FieldsPerRecord = -1

	records, err := r.ReadAll()
	if err != nil {
		return nil, fmt.Errorf("invalid CSV: %w", err)
	}
	return records, nil
}

// detectDelimiter sniffs the first 2 KB to pick the most frequent delimiter.
func detectDelimiter(data []byte) rune {
	sample := data
	if len(sample) > 2048 {
		sample = sample[:2048]
	}
	counts := map[rune]int{
		',':  bytes.Count(sample, []byte(",")),
		'\t': bytes.Count(sample, []byte("\t")),
		'|':  bytes.Count(sample, []byte("|")),
		';':  bytes.Count(sample, []byte(";")),
	}
	best := rune(',')
	for delim, count := range counts {
		if count > counts[best] {
			best = delim
		}
	}
	return best
}

func readXLSX(data []byte) ([][]string, error) {
	f, err := excelize.OpenReader(bytes.NewReader(data))
	if err != nil {
		return nil, fmt.Errorf("invalid Excel file: %w", err)
	}
	defer f.Close()

	// Use the first sheet
	sheets := f.GetSheetList()
	if len(sheets) == 0 {
		return nil, fmt.Errorf("Excel file has no sheets")
	}

	rows, err := f.GetRows(sheets[0])
	if err != nil {
		return nil, fmt.Errorf("failed to read Excel sheet: %w", err)
	}
	return rows, nil
}

func parseRecords(records [][]string) ([]RawTransaction, error) {
	// Skip leading empty or metadata rows to find the header
	headerIdx := findHeaderRow(records)
	if headerIdx < 0 {
		return nil, fmt.Errorf("could not find a header row with date/amount/description columns")
	}

	headers := normalizeHeaders(records[headerIdx])
	dateIdx, amountIdx, descIdx, creditIdx, debitIdx, typeIdx := detectColumns(headers)
	log.Printf("[csv] header row %d: %v", headerIdx, records[headerIdx])
	log.Printf("[csv] cols → date:%d desc:%d debit:%d credit:%d amount:%d", dateIdx, descIdx, debitIdx, creditIdx, amountIdx)

	if dateIdx < 0 || descIdx < 0 || (amountIdx < 0 && creditIdx < 0 && debitIdx < 0) {
		return nil, fmt.Errorf(
			"could not detect required columns (date, amount/debit/credit, description); headers found: %v",
			records[headerIdx],
		)
	}

	var txns []RawTransaction
	for rowNum, row := range records[headerIdx+1:] {
		maxIdx := maxOf(dateIdx, descIdx, amountIdx, creditIdx, debitIdx, typeIdx)
		if len(row) <= maxIdx {
			continue
		}

		date, err := parseDate(strings.TrimSpace(row[dateIdx]))
		if err != nil {
			continue
		}

		desc := strings.TrimSpace(row[descIdx])
		if desc == "" {
			desc = fmt.Sprintf("Transaction %d", rowNum+1)
		}
		// Skip rows where the description looks like a raw transaction ID
		// (long alphanumeric with no spaces — not a human-readable narration)
		if isRawID(desc) {
			continue
		}

		// Two-column debit/credit style
		if creditIdx >= 0 && debitIdx >= 0 {
			credit, _ := parseAmount(safeCell(row, creditIdx))
			debit, _ := parseAmount(safeCell(row, debitIdx))
			if credit > 0 {
				txns = append(txns, RawTransaction{Date: date, Amount: credit, Description: desc, Type: "income"})
			}
			if debit > 0 {
				txns = append(txns, RawTransaction{Date: date, Amount: debit, Description: desc, Type: "expense"})
			}
			continue
		}

		// Single amount column
		amount, err := parseAmount(safeCell(row, amountIdx))
		if err != nil || amount == 0 {
			continue
		}
		if amount < 0 {
			amount = -amount
		}

		txType := "expense"
		if typeIdx >= 0 && typeIdx < len(row) {
			if isCredit(row[typeIdx]) {
				txType = "income"
			}
		}

		txns = append(txns, RawTransaction{Date: date, Amount: amount, Description: desc, Type: txType})
	}
	return txns, nil
}

// findHeaderRow scans up to the first 40 rows to find one that looks like a header.
func findHeaderRow(records [][]string) int {
	for i, row := range records {
		if i >= 40 {
			break
		}
		headers := normalizeHeaders(row)
		dateIdx, amountIdx, descIdx, creditIdx, debitIdx, _ := detectColumns(headers)
		hasDate := dateIdx >= 0
		hasAmount := amountIdx >= 0 || creditIdx >= 0 || debitIdx >= 0
		hasDesc := descIdx >= 0
		if hasDate && hasAmount && hasDesc {
			return i
		}
	}
	return -1
}

func safeCell(row []string, idx int) string {
	if idx < 0 || idx >= len(row) {
		return ""
	}
	return row[idx]
}

func normalizeHeaders(row []string) []string {
	out := make([]string, len(row))
	for i, h := range row {
		out[i] = strings.ToLower(strings.TrimSpace(h))
	}
	return out
}

func detectColumns(headers []string) (dateIdx, amountIdx, descIdx, creditIdx, debitIdx, typeIdx int) {
	dateIdx, amountIdx, descIdx, creditIdx, debitIdx, typeIdx = -1, -1, -1, -1, -1, -1
	for i, h := range headers {
		switch {
		case containsAny(h, "date", "value date", "transaction date", "trans date", "posting date", "txn date"):
			if dateIdx < 0 {
				dateIdx = i
			}
		case strings.HasPrefix(h, "credit") || h == "cr" || h == "cr amount":
			if creditIdx < 0 {
				creditIdx = i
			}
		case strings.HasPrefix(h, "debit") || h == "dr" || h == "dr amount":
			if debitIdx < 0 {
				debitIdx = i
			}
		case containsAny(h, "amount", "value") && !containsAny(h, "date", "credit", "debit"):
			if amountIdx < 0 && creditIdx < 0 && debitIdx < 0 {
				amountIdx = i
			}
		case containsAny(h, "description", "narration", "details", "particulars", "memo", "remarks", "beneficiary", "payee"):
			if descIdx < 0 {
				descIdx = i
			}
		case containsAny(h, "type", "dr/cr", "dr cr", "transaction type", "crdr"):
			if typeIdx < 0 {
				typeIdx = i
			}
		}
	}
	return
}

// isRawID returns true if s looks like a machine-generated transaction ID rather
// than a human-readable description — long (>12 chars), no spaces, all alphanumeric.
func isRawID(s string) bool {
	if len(s) <= 12 {
		return false
	}
	if strings.ContainsAny(s, " /-,()") {
		return false
	}
	for _, r := range s {
		if !((r >= 'a' && r <= 'z') || (r >= 'A' && r <= 'Z') || (r >= '0' && r <= '9')) {
			return false
		}
	}
	return true
}

func containsAny(s string, subs ...string) bool {
	for _, sub := range subs {
		if strings.Contains(s, sub) {
			return true
		}
	}
	return false
}

func parseDate(s string) (time.Time, error) {
	s = strings.TrimSpace(s)
	for _, format := range dateFormats {
		if t, err := time.Parse(format, s); err == nil {
			return t, nil
		}
	}
	return time.Time{}, fmt.Errorf("unparseable date: %s", s)
}

func parseAmount(s string) (float64, error) {
	s = strings.TrimSpace(s)
	s = strings.ReplaceAll(s, ",", "")
	s = strings.ReplaceAll(s, "₦", "")
	s = strings.ReplaceAll(s, "$", "")
	s = strings.ReplaceAll(s, "£", "")
	s = strings.ReplaceAll(s, "€", "")
	s = strings.ReplaceAll(s, " ", "")
	if s == "" || s == "-" || s == "--" || s == "0" || s == "0.00" {
		return 0, nil
	}
	var result float64
	_, err := fmt.Sscanf(s, "%f", &result)
	return result, err
}

func isCredit(s string) bool {
	s = strings.ToLower(strings.TrimSpace(s))
	return s == "cr" || s == "credit" || s == "c" || s == "in"
}

func maxOf(vals ...int) int {
	m := -1
	for _, v := range vals {
		if v > m {
			m = v
		}
	}
	return m
}
