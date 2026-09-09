
import { useState, useEffect, useRef, useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { MonacoEditor } from "@/components/monaco-editor";
import { AIAnalysisPanel } from "@/components/ai-analysis-panel";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Play, Download, RefreshCw, Clock, PanelRightOpen, PanelRightClose } from "lucide-react";

interface ExecutionResult {
  output: string;
  error: string;
  exitCode: number;
  executionTime: number;
  memoryUsage?: number;
}

type EditorMode = "normal" | "restrict";

export function CodeWorkspace() {
  // State for code editor and execution
  const [code, setCode] = useState("");
  const [language, setLanguage] = useState("javascript");
  const [output, setOutput] = useState("");
  const [executionResult, setExecutionResult] = useState<ExecutionResult | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [stdin, setStdin] = useState("");
  const [isPanelOpen, setIsPanelOpen] = useState(true);
  const [consoleHeight, setConsoleHeight] = useState(300); // Default height in pixels
  const [isResizing, setIsResizing] = useState(false);
  const consoleRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<EditorMode>("normal");

  // Handle mouse move for resizing
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isResizing) return;
    
    if (consoleRef.current) {
      const containerRect = consoleRef.current.getBoundingClientRect();
      const newHeight = window.innerHeight - e.clientY - 16; // 16px padding from bottom
      // Limit height between 200px and 80% of viewport
      setConsoleHeight(Math.min(Math.max(newHeight, 200), window.innerHeight * 0.8));
    }
  }, [isResizing]);

  // Handle mouse up to stop resizing
  const handleMouseUp = useCallback(() => {
    setIsResizing(false);
  }, []);

  // Add/remove event listeners for resizing
  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    } else {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, handleMouseMove, handleMouseUp]);

  // Restrict mode: clear code when user leaves or unfocuses this tab/window
  useEffect(() => {
    if (mode !== "restrict") return;

    const handleVisibilityOrBlur = () => {
      setCode("");
      setStdin("");
      setOutput("");
      setExecutionResult(null);
    };

    document.addEventListener("visibilitychange", handleVisibilityOrBlur);
    window.addEventListener("blur", handleVisibilityOrBlur);
    window.addEventListener("pagehide", handleVisibilityOrBlur);
    window.addEventListener("focusout", handleVisibilityOrBlur);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityOrBlur);
      window.removeEventListener("blur", handleVisibilityOrBlur);
      window.removeEventListener("pagehide", handleVisibilityOrBlur);
       window.removeEventListener("focusout", handleVisibilityOrBlur);
    };
  }, [mode]);

  // Load template code when language changes
  const { data: templateData } = useQuery({
    queryKey: ["/api/template", language],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/template/${language}`);
      return await res.json();
    },
  });

  useEffect(() => {
    if (templateData?.template && !code.trim()) {
      setCode(templateData.template);
    }
  }, [templateData, code]);

  // Code execution mutation
  const executeMutation = useMutation({
    mutationFn: async ({ code, language, stdin }: { code: string; language: string; stdin?: string }) => {
      const res = await apiRequest("POST", "/api/execute", { code, language, stdin });
      return await res.json();
    },
    onMutate: () => {
      setIsExecuting(true);
      setOutput("Running code...");
    },
    onSuccess: (result: ExecutionResult) => {
      setExecutionResult(result);
      setOutput(result.output || "No output");
      setIsExecuting(false);

      // Refresh progress-related data so progress view shows real-time records
      queryClient.invalidateQueries({ queryKey: ["/api/progress"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["/api/execution-history"] });
    },
    onError: (error: any) => {
      setOutput(`Error: ${error.message}`);
      setIsExecuting(false);
    },
  });

  const handleRunCode = () => {
    if (!code.trim()) {
      setOutput("No code to execute");
      return;
    }
    executeMutation.mutate({ code, language, stdin });
  };

  const handleLanguageChange = (newLanguage: string) => {
    setLanguage(newLanguage);
    setCode(""); // Clear code to load new template
    setOutput("");
    setExecutionResult(null);
  };

  const handleDownloadCode = () => {
    const extension = {
      javascript: 'js',
      python: 'py',
      java: 'java',
      cpp: 'cpp',
      c: 'c',
      typescript: 'ts'
    }[language] || 'txt';
    
    const blob = new Blob([code], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `code.${extension}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const togglePanel = () => {
    setIsPanelOpen(!isPanelOpen);
  };

  return (
    <div className="flex flex-col h-screen w-full relative overflow-hidden bg-background">
      {/* Top Bar */}
      <header className="h-16 bg-card border-b border-border flex items-center justify-between px-6 flex-shrink-0">
        <div className="flex items-center space-x-4">
          <h1 className="text-lg font-semibold">Code Editor</h1>
          <Select value={language} onValueChange={handleLanguageChange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select language" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="javascript">JavaScript</SelectItem>
              <SelectItem value="typescript">TypeScript</SelectItem>
              <SelectItem value="python">Python</SelectItem>
              <SelectItem value="java">Java</SelectItem>
              <SelectItem value="cpp">C++</SelectItem>
              <SelectItem value="c">C</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRunCode}
            disabled={isExecuting}
            className="gap-2"
          >
            {isExecuting ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Play className="w-4 h-4" />
            )}
            Run
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadCode}
            className="gap-2"
          >
            <Download className="w-4 h-4" />
            Download
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={togglePanel}
            className="ml-2"
            title={isPanelOpen ? "Hide AI Panel" : "Show AI Panel"}
          >
            {isPanelOpen ? <PanelRightClose className="w-5 h-5" /> : <PanelRightOpen className="w-5 h-5" />}
          </Button>

          {/* Mode toggle */}
          <Button
            variant={mode === "restrict" ? "destructive" : "outline"}
            size="sm"
            className="ml-2 text-xs px-3"
            onClick={() =>
              setMode((prev) => (prev === "normal" ? "restrict" : "normal"))
            }
            title={
              mode === "restrict"
                ? "Restrict mode: leaving this browser tab clears your code"
                : "Normal mode: your code stays when you switch tabs"
            }
          >
            {mode === "restrict" ? "Restrict Mode" : "Normal Mode"}
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Main Editor and Console Container */}
        <div
          className="flex flex-col overflow-hidden"
          style={{
            width: isPanelOpen ? 'calc(100% - 400px)' : '100%',
            transition: 'width 0.2s ease-out',
          }}
        >
          {mode === "restrict" && (
            <div className="px-4 py-1 text-[11px] text-amber-400 bg-amber-500/10 border-b border-amber-500/30">
              ⚠️ Restrict Mode Active – switching browser tabs will erase your current code and console.
            </div>
          )}
          {/* Editor - Upper Half */}
          <div className="flex-1 min-h-0 relative">
            <MonacoEditor
              code={code}
              language={language}
              onChange={setCode}
              options={{
                minimap: { enabled: true },
                scrollBeyondLastLine: false,
                fontSize: 14,
                wordWrap: 'on',
                automaticLayout: true
              }}
            />
          </div>

          {/* Console - Lower Half */}
          <div 
            ref={consoleRef}
            className="flex flex-col border-t border-border bg-card w-full overflow-hidden"
            style={{ 
              height: `${consoleHeight}px`,
              minHeight: '200px',
              maxHeight: '80vh',
              transition: isResizing ? 'none' : 'height 0.2s ease-out'
            }}
          >
            {/* Resize handle */}
            <div 
              className="h-2 w-full bg-transparent hover:h-3 hover:bg-primary/20 cursor-row-resize transition-all duration-100 flex items-center justify-center group"
              onMouseDown={() => setIsResizing(true)}
            >
              <div className="w-12 h-0.5 bg-muted-foreground/40 group-hover:bg-primary rounded-full" />
            </div>
            {/* Console Header */}
            <div className="h-10 bg-card border-b border-border flex items-center justify-between px-4">
              <span className="text-sm font-medium text-muted-foreground">Console</span>
              <div className="flex items-center space-x-2">
                {executionResult && (
                  <span className="text-xs text-muted-foreground">
                    {executionResult.exitCode === 0 ? '✓' : '✗'} 
                    {executionResult.executionTime}ms
                  </span>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-auto p-1"
                  onClick={() => {
                    setOutput("");
                    setExecutionResult(null);
                  }}
                >
                  <span className="text-xs">Clear</span>
                </Button>
              </div>
            </div>
            
            {/* Output Console */}
            <div className="flex-1 overflow-auto p-4 bg-[hsl(240,10%,5%)] text-sm">
              {isExecuting ? (
                <div className="flex items-center space-x-2 text-muted-foreground">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Executing code...</span>
                </div>
              ) : executionResult?.error ? (
                <pre className="text-red-400 whitespace-pre-wrap text-sm font-mono" data-testid="text-error">
                  {executionResult.error}
                </pre>
              ) : (
                <pre className="text-green-400 whitespace-pre-wrap text-sm font-mono" data-testid="text-output">
                  {output || "Run your code to see output here..."}
                </pre>
              )}
            </div>

            {/* Standard Input */}
            <div className="px-3 py-2 border-t border-border bg-card/50">
              <div className="flex items-center justify-between">
                <label className="block text-xs text-muted-foreground mb-1">Input</label>
                <span className="text-xs text-muted-foreground">{stdin.length} chars</span>
              </div>
              <textarea
                className="w-full h-[60px] bg-[hsl(240,10%,8%)] text-gray-300 font-mono text-sm px-2 py-1.5 rounded-md outline-none resize-none border border-border/20 focus:border-primary/50 transition-colors text-[13px] leading-snug"
                placeholder="Input (e.g., 1 2 3)"
                value={stdin}
                onChange={(e) => setStdin(e.target.value)}
                style={{
                  minHeight: '60px',
                  maxHeight: '100px',
                  overflowY: 'auto',
                  lineHeight: '1.25rem',
                }}
              />
            </div>
          </div>
        </div>

        {/* AI Analysis Panel - Positioned absolutely on the right */}
        {isPanelOpen && (
          <div
            className="absolute right-0 top-0 bottom-0 bg-card border-l border-border overflow-hidden transition-all duration-200 ease-out flex flex-col"
            style={{ width: '400px' }}
          >
            <div className="h-full overflow-y-auto">
              <AIAnalysisPanel code={code} language={language} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
