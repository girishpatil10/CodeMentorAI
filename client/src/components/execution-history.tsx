import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Play, 
  Trash2, 
  Clock, 
  CheckCircle, 
  XCircle, 
  Code, 
  Terminal,
  Calendar,
  TrendingUp,
  Activity
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface ExecutionHistory {
  id: string;
  userId: string;
  code: string;
  language: string;
  stdin: string;
  output: string;
  error: string;
  exitCode: number;
  executionTime: number;
  memoryUsage?: number;
  success: boolean;
  createdAt: string;
}

interface ExecutionHistoryProps {
  onReplay: (code: string, language: string, stdin: string) => void;
}

export function ExecutionHistory({ onReplay }: ExecutionHistoryProps) {
  const [selectedHistory, setSelectedHistory] = useState<ExecutionHistory | null>(null);
  const queryClient = useQueryClient();

  const { data: history = [], isLoading, error } = useQuery({
    queryKey: ["/api/execution-history"],
    queryFn: async () => {
      console.log("Fetching execution history...");
      const res = await apiRequest("GET", "/api/execution-history");
      console.log("Execution history response:", res);
      return await res.json();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/execution-history/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/execution-history"] });
      if (selectedHistory && !history.find((h: ExecutionHistory) => h.id === selectedHistory.id)) {
        setSelectedHistory(null);
      }
    },
  });

  // Delete all execution history entries for this user (client-side loop)
  const deleteAllMutation = useMutation({
    mutationFn: async () => {
      await Promise.all(
        history.map((item: ExecutionHistory) =>
          apiRequest("DELETE", `/api/execution-history/${item.id}`)
        )
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/execution-history"] });
      setSelectedHistory(null);
    },
  });

  const handleReplay = (historyItem: ExecutionHistory) => {
    onReplay(historyItem.code, historyItem.language, historyItem.stdin);
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this execution history?")) {
      deleteMutation.mutate(id);
    }
  };

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

  if (isLoading) {
    return (
      <div className="p-4">
        <div className="animate-pulse space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-24 bg-muted rounded-lg"></div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    console.error("Execution history error:", error);
    return (
      <div className="p-4">
        <div className="text-center text-destructive">
          <Terminal className="w-8 h-8 mx-auto mb-2" />
          <p>Failed to load execution history</p>
          <p className="text-xs mt-1">{error.message}</p>
        </div>
      </div>
    );
  }

  if (history.length === 0) {
    console.log("No execution history found");
    return (
      <div className="p-4">
        <div className="text-center text-muted-foreground">
          <Activity className="w-8 h-8 mx-auto mb-2" />
          <p>No execution history yet</p>
          <p className="text-sm">Run some code to see your history here</p>
        </div>
      </div>
    );
  }

  console.log("Rendering execution history with", history.length, "items");
  return (
    <div className="p-4 h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Execution History
          </h3>
          <Badge variant="outline">{history.length} items</Badge>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="text-xs"
          disabled={deleteAllMutation.isPending || history.length === 0}
          onClick={() => {
            if (
              history.length > 0 &&
              confirm("Delete all execution history records? This cannot be undone.")
            ) {
              deleteAllMutation.mutate();
            }
          }}
        >
          Clear All
        </Button>
      </div>

      <ScrollArea className="flex-1 min-h-0">
        <div className="space-y-3 pb-2">
          {history.map((item: ExecutionHistory) => (
            <Card 
              key={item.id} 
              className={`cursor-pointer transition-all hover:shadow-md ${
                selectedHistory?.id === item.id ? "ring-2 ring-primary" : ""
              }`}
              onClick={() => {
                setSelectedHistory((current) =>
                  current?.id === item.id ? null : item
                );
              }}
            >
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{getLanguageIcon(item.language)}</span>
                    <Badge variant="outline" className="text-xs">
                      {item.language}
                    </Badge>
                    {item.success ? (
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-500" />
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock className="w-3 h-3" />
                    {item.executionTime}ms
                  </div>
                </div>
                <CardDescription className="text-xs">
                  {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
                </CardDescription>
              </CardHeader>
              
              <CardContent className="pt-0">
                <div className="space-y-2">
                  <div className="text-sm font-mono bg-muted p-2 rounded truncate">
                    {item.code.split('\n')[0].substring(0, 80)}...
                  </div>
                  
                  {item.stdin && (
                    <div className="text-xs text-muted-foreground">
                      <span className="font-semibold">Input:</span> {item.stdin}
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-muted-foreground">
                      <span className="font-semibold">Output:</span> {item.output.substring(0, 50)}...
                    </div>
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleReplay(item);
                        }}
                        className="h-7 px-2"
                      >
                        <Play className="w-3 h-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(item.id);
                        }}
                        className="h-7 px-2"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </ScrollArea>

      {selectedHistory && (
        <Card className="mt-4">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base flex items-center gap-2">
              <Code className="w-4 h-4" />
              Execution Details
            </CardTitle>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => setSelectedHistory(null)}
              title="Close details"
            >
              <XCircle className="w-4 h-4" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-semibold">Language:</span> {selectedHistory.language}
              </div>
              <div>
                <span className="font-semibold">Exit Code:</span> {selectedHistory.exitCode}
              </div>
              <div>
                <span className="font-semibold">Execution Time:</span> {selectedHistory.executionTime}ms
              </div>
              <div>
                <span className="font-semibold">Memory:</span> {selectedHistory.memoryUsage || 'N/A'}KB
              </div>
            </div>
            
            {selectedHistory.stdin && (
              <div>
                <span className="font-semibold text-sm">Input:</span>
                <pre className="text-xs bg-muted p-2 rounded mt-1 whitespace-pre-wrap">
                  {selectedHistory.stdin}
                </pre>
              </div>
            )}
            
            <div>
              <span className="font-semibold text-sm">Output:</span>
              <pre className="text-xs bg-muted p-2 rounded mt-1 whitespace-pre-wrap max-h-32 overflow-auto">
                {selectedHistory.output || 'No output'}
              </pre>
            </div>
            
            {selectedHistory.error && (
              <div>
                <span className="font-semibold text-sm text-red-500">Error:</span>
                <pre className="text-xs bg-red-50 text-red-700 p-2 rounded mt-1 whitespace-pre-wrap max-h-32 overflow-auto">
                  {selectedHistory.error}
                </pre>
              </div>
            )}
            
            <div>
              <span className="font-semibold text-sm">Code:</span>
              <pre className="text-xs bg-muted p-2 rounded mt-1 whitespace-pre-wrap max-h-48 overflow-auto">
                {selectedHistory.code}
              </pre>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
