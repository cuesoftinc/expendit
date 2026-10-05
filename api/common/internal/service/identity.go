package service

import (
	"context"
	"net/http"
	"regexp"
	"strings"

	"github.com/jackc/pgx/v5"

	"github.com/cuesoftinc/expendit/api/common/internal/auth"
	"github.com/cuesoftinc/expendit/api/common/internal/middleware"
	"github.com/cuesoftinc/expendit/api/common/internal/model"
	"github.com/cuesoftinc/expendit/api/common/internal/repository"
)

// DefaultCategories seeds a new org; analytics' keyword rules map onto them.
var DefaultCategories = []model.Category{
	{Name: "Food", Type: "expense", Color: "#E07A5F"},
	{Name: "Groceries", Type: "expense", Color: "#81B29A"},
	{Name: "Transportation", Type: "expense", Color: "#3D85C6"},
	{Name: "Utility", Type: "expense", Color: "#F2CC8F"},
	{Name: "Data", Type: "expense", Color: "#6D9DC5"},
	{Name: "Shopping", Type: "expense", Color: "#C77DFF"},
	{Name: "Health", Type: "expense", Color: "#EF476F"},
	{Name: "Travel", Type: "expense", Color: "#06D6A0"},
	{Name: "School", Type: "expense", Color: "#118AB2"},
	{Name: "Cash", Type: "expense", Color: "#8D99AE"},
	{Name: "Bank Transfer", Type: "expense", Color: "#5C677D"},
	{Name: "Savings", Type: "expense", Color: "#2A9D8F"},
	{Name: "Other", Type: "expense", Color: "#8A8F98"},
	{Name: "Income", Type: "income", Color: "#2EC4B6"},
	{Name: "Bank Transfer", Type: "income", Color: "#5C677D"},
	{Name: "Other", Type: "income", Color: "#8A8F98"},
}

type Identity struct {
	DB *repository.DB
}

// SignIn upserts the user; a first sign-in creates their personal org
// (E-4: every user owns one) and claims pending invites.
func (s *Identity) SignIn(ctx context.Context, id *auth.Identity) (string, error) {
	var userID string
	err := s.DB.AsSystem(ctx, func(tx pgx.Tx) error {
		user, created, err := repository.UpsertUser(ctx, tx, id.UID, id.Email, id.Name)
		if err != nil {
			return err
		}
		userID = user.ID
		if err := repository.ClaimInvites(ctx, tx, user.ID, user.Email); err != nil {
			return err
		}
		if !created {
			return nil
		}
		name := id.Name
		if name == "" {
			name = strings.Split(id.Email, "@")[0]
		}
		_, err = createOrg(ctx, tx, user.ID, user.Email, model.Org{Name: name, Kind: "personal", Currency: "NGN", Country: "NG", FiscalYearEnd: "12-31"})
		return err
	})
	return userID, err
}

func (s *Identity) ResolveOrg(ctx context.Context, userID, orgID string) (string, model.Role, error) {
	var role model.Role
	err := s.DB.AsSystem(ctx, func(tx pgx.Tx) (err error) {
		if orgID == "" {
			if orgID, err = repository.PersonalOrgID(ctx, tx, userID); err != nil {
				return err
			}
		}
		role, err = repository.MemberRole(ctx, tx, orgID, userID)
		return err
	})
	if err == repository.ErrNotFound {
		return "", "", middleware.ErrNotMember
	}
	return orgID, role, err
}

func createOrg(ctx context.Context, tx pgx.Tx, userID, email string, o model.Org) (*model.Org, error) {
	org, err := repository.CreateOrg(ctx, tx, o)
	if err != nil {
		return nil, err
	}
	if _, err := repository.AddMember(ctx, tx, org.ID, &userID, email, model.RoleOwner); err != nil {
		return nil, err
	}
	if err := repository.Narrow(ctx, tx, org.ID); err != nil {
		return nil, err
	}
	for _, c := range DefaultCategories {
		c.OrgID, c.TaxTreatment, c.VATTreatment, c.VATBasis = org.ID, "taxable_income", "vatable", "inclusive"
		if _, err := repository.CreateCategory(ctx, tx, c); err != nil {
			return nil, err
		}
	}
	return org, nil
}

type Me struct {
	User *model.User `json:"user"`
	Orgs []model.Org `json:"orgs"`
}

func (s *Identity) Orgs(ctx context.Context, p *middleware.Principal) ([]model.Org, error) {
	var orgs []model.Org
	err := s.DB.AsSystem(ctx, func(tx pgx.Tx) (err error) {
		orgs, err = repository.OrgsForUser(ctx, tx, p.UserID)
		return err
	})
	return orgs, err
}

