import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storagePromise } from "./storage";
import { debugCode, analyzeComplexity, detectConcepts } from "./gemini";
import { insertCodeSubmissionSchema, insertExecutionHistorySchema, insertLearningAnalyticsSchema } from "@shared/schema";
import { codeExecutionService, ExecutionResult } from "./code-execution";

export async function registerRoutes(app: Express): Promise<Server> {
  // sets up /api/register, /api/login, /api/logout, /api/user
  await setupAuth(app);

  // Middleware to check authentication for protected routes
  const requireAuth = (req: any, res: any, next: any) => {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({ message: "Authentication required" });
    }
    next();
  };

  // Debug endpoint
  app.post("/api/debug", requireAuth, async (req, res) => {
    try {
      const storage = await storagePromise;
      const { code, language, error } = req.body;
      
      if (!code || !language) {
        return res.status(400).json({ message: "Code and language are required" });
      }

      const debugResult = await debugCode(code, language, error);
      
      // Save submission to database
      const submission = await storage.createCodeSubmission({
        userId: req.user!.id,
        code,
        language,
        debuggingResults: JSON.stringify(debugResult),
        timeComplexity: null,
        spaceComplexity: null,
        concepts: [],
        aiSuggestions: debugResult.explanation
      });

      // Update user progress
      const userProgress = await storage.getUserProgress(req.user!.id);
      if (userProgress) {
        await storage.updateUserProgress(req.user!.id, {
          bugsFixed: userProgress.bugsFixed + 1,
          lastActive: new Date()
        });
      }

      res.json(debugResult);
    } catch (error) {
      console.error("Debug error:", error);
      res.status(500).json({ message: "Failed to debug code" });
    }
  });

  // Complexity analysis endpoint
  app.post("/api/complexity", requireAuth, async (req, res) => {
    try {
      const { code, language } = req.body;
      
      if (!code || !language) {
        return res.status(400).json({ message: "Code and language are required" });
      }

      const complexityResult = await analyzeComplexity(code, language);
      
      // Save or update submission
      const storage = await storagePromise;
      const submission = await storage.createCodeSubmission({
        userId: req.user!.id,
        code,
        language,
        timeComplexity: complexityResult.timeComplexity,
        spaceComplexity: complexityResult.spaceComplexity,
        debuggingResults: null,
        concepts: [],
        aiSuggestions: complexityResult.analysis
      });

      res.json(complexityResult);
    } catch (error) {
      console.error("Complexity analysis error:", error);
      res.status(500).json({ message: "Failed to analyze complexity" });
    }
  });

  // Recommendations endpoint
  app.post("/api/recommendations", requireAuth, async (req, res) => {
    try {
      const { code, language } = req.body;
      
      if (!code || !language) {
        return res.status(400).json({ message: "Code and language are required" });
      }

      const conceptResult = await detectConcepts(code, language);
      
      // Save or update submission
      const storage = await storagePromise;
      const submission = await storage.createCodeSubmission({
        userId: req.user!.id,
        code,
        language,
        concepts: conceptResult.concepts,
        timeComplexity: null,
        spaceComplexity: null,
        debuggingResults: null,
        aiSuggestions: JSON.stringify(conceptResult.recommendations)
      });

      res.json(conceptResult);
    } catch (error) {
      console.error("Recommendations error:", error);
      res.status(500).json({ message: "Failed to get recommendations" });
    }
  });

  // Get user progress
  app.get("/api/progress", requireAuth, async (req, res) => {
    try {
      const storage = await storagePromise;
      const userProgress = await storage.getUserProgress(req.user!.id);
      const submissions = await storage.getCodeSubmissionsByUser(req.user!.id);
      
      res.json({
        progress: userProgress,
        submissions: submissions.slice(-10), // Last 10 submissions
        user: req.user
      });
    } catch (error) {
      console.error("Progress error:", error);
      res.status(500).json({ message: "Failed to fetch progress" });
    }
  });

  // Reset user progress and execution history
  app.post("/api/progress/reset", requireAuth, async (req, res) => {
    try {
      const storage = await storagePromise;
      const userId = req.user!.id;

      // Reset aggregated progress stats
      const userProgress = await storage.getUserProgress(userId);
      if (userProgress) {
        await storage.updateUserProgress(userId, {
          problemsSolved: 0,
          bugsFixed: 0,
          languagesUsed: {},
          achievements: [],
          totalExecutions: 0,
          successfulExecutions: 0,
          averageExecutionTime: 0,
          favoriteLanguage: null,
          lastActive: new Date(),
        });
      }

      // Delete execution history entries
      const history = await storage.getExecutionHistoryByUser(userId, 1000);
      await Promise.all(history.map((item) => storage.deleteExecutionHistory(item.id)));

      // Delete code submissions used for progress graphs and recent activity
      await storage.deleteCodeSubmissionsByUser(userId);

      // Delete learning analytics records
      await storage.deleteLearningAnalyticsByUser(userId);

      res.json({ message: "Progress and execution history reset successfully" });
    } catch (error) {
      console.error("Reset progress error:", error);
      res.status(500).json({ message: "Failed to reset progress" });
    }
  });

  // Get code submissions history
  app.get("/api/submissions", requireAuth, async (req, res) => {
    try {
      const storage = await storagePromise;
      const submissions = await storage.getCodeSubmissionsByUser(req.user!.id);
      res.json(submissions);
    } catch (error) {
      console.error("Submissions error:", error);
      res.status(500).json({ message: "Failed to fetch submissions" });
    }
  });

  // Real-time code execution endpoint
  app.post("/api/execute", requireAuth, async (req, res) => {
    try {
      const { code, language, stdin } = req.body;
      
      if (!code || !language) {
        return res.status(400).json({ message: "Code and language are required" });
      }

      const executionResult = await codeExecutionService.executeCode(code, language, stdin);
      
      // Save execution to database
      const storage = await storagePromise;
      
      // Save to execution history
      const executionHistory = await storage.createExecutionHistory({
        userId: req.user!.id,
        code,
        language,
        stdin: stdin || "",
        output: executionResult.output || "",
        error: executionResult.error || "",
        exitCode: executionResult.exitCode,
        executionTime: executionResult.executionTime,
        memoryUsage: executionResult.memoryUsage,
        success: executionResult.exitCode === 0
      });

      // Save execution to code submissions (for legacy compatibility)
      const submission = await storage.createCodeSubmission({
        userId: req.user!.id,
        code,
        language,
        timeComplexity: null,
        spaceComplexity: null,
        concepts: [],
        aiSuggestions: `Execution time: ${executionResult.executionTime}ms`,
        debuggingResults: JSON.stringify(executionResult)
      });

      // Update user progress
      const userProgress = await storage.getUserProgress(req.user!.id);
      if (userProgress) {
        const languageUsed = { ...userProgress.languagesUsed };
        languageUsed[language] = (languageUsed[language] || 0) + 1;
        
        // Calculate new averages
        const totalExecutions = userProgress.totalExecutions + 1;
        const successfulExecutions = userProgress.successfulExecutions + (executionResult.exitCode === 0 ? 1 : 0);
        const averageExecutionTime = (userProgress.averageExecutionTime * userProgress.totalExecutions + executionResult.executionTime) / totalExecutions;
        
        await storage.updateUserProgress(req.user!.id, {
          problemsSolved: userProgress.problemsSolved + 1,
          languagesUsed: languageUsed,
          totalExecutions,
          successfulExecutions,
          averageExecutionTime,
          lastActive: new Date()
        });

        // Update learning analytics
        const successRate = (successfulExecutions / totalExecutions) * 100;
        await storage.updateLearningAnalytics(req.user!.id, language, {
          executionsCount: languageUsed[language],
          successRate,
          averageTime: executionResult.executionTime
        });
      }

      res.json({ ...executionResult, historyId: executionHistory.id });
    } catch (error) {
      console.error("Code execution error:", error);
      res.status(500).json({ message: "Failed to execute code" });
    }
  });

  // Get code template for a language
  app.get("/api/template/:language", requireAuth, async (req, res) => {
    try {
      const { language } = req.params;
      const template = codeExecutionService.getTemplate(language);
      res.json({ template, language });
    } catch (error) {
      console.error("Template error:", error);
      res.status(500).json({ message: "Failed to get template" });
    }
  });

  // Enhanced AI analysis endpoint (combines all AI features)
  app.post("/api/analyze", requireAuth, async (req, res) => {
    try {
      const { code, language, analysisType = "all" } = req.body;
      
      if (!code || !language) {
        return res.status(400).json({ message: "Code and language are required" });
      }

      const results: any = {};

      // Run different types of analysis based on request
      if (analysisType === "all" || analysisType === "debug") {
        results.debug = await debugCode(code, language);
      }

      if (analysisType === "all" || analysisType === "complexity") {
        results.complexity = await analyzeComplexity(code, language);
      }

      if (analysisType === "all" || analysisType === "concepts") {
        results.concepts = await detectConcepts(code, language);
      }

      // Save comprehensive analysis to database
      const storage = await storagePromise;
      const submission = await storage.createCodeSubmission({
        userId: req.user!.id,
        code,
        language,
        timeComplexity: results.complexity?.timeComplexity || null,
        spaceComplexity: results.complexity?.spaceComplexity || null,
        concepts: results.concepts?.concepts || [],
        aiSuggestions: JSON.stringify({
          debug: results.debug?.suggestions || [],
          recommendations: results.concepts?.recommendations || []
        }),
        debuggingResults: JSON.stringify(results.debug || null)
      });

      // Update user progress
      const userProgress = await storage.getUserProgress(req.user!.id);
      if (userProgress) {
        await storage.updateUserProgress(req.user!.id, {
          bugsFixed: userProgress.bugsFixed + (results.debug ? 1 : 0),
          lastActive: new Date()
        });
      }

      res.json(results);
    } catch (error) {
      console.error("AI analysis error:", error);
      res.status(500).json({ message: "Failed to analyze code" });
    }
  });

  // Get execution history
  app.get("/api/execution-history", requireAuth, async (req, res) => {
    try {
      const storage = await storagePromise;
      const limit = parseInt(req.query.limit as string) || 50;
      const history = await storage.getExecutionHistoryByUser(req.user!.id, limit);
      res.json(history);
    } catch (error) {
      console.error("Execution history error:", error);
      res.status(500).json({ message: "Failed to fetch execution history" });
    }
  });

  // Get specific execution history item
  app.get("/api/execution-history/:id", requireAuth, async (req, res) => {
    try {
      const storage = await storagePromise;
      const history = await storage.getExecutionHistory(req.params.id);
      
      if (!history || history.userId !== req.user!.id) {
        return res.status(404).json({ message: "Execution history not found" });
      }
      
      res.json(history);
    } catch (error) {
      console.error("Execution history item error:", error);
      res.status(500).json({ message: "Failed to fetch execution history item" });
    }
  });

  // Delete execution history item
  app.delete("/api/execution-history/:id", requireAuth, async (req, res) => {
    try {
      const storage = await storagePromise;
      const history = await storage.getExecutionHistory(req.params.id);
      
      if (!history || history.userId !== req.user!.id) {
        return res.status(404).json({ message: "Execution history not found" });
      }
      
      await storage.deleteExecutionHistory(req.params.id);
      res.json({ message: "Execution history deleted successfully" });
    } catch (error) {
      console.error("Delete execution history error:", error);
      res.status(500).json({ message: "Failed to delete execution history" });
    }
  });

  // Get learning analytics
  app.get("/api/analytics", requireAuth, async (req, res) => {
    try {
      const storage = await storagePromise;
      const days = parseInt(req.query.days as string) || 30;
      const analytics = await storage.getLearningAnalyticsByUser(req.user!.id, days);
      
      // Get user progress for additional stats
      const progress = await storage.getUserProgress(req.user!.id);
      
      res.json({ analytics, progress });
    } catch (error) {
      console.error("Analytics error:", error);
      res.status(500).json({ message: "Failed to fetch analytics" });
    }
  });

  // Get dashboard data (combined analytics and history)
  app.get("/api/dashboard", requireAuth, async (req, res) => {
    try {
      const storage = await storagePromise;
      const days = parseInt(req.query.days as string) || 7;
      
      const [analytics, progress, recentHistory, user] = await Promise.all([
        storage.getLearningAnalyticsByUser(req.user!.id, days),
        storage.getUserProgress(req.user!.id),
        storage.getExecutionHistoryByUser(req.user!.id, 10),
        storage.getUser(req.user!.id)
      ]);
      
      // Calculate additional metrics
      const totalExecutions = progress?.totalExecutions || 0;
      const successRate = totalExecutions > 0 ? ((progress?.successfulExecutions || 0) / totalExecutions) * 100 : 0;
      const favoriteLanguage = progress?.favoriteLanguage || 
        Object.keys(progress?.languagesUsed || {}).reduce((a, b) => 
          (progress?.languagesUsed?.[a] || 0) > (progress?.languagesUsed?.[b] || 0) ? a : b, 'javascript');
      
      res.json({
        analytics,
        progress,
        recentHistory,
        metrics: {
          totalExecutions,
          successRate,
          favoriteLanguage,
          averageExecutionTime: progress?.averageExecutionTime || 0,
          streak: user?.streak || 0,
          level: user?.level || 1
        }
      });
    } catch (error) {
      console.error("Dashboard error:", error);
      res.status(500).json({ message: "Failed to fetch dashboard data" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
