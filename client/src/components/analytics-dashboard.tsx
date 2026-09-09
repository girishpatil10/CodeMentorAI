import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  TrendingUp, 
  Code, 
  Clock, 
  Target, 
  Trophy, 
  Zap,
  Calendar,
  BarChart3,
  PieChart,
  Activity
} from "lucide-react";

interface DashboardData {
  analytics: Array<{
    id: string;
    userId: string;
    date: string;
    language: string;
    executionsCount: number;
    successRate: number;
    averageTime: number;
    complexityScore: number;
    conceptsLearned: string[];
  }>;
  progress: {
    id: string;
    userId: string;
    problemsSolved: number;
    bugsFixed: number;
    languagesUsed: Record<string, number>;
    achievements: string[];
    totalExecutions: number;
    successfulExecutions: number;
    averageExecutionTime: number;
    favoriteLanguage?: string;
    lastActive: string;
  };
  recentHistory: Array<{
    id: string;
    language: string;
    success: boolean;
    executionTime: number;
    createdAt: string;
  }>;
  metrics: {
    totalExecutions: number;
    successRate: number;
    favoriteLanguage: string;
    averageExecutionTime: number;
    streak: number;
    level: number;
  };
}

export function AnalyticsDashboard() {
  const { data: dashboard, isLoading, error } = useQuery({
    queryKey: ["/api/dashboard"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/dashboard");
      return await res.json();
    },
  });

  const getLanguageIcon = (language: string) => {
    const icons: Record<string, string> = {
      javascript: "🟨",
      typescript: "🔷",
      python: "🐍",
      java: "☕",
      cpp: "⚙️",
      c: "⚪"
    };
    return icons[language] || "📄";
  };

  const getLanguageColor = (language: string) => {
    const colors: Record<string, string> = {
      javascript: "bg-yellow-500",
      typescript: "bg-blue-500",
      python: "bg-green-500",
      java: "bg-orange-500",
      cpp: "bg-purple-500",
      c: "bg-gray-500"
    };
    return colors[language] || "bg-gray-400";
  };

  const getProgressColor = (percentage: number) => {
    if (percentage >= 80) return "bg-green-500";
    if (percentage >= 60) return "bg-yellow-500";
    return "bg-red-500";
  };

  if (isLoading) {
    return (
      <div className="p-4">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-muted rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4">
        <div className="text-center text-destructive">
          <BarChart3 className="w-8 h-8 mx-auto mb-2" />
          <p>Failed to load analytics</p>
        </div>
      </div>
    );
  }

  if (!dashboard) return null;

  const { metrics, progress, analytics, recentHistory } = dashboard;

  return (
    <div className="p-4 space-y-6">
      <div className="flex items-center gap-2">
        <BarChart3 className="w-6 h-6" />
        <h2 className="text-2xl font-bold">Learning Analytics</h2>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Executions</CardTitle>
            <Code className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalExecutions}</div>
            <p className="text-xs text-muted-foreground">
              All time code runs
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.successRate.toFixed(1)}%</div>
            <Progress value={metrics.successRate} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Execution Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.averageExecutionTime}ms</div>
            <p className="text-xs text-muted-foreground">
              Per execution
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Current Level</CardTitle>
            <Trophy className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.level}</div>
            <p className="text-xs text-muted-foreground">
              {metrics.streak} day streak
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Language Usage */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="w-5 h-5" />
              Language Usage
            </CardTitle>
            <CardDescription>Your programming language distribution</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(progress.languagesUsed || {}).map(([language, count]: [string, number]) => {
                const percentage = (count / metrics.totalExecutions) * 100;
                return (
                  <div key={language} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{getLanguageIcon(language)}</span>
                      <span className="text-sm font-medium capitalize">{language}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-24">
                        <Progress value={percentage} className="h-2" />
                      </div>
                      <span className="text-sm text-muted-foreground w-12 text-right">
                        {count}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5" />
              Recent Activity
            </CardTitle>
            <CardDescription>Your latest code executions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {recentHistory.slice(0, 8).map((item: any) => (
                <div key={item.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{getLanguageIcon(item.language)}</span>
                    <span className="text-sm font-medium capitalize">{item.language}</span>
                    {item.success ? (
                      <Badge variant="default" className="text-xs bg-green-500">Success</Badge>
                    ) : (
                      <Badge variant="destructive" className="text-xs">Error</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock className="w-3 h-3" />
                    {item.executionTime}ms
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Learning Progress */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5" />
              Problems Solved
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center">
              <div className="text-3xl font-bold text-primary">{progress.problemsSolved}</div>
              <p className="text-sm text-muted-foreground">Completed challenges</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Bugs Fixed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600">{progress.bugsFixed}</div>
              <p className="text-sm text-muted-foreground">Debugging successes</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Daily Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600">{analytics.length}</div>
              <p className="text-sm text-muted-foreground">Active days</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Achievements */}
      {progress.achievements && progress.achievements.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="w-5 h-5" />
              Achievements
            </CardTitle>
            <CardDescription>Your unlocked accomplishments</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {progress.achievements.map((achievement: string, index: number) => (
                <Badge key={index} variant="secondary" className="px-3 py-1">
                  🏆 {achievement}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