var (
	fiscalYearEnd = regexp.MustCompile(`^(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$`)
	currencyCode  = regexp.MustCompile(`^[A-Z]{3}$`)
	countryCode   = regexp.MustCompile(`^[A-Z]{2}$`)
	stateCode     = regexp.MustCompile(`^[A-Z]{2}-[A-Z0-9]{1,3}$`)
)

type OrgInput struct {
	Name              string         `json:"name"`
	Kind              string         `json:"kind"`
	Currency          string         `json:"currency"`
	Country           string         `json:"country"`
	FiscalYearEnd     string         `json:"fiscal_year_end"`
	RegisteredAddress *model.Address `json:"registered_address"`
}

func validateAddress(a *model.Address) map[string]any {
	if a == nil {
		return nil
	}
	if a.Line1 == "" || a.City == "" || !stateCode.MatchString(a.State) || a.Country == "" {
		return map[string]any{"registered_address": "line1, city, state (e.g. NG-LA) and country are required"}
	}
	return nil
}

func (s *Identity) CreateOrg(ctx context.Context, p *middleware.Principal, in OrgInput) (*model.Org, error) {
	in.Name = strings.TrimSpace(in.Name)
	if in.FiscalYearEnd == "" {
		in.FiscalYearEnd = "12-31"
	}
	switch {
	case in.Name == "" || len(in.Name) > 200:
		return nil, invalid("Give the organization a name", map[string]any{"name": "required"})
	case in.Kind != "company":
		// Personal orgs are created at sign-in, one per user.
		return nil, invalid("Only company organizations can be created", map[string]any{"kind": "must be company"})
	case !currencyCode.MatchString(in.Currency) || !countryCode.MatchString(in.Country):
		return nil, invalid("currency and country must be ISO codes", nil)
	case !fiscalYearEnd.MatchString(in.FiscalYearEnd):
		return nil, invalid("fiscal_year_end must be MM-DD", nil)
	}
	if d := validateAddress(in.RegisteredAddress); d != nil {
		return nil, invalid("The registered address is incomplete", d)
	}
	var org *model.Org
	err := s.DB.AsSystem(ctx, func(tx pgx.Tx) (err error) {
		org, err = createOrg(ctx, tx, p.UserID, p.Email, model.Org{Name: in.Name, Kind: in.Kind, Currency: in.Currency,
			Country: in.Country, FiscalYearEnd: in.FiscalYearEnd, RegisteredAddress: in.RegisteredAddress})
		return err
	})
	return org, err
}

type OrgPatch struct {
	Name              *string        `json:"name"`
	FiscalYearEnd     *string        `json:"fiscal_year_end"`
	RegisteredAddress *model.Address `json:"registered_address"`
}

// UpdateOrg: owner only (org settings are the owner's, engineering.md §2).
func (s *Identity) UpdateOrg(ctx context.Context, p *middleware.Principal, orgID string, in OrgPatch) (*model.Org, error) {
	role, err := s.roleIn(ctx, p.UserID, orgID)
	if err != nil {
		return nil, err
	}
	if !role.AtLeast(model.RoleOwner) {
		return nil, ErrForbidden
	}
	if in.FiscalYearEnd != nil && !fiscalYearEnd.MatchString(*in.FiscalYearEnd) {
		return nil, invalid("fiscal_year_end must be MM-DD", nil)
	}
	if d := validateAddress(in.RegisteredAddress); d != nil {
		return nil, invalid("The registered address is incomplete", d)
	}
	var org *model.Org
	err = s.DB.InOrg(ctx, orgID, func(tx pgx.Tx) error {
		current, err := repository.GetOrg(ctx, tx, orgID)
		if err != nil {
			return err
		}
		if in.Name != nil && strings.TrimSpace(*in.Name) != "" {
			current.Name = strings.TrimSpace(*in.Name)
		}
		if in.FiscalYearEnd != nil {
			current.FiscalYearEnd = *in.FiscalYearEnd
		}
		if in.RegisteredAddress != nil {
			current.RegisteredAddress = in.RegisteredAddress
		}
		if org, err = repository.UpdateOrg(ctx, tx, *current); err != nil {
			return err
		}
		// Fiscal year end and address change tax periods and authorities.
		_, err = repository.BumpDataVersion(ctx, tx, orgID)
		return err
	})
	return org, err
}

func (s *Identity) roleIn(ctx context.Context, userID, orgID string) (model.Role, error) {
	_, role, err := s.ResolveOrg(ctx, userID, orgID)
	if err == middleware.ErrNotMember {
		return "", ErrNotFound
	}
	return role, err
}

