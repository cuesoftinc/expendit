package services

import (
	"expendit-server/models"
)

func GenerateSummary(txns []models.ImportedTransaction) models.ImportSummary {
	summary := models.ImportSummary{
		ByCategory:    make(map[string]float64),
		MonthlyTrends: []models.MonthlyTrend{},
	}

	monthlyMap := make(map[string]*models.MonthlyTrend)

	for _, txn := range txns {
		month := txn.Date.Format("2006-01")
		if _, ok := monthlyMap[month]; !ok {
			monthlyMap[month] = &models.MonthlyTrend{Month: month}
		}

		if txn.Type == "income" {
			summary.TotalIncome += txn.Amount
			monthlyMap[month].Income += txn.Amount
		} else {
			summary.TotalExpenses += txn.Amount
			summary.ByCategory[txn.Category] += txn.Amount
			monthlyMap[month].Expenses += txn.Amount
		}
	}

	summary.NetCashFlow = summary.TotalIncome - summary.TotalExpenses

	for _, trend := range monthlyMap {
		summary.MonthlyTrends = append(summary.MonthlyTrends, *trend)
	}

	return summary
}
