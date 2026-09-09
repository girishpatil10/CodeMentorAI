import { useState } from "react";
import { Sidebar } from "@/components/sidebar";
import { CodeWorkspace } from "@/components/code-workspace";
import { ProgressView } from "@/components/progress-view";
import { SettingsView } from "@/components/settings-view";

type ActiveView = "editor" | "progress" | "settings";

export default function HomePage() {
  const [activeView, setActiveView] = useState<ActiveView>("editor");

  return (
    <div className="h-screen flex bg-background text-foreground">
      <Sidebar
        activeView={activeView}
        onShowEditor={() => setActiveView("editor")}
        onShowProgress={() => setActiveView("progress")}
        onShowSettings={() => setActiveView("settings")}
      />

      <div className="flex-1 flex overflow-hidden">
        <div className={activeView === "editor" ? "flex-1 flex" : "hidden"}>
          <CodeWorkspace />
        </div>
        <div className={activeView === "progress" ? "flex-1 flex" : "hidden"}>
          <ProgressView />
        </div>
        <div className={activeView === "settings" ? "flex-1 flex" : "hidden"}>
          <SettingsView />
        </div>
      </div>
    </div>
  );
}