func (s *Identity) Members(ctx context.Context, p *middleware.Principal, orgID string) ([]model.Member, error) {
	if _, err := s.roleIn(ctx, p.UserID, orgID); err != nil {
		return nil, err
	}
	var members []model.Member
	err := s.DB.InOrg(ctx, orgID, func(tx pgx.Tx) (err error) {
		members, err = repository.ListMembers(ctx, tx, orgID)
		return err
	})
	return members, err
}

func validRole(r model.Role) bool {
	return r == model.RoleOwner || r == model.RoleAdmin || r == model.RoleMember
}

// Invite adds an existing user directly, or a pending email invite that
// activates on that email's first sign-in. Owner only.
func (s *Identity) Invite(ctx context.Context, p *middleware.Principal, orgID, email string, role model.Role) (*model.Member, error) {
	if r, err := s.roleIn(ctx, p.UserID, orgID); err != nil {
		return nil, err
	} else if !r.AtLeast(model.RoleOwner) {
		return nil, ErrForbidden
	}
	email = strings.ToLower(strings.TrimSpace(email))
	if !strings.Contains(email, "@") || !validRole(role) {
		return nil, invalid("Give an email and a role (owner, admin or member)", nil)
	}
	var member *model.Member
	err := s.DB.AsSystem(ctx, func(tx pgx.Tx) error {
		var userID *string
		if user, err := repository.FindUserByEmail(ctx, tx, email); err == nil {
			userID = &user.ID
		} else if err != repository.ErrNotFound {
			return err
		}
		var err error
		member, err = repository.AddMember(ctx, tx, orgID, userID, email, role)
		return err
	})
	if err == repository.ErrConflict {
		return nil, newErr(http.StatusConflict, "already_member", "That person is already in this organization")
	}
	return member, err
}

func (s *Identity) SetRole(ctx context.Context, p *middleware.Principal, orgID, userID string, role model.Role) (*model.Member, error) {
	if r, err := s.roleIn(ctx, p.UserID, orgID); err != nil {
		return nil, err
	} else if !r.AtLeast(model.RoleOwner) {
		return nil, ErrForbidden
	}
	if !validRole(role) {
		return nil, invalid("role must be owner, admin or member", nil)
	}
	var member *model.Member
	err := s.DB.InOrg(ctx, orgID, func(tx pgx.Tx) error {
		current, err := repository.MemberRole(ctx, tx, orgID, userID)
		if err != nil {
			return err
		}
		if current == model.RoleOwner && role != model.RoleOwner {
			if err := keepAnOwner(ctx, tx, orgID); err != nil {
				return err
			}
		}
		member, err = repository.SetMemberRole(ctx, tx, orgID, userID, role)
		return err
	})
	return member, err
}

func (s *Identity) RemoveMember(ctx context.Context, p *middleware.Principal, orgID, userID string) error {
	if r, err := s.roleIn(ctx, p.UserID, orgID); err != nil {
		return err
	} else if !r.AtLeast(model.RoleOwner) && userID != p.UserID {
		return ErrForbidden // anyone may leave; only owners remove others
	}
	return s.DB.InOrg(ctx, orgID, func(tx pgx.Tx) error {
		if role, err := repository.MemberRole(ctx, tx, orgID, userID); err != nil {
			return err
		} else if role == model.RoleOwner {
			if err := keepAnOwner(ctx, tx, orgID); err != nil {
				return err
			}
		}
		return repository.RemoveMember(ctx, tx, orgID, userID)
	})
}

func keepAnOwner(ctx context.Context, tx pgx.Tx, orgID string) error {
	n, err := repository.CountOwners(ctx, tx, orgID)
	if err != nil {
		return err
	}
	if n <= 1 {
		return newErr(http.StatusConflict, "last_owner", "An organization needs at least one owner")
	}
	return nil
}

// ── Consent (self only) ─────────────────────────────────────────────────

func (s *Identity) Consents(ctx context.Context, p *middleware.Principal) ([]model.Consent, error) {
	var out []model.Consent
	err := s.DB.AsSystem(ctx, func(tx pgx.Tx) (err error) {
		out, err = repository.ListConsents(ctx, tx, p.UserID)
		return err
	})
	return out, err
}

func (s *Identity) RecordConsent(ctx context.Context, p *middleware.Principal, document, version string) (*model.Consent, error) {
	if document != "tos" && document != "privacy" && document != "ai_processing" {
		return nil, invalid("document must be tos, privacy or ai_processing", nil)
	}
	if strings.TrimSpace(version) == "" {
		return nil, invalid("version is required", nil)
	}
	var c *model.Consent
	err := s.DB.AsSystem(ctx, func(tx pgx.Tx) (err error) {
		c, err = repository.RecordConsent(ctx, tx, p.UserID, document, version)
		return err
	})
	return c, err
}
