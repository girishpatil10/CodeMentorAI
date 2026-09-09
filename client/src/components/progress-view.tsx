import { ExecutionHistory } from "@/components/execution-history";
import { ProgressDashboard } from "@/components/progress-dashboard";

export function ProgressView() {
  return (
    <div className="flex-1 flex flex-col lg:flex-row h-full overflow-hidden bg-background">
      {/* Left: Run / Debug History */}
      <div className="w-full lg:w-2/3 border-r border-border flex flex-col overflow-hidden">
        <div className="flex-1 overflow-hidden">
          <ExecutionHistory
            onReplay={() => {
              // In the progress view we only show history; replay is handled from the editor page.
            }}
          />
        </div>
      </div>

      {/* Right: Progress & Summary */}
      <div className="w-full lg:w-1/3 overflow-auto bg-card/40">
        <ProgressDashboard />
      </div>
    </div>
  );
}


