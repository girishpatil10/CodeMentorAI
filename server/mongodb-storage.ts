import { MongoClient, Db, Collection } from "mongodb";
import { type User, type InsertUser, type CodeSubmission, type InsertCodeSubmission, type UserProgress, type InsertUserProgress, type ExecutionHistory, type InsertExecutionHistory, type LearningAnalytics, type InsertLearningAnalytics } from "@shared/schema";
import { type IStorage } from "./storage";
import session from "express-session";
import createMemoryStore from "memorystore";

const MemoryStore = createMemoryStore(session);

export class MongoDBStorage implements IStorage {
  private client: MongoClient;
  private db: Db;
  private users: Collection<User>;
  private codeSubmissions: Collection<CodeSubmission>;
  private userProgress: Collection<UserProgress>;
  private executionHistory: Collection<ExecutionHistory>;
  private learningAnalytics: Collection<LearningAnalytics>;
  public sessionStore: session.Store;

  constructor(connectionString: string) {
    // Ensure connection string includes database name if not present
    let uri = connectionString;
    if (!uri.includes("/codementor_ai") && !uri.match(/\/[^\/\?]+(\?|$)/)) {
      uri = uri.endsWith("/") ? uri + "codementor_ai" : uri + "/codementor_ai";
    }
    this.client = new MongoClient(uri);
    // Extract database name from URI or use default
    const dbMatch = uri.match(/\/([^\/\?]+)(\?|$)/);
    const dbName = dbMatch ? dbMatch[1] : "codementor_ai";
    this.db = this.client.db(dbName);
    this.users = this.db.collection("users");
    this.codeSubmissions = this.db.collection("code_submissions");
    this.userProgress = this.db.collection("user_progress");
    this.executionHistory = this.db.collection("execution_history");
    this.learningAnalytics = this.db.collection("learning_analytics");
    
    // Use memory store for sessions (you can use MongoDB sessions later if needed)
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000, // prune expired entries every 24h
    });
  }

  async connect(): Promise<void> {
    try {
      await this.client.connect();
      console.log("✅ Connected to MongoDB successfully!");
      
      // Create indexes for better performance
      await this.users.createIndex({ username: 1 }, { unique: true });
      await this.users.createIndex({ email: 1 }, { unique: true });
      await this.codeSubmissions.createIndex({ userId: 1 });
      await this.codeSubmissions.createIndex({ createdAt: -1 });
      await this.userProgress.createIndex({ userId: 1 }, { unique: true });
      await this.executionHistory.createIndex({ userId: 1 });
      await this.executionHistory.createIndex({ createdAt: -1 });
      await this.learningAnalytics.createIndex({ userId: 1 });
      await this.learningAnalytics.createIndex({ date: -1 });
      
      console.log("✅ Database indexes created successfully!");
    } catch (error) {
      console.error("❌ Failed to connect to MongoDB:", error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    await this.client.close();
  }

  // User methods
  async getUser(id: string): Promise<User | undefined> {
    const user = await this.users.findOne({ id });
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const user = await this.users.findOne({ username });
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const user = await this.users.findOne({ email });
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = new Date().getTime().toString() + Math.random().toString(36).substr(2, 9);
    const user: User = { 
      ...insertUser, 
      id,
      level: 1,
      xp: 0,
      streak: 0,
      createdAt: new Date()
    };
    
    await this.users.insertOne(user);
    
    // Create initial progress record
    await this.createUserProgress({
      userId: id,
      problemsSolved: 0,
      bugsFixed: 0,
      languagesUsed: {},
      achievements: [],
      lastActive: new Date()
    });
    
    return user;
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | undefined> {
    const result = await this.users.findOneAndUpdate(
      { id },
      { $set: updates },
      { returnDocument: 'after' }
    );
    return result || undefined;
  }

  // Code submission methods
  async createCodeSubmission(submission: InsertCodeSubmission): Promise<CodeSubmission> {
    const id = new Date().getTime().toString() + Math.random().toString(36).substr(2, 9);
    const codeSubmission: CodeSubmission = {
      ...submission,
      id,
      createdAt: new Date(),
      timeComplexity: submission.timeComplexity || null,
      spaceComplexity: submission.spaceComplexity || null,
      concepts: (submission.concepts as string[]) || [],
      aiSuggestions: submission.aiSuggestions || null,
      debuggingResults: submission.debuggingResults || null
    };
    
    await this.codeSubmissions.insertOne(codeSubmission);
    return codeSubmission;
  }

  async getCodeSubmissionsByUser(userId: string): Promise<CodeSubmission[]> {
    const submissions = await this.codeSubmissions
      .find({ userId })
      .sort({ createdAt: -1 })
      .toArray();
    return submissions;
  }

  async getCodeSubmission(id: string): Promise<CodeSubmission | undefined> {
    const submission = await this.codeSubmissions.findOne({ id });
    return submission || undefined;
  }

  async deleteCodeSubmissionsByUser(userId: string): Promise<number> {
    const result = await this.codeSubmissions.deleteMany({ userId });
    return result.deletedCount ?? 0;
  }

  // User progress methods
  async getUserProgress(userId: string): Promise<UserProgress | undefined> {
    const progress = await this.userProgress.findOne({ userId });
    return progress || undefined;
  }

  async createUserProgress(progress: InsertUserProgress): Promise<UserProgress> {
    const id = new Date().getTime().toString() + Math.random().toString(36).substr(2, 9);
    const userProgress: UserProgress = {
      ...progress,
      id,
      problemsSolved: progress.problemsSolved || 0,
      bugsFixed: progress.bugsFixed || 0,
      languagesUsed: progress.languagesUsed || {},
      achievements: (progress.achievements as string[]) || [],
      totalExecutions: progress.totalExecutions || 0,
      successfulExecutions: progress.successfulExecutions || 0,
      averageExecutionTime: progress.averageExecutionTime || 0,
      favoriteLanguage: progress.favoriteLanguage || null,
      lastActive: progress.lastActive || new Date()
    };
    
    await this.userProgress.insertOne(userProgress);
    return userProgress;
  }

  async updateUserProgress(userId: string, updates: Partial<UserProgress>): Promise<UserProgress | undefined> {
    const result = await this.userProgress.findOneAndUpdate(
      { userId },
      { $set: { ...updates, lastActive: new Date() } },
      { returnDocument: 'after' }
    );
    return result || undefined;
  }

  // Execution History methods
  async createExecutionHistory(history: InsertExecutionHistory): Promise<ExecutionHistory> {
    const id = new Date().getTime().toString() + Math.random().toString(36).substr(2, 9);
    const executionHistory: ExecutionHistory = {
      ...history,
      id,
      stdin: history.stdin || null,
      error: history.error || null,
      memoryUsage: history.memoryUsage || null,
      success: history.success ?? true,
      createdAt: new Date()
    };
    
    await this.executionHistory.insertOne(executionHistory);
    return executionHistory;
  }

  async getExecutionHistoryByUser(userId: string, limit: number = 50): Promise<ExecutionHistory[]> {
    return await this.executionHistory
      .find({ userId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray();
  }

  async getExecutionHistory(id: string): Promise<ExecutionHistory | undefined> {
    return await this.executionHistory.findOne({ id }) || undefined;
  }

  async deleteExecutionHistory(id: string): Promise<boolean> {
    const result = await this.executionHistory.deleteOne({ id });
    return result.deletedCount > 0;
  }

  // Learning Analytics methods
  async createLearningAnalytics(analytics: InsertLearningAnalytics): Promise<LearningAnalytics> {
    const id = new Date().getTime().toString() + Math.random().toString(36).substr(2, 9);
    const learningAnalytics: LearningAnalytics = {
      ...analytics,
      id,
      executionsCount: analytics.executionsCount || 1,
      successRate: analytics.successRate || 0,
      averageTime: analytics.averageTime || 0,
      complexityScore: analytics.complexityScore || 0,
      conceptsLearned: (analytics.conceptsLearned as string[]) || [],
      date: (analytics as any).date || new Date()
    };
    
    await this.learningAnalytics.insertOne(learningAnalytics);
    return learningAnalytics;
  }

  async getLearningAnalyticsByUser(userId: string, days: number = 30): Promise<LearningAnalytics[]> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    return await this.learningAnalytics
      .find({ 
        userId,
        date: { $gte: cutoffDate }
      })
      .sort({ date: -1 })
      .toArray();
  }

  async updateLearningAnalytics(userId: string, language: string, data: Partial<LearningAnalytics>): Promise<LearningAnalytics> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const existing = await this.learningAnalytics.findOne({
      userId,
      language,
      date: {
        $gte: today,
        $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000)
      }
    });

    if (existing) {
      const updated = { ...existing, ...data };
      await this.learningAnalytics.updateOne(
        { id: existing.id },
        { $set: updated }
      );
      return updated;
    } else {
      const newAnalytics: LearningAnalytics = {
        id: new Date().getTime().toString() + Math.random().toString(36).substr(2, 9),
        userId,
        date: today,
        language,
        executionsCount: data.executionsCount || 1,
        successRate: data.successRate || 0,
        averageTime: data.averageTime || 0,
        complexityScore: data.complexityScore || 0,
        conceptsLearned: (data.conceptsLearned as string[]) || []
      };
      
      await this.learningAnalytics.insertOne(newAnalytics);
      return newAnalytics;
    }
  }

  async deleteLearningAnalyticsByUser(userId: string): Promise<number> {
    const result = await this.learningAnalytics.deleteMany({ userId });
    return result.deletedCount ?? 0;
  }

  // Utility methods
  async getStats(): Promise<{
    totalUsers: number;
    totalSubmissions: number;
    totalActiveUsers: number;
  }> {
    const totalUsers = await this.users.countDocuments();
    const totalSubmissions = await this.codeSubmissions.countDocuments();
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const totalActiveUsers = await this.userProgress.countDocuments({
      lastActive: { $gte: oneDayAgo }
    });

    return {
      totalUsers,
      totalSubmissions,
      totalActiveUsers
    };
  }
}

// Create and export the MongoDB storage instance
export const createMongoDBStorage = async (connectionString: string): Promise<MongoDBStorage> => {
  const storage = new MongoDBStorage(connectionString);
  await storage.connect();
  return storage;
};