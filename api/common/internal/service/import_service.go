package service

// CRUD-only now: the parse/categorize/dedup/anomaly decisions that used to
// live in ProcessImport moved to api/process (see import_pipeline.go for the
// Kafka handlers that replaced it). Everything below only reads or writes
// records api/common already owns.

import (
	"context"
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
	categoryCol    *mongo.Collection = database.OpenCollection(database.Client, "category")
	fingerprintCol *mongo.Collection = database.OpenCollection(database.Client, "import_fingerprints")
)

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
	var fingerprints []bson.M

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
		fingerprints = append(fingerprints, bson.M{
			"fingerprint": txn.Fingerprint,
			"userid":      userID,
			"created_at":  now,
		})
	}

	if len(fingerprints) > 0 {
		docs := make([]interface{}, len(fingerprints))
		for i, f := range fingerprints {
			docs[i] = f
		}
		if _, err := fingerprintCol.InsertMany(ctx, docs); err != nil {
			return err
		}
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
