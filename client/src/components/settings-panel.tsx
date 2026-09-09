"use client";

import { useState } from "react";
import { Settings, X } from "lucide-react";
import { Button } from "./ui/button";
import { ThemeToggle } from "./theme-toggle";

export function SettingsPanel() {
  const [isOpen, setIsOpen] = useState(false);

  if (!isOpen) {
    return (
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setIsOpen(true)}
        className="absolute bottom-20 right-4 rounded-full w-10 h-10"
      >
        <Settings className="h-5 w-5" />
      </Button>
    );
  }

  return (
    <div className="absolute bottom-20 right-4 w-64 bg-card border border-border rounded-lg shadow-lg p-4 space-y-4 z-50">
      <div className="flex items-center justify-between">
        <h3 className="font-medium">Settings</h3>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsOpen(false)}
          className="h-6 w-6"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">Appearance</p>
        <ThemeToggle />
      </div>
    </div>
  );
}
