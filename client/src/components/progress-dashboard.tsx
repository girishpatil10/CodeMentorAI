import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { Area, AreaChart, Brush, CartesianGrid, XAxis, YAxis } from "recharts";
import { 
  Code, 
  Bug, 
  Flame, 
  Trophy, 
  Star, 
  Zap, 
  Lock,
  TrendingUp 
} from "lucide-react";

interface ProgressData {
  progress: {
    problemsSolved: number;
    bugsFixed: number;
    languagesUsed: Record<string, number>;
    achievements: string[];
  };
  submissions: any[];
  user: {
    level: number;
    xp: number;
    streak: number;
  };
}

export function ProgressDashboard() {
  const { data: progressData, isLoading } = useQuery<ProgressData>({
    queryKey: ["/api/progress"],
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const progress = progressData?.progress;
  const user = progressData?.user;
  const submissions = Array.isArray(progressData?.submissions)
    ? progressData!.submissions
    : [];

  // Build daily problem-solved data from submissions (persisted on backend)
  const map = new Map<string, number>();
  for (const submission of submissions) {
    if (!submission?.createdAt) continue;
    const d = new Date(submission.createdAt);
    if (isNaN(d.getTime())) continue;
    const key = d.toISOString().slice(0, 10); // YYYY-MM-DD
    map.set(key, (map.get(key) || 0) + 1);
  }

  const sortedEntries = Array.from(map.entries()).sort(([a], [b]) =>
    a < b ? -1 : 1
  );

  // Build series with day-over-day change to drive green (up) / red (down) visuals
  const dailySeries = sortedEntries.map(([date, count], idx) => {
    const label = new Date(date).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    });

    const prevCount = idx > 0 ? sortedEntries[idx - 1][1] : count;
    const delta = count - prevCount;

    return {
      date: label,
      problems: count,
      up: delta >= 0 ? count : null,   // used for green area
      down: delta < 0 ? count : null,  // used for red area
    };
  });

  // Today's direction color: green if up, red if down, gray if flat
  let todayStrokeColor = "hsl(215 20% 65%)"; // default muted
  if (dailySeries.length > 1) {
    const latest = dailySeries[dailySeries.length - 1];
    const prev = dailySeries[dailySeries.length - 2];
    if (latest.problems > prev.problems) {
      todayStrokeColor = "hsl(142 76% 36%)"; // green
    } else if (latest.problems < prev.problems) {
      todayStrokeColor = "hsl(0 72% 51%)"; // red
    }
  }

  const chartConfig: ChartConfig = {
    problems: {
      label: "Problems solved",
      theme: {
        light: "hsl(210 90% 50%)",
        dark: "hsl(210 90% 70%)",
      },
    },
  };

  return (
    <div className="space-y-6 p-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <TrendingUp className="w-6 h-6 text-primary" />
          <h2 className="text-2xl font-bold">Progress Dashboard</h2>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="floating-card animate-scale-in" style={{ animationDelay: '0.1s' }}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Problems</p>
                <p className="text-2xl font-bold text-foreground" data-testid="stat-total-problems">
                  {progress?.problemsSolved || 0}
                </p>
              </div>
              <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center">
                <Code className="w-6 h-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="floating-card animate-scale-in" style={{ animationDelay: '0.2s' }}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Bugs Fixed</p>
                <p className="text-2xl font-bold text-foreground" data-testid="stat-bugs-fixed">
                  {progress?.bugsFixed || 0}
                </p>
              </div>
              <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center">
                <Bug className="w-6 h-6 text-green-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="floating-card animate-scale-in" style={{ animationDelay: '0.3s' }}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Current Streak</p>
                <p className="text-2xl font-bold text-foreground" data-testid="stat-streak">
                  {user?.streak || 0} days
                </p>
              </div>
              <div className="w-12 h-12 bg-amber-500/20 rounded-full flex items-center justify-center">
                <Flame className="w-6 h-6 text-amber-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Problems vs Progress graph */}
      <Card className="ai-feedback-card floating-card animate-slide-in-up">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 text-sm">
            <Trophy className="w-4 h-4 text-amber-400" />
            <span>Problems vs Progress</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {dailySeries.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              Solve some problems to see your progress graph.
            </p>
          ) : (
            <ChartContainer config={chartConfig} className="w-full h-64">
              <AreaChart
                data={dailySeries}
                margin={{ left: 8, right: 8, top: 8, bottom: 24 }}
              >
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" />
                <XAxis dataKey="date" tickLine={false} axisLine={false} />
                <YAxis
                  allowDecimals={false}
                  tickLine={false}
                  axisLine={false}
                  width={24}
                />

                <ChartTooltip
                  cursor={{ strokeDasharray: "3 3" }}
                  content={<ChartTooltipContent labelKey="date" />}
                />

                {/* Stock-market style areas: green when progress up/flat, red when down */}
                <defs>
                  <linearGradient id="areaUp" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(142 76% 36%)" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="hsl(142 76% 36%)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="areaDown" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(0 72% 51%)" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="hsl(0 72% 51%)" stopOpacity={0} />
                  </linearGradient>
                </defs>

                {/* Up / flat days */}
                <Area
                  type="monotone"
                  dataKey="up"
                  stroke="hsl(142 76% 36%)"
                  strokeWidth={2}
                  fill="url(#areaUp)"
                  dot={false}
                  activeDot={{ r: 3 }}
                  connectNulls
                />

                {/* Down days */}
                <Area
                  type="monotone"
                  dataKey="down"
                  stroke="hsl(0 72% 51%)"
                  strokeWidth={2}
                  fill="url(#areaDown)"
                  dot={false}
                  activeDot={{ r: 3 }}
                  connectNulls
                />

                {/* Brush for zooming / panning across many days */}
                <Brush
                  dataKey="date"
                  height={18}
                  travellerWidth={8}
                  stroke={todayStrokeColor}
                />
              </AreaChart>
            </ChartContainer>
          )}
        </CardContent>
      </Card>

      {/* Language Distribution */}
      {progress?.languagesUsed && Object.keys(progress.languagesUsed).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Language Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Object.entries(progress.languagesUsed).map(([lang, count]) => (
                <div key={lang} className="flex justify-between items-center">
                  <span className="text-sm capitalize">{lang}</span>
                  <Badge variant="outline" data-testid={`lang-${lang}-count`}>
                    {count}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Achievements */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Achievements</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            {/* Bug Hunter */}
            <div className={`bg-card/60 rounded-lg p-4 border border-border text-center ${(progress?.bugsFixed || 0) >= 50 ? '' : 'opacity-50'}`}>
              <div className="w-12 h-12 bg-amber-500/20 rounded-full flex items-center justify-center mx-auto mb-2">
                <Trophy className="w-6 h-6 text-amber-400" />
              </div>
              <p className="text-sm font-medium">Bug Hunter</p>
              <p className="text-xs text-muted-foreground">Fixed 50+ bugs</p>
              {(progress?.bugsFixed || 0) >= 50 && (
                <Badge className="mt-2 bg-amber-500/20 text-amber-400">Unlocked</Badge>
              )}
            </div>

            {/* Code Master */}
            <div className={`bg-card/60 rounded-lg p-4 border border-border text-center ${(progress?.problemsSolved || 0) >= 100 ? '' : 'opacity-50'}`}>
              <div className="w-12 h-12 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-2">
                <Star className="w-6 h-6 text-blue-400" />
              </div>
              <p className="text-sm font-medium">Code Master</p>
              <p className="text-xs text-muted-foreground">100+ problems solved</p>
              {(progress?.problemsSolved || 0) >= 100 && (
                <Badge className="mt-2 bg-blue-500/20 text-blue-400">Unlocked</Badge>
              )}
            </div>

            {/* Speed Demon */}
            <div className={`bg-card/60 rounded-lg p-4 border border-border text-center ${(progress?.problemsSolved || 0) >= 25 ? '' : 'opacity-50'}`}>
              <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-2">
                <Zap className="w-6 h-6 text-green-400" />
              </div>
              <p className="text-sm font-medium">Speed Demon</p>
              <p className="text-xs text-muted-foreground">Optimized 25+ algorithms</p>
              {(progress?.problemsSolved || 0) >= 25 && (
                <Badge className="mt-2 bg-green-500/20 text-green-400">Unlocked</Badge>
              )}
            </div>

            {/* Algorithm Expert - Locked */}
            <div className="bg-card/60 rounded-lg p-4 border border-border text-center opacity-50">
              <div className="w-12 h-12 bg-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-2">
                <Lock className="w-6 h-6 text-purple-400" />
              </div>
              <p className="text-sm font-medium">Algorithm Expert</p>
              <p className="text-xs text-muted-foreground">Master 10 algorithms</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      {submissions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {submissions.slice(0, 5).map((submission, index) => (
                <div key={submission.id || index} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                  <div className="flex items-center space-x-2">
                    <Code className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm capitalize">{submission.language}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {new Date(submission.createdAt).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
