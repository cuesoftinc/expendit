package service

import (
	"context"
	"fmt"
	"time"

	"github.com/cuesoftinc/expendit/api/common/internal/model"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
)

// DetectAnomalies compares this import's transactions against the user's history.
func DetectAnomalies(ctx context.Context, expCol *mongo.Collection, userID string, txns []model.ImportedTransaction) []model.Anomaly {
	var anomalies []model.Anomaly

	avgAmount, _ := getUserAvgAmount(ctx, expCol, userID)
	lastMonthTotals, _ := getCategoryTotals(ctx, expCol, userID, lastMonthRange())
	threeMonthAvg := computeThreeMonthAvg(ctx, expCol, userID)

	importTotals := make(map[string]float64)
	for _, txn := range txns {
		if txn.Type != "expense" {
			continue
		}
		importTotals[txn.Category] += txn.Amount

		if avgAmount > 0 && txn.Amount > avgAmount*3 {
			anomalies = append(anomalies, model.Anomaly{
				Type:        model.AnomalyLargeTransaction,
				Description: fmt.Sprintf("%.0f is %.1fx your average transaction of %.0f", txn.Amount, txn.Amount/avgAmount, avgAmount),
				Amount:      txn.Amount,
				Category:    txn.Category,
			})
		}
	}

	seen := make(map[string]bool)
	for category, total := range importTotals {
		key := string(model.AnomalySpendingSpike) + ":" + category
		if lastMonth, ok := lastMonthTotals[category]; ok && lastMonth > 0 && !seen[key] {
			pct := (total - lastMonth) / lastMonth * 100
			if pct > 50 {
				seen[key] = true
				anomalies = append(anomalies, model.Anomaly{
					Type:        model.AnomalySpendingSpike,
					Description: fmt.Sprintf("%s spending is %.0f%% above last month (%.0f vs %.0f)", category, pct, total, lastMonth),
					Category:    category,
					Amount:      total,
				})
			}
		}

		key = string(model.AnomalyAbnormalCategory) + ":" + category
		if avg, ok := threeMonthAvg[category]; ok && avg > 0 && !seen[key] {
			pct := (total - avg) / avg * 100
			if pct > 50 {
				seen[key] = true
				anomalies = append(anomalies, model.Anomaly{
					Type:        model.AnomalyAbnormalCategory,
					Description: fmt.Sprintf("%s spending is %.0f%% above your 3-month average (%.0f vs %.0f)", category, pct, total, avg),
					Category:    category,
					Amount:      total,
				})
			}
		}
	}

	return anomalies
}

func getUserAvgAmount(ctx context.Context, col *mongo.Collection, userID string) (float64, error) {
	ninetyDaysAgo := time.Now().AddDate(0, 0, -90)
	pipeline := mongo.Pipeline{
		{{Key: "$match", Value: bson.M{"userid": userID, "created_at": bson.M{"$gte": ninetyDaysAgo}}}},
		{{Key: "$group", Value: bson.M{"_id": nil, "avg": bson.M{"$avg": "$amount"}}}},
	}
	cursor, err := col.Aggregate(ctx, pipeline)
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

func computeThreeMonthAvg(ctx context.Context, col *mongo.Collection, userID string) map[string]float64 {
	threeMonthsAgo := time.Now().AddDate(0, -3, 0)
	totals, err := getCategoryTotals(ctx, col, userID, [2]time.Time{threeMonthsAgo, time.Now()})
	if err != nil {
		return nil
	}
	avgs := make(map[string]float64, len(totals))
	for cat, total := range totals {
		avgs[cat] = total / 3.0
	}
	return avgs
}

func getCategoryTotals(ctx context.Context, col *mongo.Collection, userID string, dateRange [2]time.Time) (map[string]float64, error) {
	pipeline := mongo.Pipeline{
		{{Key: "$match", Value: bson.M{
			"userid":     userID,
			"created_at": bson.M{"$gte": dateRange[0], "$lt": dateRange[1]},
		}}},
		{{Key: "$group", Value: bson.M{
			"_id":   "$category",
			"total": bson.M{"$sum": "$amount"},
		}}},
	}
	cursor, err := col.Aggregate(ctx, pipeline)
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

func lastMonthRange() [2]time.Time {
	now := time.Now()
	start := time.Date(now.Year(), now.Month()-1, 1, 0, 0, 0, 0, time.UTC)
	end := time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, time.UTC)
	return [2]time.Time{start, end}
}
