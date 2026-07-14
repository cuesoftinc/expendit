package service

import (
	"context"
	"fmt"
	"log"
	"strings"
	"time"

	"github.com/cuesoftinc/expendit/api/common/internal/database"
	"github.com/cuesoftinc/expendit/api/common/internal/model"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

var (
	importJobCol   *mongo.Collection = database.OpenCollection(database.Client, "import_jobs")
	importedTxnCol *mongo.Collection = database.OpenCollection(database.Client, "imported_transactions")
	expenseCol     *mongo.Collection = database.OpenCollection(database.Client, "expense")
	incomeCol      *mongo.Collection = database.OpenCollection(database.Client, "income")
)

type ImportResult struct {
	Job          model.ImportJob             `json:"job"`
	Transactions []model.ImportedTransaction `json:"transactions"`
}

// ProcessImport parses the uploaded file and stages transactions for user review.
func ProcessImport(ctx context.Context, userID, fileName string, data []byte) (*ImportResult, error) {
	fileType := detectFileType(fileName, data)

	job := model.ImportJob{
		ID:        primitive.NewObjectID(),
		UserID:    userID,
		Status:    model.ImportStatusProcessing,
		FileName:  fileName,
		FileType:  fileType,
		Anomalies: []model.Anomaly{},
		CreatedAt: time.Now(),
	}
	if _, err := importJobCol.InsertOne(ctx, job); err != nil {
		return nil, fmt.Errorf("failed to create import job: %w", err)
	}

	aiEnhancer := NewAIEnhancer()

	// Parse file into raw transactions
	var rawTxns []RawTransaction
	var parseErr error
	switch fileType {
	case "csv":
		rawTxns, parseErr = ParseCSV(data)
	case "pdf":
		rawText, textErr := ExtractPDFText(data)
		if textErr != nil {
			log.Printf("[pdf] text extraction failed: %v", textErr)
		} else {
			log.Printf("[pdf] extracted %d chars of text", len(rawText))
			if len(rawText) > 300 {
				log.Printf("[pdf] sample: %.300s", rawText)
			} else {
				log.Printf("[pdf] sample: %s", rawText)
			}
		}

		// AI extraction in chunks — each chunk stays within Groq's token limit
		if aiEnhancer != nil && textErr == nil && len(rawText) > 50 {
			trimmed := trimPDFText(rawText, len(rawText)) // skip header only, no size cap
			aiCtx, aiCancel := context.WithTimeout(context.Background(), 120*time.Second)
			rawTxns, parseErr = aiEnhancer.ExtractTransactions(aiCtx, trimmed)
			aiCancel()
			log.Printf("[pdf] AI extracted %d transactions, err: %v", len(rawTxns), parseErr)
		}

		// Fall back to regex parser
		if len(rawTxns) == 0 {
			rawTxns, parseErr = ParsePDF(data)
			log.Printf("[pdf] regex extracted %d transactions, err: %v", len(rawTxns), parseErr)
		}
	case "image":
		if aiEnhancer == nil {
			parseErr = fmt.Errorf("image upload requires an AI provider — set GROQ_API_KEY or GEMINI_API_KEY")
			break
		}
		mimeType := detectImageMimeType(fileName, data)
		imgCtx, imgCancel := context.WithTimeout(context.Background(), 60*time.Second)
		rawTxns, parseErr = aiEnhancer.ExtractTransactionsFromImage(imgCtx, data, mimeType)
		imgCancel()
		log.Printf("[image] AI extracted %d transactions, err: %v", len(rawTxns), parseErr)
	default:
		parseErr = fmt.Errorf("unsupported file type; please upload a CSV, PDF, or image (JPG, PNG, WEBP)")
	}
	if parseErr != nil {
		return nil, markJobFailed(ctx, job.ID, parseErr)
	}

	catEngine, err := GetCategorizationEngine(ctx)
	if err != nil {
		return nil, markJobFailed(ctx, job.ID, err)
	}
	dupDetector := NewDuplicateDetector(userID)

	var staged []model.ImportedTransaction
	duplicateCount := 0

	for _, raw := range rawTxns {
		isDup, err := dupDetector.IsDuplicate(ctx, raw)
		if err != nil {
			continue
		}
		if isDup {
			duplicateCount++
			continue
		}

		staged = append(staged, model.ImportedTransaction{
			ID:          primitive.NewObjectID(),
			ImportJobID: job.ID,
			UserID:      userID,
			Date:        raw.Date,
			Amount:      raw.Amount,
			Description: raw.Description,
			Category:    catEngine.Categorize(ctx, raw.Description),
			Type:        raw.Type,
			IsDuplicate: false,
			Fingerprint: Fingerprint(raw),
			Confirmed:   false,
			CreatedAt:   time.Now(),
		})
	}

	// When AI is available, categorize ALL transactions — not just "Other" fallbacks.
	// This gives more accurate, context-aware categories and makes AI's role visible.
	if aiEnhancer != nil && len(staged) > 0 {
		log.Printf("[AI] categorizing %d transactions", len(staged))
		txnInputs := make([]TransactionInput, len(staged))
		for i, txn := range staged {
			txnInputs[i] = TransactionInput{Description: txn.Description, Type: txn.Type}
		}
		aiCtx, aiCancel := context.WithTimeout(context.Background(), 30*time.Second)
		aiCats := aiEnhancer.BatchCategorize(aiCtx, txnInputs, catEngine.CategoryNames())
		aiCancel()
		aiCount := 0
		for i, cat := range aiCats {
			if cat = strings.TrimSpace(cat); cat != "" {
				staged[i].Category = catEngine.Resolve(ctx, cat)
				staged[i].AICategorized = true
				aiCount++
			}
		}
		log.Printf("[AI] categorized %d/%d transactions", aiCount, len(staged))
		if len(staged) > 0 {
			sample := staged[0].Description + " → " + staged[0].Category
			if len(staged) > 1 {
				sample += " | " + staged[1].Description + " → " + staged[1].Category
			}
			log.Printf("[AI] sample: %s", sample)
		}
	}

	if len(staged) > 0 {
		docs := make([]interface{}, len(staged))
		for i, t := range staged {
			docs[i] = t
		}
		if _, err := importedTxnCol.InsertMany(ctx, docs); err != nil {
			return nil, markJobFailed(ctx, job.ID, err)
		}

		// Auto-confirm: write directly to expense/income so data appears immediately
		now2 := time.Now()
		var fingerprints []RawTransaction
		for _, txn := range staged {
			if txn.Type == "income" {
				incomeCol.InsertOne(ctx, bson.M{
					"_id":           primitive.NewObjectID(),
					"amount":        txn.Amount,
					"description":   txn.Description,
					"source":        txn.Category,
					"userid":        userID,
					"createdat":     txn.Date,
					"updatedat":     now2,
					"import_job_id": job.ID,
				})
			} else {
				expenseCol.InsertOne(ctx, bson.M{
					"_id":           primitive.NewObjectID(),
					"amount":        txn.Amount,
					"category":      txn.Category,
					"note":          txn.Description,
					"userid":        userID,
					"createdat":     txn.Date,
					"updatedat":     now2,
					"import_job_id": job.ID,
				})
			}
			fingerprints = append(fingerprints, RawTransaction{
				Date: txn.Date, Amount: txn.Amount, Description: txn.Description,
			})
		}
		dup := NewDuplicateDetector(userID)
		dup.PersistFingerprints(ctx, fingerprints)

		importedTxnCol.UpdateMany(ctx,
			bson.M{"import_job_id": job.ID, "userid": userID},
			bson.M{"$set": bson.M{"confirmed": true}},
		)
		log.Printf("[import] saved %d transactions to expense/income", len(staged))
	}

	summary := GenerateSummary(staged)
	anomalies := DetectAnomalies(ctx, expenseCol, userID, staged)
	if anomalies == nil {
		anomalies = []model.Anomaly{}
	}

	// AI summary of this specific import
	var aiSummaryText string
	if aiEnhancer != nil && len(staged) > 0 {
		aiSummaryText = generateImportSummary(aiEnhancer, staged, summary)
	}

	now := time.Now()
	job.Status = model.ImportStatusCompleted
	job.TotalParsed = len(rawTxns)
	job.DuplicatesFound = duplicateCount
	job.Imported = len(staged)
	job.Summary = &summary
	job.AISummary = aiSummaryText
	job.Anomalies = anomalies
	job.CompletedAt = &now

	importJobCol.UpdateOne(ctx, bson.M{"_id": job.ID}, bson.M{"$set": job})

	return &ImportResult{Job: job, Transactions: staged}, nil
}

// ConfirmImport writes staged transactions to the expense/income collections.
func ConfirmImport(ctx context.Context, jobID primitive.ObjectID, userID string) error {
	cursor, err := importedTxnCol.Find(ctx, bson.M{
		"import_job_id": jobID,
		"userid":        userID,
		"confirmed":     false,
	})
	if err != nil {
		return err
	}
	defer cursor.Close(ctx)

	var txns []model.ImportedTransaction
	if err := cursor.All(ctx, &txns); err != nil {
		return err
	}

	now := time.Now()
	var toFingerprint []RawTransaction

	for _, txn := range txns {
		var insertErr error
		if txn.Type == "income" {
			_, insertErr = incomeCol.InsertOne(ctx, bson.M{
				"_id":           primitive.NewObjectID(),
				"amount":        txn.Amount,
				"description":   txn.Description,
				"source":        txn.Category,
				"userid":        userID,
				"created_at":    txn.Date,
				"updated_at":    now,
				"import_job_id": jobID,
			})
		} else {
			_, insertErr = expenseCol.InsertOne(ctx, bson.M{
				"_id":           primitive.NewObjectID(),
				"amount":        txn.Amount,
				"category":      txn.Category,
				"note":          txn.Description,
				"userid":        userID,
				"created_at":    txn.Date,
				"updated_at":    now,
				"import_job_id": jobID,
			})
		}
		if insertErr != nil {
			return insertErr
		}
		toFingerprint = append(toFingerprint, RawTransaction{
			Date: txn.Date, Amount: txn.Amount, Description: txn.Description,
		})
	}

	// Persist fingerprints so re-uploading the same file won't duplicate
	dup := NewDuplicateDetector(userID)
	if err := dup.PersistFingerprints(ctx, toFingerprint); err != nil {
		return err
	}

	_, err = importedTxnCol.UpdateMany(ctx,
		bson.M{"import_job_id": jobID, "userid": userID},
		bson.M{"$set": bson.M{"confirmed": true}},
	)
	return err
}

// GetImportJob retrieves a job and its staged transactions.
func GetImportJob(ctx context.Context, jobID primitive.ObjectID, userID string) (*model.ImportJob, []model.ImportedTransaction, error) {
	var job model.ImportJob
	if err := importJobCol.FindOne(ctx, bson.M{"_id": jobID, "userid": userID}).Decode(&job); err != nil {
		return nil, nil, err
	}

	opts := options.Find().SetSort(bson.M{"date": 1})
	cursor, err := importedTxnCol.Find(ctx, bson.M{"import_job_id": jobID, "userid": userID}, opts)
	if err != nil {
		return &job, nil, nil
	}
	defer cursor.Close(ctx)

	var txns []model.ImportedTransaction
	cursor.All(ctx, &txns)
	return &job, txns, nil
}

// UpdateTransactionCategory lets the user re-categorize a staged transaction.
func UpdateTransactionCategory(ctx context.Context, txnID primitive.ObjectID, userID, category string) error {
	_, err := importedTxnCol.UpdateOne(ctx,
		bson.M{"_id": txnID, "userid": userID},
		bson.M{"$set": bson.M{"category": category}},
	)
	return err
}

// DiscardImport deletes a pending import job and its staged transactions.
func DiscardImport(ctx context.Context, jobID primitive.ObjectID, userID string) error {
	importedTxnCol.DeleteMany(ctx, bson.M{"import_job_id": jobID, "userid": userID})
	_, err := importJobCol.DeleteOne(ctx, bson.M{"_id": jobID, "userid": userID})
	return err
}

func generateImportSummary(ai *AIEnhancer, staged []model.ImportedTransaction, summary model.ImportSummary) string {
	// Build a compact top-categories string (max 5) — ASCII only to avoid encoding issues
	top := ""
	count := 0
	for cat, amt := range summary.ByCategory {
		if count >= 5 {
			break
		}
		top += fmt.Sprintf("%s: NGN %.0f; ", cat, amt)
		count++
	}

	prompt := fmt.Sprintf(
		"You are a personal finance assistant. A Nigerian user imported %d bank transactions. "+
			"Total income: NGN %.0f. Total expenses: NGN %.0f. Net: NGN %.0f. "+
			"Top spending categories: %s. "+
			"Write 2 short friendly sentences summarising this and give one money-saving tip. Plain text only.",
		len(staged), summary.TotalIncome, summary.TotalExpenses, summary.NetCashFlow, top,
	)

	ctx, cancel := context.WithTimeout(context.Background(), 20*time.Second)
	defer cancel()
	text, err := ai.GenerateText(ctx, prompt)
	if err != nil {
		log.Printf("[import] AI summary failed: %v", err)
		return ""
	}
	log.Printf("[import] AI summary generated (%d chars)", len(text))
	return strings.TrimSpace(text)
}

func detectFileType(fileName string, data []byte) string {
	lower := strings.ToLower(fileName)
	if strings.HasSuffix(lower, ".pdf") {
		return "pdf"
	}
	for _, ext := range []string{".jpg", ".jpeg", ".png", ".webp", ".heic", ".heif"} {
		if strings.HasSuffix(lower, ext) {
			return "image"
		}
	}
	// PDF magic bytes
	if len(data) >= 4 && string(data[:4]) == "%PDF" {
		return "pdf"
	}
	// PNG magic bytes
	if len(data) >= 4 && data[0] == 0x89 && data[1] == 'P' && data[2] == 'N' && data[3] == 'G' {
		return "image"
	}
	// JPEG magic bytes
	if len(data) >= 3 && data[0] == 0xFF && data[1] == 0xD8 && data[2] == 0xFF {
		return "image"
	}
	// Everything else (csv, xlsx, txt) goes through ParseCSV which handles all tabular formats
	return "csv"
}

func detectImageMimeType(fileName string, data []byte) string {
	lower := strings.ToLower(fileName)
	switch {
	case strings.HasSuffix(lower, ".png"):
		return "image/png"
	case strings.HasSuffix(lower, ".webp"):
		return "image/webp"
	case strings.HasSuffix(lower, ".heic"), strings.HasSuffix(lower, ".heif"):
		return "image/heic"
	default:
		if len(data) >= 4 && data[0] == 0x89 && data[1] == 'P' && data[2] == 'N' && data[3] == 'G' {
			return "image/png"
		}
		return "image/jpeg"
	}
}

func markJobFailed(ctx context.Context, jobID primitive.ObjectID, err error) error {
	importJobCol.UpdateOne(ctx,
		bson.M{"_id": jobID},
		bson.M{"$set": bson.M{"status": model.ImportStatusFailed, "error": err.Error()}},
	)
	return err
}
