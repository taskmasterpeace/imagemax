"use client";

import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Layers, Send } from "lucide-react";

export interface BulkActionsPanelProps {
  bulkPrompt: string;
  setBulkPrompt: (value: string) => void;
  selectedCount: number;
  applyBulkPrompt: () => void;
  sendToGen4: () => void;
}

export default function BulkActionsPanel({
  bulkPrompt,
  setBulkPrompt,
  selectedCount,
  applyBulkPrompt,
  sendToGen4,
}: BulkActionsPanelProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Layers className="w-5 h-5" />
          Bulk Actions
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Textarea
          placeholder="Enter prompt for all selected images..."
          value={bulkPrompt}
          onChange={(e) => setBulkPrompt(e.target.value)}
          rows={3}
        />
        <div className="flex gap-2">
          <Button
            onClick={applyBulkPrompt}
            disabled={!bulkPrompt.trim() || selectedCount === 0}
            className="flex-1"
          >
            Apply Bulk Prompt
          </Button>
          <Button
            onClick={sendToGen4}
            disabled={selectedCount === 0}
            variant="outline"
            className="flex items-center gap-2 bg-transparent"
          >
            <Send className="w-4 h-4" />
            Send to Gen 4
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
