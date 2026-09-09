import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { 
  Code, 
  TrendingUp, 
  LogOut,
  User,
  Settings,
  Moon,
  Sun,
  Monitor
} from "lucide-react";

type ActiveView = "editor" | "progress" | "settings";

interface SidebarProps {
  activeView?: ActiveView;
  onShowEditor?: () => void;
  onShowProgress?: () => void;
  onShowSettings?: () => void;
}

export function Sidebar({ activeView = "editor", onShowEditor, onShowProgress, onShowSettings }: SidebarProps) {
  const { user, logoutMutation } = useAuth();

  const isEditorActive = activeView === "editor";
  const isProgressActive = activeView === "progress";
  const isSettingsActive = activeView === "settings";

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  return (
    <aside className="w-64 bg-card border-r border-border flex flex-col transition-all duration-300 ease-in-out animate-slide-in">
      <div className="p-6 border-b border-border">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <Code className="text-primary-foreground text-sm" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-foreground">CodeMentor AI</h1>
            <p className="text-xs text-muted-foreground">Debug & Learn</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        <Button
          variant={isEditorActive ? "secondary" : "ghost"}
          className={`w-full justify-start space-x-3 nav-item animate-slide-in-up ${
            isEditorActive
              ? "bg-primary/10 text-primary hover:bg-primary/20"
              : "hover:bg-accent text-foreground"
          }`}
          data-testid="nav-code-editor"
          style={{ animationDelay: '0.1s' }}
          onClick={onShowEditor}
        >
          <Code className="w-4 h-4" />
          <span className="text-sm font-medium">Code Editor</span>
        </Button>
        
        <Button
          variant={isProgressActive ? "secondary" : "ghost"}
          className={`w-full justify-start space-x-3 nav-item animate-slide-in-up ${
            isProgressActive
              ? "bg-primary/10 text-primary hover:bg-primary/20"
              : "hover:bg-accent text-foreground"
          }`}
          data-testid="nav-progress"
          style={{ animationDelay: '0.2s' }}
          onClick={onShowProgress}
        >
          <TrendingUp className="w-4 h-4" />
          <span className="text-sm font-medium">Progress</span>
        </Button>

        <Button
          variant={isSettingsActive ? "secondary" : "ghost"}
          className={`w-full justify-start space-x-3 nav-item animate-slide-in-up ${
            isSettingsActive
              ? "bg-primary/10 text-primary hover:bg-primary/20"
              : "hover:bg-accent text-foreground"
          }`}
          data-testid="nav-settings"
          style={{ animationDelay: '0.3s' }}
          onClick={onShowSettings}
        >
          <Settings className="w-4 h-4" />
          <span className="text-sm font-medium">Settings</span>
        </Button>
      </nav>

      {/* User Profile */}
      <div className="p-4 border-t border-border space-y-3">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center">
            <User className="text-muted-foreground text-sm" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate text-foreground" data-testid="text-username">
              {user?.username}
            </p>
            <p className="text-xs text-muted-foreground">
              Level {user?.level} • {user?.xp} XP
            </p>
          </div>
        </div>
        
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={handleLogout}
          disabled={logoutMutation.isPending}
          data-testid="button-logout"
        >
          <LogOut className="w-4 h-4 mr-2" />
          {logoutMutation.isPending ? "Signing out..." : "Sign Out"}
        </Button>
      </div>
    </aside>
  );
}
