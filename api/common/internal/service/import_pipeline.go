package service

// Kafka handlers for the receipt pipeline: api/intake hands off a raw
// upload here; this file creates the job, gathers reference data api/common
// owns (existing categories, fingerprints, historical aggregates), and
// forwards to api/process. When api/process reports back, this file
// persists the result. api/common never parses a file or makes a
// categorization/duplicate/anomaly decision itself; see
// repository-and-services.md's "Multi-service pipelines" section.

import (
	"context"
	"encoding/json"
	"log/slog"
	"time"

	"github.com/cuesoftinc/expendit/api/common/internal/kafka"
	"github.com/cuesoftinc/expendit/api/common/internal/model"
	skafka "github.com/segmentio/kafka-go"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

// -- wire messages, snake_case to match api/process's pydantic schemas and
// this codebase's own JSON convention (see model.ImportJob's json tags) --

type receiptUploadedMessage struct {
	JobID    string `json:"job_id"`
	UserID   string `json:"user_id"`
	FileName string `json:"file_name"`
	FileData string `json:"file_data"`
}

type referenceData struct {
	Categories       []string           `json:"categories"`
	Fingerprints     []string           `json:"fingerprints"`
	AvgAmount        float64            `json:"avg_amount"`
	LastMonthTotals  map[string]float64 `json:"last_month_totals"`
	ThreeMonthAvg    map[string]float64 `json:"three_month_avg"`
}

type readyForProcessingMessage struct {
	JobID     string        `json:"job_id"`
	UserID    string        `json:"user_id"`
	FileName  string        `json:"file_name"`
	FileData  string        `json:"file_data"`
	Reference referenceData `json:"reference"`
}

type processedTransaction struct {
	Date          string  `json:"date"`
	Amount        float64 `json:"amount"`
	Description   string  `json:"description"`
	Category      string  `json:"category"`
	AICategorized bool    `json:"ai_categorized"`
	Type          string  `json:"type"`
	Fingerprint   string  `json:"fingerprint"`
}

type processedMessage struct {
	JobID           string                  `json:"job_id"`
	UserID          string                  `json:"user_id"`
	Status          string                  `json:"status"` // "completed" or "failed"
	Error           string                  `json:"error"`
	FileType        string                  `json:"file_type"`
	TotalParsed     int                     `json:"total_parsed"`
	DuplicatesFound int                     `json:"duplicates_found"`
	Transactions    []processedTransaction  `json:"transactions"`
	NewCategories   []string                `json:"new_categories"`
	NewFingerprints []string                `json:"new_fingerprints"`
	Summary         *model.ImportSummary    `json:"summary"`
	AISummary       string                  `json:"ai_summary"`
	Anomalies       []model.Anomaly         `json:"anomalies"`
}

// StartConsumers launches the two long-running consume loops. It returns
// immediately if KAFKA_BROKERS is unset (matches api/intake and
// api/process's same disabled-without-config posture); callers should run
// it in a goroutine.
func StartConsumers(ctx context.Context) {
	go consumeLoop(ctx, kafka.TopicReceiptUploaded, "expendit-api-common-uploaded", handleReceiptUploaded)
	go consumeLoop(ctx, kafka.TopicReceiptProcessed, "expendit-api-common-processed", handleReceiptProcessed)
}

func consumeLoop(ctx context.Context, topic, groupID string, handle func(context.Context, []byte) error) {
	reader, err := kafka.NewReader(topic, groupID)
	if err != nil {
		slog.Error("failed to create kafka reader", "topic", topic, "error", err)
		return
	}
	if reader == nil {
		slog.Warn("KAFKA_BROKERS not set, consumer disabled", "topic", topic)
		return
	}
	defer reader.Close()

	for {
		msg, err := reader.ReadMessage(ctx)
		if err != nil {
			if ctx.Err() != nil {
				return
			}
			slog.Error("kafka read failed", "topic", topic, "error", err)
			continue
		}
		if err := handle(ctx, msg.Value); err != nil {
			slog.Error("kafka handler failed", "topic", topic, "error", err)
		}
	}
}

// handleReceiptUploaded consumes TopicReceiptUploaded: creates the job
// record, gathers reference data, and forwards to api/process.
func handleReceiptUploaded(ctx context.Context, raw []byte) error {
	var msg receiptUploadedMessage
	if err := json.Unmarshal(raw, &msg); err != nil {
		return err
	}

	// api/intake mints this as 24 hex chars specifically so it round-trips
	// through the same ObjectID the client polls by; a parse failure here
	// means intake's ID minting and this parse have drifted out of sync.
	jobID, err := primitive.ObjectIDFromHex(msg.JobID)
	if err != nil {
		return err
	}

	job := model.ImportJob{
		ID:        jobID,
		UserID:    msg.UserID,
		Status:    model.ImportStatusProcessing,
		FileName:  msg.FileName,
		Anomalies: []model.Anomaly{},
		CreatedAt: time.Now(),
	}
	if _, err := importJobCol.InsertOne(ctx, job); err != nil {
		return err
	}

	ref, err := gatherReferenceData(ctx, msg.UserID)
	if err != nil {
		return markJobFailed(ctx, jobID, err)
	}

	writer, err := kafka.NewWriter(kafka.TopicReceiptReady)
	if err != nil {
		return markJobFailed(ctx, jobID, err)
	}
	if writer == nil {
		return markJobFailed(ctx, jobID, errNoKafka)
	}
	defer writer.Close()

	ready := readyForProcessingMessage{
		JobID:     msg.JobID,
		UserID:    msg.UserID,
		FileName:  msg.FileName,
		FileData:  msg.FileData,
		Reference: ref,
	}
	body, err := json.Marshal(ready)
	if err != nil {
		return markJobFailed(ctx, jobID, err)
	}
	return writer.WriteMessages(ctx, skafka.Message{Key: []byte(msg.JobID), Value: body})
}

// handleReceiptProcessed consumes TopicReceiptProcessed: persists every
// decision api/process made. api/common creates rows here, it never decides
// their values.
func handleReceiptProcessed(ctx context.Context, raw []byte) error {
	var msg processedMessage
	if err := json.Unmarshal(raw, &msg); err != nil {
		return err
	}

	jobID, err := primitive.ObjectIDFromHex(msg.JobID)
	if err != nil {
		return err
	}

	if msg.Status == "failed" {
		return markJobFailed(ctx, jobID, errProcessing(msg.Error))
	}

	for _, name := range msg.NewCategories {
		count, err := categoryCol.CountDocuments(ctx, bson.M{"name": name})
		if err != nil {
			return err
		}
		if count == 0 {
			categoryCol.InsertOne(ctx, model.Category{
				ID:        primitive.NewObjectID(),
				Name:      name,
				CreatedAt: time.Now(),
				UpdatedAt: time.Now(),
			})
		}
	}

	now := time.Now()
	var staged []model.ImportedTransaction
	for _, t := range msg.Transactions {
		date, err := time.Parse(time.RFC3339, t.Date)
		if err != nil {
			date, err = time.Parse("2006-01-02T15:04:05", t.Date)
			if err != nil {
				date = now
			}
		}
		staged = append(staged, model.ImportedTransaction{
			ID:            primitive.NewObjectID(),
			ImportJobID:   jobID,
			UserID:        msg.UserID,
			Date:          date,
			Amount:        t.Amount,
			Description:   t.Description,
			Category:      t.Category,
			AICategorized: t.AICategorized,
			Type:          t.Type,
			IsDuplicate:   false,
			Fingerprint:   t.Fingerprint,
			Confirmed:     false,
			CreatedAt:     now,
		})
	}

	if len(staged) > 0 {
		docs := make([]interface{}, len(staged))
		for i, t := range staged {
			docs[i] = t
		}
		if _, err := importedTxnCol.InsertMany(ctx, docs); err != nil {
			return markJobFailed(ctx, jobID, err)
		}

		// Auto-confirm: write directly to expense/income so data appears
		// immediately, matching the old monolith's behavior. ConfirmImport
		// remains for the explicit user-driven confirm flow.
		for _, t := range staged {
			if t.Type == "income" {
				incomeCol.InsertOne(ctx, bson.M{
					"_id": primitive.NewObjectID(), "amount": t.Amount, "description": t.Description,
					"source": t.Category, "userid": msg.UserID, "createdat": t.Date, "updatedat": now,
					"import_job_id": jobID,
				})
			} else {
				expenseCol.InsertOne(ctx, bson.M{
					"_id": primitive.NewObjectID(), "amount": t.Amount, "category": t.Category,
					"note": t.Description, "userid": msg.UserID, "createdat": t.Date, "updatedat": now,
					"import_job_id": jobID,
				})
			}
		}
		if len(msg.NewFingerprints) > 0 {
			docs := make([]interface{}, len(msg.NewFingerprints))
			for i, fp := range msg.NewFingerprints {
				docs[i] = bson.M{"fingerprint": fp, "userid": msg.UserID, "created_at": now}
			}
			fingerprintCol.InsertMany(ctx, docs)
		}

		importedTxnCol.UpdateMany(ctx,
			bson.M{"import_job_id": jobID, "userid": msg.UserID},
			bson.M{"$set": bson.M{"confirmed": true}},
		)
	}

	completedAt := time.Now()
	update := bson.M{
		"status":           model.ImportStatusCompleted,
		"file_type":        msg.FileType,
		"total_parsed":     msg.TotalParsed,
		"duplicates_found": msg.DuplicatesFound,
		"imported":         len(staged),
		"ai_summary":       msg.AISummary,
		"anomalies":        msg.Anomalies,
		"completed_at":     &completedAt,
	}
	if msg.Summary != nil {
		update["summary"] = msg.Summary
	}
	_, err = importJobCol.UpdateOne(ctx, bson.M{"_id": jobID}, bson.M{"$set": update})
	return err
}

// -- reference data api/process needs to make decisions ---------------------

func gatherReferenceData(ctx context.Context, userID string) (referenceData, error) {
	categories, err := existingCategoryNames(ctx)
	if err != nil {
		return referenceData{}, err
	}
	fingerprints, err := existingFingerprints(ctx, userID)
	if err != nil {
		return referenceData{}, err
	}
	avgAmount, err := userAvgAmount(ctx, userID)
	if err != nil {
		return referenceData{}, err
	}
	lastMonthTotals, err := categoryTotals(ctx, userID, lastMonthRange())
	if err != nil {
		return referenceData{}, err
	}
	threeMonthAvg, err := threeMonthAvgTotals(ctx, userID)
	if err != nil {
		return referenceData{}, err
	}

	return referenceData{
		Categories:      categories,
		Fingerprints:    fingerprints,
		AvgAmount:       avgAmount,
		LastMonthTotals: lastMonthTotals,
		ThreeMonthAvg:   threeMonthAvg,
	}, nil
}

func existingCategoryNames(ctx context.Context) ([]string, error) {
	cursor, err := categoryCol.Find(ctx, bson.M{})
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var cats []model.Category
	if err := cursor.All(ctx, &cats); err != nil {
		return nil, err
	}
	names := make([]string, len(cats))
	for i, c := range cats {
		names[i] = c.Name
	}
	return names, nil
}

func existingFingerprints(ctx context.Context, userID string) ([]string, error) {
	cursor, err := fingerprintCol.Find(ctx, bson.M{"userid": userID})
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var docs []struct {
		Fingerprint string `bson:"fingerprint"`
	}
	if err := cursor.All(ctx, &docs); err != nil {
		return nil, err
	}
	fps := make([]string, len(docs))
	for i, d := range docs {
		fps[i] = d.Fingerprint
	}
	return fps, nil
}

func userAvgAmount(ctx context.Context, userID string) (float64, error) {
	ninetyDaysAgo := time.Now().AddDate(0, 0, -90)
	pipeline := []bson.M{
		{"$match": bson.M{"userid": userID, "created_at": bson.M{"$gte": ninetyDaysAgo}}},
		{"$group": bson.M{"_id": nil, "avg": bson.M{"$avg": "$amount"}}},
	}
	cursor, err := expenseCol.Aggregate(ctx, pipeline)
	if err != nil {
		return 0, err
	}
	defer cursor.Close(ctx)

	var result []struct {
		Avg float64 `bson:"avg"`
	}
	if err := cursor.All(ctx, &result); err != nil || len(result) == 0 {
		return 0, nil
	}
	return result[0].Avg, nil
}

func categoryTotals(ctx context.Context, userID string, dateRange [2]time.Time) (map[string]float64, error) {
	pipeline := []bson.M{
		{"$match": bson.M{"userid": userID, "created_at": bson.M{"$gte": dateRange[0], "$lt": dateRange[1]}}},
		{"$group": bson.M{"_id": "$category", "total": bson.M{"$sum": "$amount"}}},
	}
	cursor, err := expenseCol.Aggregate(ctx, pipeline)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var results []struct {
		ID    string  `bson:"_id"`
		Total float64 `bson:"total"`
	}
	if err := cursor.All(ctx, &results); err != nil {
		return nil, err
	}
	totals := make(map[string]float64, len(results))
	for _, r := range results {
		totals[r.ID] = r.Total
	}
	return totals, nil
}

func threeMonthAvgTotals(ctx context.Context, userID string) (map[string]float64, error) {
	threeMonthsAgo := time.Now().AddDate(0, -3, 0)
	totals, err := categoryTotals(ctx, userID, [2]time.Time{threeMonthsAgo, time.Now()})
	if err != nil {
		return nil, err
	}
	avgs := make(map[string]float64, len(totals))
	for cat, total := range totals {
		avgs[cat] = total / 3.0
	}
	return avgs, nil
}

func lastMonthRange() [2]time.Time {
	now := time.Now()
	start := time.Date(now.Year(), now.Month()-1, 1, 0, 0, 0, 0, time.UTC)
	end := time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, time.UTC)
	return [2]time.Time{start, end}
}

func markJobFailed(ctx context.Context, jobID primitive.ObjectID, err error) error {
	importJobCol.UpdateOne(ctx,
		bson.M{"_id": jobID},
		bson.M{"$set": bson.M{"status": model.ImportStatusFailed, "error": err.Error()}},
	)
	return err
}

type errProcessing string

func (e errProcessing) Error() string { return string(e) }

var errNoKafka = errProcessing("KAFKA_BROKERS not set")
