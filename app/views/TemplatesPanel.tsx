"use client";

import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Star } from "lucide-react";
import { Template } from "@/types";

export interface TemplatesPanelProps {
  templates: Template[];
  selectedTemplate: string;
  setSelectedTemplate: (id: string) => void;
  selectedCount: number;
  applyTemplateToSelected: () => void;
}

export default function TemplatesPanel({
  templates,
  selectedTemplate,
  setSelectedTemplate,
  selectedCount,
  applyTemplateToSelected,
}: TemplatesPanelProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Star className="w-5 h-5" />
          Templates
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
          <SelectTrigger>
            <SelectValue placeholder="Choose a template" />
          </SelectTrigger>
          <SelectContent>
            {templates.map((template) => (
              <SelectItem key={template.id} value={template.id}>
                <div className="flex items-center justify-between w-full">
                  <span>{template.name}</span>
                  <Badge variant="outline" className="ml-2">
                    {template.category}
                  </Badge>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          onClick={applyTemplateToSelected}
          disabled={!selectedTemplate || selectedCount === 0}
          className="w-full"
        >
          Apply to Selected ({selectedCount})
        </Button>
      </CardContent>
    </Card>
  );
}
