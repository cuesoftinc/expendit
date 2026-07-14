package main

import (
	"context"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"

	"expendit-server/internal/handler"
	"expendit-server/internal/middleware"
	"expendit-server/internal/router"
)

func main() {
	slog.SetDefault(slog.New(slog.NewJSONHandler(os.Stdout, nil)))

	if err := godotenv.Load(".env"); err != nil {
		slog.Warn("no .env file found; using environment variables")
	}
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	gin.SetMode(gin.ReleaseMode)
	engine := gin.New()
	engine.Use(gin.Recovery(), middleware.RequestID(), middleware.Logger(), middleware.CORSMiddleware())

	// Liveness + readiness — registered before the route groups so they stay
	// public. (incomeRouter/reportRouter call .Use(Authenticate()) on the shared
	// engine, which leaks auth onto any route registered after them.)
	engine.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "healthy"})
	})
	engine.GET("/ready", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ready"})
	})

	router.AuthRoutes(engine)
	router.UserRoutes(engine)
	router.ExpenseRoutes(engine)
	router.IncomeRoutes(engine)
	router.CategoryRoutes(engine)
	router.ReportRoutes(engine)
	router.ImportRoutes(engine)
	engine.GET("/ai/summary/:userID", middleware.Authenticate(), handler.AISummary())

	if err := handler.CreateCategories(); err != nil {
		slog.Error("failed to initialize categories", "error", err)
		os.Exit(1)
	}
	slog.Info("categories initialization completed")

	srv := &http.Server{
		Addr:              ":" + port,
		Handler:           engine,
		ReadHeaderTimeout: 10 * time.Second,
	}

	go func() {
		slog.Info("server listening", "addr", srv.Addr)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			slog.Error("server error", "error", err)
			os.Exit(1)
		}
	}()

	// Graceful shutdown on SIGINT/SIGTERM.
	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer stop()
	<-ctx.Done()
	slog.Info("shutting down server")

	shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if err := srv.Shutdown(shutdownCtx); err != nil {
		slog.Error("forced shutdown", "error", err)
		os.Exit(1)
	}
	slog.Info("server exited")
}
