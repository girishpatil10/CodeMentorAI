import { useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useTheme } from "@/contexts/theme-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sun, Moon, Monitor, Trash2, Loader2, Settings } from "lucide-react";

function ThemeToggleGroup() {
  const { theme, setTheme } = useTheme();

  const themes = [
    { value: "light", label: "Light", icon: Sun },
    { value: "dark", label: "Dark", icon: Moon },
    { value: "system", label: "System", icon: Monitor },
  ] as const;

  // Ensure a default theme
  useEffect(() => {
    if (!theme) {
      setTheme("system");
    }
  }, [theme, setTheme]);

  return (
    <div className="flex flex-wrap gap-2">
      {themes.map(({ value, label, icon: Icon }) => (
        <Button
          key={value}
          type="button"
          variant={theme === value ? "secondary" : "outline"}
          size="sm"
          className="flex items-center gap-2"
          onClick={() => setTheme(value as any)}
        >
          <Icon className="w-4 h-4" />
          <span className="text-xs">{label}</span>
        </Button>
      ))}
    </div>
  );
}

export function SettingsView() {
  const queryClient = useQueryClient();

  const resetProgressMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/progress/reset");
    },
    onSuccess: () => {
      // Refresh everything the Progress view uses
      queryClient.invalidateQueries({ queryKey: ["/api/progress"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["/api/execution-history"] });
    },
  });

  return (
    <div className="flex-1 h-full overflow-auto bg-background p-4 space-y-6">
      <div className="flex items-center gap-2">
        <Settings className="w-5 h-5 text-primary" />
        <h2 className="text-2xl font-bold">Settings</h2>
      </div>

      {/* Appearance */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Appearance</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-xs text-muted-foreground">
            Choose how CodeMentor AI looks. The system option follows your OS theme.
          </p>
          <ThemeToggleGroup />
        </CardContent>
      </Card>

      {/* Progress & History */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Progress &amp; History</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Reset all learning progress, execution history, and analytics for this account.
            This action is permanent and cannot be undone.
          </p>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            className="flex items-center gap-2"
            disabled={resetProgressMutation.isPending}
            onClick={() => {
              if (
                confirm(
                  "This will clear all your progress statistics and execution history. Continue?"
                )
              ) {
                resetProgressMutation.mutate();
              }
            }}
          >
            {resetProgressMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Trash2 className="w-4 h-4" />
            )}
            <span className="text-xs">Reset all progress</span>
          </Button>
          <Badge variant="outline" className="text-[10px]">
            Affects Progress dashboard, execution history, and analytics only.
          </Badge>
        </CardContent>
      </Card>
    </div>
  );
}
