package services

import (
	"bytes"
	"fmt"
	"regexp"
	"strings"

	"github.com/ledongthuc/pdf"
)

// Matches a date at the very start of a line in common bank statement formats:
//   DD/MM/YYYY  DD-MM-YYYY  YYYY-MM-DD
//   DD/Mon/YYYY DD-Mon-YYYY DD-Mon-YY   (e.g. 15-Jan-2024, 15/Jan/24)
//   Mon DD YYYY  Mon DD, YYYY           (e.g. Jan 15 2024)
var dateAtStart = regexp.MustCompile(
	`(?i)^(\d{1,2}[/\-]\d{1,2}[/\-]\d{2,4}` +
		`|\d{4}[/\-]\d{2}[/\-]\d{2}` +
		`|\d{1,2}[/\-][A-Za-z]{3}[/\-]\d{2,4}` +
		`|[A-Za-z]{3}\.?\s+\d{1,2}[,\s]+\d{4})`,
)

// Matches monetary amounts like 5,000.00 or 1234.50
var moneyPattern = regexp.MustCompile(`[\d]{1,3}(?:,\d{3})*\.\d{2}`)

// Detects CR/DR markers
var crPattern = regexp.MustCompile(`(?i)\bCR\b|\bcredit\b`)
var drPattern = regexp.MustCompile(`(?i)\bDR\b|\bdebit\b`)

// trimPDFText skips account metadata at the top of a bank statement PDF and
// limits the result to maxChars so it fits within AI token limits.
func trimPDFText(text string, maxChars int) string {
	// Find the first occurrence of a date-like pattern to skip the header metadata
	loc := dateAtStart.FindStringIndex(text)
	if loc != nil && loc[0] > 0 {
		text = text[loc[0]:]
	}
	if len(text) > maxChars {
		text = text[:maxChars]
	}
	return text
}

// ExtractPDFText returns the raw text content of a PDF file.
func ExtractPDFText(data []byte) (string, error) {
	reader := bytes.NewReader(data)
	pdfReader, err := pdf.NewReader(reader, int64(len(data)))
	if err != nil {
		return "", fmt.Errorf("failed to read PDF: %w", err)
	}
	var allText strings.Builder
	for i := 1; i <= pdfReader.NumPage(); i++ {
		page := pdfReader.Page(i)
		if page.V.IsNull() {
			continue
		}
		text, err := page.GetPlainText(nil)
		if err != nil {
			continue
		}
		allText.WriteString(text)
		allText.WriteString("\n")
	}
	return allText.String(), nil
}

func ParsePDF(data []byte) ([]RawTransaction, error) {
	text, err := ExtractPDFText(data)
	if err != nil {
		return nil, err
	}
	txns, err := parsePDFText(text)
	if err != nil {
		return nil, err
	}
	return txns, nil
}

func parsePDFText(text string) ([]RawTransaction, error) {
	var txns []RawTransaction
	lines := strings.Split(text, "\n")

	// Buffer to accumulate continuation lines for a transaction
	var pendingDate string
	var pendingDesc strings.Builder

	flushPending := func() {
		if pendingDate == "" {
			return
		}
		combined := pendingDate + " " + pendingDesc.String()
		if t := tryParseLine(combined); t != nil {
			txns = append(txns, *t)
		}
		pendingDate = ""
		pendingDesc.Reset()
	}

	for _, raw := range lines {
		line := strings.TrimSpace(raw)
		if len(line) < 6 {
			flushPending()
			continue
		}

		loc := dateAtStart.FindStringIndex(line)
		if loc == nil {
			// No date — might be a continuation of the previous transaction
			if pendingDate != "" {
				pendingDesc.WriteString(" ")
				pendingDesc.WriteString(line)
			}
			continue
		}

		// New date found — flush any pending transaction first
		flushPending()

		// Try to parse the whole line immediately
		if t := tryParseLine(line); t != nil {
			txns = append(txns, *t)
			continue
		}

		// Line has a date but no amount yet — buffer it for continuation
		pendingDate = line[loc[0]:loc[1]]
		rest := strings.TrimSpace(line[loc[1]:])
		pendingDesc.Reset()
		pendingDesc.WriteString(rest)
	}
	flushPending()

	if len(txns) == 0 {
		return nil, fmt.Errorf("no transactions found in PDF — try exporting as CSV from your bank's portal instead")
	}
	return txns, nil
}

// tryParseLine attempts to extract a transaction from a single line.
// Returns nil if the line doesn't look like a transaction.
func tryParseLine(line string) *RawTransaction {
	loc := dateAtStart.FindStringIndex(line)
	if loc == nil {
		return nil
	}

	dateStr := line[loc[0]:loc[1]]
	rest := strings.TrimSpace(line[loc[1]:])

	// Find all money amounts in the rest of the line
	amounts := moneyPattern.FindAllString(rest, -1)
	if len(amounts) == 0 {
		return nil
	}

	// Determine transaction type from DR/CR markers
	txType := "expense" // default
	if crPattern.MatchString(rest) {
		txType = "income"
	} else if drPattern.MatchString(rest) {
		txType = "expense"
	}

	// Pick the transaction amount:
	// - 1 amount: use it
	// - 2 amounts: first is the transaction, second is running balance — use first
	// - 3 amounts: debit / credit / balance layout
	//     if CR marker → second amount (credit column), else first (debit column)
	var amountStr string
	switch len(amounts) {
	case 1:
		amountStr = amounts[0]
	case 2:
		amountStr = amounts[0]
	default: // 3+
		if txType == "income" {
			amountStr = amounts[1] // credit column
		} else {
			amountStr = amounts[0] // debit column
		}
	}

	amount, err := parseAmount(amountStr)
	if err != nil || amount == 0 {
		return nil
	}

	// Description: text between date and first money amount, stripped of DR/CR markers
	firstAmountIdx := strings.Index(rest, amounts[0])
	desc := rest
	if firstAmountIdx > 0 {
		desc = rest[:firstAmountIdx]
	}
	desc = drPattern.ReplaceAllString(desc, "")
	desc = crPattern.ReplaceAllString(desc, "")
	desc = strings.TrimSpace(desc)
	if desc == "" {
		desc = "Transaction"
	}

	date, err := parseDate(dateStr)
	if err != nil {
		return nil
	}

	return &RawTransaction{
		Date:        date,
		Amount:      amount,
		Description: desc,
		Type:        txType,
	}
}
