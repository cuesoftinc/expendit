package service

import (
	"expendit-server/internal/model"
)

func GenerateSummary(txns []model.ImportedTransaction) model.ImportSummary {
	summary := model.ImportSummary{
		ByCategory:    make(map[string]float64),
		MonthlyTrends: []model.MonthlyTrend{},
	}

	monthlyMap := make(map[string]*model.MonthlyTrend)

	for _, txn := range txns {
		month := txn.Date.Format("2006-01")
		if _, ok := monthlyMap[month]; !ok {
			monthlyMap[month] = &model.MonthlyTrend{Month: month}
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
