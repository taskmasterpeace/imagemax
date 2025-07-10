"use client";

import React, { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Star, Plus, Trash, Pencil, Check, X } from "lucide-react";
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

  // category renaming
  const [editingCat, setEditingCat] = useState<string | null>(null);
  const [catInput, setCatInput] = useState("");

  const categories = Array.from(
    templates.reduce((set, t) => set.add(t.category), new Set<string>())
  );

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

  // rename category and persist
  const renameCategory = () => {
    if (editingCat === null) return;
    const newCat = catInput.trim();
    if (!newCat || newCat === editingCat) {
      setEditingCat(null);
      return;
    }
    templates
      .filter((t) => t.category === editingCat)
      .forEach((t) => updateTemplate({ ...t, category: newCat }));
    setEditingCat(null);
    setCatInput("");
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
      <CardContent className="space-y-4 max-h-[60vh] overflow-y-auto">
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
            {(() => {
              const sel = templates.find((t) => t.id === selectedTemplate);
              return <span>{sel ? sel.name : "Choose a template"}</span>;
            })()}
          </SelectTrigger>
          <SelectContent>
            {categories.map((cat) => (
              <details key={cat} className="border rounded-md p-2">
                <summary className="cursor-pointer flex items-center justify-between">
                  {editingCat === cat ? (
                    <div className="flex gap-2 w-full">
                      <input
                        className="flex-1 border p-1 rounded-md text-sm"
                        value={catInput}
                        onChange={(e) => setCatInput(e.target.value)}
                        autoFocus
                      />
                      <Button size="icon" variant="ghost" onClick={renameCategory}>
                        <Check className="w-4 h-4" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => setEditingCat(null)}>
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ) : (
                    <>
                      <span className="font-medium">{cat}</span>
                      <Button size="icon" variant="ghost" onClick={() => { setEditingCat(cat); setCatInput(cat); }}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                    </>
                  )}
                </summary>
                <div className="mt-2 space-y-2">
                  {templates.filter((t) => t.category === cat).map((t) => (
                    <div
                      key={t.id}
                      className={`p-2 border rounded-md flex justify-between items-center cursor-pointer ${selectedTemplate === t.id ? "bg-accent" : ""}`}
                      onClick={() => setSelectedTemplate(t.id)}
                    >
                      <span className="text-sm">{t.name}</span>
                      <div className="flex gap-1">
                        <Button size="icon" variant="ghost" onClick={(e) => { e.stopPropagation(); setEditingTemplate(t); setNewName(t.name); setNewPrompt(t.prompt); setNewCategory(t.category); setShowAddForm(true); }}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={(e) => { e.stopPropagation(); handleDelete(t.id); }}>
                          <Trash className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </details>
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
              <Trash className="w-4 h-4" />
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
