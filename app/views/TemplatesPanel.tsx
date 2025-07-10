"use client";

import React, { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Star, Plus, Trash2, Pencil } from "lucide-react";
import { Template } from "@/types";

export interface TemplatesPanelProps {
  templates: Template[];
  selectedTemplate: string;
  setSelectedTemplate: (id: string) => void;
  selectedCount: number;
  applyTemplateToSelected: () => void;
  addTemplate: (template: Template) => void;
  deleteTemplate: (id: string) => void;
  updateTemplate: (template: Template) => void;
  resetTemplates: () => void;
}

export default function TemplatesPanel({
  templates,
  selectedTemplate,
  setSelectedTemplate,
  selectedCount,
  applyTemplateToSelected,
  addTemplate,
  deleteTemplate,
  updateTemplate,
  resetTemplates,
}: TemplatesPanelProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPrompt, setNewPrompt] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);

  const handleSave = () => {
    if (!newName.trim() || !newPrompt.trim()) return;
    const template: Template = {
      ...(editingTemplate ?? {}),
      id: editingTemplate?.id ?? Date.now().toString(36),
      name: newName,
      prompt: newPrompt,
      category: newCategory || "Custom",
      favorite: false,
      usageCount: 0,
    };
    if (editingTemplate) {
      updateTemplate(template);
    } else {
      addTemplate(template);
    }
    setNewName("");
    setNewPrompt("");
    setNewCategory("");
    setShowAddForm(false);
    setEditingTemplate(null);
  };

  const handleDelete = (id: string) => {
    deleteTemplate(id);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 justify-between">
          <div className="flex items-center gap-2">
            <Star className="w-5 h-5" />
            Templates
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowAddForm(prev => !prev)}>
              <Plus className="w-4 h-4" />
            </Button>
            <Button variant="destructive" size="sm" onClick={resetTemplates} title="Reset to defaults">
              Reset
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {showAddForm && (
          <div className="space-y-2 p-4 border rounded-md">
            <input
              className="w-full border p-2 rounded-md"
              placeholder="Template Name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
            />
            <textarea
              className="w-full border p-2 rounded-md"
              placeholder="Prompt"
              value={newPrompt}
              onChange={(e) => setNewPrompt(e.target.value)}
            />
            <input
              className="w-full border p-2 rounded-md"
              placeholder="Category (optional)"
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={handleSave}>Save</Button>
              <Button size="sm" variant="outline" onClick={() => setShowAddForm(false)}>Cancel</Button>
            </div>
          </div>
        )}

        <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
          <SelectTrigger>
            <SelectValue placeholder="Choose a template" />
          </SelectTrigger>
          <SelectContent>
            {templates.map((template) => (
              <SelectItem key={template.id} value={template.id}>
                <div className="flex items-center justify-between w-full">
                  <div className="flex flex-col text-left">
                    <span className="font-medium">{template.name}</span>
                    <span className="text-xs text-muted-foreground truncate max-w-[160px]">
                      {template.prompt.slice(0, 40)}{template.prompt.length > 40 ? "…" : ""}
                    </span>
                  </div>
                  <Badge variant="outline">{template.category}</Badge>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Edit / Delete actions for selected template */}
        {selectedTemplate && (
          <div className="flex gap-2 justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const tmpl = templates.find((t) => t.id === selectedTemplate);
                if (!tmpl) return;
                setEditingTemplate(tmpl);
                setNewName(tmpl.name);
                setNewPrompt(tmpl.prompt);
                setNewCategory(tmpl.category);
                setShowAddForm(true);
              }}
            >
              <Pencil className="w-4 h-4" />
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => handleDelete(selectedTemplate)}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        )}

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
