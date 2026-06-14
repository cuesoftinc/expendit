package services

import (
	"context"
	"strings"
	"time"

	"expendit-server/database"
	"expendit-server/models"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
)

var categoryCol *mongo.Collection = database.OpenCollection(database.Client, "category")

type categoryRule struct {
	Keywords []string
	Category string
}

// Rules map to existing default categories where possible.
// Existing defaults: Food, Transportation, Groceries, Utility, Data, School, Netflix, Gaming
var categorizationRules = []categoryRule{
	{Keywords: []string{"uber", "bolt", "taxify", "lyft", "okada", "tricycle", "bus fare", "transport", "fare", "taxi", "ride"}, Category: "Transportation"},
	{Keywords: []string{"kfc", "dominos", "pizza", "restaurant", "cafe", "burger", "chicken republic", "suya", "amala", "jollof", "shawarma", "eatery", "diner", "food"}, Category: "Food"},
	{Keywords: []string{"shoprite", "spar", "market", "supermarket", "grocery", "groceries", "provision"}, Category: "Groceries"},
	{Keywords: []string{"mtn", "airtel", "glo", "9mobile", "electricity", "nepa", "phcn", "water", "internet", "wifi", "cable", "dstv", "gotv", "startimes", "utility", "bills"}, Category: "Utility"},
	{Keywords: []string{"data", "recharge", "airtime", "topup", "bundle"}, Category: "Data"},
	{Keywords: []string{"school", "tuition", "university", "college", "education", "lesson", "tutorial", "academy"}, Category: "School"},
	{Keywords: []string{"netflix", "netflix.com"}, Category: "Netflix"},
	{Keywords: []string{"gaming", "playstation", "xbox", "steam", "game", "esport", "battlenet"}, Category: "Gaming"},
	// Interest & dividends → income (check before broad savings rule)
	{Keywords: []string{"interest earned", "interest credit", "dividend", "bonus credit", "cashback"}, Category: "Income"},
	// Savings & investment platforms
	{Keywords: []string{"owealth", "piggyvest", "cowrywise", "risevest", "bamboo", "auto-save", "autosave", "savings deposit", "investment"}, Category: "Savings"},
	// Salary & wages → income
	{Keywords: []string{"salary", "wage", "payroll", "stipend"}, Category: "Income"},
	// Cash & withdrawals
	{Keywords: []string{"atm", "withdrawal", "cash out", "cash"}, Category: "Cash"},
	// POS & card payments
	{Keywords: []string{"pos", "card payment", "ussd", "mobile money"}, Category: "Bank Transfer"},
	{Keywords: []string{"amazon", "jumia", "konga", "aliexpress", "shop", "mall", "purchase", "buy"}, Category: "Shopping"},
	{Keywords: []string{"hospital", "pharmacy", "clinic", "health", "medical", "doctor", "lab"}, Category: "Health"},
	{Keywords: []string{"hotel", "flight", "travel", "airbnb", "booking.com", "trip", "airline"}, Category: "Travel"},
	{Keywords: []string{"transfer", "wire", "remittance", "bank transfer", "nip", "neft", "rtgs"}, Category: "Bank Transfer"},
}

// CategorizationEngine resolves categories against the DB, creating new ones only when needed.
type CategorizationEngine struct {
	// normalized lowercase name → actual DB-stored name
	cache map[string]string
}

func NewCategorizationEngine(ctx context.Context) (*CategorizationEngine, error) {
	cursor, err := categoryCol.Find(ctx, bson.M{})
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	cache := make(map[string]string)
	var cats []models.Category
	if err := cursor.All(ctx, &cats); err != nil {
		return nil, err
	}
	for _, c := range cats {
		cache[strings.ToLower(c.Name)] = c.Name
	}

	return &CategorizationEngine{cache: cache}, nil
}

// Categorize returns the DB category name for a transaction description.
func (e *CategorizationEngine) Categorize(ctx context.Context, description string) string {
	normalized := strings.ToLower(description)
	for _, rule := range categorizationRules {
		for _, kw := range rule.Keywords {
			if strings.Contains(normalized, kw) {
				return e.resolveOrCreate(ctx, rule.Category)
			}
		}
	}
	return e.resolveOrCreate(ctx, "Other")
}

// CategoryNames returns all category names currently known to this engine.
func (e *CategorizationEngine) CategoryNames() []string {
	names := make([]string, 0, len(e.cache))
	for _, name := range e.cache {
		names = append(names, name)
	}
	return names
}

// Resolve maps a category name to its DB-stored form, creating it if needed.
func (e *CategorizationEngine) Resolve(ctx context.Context, name string) string {
	return e.resolveOrCreate(ctx, name)
}

// resolveOrCreate returns the matching existing category name (case-insensitive),
// or inserts a new category and returns its name.
func (e *CategorizationEngine) resolveOrCreate(ctx context.Context, name string) string {
	key := strings.ToLower(name)
	if existing, ok := e.cache[key]; ok {
		return existing
	}

	cat := models.Category{
		ID:        primitive.NewObjectID(),
		Name:      name,
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}
	if _, err := categoryCol.InsertOne(ctx, cat); err == nil {
		e.cache[key] = name
	}
	return name
}
