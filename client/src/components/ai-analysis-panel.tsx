import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, BarChart3, Lightbulb, Tags, AlertTriangle, Bot } from "lucide-react";

interface AIAnalysisPanelProps {
  code: string;
  language: string;
}

interface DebugResult {
  correctedCode: string;
  explanation: string;
  suggestions: string[];
}

interface ComplexityResult {
  timeComplexity: string;
  spaceComplexity: string;
  analysis: string;
}

interface ConceptResult {
  concepts: string[];
  recommendations: string[];
}

export function AIAnalysisPanel({ code, language }: AIAnalysisPanelProps) {
  const [debugResult, setDebugResult] = useState<DebugResult | null>(null);
  const [complexityResult, setComplexityResult] = useState<ComplexityResult | null>(null);
  const [conceptResult, setConceptResult] = useState<ConceptResult | null>(null);

  const debugMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/analyze", { 
        code, 
        language, 
        analysisType: "debug" 
      });
      const result = await res.json();
      return result.debug;
    },
    onSuccess: (data) => setDebugResult(data),
  });

  const complexityMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/analyze", { 
        code, 
        language, 
        analysisType: "complexity" 
      });
      const result = await res.json();
      return result.complexity;
    },
    onSuccess: (data) => setComplexityResult(data),
  });

  const recommendationsMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/analyze", { 
        code, 
        language, 
        analysisType: "concepts" 
      });
      const result = await res.json();
      return result.concepts;
    },
    onSuccess: (data) => setConceptResult(data),
  });

  // Comprehensive AI analysis mutation
  const comprehensiveAnalysisMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/analyze", { 
        code, 
        language, 
        analysisType: "all" 
      });
      return await res.json();
    },
    onSuccess: (data) => {
      if (data.debug) setDebugResult(data.debug);
      if (data.complexity) setComplexityResult(data.complexity);
      if (data.concepts) setConceptResult(data.concepts);
    },
  });

  const handleDebug = () => {
    if (!code.trim()) return;
    debugMutation.mutate();
  };

  const handleAnalyzeComplexity = () => {
    if (!code.trim()) return;
    complexityMutation.mutate();
  };

  const handleGetRecommendations = () => {
    if (!code.trim()) return;
    recommendationsMutation.mutate();
  };

  return (
    <div className="w-96 border-l border-border bg-card/50 p-6 space-y-6 overflow-y-auto">
      {/* Action Buttons */}
      <div className="space-y-3">
        <Button
          onClick={handleDebug}
          disabled={debugMutation.isPending || !code.trim()}
          className="w-full flex items-center space-x-2 interactive-button ripple animate-glow"
          data-testid="button-debug"
        >
          {debugMutation.isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <AlertTriangle className="w-4 h-4" />
          )}
          <span>{debugMutation.isPending ? "Debugging..." : "Debug with AI"}</span>
        </Button>

        <Button
          onClick={handleAnalyzeComplexity}
          disabled={complexityMutation.isPending || !code.trim()}
          className="w-full flex items-center space-x-2 interactive-button ripple"
          variant="outline"
          data-testid="button-complexity"
        >
          {complexityMutation.isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <BarChart3 className="w-4 h-4" />
          )}
          <span>{complexityMutation.isPending ? "Analyzing..." : "Analyze Complexity"}</span>
        </Button>

        <Button
          onClick={handleGetRecommendations}
          disabled={recommendationsMutation.isPending || !code.trim()}
          className="w-full flex items-center space-x-2 interactive-button ripple"
          variant="outline"
          data-testid="button-recommendations"
        >
          {recommendationsMutation.isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Lightbulb className="w-4 h-4" />
          )}
          <span>{recommendationsMutation.isPending ? "Getting..." : "Get Recommendations"}</span>
        </Button>

        <Button
          onClick={() => comprehensiveAnalysisMutation.mutate()}
          disabled={comprehensiveAnalysisMutation.isPending || !code.trim()}
          className="w-full flex items-center space-x-2 interactive-button ripple bg-gradient-to-r from-primary to-chart-2 hover:from-primary/80 hover:to-chart-2/80"
          data-testid="button-comprehensive-analysis"
        >
          {comprehensiveAnalysisMutation.isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Bot className="w-4 h-4" />
          )}
          <span className="text-white font-medium">
            {comprehensiveAnalysisMutation.isPending ? "Analyzing..." : "Complete AI Analysis"}
          </span>
        </Button>
      </div>

      {/* Complexity Analysis */}
      {complexityResult && (
        <Card className="ai-feedback-card floating-card animate-scale-in">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center space-x-2 text-sm">
              <BarChart3 className="w-4 h-4 text-primary" />
              <span>Complexity Analysis</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Time Complexity:</span>
                <Badge 
                  variant={complexityResult.timeComplexity.includes("2^") ? "destructive" : "default"}
                  className="font-mono"
                  data-testid="badge-time-complexity"
                >
                  {complexityResult.timeComplexity}
                </Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Space Complexity:</span>
                <Badge variant="secondary" className="font-mono" data-testid="badge-space-complexity">
                  {complexityResult.spaceComplexity}
                </Badge>
              </div>
            </div>
            <div className="bg-muted/50 rounded-md p-3">
              <p className="text-xs text-muted-foreground" data-testid="text-complexity-analysis">
                {complexityResult.analysis}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Debug Results */}
      {debugResult && (
        <Card className="ai-feedback-card floating-card animate-scale-in">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center space-x-2 text-sm">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <span>Debug Analysis</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="bg-muted/50 rounded-md p-3">
              <p className="text-xs text-muted-foreground" data-testid="text-debug-explanation">
                {debugResult.explanation}
              </p>
            </div>
            {debugResult.suggestions.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-medium text-foreground">Suggestions:</h4>
                <div className="space-y-1">
                  {debugResult.suggestions.map((suggestion, index) => (
                    <div key={index} className="text-xs text-muted-foreground p-2 bg-accent/50 rounded">
                      • {suggestion}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Concept Detection */}
      {conceptResult && (
        <div className="space-y-4">
          <Card className="ai-feedback-card floating-card animate-scale-in">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center space-x-2 text-sm">
                <Tags className="w-4 h-4 text-green-400" />
                <span>Concepts Detected</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2" data-testid="concepts-container">
                {conceptResult.concepts.map((concept, index) => (
                  <Badge key={index} variant="outline" className="text-xs">
                    {concept}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="ai-feedback-card floating-card animate-scale-in">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center space-x-2 text-sm">
                <Lightbulb className="w-4 h-4 text-amber-400" />
                <span>Practice Recommendations</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2" data-testid="recommendations-container">
                {conceptResult.recommendations.map((rec, index) => (
                  <div key={index} className="text-xs text-muted-foreground p-2 bg-accent/50 rounded">
                    • {rec}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Empty State */}
      {!debugResult && !complexityResult && !conceptResult && (
        <Card className="ai-feedback-card">
          <CardContent className="pt-6">
            <div className="text-center space-y-3">
              <Bot className="w-12 h-12 text-muted-foreground mx-auto opacity-50" />
              <div>
                <h3 className="text-sm font-medium text-foreground">AI Analysis Ready</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Write some code and use the buttons above to get AI-powered insights
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
