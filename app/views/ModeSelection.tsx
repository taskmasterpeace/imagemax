"use client";

import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Video, ImageIcon, Wand2 } from "lucide-react";

export interface ModeSelectionProps {
  mode: "seedance" | "kontext";
  setMode: (mode: "seedance" | "kontext") => void;
}

export default function ModeSelection({ mode, setMode }: ModeSelectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wand2 className="w-5 h-5" />
          Mode Selection
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex gap-4">
          <Button
            variant={mode === "seedance" ? "default" : "outline"}
            onClick={() => setMode("seedance")}
            className="flex items-center gap-2"
          >
            <Video className="w-4 h-4" />
            Seedance (Video)
          </Button>
          <Button
            variant={mode === "kontext" ? "default" : "outline"}
            onClick={() => setMode("kontext")}
            className="flex items-center gap-2"
          >
            <ImageIcon className="w-4 h-4" />
            Kontext (Edit)
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
