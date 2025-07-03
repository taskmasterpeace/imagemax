"use client";

import type React from "react";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { toast } from "@/hooks/use-toast";
import {
  Upload,
  Play,
  Download,
  Trash2,
  Settings,
  ImageIcon,
  Video,
  Wand2,
  Sparkles,
  Check,
  X,
  Plus,
  Star,
  DollarSign,
  Layers,
  Grid,
  List,
  SortAsc,
  SortDesc,
  Tag,
  Send,
  Clock,
  Copy,
  CheckCircle2,
  Search,
} from "lucide-react";
import Image from "next/image";

// Types and interfaces
interface ImageData {
  filename?: any;
  id: string;
  file: File;
  preview: string;
  prompt: string;
  selected: boolean;
  status: "idle" | "processing" | "completed" | "failed";
  outputUrl?: string;
  videos?: string[];
  error?: string;
  editHistory?: EditHistoryItem[];
}

interface EditHistoryItem {
  id: string;
  prompt: string;
  imageUrl: string;
  timestamp: number;
  model: "dev" | "max";
}

interface Template {
  id: string;
  name: string;
  prompt: string;
  category: string;
  favorite: boolean;
  usageCount: number;
}

interface JobStatus {
  jobId: string;
  status: "processing" | "completed" | "failed" | "merging";
  total: number;
  completed: number;
  tasks: Array<{
    filename: string;
    prompt: string;
    status: string;
    outputUrl?: string;
    error?: string;
  }>;
  mergedOutputUrl?: string;
}

interface Gen4ReferenceImage {
  id: string;
  file: File;
  preview: string;
  tags: string[];
}

interface Gen4Generation {
  id: string;
  prompt: string;
  referenceImages: Gen4ReferenceImage[];
  settings: {
    aspectRatio: string;
    resolution: string;
    seed?: number;
  };
  status: "idle" | "processing" | "completed" | "failed";
  outputUrl?: string;
  error?: string;
  timestamp: number;
}

export default function VideoGeneratorApp() {
  // State management
  const [activeTab, setActiveTab] = useState("workspace");
  const [mode, setMode] = useState<"seedance" | "kontext">("seedance");
  const [images, setImages] = useState<ImageData[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [bulkPrompt, setBulkPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [jobStatus, setJobStatus] = useState<JobStatus | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [showOnlySelected, setShowOnlySelected] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"name" | "date" | "status">("date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);
  const [fullscreenVideo, setFullscreenVideo] = useState<string | null>(null);
  const [carouselIndex, setCarouselIndex] = useState<{ [key: string]: number }>({});
  const [generatedVideos, setGeneratedVideos] = useState<{
    filename: string;
    prompt: string;
    status: string;
    outputUrl?: string;
  }[]>([]);
  
  // Gen 4 specific state
  const [gen4ReferenceImages, setGen4ReferenceImages] = useState<
    Gen4ReferenceImage[]
  >([]);
  const [gen4Prompt, setGen4Prompt] = useState("");
  const [gen4Settings, setGen4Settings] = useState({
    aspectRatio: "16:9",
    resolution: "480p",
    seed: undefined as number | undefined,
  });
  const [gen4Generations, setGen4Generations] = useState<Gen4Generation[]>([]);
  const [isGen4Generating, setIsGen4Generating] = useState(false);

  // Settings state
  const [settings, setSettings] = useState({
    seedance: {
      model: "seedance-1-lite",
      resolution: "480p",
      duration: 5,
      cameraFixed: false,
    },
    kontext: {
      model: "dev" as "dev" | "max",
    },
    general: {
      autoSave: true,
      showCostEstimates: true,
      maxConcurrentJobs: 3,
    },
  });

  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const gen4FileInputRef = useRef<HTMLInputElement>(null);

  // Load data from IndexedDB on mount
  useEffect(() => {
    loadFromIndexedDB();
    loadTemplates();
  }, []);

  // Auto-save to IndexedDB when images change
  useEffect(() => {
    if (settings.general.autoSave && images.length > 0) {
      saveToIndexedDB();
    }
  }, [images, settings.general.autoSave]);

  // Polling for job status
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (jobStatus && jobStatus.status === "processing") {
      interval = setInterval(async () => {
        try {
          const response = await fetch(`/api/job-status/${jobStatus.jobId}`);
          if (response.ok) {
            const updatedStatus = await response.json();
            setJobStatus(updatedStatus);

            if (
              updatedStatus.status === "completed" ||
              updatedStatus.status === "failed"
            ) {
              updateImagesWithResults(updatedStatus);
              setIsGenerating(false);
            }
          }
        } catch (error) {
          console.error("Error polling job status:", error);
        }
      }, 2000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [jobStatus]);

  // Helper functions
  const loadFromIndexedDB = async () => {
    try {
      // Simple fallback - just return empty array for now
      // The actual job data will be loaded from the job status API
      console.log("Loading from IndexedDB...");
      return [];
    } catch (error) {
      console.error("Error loading from IndexedDB:", error);
    }
  };

  const saveToIndexedDB = async () => {
    try {
      // Simple auto-save implementation
      console.log("Auto-saving to IndexedDB...");
    } catch (error) {
      console.error("Error saving to IndexedDB:", error);
    }
  };

  const loadTemplates = () => {
    const defaultTemplates: Template[] = [
      {
        id: "1",
        name: "Cinematic",
        prompt: "cinematic shot, dramatic lighting, film grain",
        category: "Style",
        favorite: false,
        usageCount: 0,
      },
      {
        id: "2",
        name: "Nature",
        prompt: "beautiful nature scene, vibrant colors, peaceful atmosphere",
        category: "Scene",
        favorite: false,
        usageCount: 0,
      },
      {
        id: "3",
        name: "Urban",
        prompt: "modern city, bustling streets, urban architecture",
        category: "Scene",
        favorite: false,
        usageCount: 0,
      },
      {
        id: "4",
        name: "Portrait",
        prompt: "professional portrait, soft lighting, shallow depth of field",
        category: "Style",
        favorite: false,
        usageCount: 0,
      },
      {
        id: "5",
        name: "Abstract",
        prompt: "abstract art, flowing shapes, vibrant colors",
        category: "Art",
        favorite: false,
        usageCount: 0,
      },
    ];
    setTemplates(defaultTemplates);
  };

  const handleFileUpload = (files: FileList | null, isGen4 = false) => {
    if (!files) return;

    const newImages: ImageData[] = [];
    const newGen4Images: Gen4ReferenceImage[] = [];

    Array.from(files).forEach((file) => {
      if (file.type.startsWith("image/")) {
        const id =
          Date.now().toString() + Math.random().toString(36).substr(2, 9);
        const preview = URL.createObjectURL(file);

        if (isGen4) {
          newGen4Images.push({
            id,
            file,
            preview,
            tags: [],
          });
        } else {
          newImages.push({
            id,
            file,
            preview,
            prompt: "",
            selected: false,
            status: "idle",
          });
        }
      }
    });

    if (isGen4) {
      setGen4ReferenceImages((prev) => [...prev, ...newGen4Images]);
      if (newGen4Images.length > 0) {
        setActiveTab("gen4");
        toast({
          title: "Images added to Gen 4",
          description: `${newGen4Images.length} image(s) added to Gen 4 references`,
        });
      }
    } else {
      setImages((prev) => [...prev, ...newImages]);
      toast({
        title: "Images uploaded",
        description: `${newImages.length} image(s) uploaded successfully`,
      });
    }
  };

  const handleDrop = (e: React.DragEvent, isGen4 = false) => {
    e.preventDefault();
    handleFileUpload(e.dataTransfer.files, isGen4);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const removeImage = (id: string, isGen4 = false) => {
    if (isGen4) {
      setGen4ReferenceImages((prev) => prev.filter((img) => img.id !== id));
    } else {
      setImages((prev) => prev.filter((img) => img.id !== id));
    }
  };

  const toggleImageSelection = (id: string) => {
    setImages((prev) =>
      prev.map((img) =>
        img.id === id ? { ...img, selected: !img.selected } : img
      )
    );
  };

  const selectAllImages = () => {
    const allSelected = images.every((img) => img.selected);
    setImages((prev) =>
      prev.map((img) => ({ ...img, selected: !allSelected }))
    );
  };

  const applyTemplateToSelected = () => {
    if (!selectedTemplate) return;

    const template = templates.find((t) => t.id === selectedTemplate);
    if (!template) return;

    setImages((prev) =>
      prev.map((img) =>
        img.selected ? { ...img, prompt: template.prompt } : img
      )
    );

    // Update template usage count
    setTemplates((prev) =>
      prev.map((t) =>
        t.id === selectedTemplate ? { ...t, usageCount: t.usageCount + 1 } : t
      )
    );

    toast({
      title: "Template applied",
      description: `Applied "${template.name}" to selected images`,
    });
  };

  const applyBulkPrompt = () => {
    if (!bulkPrompt.trim()) return;

    setImages((prev) =>
      prev.map((img) => (img.selected ? { ...img, prompt: bulkPrompt } : img))
    );

    toast({
      title: "Bulk prompt applied",
      description: "Prompt applied to all selected images",
    });
  };

  const updateImagesWithResults = (status: JobStatus) => {
    setImages((prev) =>
      prev.map((img) => {
        const task = status.tasks.find((t) => t.filename === img.file.name);
        if (task) {
          const updatedVideos = task.outputUrl
            ? [...(img.videos || []), task.outputUrl]
            : img.videos;
          return {
            ...img,
            status: task.status as any,
            outputUrl: task.outputUrl ? task.outputUrl : img.outputUrl,
            videos: updatedVideos,
            error: task.error,
          };
        }
        return img;
      })
    );
  };

  const startGeneration = async () => {
    const selectedImages = images.filter(
      (img) => img.selected && img.prompt.trim()
    );

    if (selectedImages.length === 0) {
      toast({
        title: "No images selected",
        description: "Please select images with prompts to generate videos",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    setImages((prev) =>
      prev.map((img) => (img.selected ? { ...img, status: "processing" } : img))
    );

    try {
      const formData = new FormData();

      selectedImages.forEach((img) => {
        formData.append("images", img.file);
      });

      const metadata = {
        prompts: selectedImages.map((img) => img.prompt),
        model: settings.seedance.model,
        resolution: settings.seedance.resolution,
        duration: settings.seedance.duration,
        camera_fixed: settings.seedance.cameraFixed,
        mode: mode,
      };

      formData.append("metadata", JSON.stringify(metadata));

      const response = await fetch("/api/generate-videos", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      setGeneratedVideos(result?.generatedResponse);
      // kick off job-status polling so `updateImagesWithResults` will add the outputUrl & videos
      setJobStatus(result);

      setIsGenerating(false);

      toast({
        title: "Generation started",
        description: `Processing ${selectedImages.length} image(s)`,
      });
    } catch (error) {
      console.error("Generation error:", error);
      setIsGenerating(false);
      toast({
        title: "Generation failed",
        description:
          error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
    }
  };

  const editWithKontext = async (imageId: string, prompt: string) => {
    const image = images.find((img) => img.id === imageId);
    if (!image) return;

    try {
      setImages((prev) =>
        prev.map((img) =>
          img.id === imageId ? { ...img, status: "processing" } : img
        )
      );

      const formData = new FormData();
      formData.append("image", image.file);
      formData.append("prompt", prompt);
      formData.append("editId", imageId);
      formData.append("model", settings.kontext.model);

      const response = await fetch("/api/kontext-edit", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (result.success) {
        setImages((prev) =>
          prev.map((img) => {
            if (img.id === imageId) {
              const editHistory = img.editHistory || [];
              editHistory.push({
                id: Date.now().toString(),
                prompt,
                imageUrl: result.imageUrl,
                timestamp: Date.now(),
                model: settings.kontext.model,
              });
              return {
                ...img,
                status: "completed",
                outputUrl: result.imageUrl,
                editHistory,
              };
            }
            return img;
          })
        );

        toast({
          title: "Edit completed",
          description: "Image edited successfully with Kontext",
        });
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error("Kontext edit error:", error);
      setImages((prev) =>
        prev.map((img) =>
          img.id === imageId
            ? {
                ...img,
                status: "failed",
                error: error instanceof Error ? error.message : "Edit failed",
              }
            : img
        )
      );

      toast({
        title: "Edit failed",
        description:
          error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
    }
  };

  const sendToGen4 = () => {
    const selectedImages = images.filter((img) => img.selected);

    if (selectedImages.length === 0) {
      toast({
        title: "No images selected",
        description: "Please select images to send to Gen 4",
        variant: "destructive",
      });
      return;
    }

    const newGen4Images: Gen4ReferenceImage[] = selectedImages.map((img) => ({
      id: img.id,
      file: img.file,
      preview: img.preview,
      tags: [],
    }));

    setGen4ReferenceImages((prev) => [...prev, ...newGen4Images]);
    setActiveTab("gen4");

    toast({
      title: "Images sent to Gen 4",
      description: `${selectedImages.length} image(s) added to Gen 4 references`,
    });
  };

  const generateGen4 = async () => {
    if (!gen4Prompt.trim()) {
      toast({
        title: "Missing prompt",
        description: "Please enter a prompt for Gen 4 generation",
        variant: "destructive",
      });
      return;
    }

    if (gen4ReferenceImages.length === 0) {
      toast({
        title: "No reference images",
        description: "Please add at least one reference image",
        variant: "destructive",
      });
      return;
    }

    setIsGen4Generating(true);

    try {
      const formData = new FormData();
      formData.append("prompt", gen4Prompt);
      formData.append("aspectRatio", gen4Settings.aspectRatio);
      formData.append("resolution", gen4Settings.resolution);
      if (gen4Settings.seed) {
        formData.append("seed", gen4Settings.seed.toString());
      }

      gen4ReferenceImages.forEach((img, index) => {
        formData.append(`referenceImage${index + 1}`, img.file);
        formData.append(`referenceTags${index + 1}`, JSON.stringify(img.tags));
      });

      const response = await fetch("/api/gen4", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      const newGeneration: Gen4Generation = {
        id: Date.now().toString(),
        prompt: gen4Prompt,
        referenceImages: [...gen4ReferenceImages],
        settings: { ...gen4Settings },
        status: "completed",
        outputUrl: result.imageUrl,
        timestamp: Date.now(),
      };

      setGen4Generations((prev) => [newGeneration, ...prev]);

      toast({
        title: "Gen 4 generation completed",
        description: "Your image has been generated successfully",
      });
    } catch (error) {
      console.error("Gen 4 generation error:", error);
      toast({
        title: "Generation failed",
        description:
          error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
    } finally {
      setIsGen4Generating(false);
    }
  };

  const addTagToGen4Image = (imageId: string, tag: string) => {
    if (!tag.trim()) return;

    setGen4ReferenceImages((prev) =>
      prev.map((img) =>
        img.id === imageId
          ? {
              ...img,
              tags: [...img.tags, tag.trim()],
            }
          : img
      )
    );
  };

  const removeTagFromGen4Image = (imageId: string, tagIndex: number) => {
    setGen4ReferenceImages((prev) =>
      prev.map((img) =>
        img.id === imageId
          ? {
              ...img,
              tags: img.tags.filter((_, index) => index !== tagIndex),
            }
          : img
      )
    );
  };

  // Filter and sort images
  const filteredImages = images
    .filter((img) => {
      if (showOnlySelected && !img.selected) return false;
      if (
        searchQuery &&
        !img.file.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !img.prompt.toLowerCase().includes(searchQuery.toLowerCase())
      )
        return false;
      return true;
    })
    .sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case "name":
          comparison = a.file.name.localeCompare(b.file.name);
          break;
        case "date":
          comparison = a.id.localeCompare(b.id);
          break;
        case "status":
          comparison = a.status.localeCompare(b.status);
          break;
      }
      return sortOrder === "asc" ? comparison : -comparison;
    });

  const selectedCount = images.filter((img) => img.selected).length;
  const gen4ImageCount = gen4ReferenceImages.length;
  const gen4GenerationCount = gen4Generations.length;

  const handleCopy = async (fileUrl: string) => {
    try {
      await navigator.clipboard.writeText(fileUrl);
      toast({
        title: "URL copied to clipboard",
        description: "URL copied to clipboard!",
      });
    } catch (error) {
      console.error("Failed to copy URL:", error);
    }
  };

  const handleDownload = async (fileUrl: string) => {
    const fileName = fileUrl.split("/").pop() || "image.png";

    try {
      const response = await fetch(fileUrl, {
        mode: "cors", // or 'no-cors' if server allows it (limited access though)
      });

      if (!response.ok) {
        throw new Error("Network response was not ok");
      }

      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error("Download failed:", error);
    }
  };

  const openFullscreenImage = (src: string, mode: string) => {
    console.log("src", src, mode);

    if (mode === "seedance") {
      setFullscreenVideo(src);
    } else {
      setFullscreenImage(src);
    }
  };

  const closeFullscreenImage = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setFullscreenImage(null);
    setFullscreenVideo(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="container mx-auto p-6">
        <div className="mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
            Seedance Video Generator
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-2">
            Transform your images into stunning videos with AI
          </p>
        </div>

        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="space-y-6"
        >
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="workspace" className="flex items-center gap-2">
              <Layers className="w-4 h-4" />
              Workspace
              {selectedCount > 0 && (
                <Badge variant="secondary" className="ml-1">
                  {selectedCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="gen4" className="flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              Gen 4
              {(gen4ImageCount > 0 || gen4GenerationCount > 0) && (
                <Badge variant="secondary" className="ml-1">
                  {gen4ImageCount + gen4GenerationCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Settings
            </TabsTrigger>
          </TabsList>

          {/* Workspace Tab */}
          <TabsContent value="workspace" className="space-y-6">
            {/* Mode Selection */}
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

            {/* Upload Area */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="w-5 h-5" />
                  Upload Images
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div
                  className="border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg p-8 text-center hover:border-purple-400 transition-colors cursor-pointer"
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="w-12 h-12 mx-auto mb-4 text-slate-400" />
                  <p className="text-lg font-medium mb-2">
                    Drop images here or click to upload
                  </p>
                  <p className="text-slate-500">
                    Support for JPG, PNG, WebP formats
                  </p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleFileUpload(e.target.files)}
                />
              </CardContent>
            </Card>

            {/* Templates and Bulk Actions */}
            {images.length > 0 && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Star className="w-5 h-5" />
                      Templates
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Select
                      value={selectedTemplate}
                      onValueChange={setSelectedTemplate}
                    >
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
              </div>
            )}

            {/* Image Management */}
            {images.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ImageIcon className="w-5 h-5" />
                      Images ({images.length})
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-2">
                        <Input
                          placeholder="Search images..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="w-48"
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            setViewMode(viewMode === "grid" ? "list" : "grid")
                          }
                        >
                          {viewMode === "grid" ? (
                            <List className="w-4 h-4" />
                          ) : (
                            <Grid className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={selectAllImages}
                      >
                        {images.every((img) => img.selected)
                          ? "Deselect All"
                          : "Select All"}
                      </Button>
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id="show-selected"
                          checked={showOnlySelected}
                          // onCheckedChange={setShowOnlySelected}
                        />
                        <Label htmlFor="show-selected">
                          Show only selected
                        </Label>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Select
                        value={sortBy}
                        onValueChange={(value: any) => setSortBy(value)}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="name">Name</SelectItem>
                          <SelectItem value="date">Date</SelectItem>
                          <SelectItem value="status">Status</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setSortOrder(sortOrder === "asc" ? "desc" : "asc")
                        }
                      >
                        {sortOrder === "asc" ? (
                          <SortAsc className="w-4 h-4" />
                        ) : (
                          <SortDesc className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  </div>

                  <div
                      className={
                        viewMode === "grid"
                          ? "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4"
                          : "space-y-4"
                      }
                    >
                      {filteredImages.map((image, index) => {
                        const videos = image.videos && image.videos.length > 0 ? image.videos : image.outputUrl ? [image.outputUrl] : [];
                        const currentIdx = carouselIndex[image.id] ?? 0;
                        const mediaUrl = videos[currentIdx] ?? generatedVideos.find(
                          (vid) => vid?.filename === image?.file?.name
                        )?.outputUrl;
                        return (
                        <div
                          key={image.id}
                          className={`m-1 relative group border rounded-lg overflow-hidden ${
                            image.selected ? "ring-2 ring-purple-500" : ""
                          } ${
                            viewMode === "list"
                              ? "flex items-center gap-4 p-4"
                              : ""
                          }`}
                        >
                          <div
                            className={`relative ${
                              viewMode === "list"
                                ? "w-20 h-20 flex-shrink-0"
                                : "aspect-square"
                            }`}
                          >
                            <img
                              src={image.preview || "/placeholder.svg"}
                              alt={image.file.name}
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  onClick={() => toggleImageSelection(image.id)}
                                >
                                  {image.selected ? (
                                    <Check className="w-4 h-4" />
                                  ) : (
                                    <Plus className="w-4 h-4" />
                                  )}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => removeImage(image.id)}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  onClick={() =>
                                    openFullscreenImage(
                                      image.preview || "/placeholder.svg",
                                      "kontext"
                                    )
                                  }
                                >
                                  <Search className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                            {image.status !== "idle" && (
                              <div className="absolute top-2 right-2">
                                <Badge
                                  variant={
                                    image.status === "completed"
                                      ? "default"
                                      : image.status === "processing"
                                      ? "secondary"
                                      : image.status === "failed"
                                      ? "destructive"
                                      : "outline"
                                  }
                                >
                                  {image.status}
                                </Badge>
                              </div>
                            )}
                          </div>

                          <div
                            className={`${
                              viewMode === "list" ? "flex-1" : "p-3"
                            }`}
                          >
                            <p className="font-medium text-sm truncate mb-2">
                              {image.file.name}
                            </p>
                            <Textarea
                              placeholder={
                                mode === "seedance"
                                  ? "Enter video prompt..."
                                  : "Enter edit prompt..."
                              }
                              value={image.prompt}
                              onChange={(e) =>
                                setImages((prev) =>
                                  prev.map((img) =>
                                    img.id === image.id
                                      ? { ...img, prompt: e.target.value }
                                      : img
                                  )
                                )
                              }
                              rows={2}
                              className="text-sm"
                            />
                            {mode === "kontext" && image.prompt && (
                              <Button
                                size="sm"
                                onClick={startGeneration}
                                disabled={image.status === "processing"}
                                className="mt-2 w-full"
                              >
                                {image.status === "processing"
                                  ? "Editing..."
                                  : "Edit with Kontext"}
                              </Button>
                            )}
                            {mediaUrl && (
                              <div className="mt-2 relative overflow-hidden rounded-lg border bg-white group">
                                {mode === "seedance" ? (
                                  <video
                                    src={mediaUrl}
                                    controls
                                    className="w-full rounded"
                                  />
                                ) : (
                                  <img
                                    src={mediaUrl}
                                    alt="Edited"
                                    className="w-full rounded"
                                  />
                                )}
                                {videos.length > 1 && (
                                  <div className="absolute inset-0 flex items-center justify-between px-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                      className="bg-black/50 text-white rounded-full w-6 h-6 flex items-center justify-center"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setCarouselIndex((prev) => ({
                                          ...prev,
                                          [image.id]: (currentIdx - 1 + videos.length) % videos.length,
                                        }));
                                      }}
                                    >
                                      ‹
                                    </button>
                                    <button
                                      className="bg-black/50 text-white rounded-full w-6 h-6 flex items-center justify-center"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setCarouselIndex((prev) => ({
                                          ...prev,
                                          [image.id]: (currentIdx + 1) % videos.length,
                                        }));
                                      }}
                                    >
                                      ›
                                    </button>
                                  </div>
                                )}

                                <div className="absolute top-2 right-2 opacity-0 bg-black/0 group-hover:bg-black/20 group-hover:opacity-100 transition-opacity">
                                  <div className="flex gap-1">
                                    <Button
                                      size="sm"
                                      variant="secondary"
                                      className="h-8 w-8 p-0"
                                      onClick={() =>
                                        openFullscreenImage(
                                          mediaUrl ||
                                          "/placeholder.svg", 
                                          mode === "seedance" ? "seedance" : "kontext"
                                        )
                                      }
                                    >
                                      <Search className="w-3 h-3" />
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            )}

                            {image.error && (
                              <p className="text-red-500 text-xs mt-2">
                                {image.error}
                              </p>
                            )}
                          </div>
                        </div>
                        )
                      })}
                    </div>
                  </CardContent>
                </Card>
              )}

            {/* Generation Controls */}
            {mode === "seedance" && images.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Play className="w-5 h-5" />
                    Generate Videos
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <p className="text-sm text-slate-600">
                        {selectedCount} image(s) selected for generation
                      </p>
                      {jobStatus && (
                        <div className="flex items-center gap-2">
                          <Progress
                            value={
                              (jobStatus.completed / jobStatus.total) * 100
                            }
                            className="w-32"
                          />
                          <span className="text-sm">
                            {jobStatus.completed}/{jobStatus.total}
                          </span>
                        </div>
                      )}
                    </div>
                    <Button
                      onClick={startGeneration}
                      disabled={isGenerating || selectedCount === 0}
                      className="flex items-center gap-2"
                    >
                      {isGenerating ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <Play className="w-4 h-4" />
                          Generate Videos
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Gen 4 Tab */}
          <TabsContent value="gen4" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="col-span-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Sparkles className="w-5 h-5" />
                      Gen 4 Image Generation
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Reference Images Upload */}
                    <div>
                      <Label className="text-base font-medium mb-3 block">
                        Reference Images
                      </Label>
                      <div
                        className="border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg p-6 text-center hover:border-purple-400 transition-colors cursor-pointer"
                        onDrop={(e) => handleDrop(e, true)}
                        onDragOver={handleDragOver}
                        onClick={() => gen4FileInputRef.current?.click()}
                      >
                        <Upload className="w-8 h-8 mx-auto mb-2 text-slate-400" />
                        <p className="font-medium mb-1">Add reference images</p>
                        <p className="text-sm text-slate-500">
                          Up to 3 images for style reference
                        </p>
                      </div>
                      <input
                        ref={gen4FileInputRef}
                        type="file"
                        multiple
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handleFileUpload(e.target.files, true)}
                      />
                    </div>

                    {/* Reference Images Display */}
                    {gen4ReferenceImages.length > 0 && (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {gen4ReferenceImages.map((image, index) => (
                          <div
                            key={image.id}
                            className="relative group border rounded-lg overflow-hidden"
                          >
                            <div className="aspect-square relative">
                              <img
                                src={image.preview || "/placeholder.svg"}
                                alt={`Reference ${index + 1}`}
                                className="w-full h-full object-cover"
                              />
                              <div className="absolute top-2 left-2">
                                <Badge variant="secondary">
                                  {index === 0
                                    ? "1st"
                                    : index === 1
                                    ? "2nd"
                                    : "3rd"}{" "}
                                  Reference
                                </Badge>
                              </div>
                              <Button
                                size="sm"
                                variant="destructive"
                                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={() => removeImage(image.id, true)}
                              >
                                <X className="w-4 h-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="secondary"
                                className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={() =>
                                  openFullscreenImage(
                                    image.preview || "/placeholder.svg",
                                    "gen4"
                                  )
                                }
                              >
                                <Search className="w-4 h-4" />
                              </Button>
                            </div>
                            <div className="p-3">
                              <div className="flex flex-wrap gap-1 mb-2">
                                {image.tags.map((tag, tagIndex) => (
                                  <Badge
                                    key={tagIndex}
                                    variant="outline"
                                    className="text-xs cursor-pointer hover:bg-red-100"
                                    onClick={() =>
                                      removeTagFromGen4Image(image.id, tagIndex)
                                    }
                                  >
                                    {tag} <X className="w-3 h-3 ml-1" />
                                  </Badge>
                                ))}
                              </div>
                              <div className="flex gap-2">
                                <Input
                                  placeholder="Add tag..."
                                  className="text-sm"
                                  onKeyPress={(e) => {
                                    if (e.key === "Enter") {
                                      addTagToGen4Image(
                                        image.id,
                                        e.currentTarget.value
                                      );
                                      e.currentTarget.value = "";
                                    }
                                  }}
                                />
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={(e) => {
                                    const input = e.currentTarget
                                      .previousElementSibling as HTMLInputElement;
                                    addTagToGen4Image(image.id, input.value);
                                    input.value = "";
                                  }}
                                >
                                  <Tag className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Generation Prompt */}
                    <div>
                      <Label
                        htmlFor="gen4-prompt"
                        className="text-base font-medium mb-3 block"
                      >
                        Generation Prompt
                      </Label>
                      <Textarea
                        id="gen4-prompt"
                        placeholder="Describe the image you want to generate..."
                        value={gen4Prompt}
                        onChange={(e) => setGen4Prompt(e.target.value)}
                        rows={4}
                      />
                    </div>

                    {/* Generation Settings */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <Label className="text-sm font-medium mb-2 block">
                          Aspect Ratio
                        </Label>
                        <Select
                          value={gen4Settings.aspectRatio}
                          onValueChange={(value) =>
                            setGen4Settings((prev) => ({
                              ...prev,
                              aspectRatio: value,
                            }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="1:1">Square (1:1)</SelectItem>
                            <SelectItem value="16:9">
                              Landscape (16:9)
                            </SelectItem>
                            <SelectItem value="9:16">
                              Portrait (9:16)
                            </SelectItem>
                            <SelectItem value="4:3">Standard (4:3)</SelectItem>
                            <SelectItem value="3:4">Portrait (3:4)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-sm font-medium mb-2 block">
                          Resolution
                        </Label>
                        <Select
                          value={gen4Settings.resolution}
                          onValueChange={(value) =>
                            setGen4Settings((prev) => ({
                              ...prev,
                              resolution: value,
                            }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="480p">480x854</SelectItem>
                             <SelectItem value="720p">720x1280</SelectItem>
                            <SelectItem value="1080p">1080x1920</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-sm font-medium mb-2 block">
                          Seed (Optional)
                        </Label>
                        <Input
                          type="number"
                          placeholder="Random"
                          value={gen4Settings.seed || ""}
                          onChange={(e) =>
                            setGen4Settings((prev) => ({
                              ...prev,
                              seed: e.target.value
                                ? Number.parseInt(e.target.value)
                                : undefined,
                            }))
                          }
                        />
                      </div>
                    </div>

                    {/* Generate Button */}
                    <Button
                      onClick={generateGen4}
                      disabled={
                        isGen4Generating ||
                        !gen4Prompt.trim() ||
                        gen4ReferenceImages.length === 0
                      }
                      className="w-full flex items-center gap-2"
                      size="lg"
                    >
                      {isGen4Generating ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4" />
                          Generate with Gen 4
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              </div>
              {/* Gen 4 Results */}
              <div className="space-y-6 ">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2">
                        <CheckCircle2 className="w-5 h-5 text-green-600" />
                        Generated Images
                      </CardTitle>
                      <Badge variant="outline" className="text-xs">
                        {gen4Generations.length} results
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {isGenerating ? (
                      <div className="flex flex-col items-center justify-center py-12 space-y-4">
                        <div className="w-16 h-16 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin"></div>
                        <p className="text-sm text-gray-600">
                          Generating your images...
                        </p>
                        <div className="w-full bg-gray-200 rounded-full h-2 max-w-xs">
                          <div
                            className="bg-purple-600 h-2 rounded-full animate-pulse"
                            style={{ width: "60%" }}
                          ></div>
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 gap-4">
                        {gen4Generations.length > 0 ? (
                            gen4Generations.map((generation, index) => (
                              <div
                                key={generation.id}
                                className="group relative"
                              >
                                <div className="relative overflow-hidden rounded-lg border bg-white">
                                  <img
                                    src={
                                      generation.outputUrl
                                        ? generation.outputUrl
                                        : "/placeholder.svg?height=512&width=512"
                                    }
                                    alt="Generated image"
                                    width={300}
                                    height={300}
                                    className="w-full aspect-square object-cover transition-transform group-hover:scale-105"
                                  />

                                  {/* Overlay Actions */}
                                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors">
                                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                      <div className="flex gap-1">
                                        <Button
                                          size="sm"
                                          variant="secondary"
                                          className="h-8 w-8 p-0"
                                          onClick={() =>
                                            openFullscreenImage(
                                              generation?.outputUrl || "",
                                              "gen4"
                                            )
                                          }
                                        >
                                          <Search className="w-3 h-3" />
                                        </Button>
                                      </div>
                                    </div>
                                  </div>
                                </div>

                                {/* Image Info */}
                                <div className="mt-2 space-y-2">
                                  <div className="flex items-center justify-between text-xs text-gray-500">
                                    <span className="flex items-center gap-1">
                                      <Clock className="w-3 h-3" />
                                      {generation.timestamp}
                                    </span>
                                  </div>

                                  {/* Action Buttons */}
                                  <div className="flex gap-1">
                                    {generation?.outputUrl && (
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="flex-1 h-8 text-xs bg-transparent"
                                        onClick={() =>
                                          handleDownload(
                                            generation?.outputUrl || ""
                                          )
                                        }
                                      >
                                        <Download className="w-3 h-3 mr-1" />
                                        Download
                                      </Button>
                                    )}
                                    {generation?.outputUrl && (
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="h-8 w-8 p-0 bg-transparent"
                                        onClick={() =>
                                          handleCopy(generation?.outputUrl || "")
                                        }
                                      >
                                        <Copy className="w-3 h-3" />
                                      </Button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="flex items-center justify-center py-12 space-y-4">
                              <p>No generations found.</p>
                            </div>
                          )}
                        </div>
                      )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Seedance Settings */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Video className="w-5 h-5" />
                    Seedance Settings
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium mb-2 block">
                      Model
                    </Label>
                    <Select
                      value={settings.seedance.model}
                      onValueChange={(value) =>
                        setSettings((prev) => ({
                          ...prev,
                          seedance: { ...prev.seedance, model: value },
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="minimax-video-01">
                          MiniMax Video 01
                        </SelectItem>
                        <SelectItem value="runway-gen3">Runway Gen3</SelectItem>
                        <SelectItem value="luma-dream-machine">
                          Luma Dream Machine
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-sm font-medium mb-2 block">
                      Resolution
                    </Label>
                    <Select
                      value={settings.seedance.resolution}
                      onValueChange={(value) =>
                        setSettings((prev) => ({
                          ...prev,
                          seedance: { ...prev.seedance, resolution: value },
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="480p">SD (854x480)</SelectItem>
                         <SelectItem value="720p">HD (1280x720)</SelectItem>
                        <SelectItem value="1080p">
                          Full HD (1920x1080)
                        </SelectItem>
                        <SelectItem value="2160p">Vertical HD</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-sm font-medium mb-2 block">
                      Duration: {settings.seedance.duration}s
                    </Label>
                    <Slider
                      value={[settings.seedance.duration]}
                      onValueChange={([value]) =>
                        setSettings((prev) => ({
                          ...prev,
                          seedance: { ...prev.seedance, duration: value },
                        }))
                      }
                      min={3}
                      max={10}
                      step={1}
                      className="w-full"
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="camera-fixed"
                      checked={settings.seedance.cameraFixed}
                      onCheckedChange={(checked) =>
                        setSettings((prev) => ({
                          ...prev,
                          seedance: { ...prev.seedance, cameraFixed: checked },
                        }))
                      }
                    />
                    <Label htmlFor="camera-fixed">Fixed Camera</Label>
                  </div>
                </CardContent>
              </Card>

              {/* Kontext Settings */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ImageIcon className="w-5 h-5" />
                    Kontext Settings
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium mb-2 block">
                      Model
                    </Label>
                    <Select
                      value={settings.kontext.model}
                      onValueChange={(value: "dev" | "max") =>
                        setSettings((prev) => ({
                          ...prev,
                          kontext: { ...prev.kontext, model: value },
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="dev">
                          Dev (Fast & Affordable)
                        </SelectItem>
                        <SelectItem value="max">
                          Max (Premium Quality)
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                    <h4 className="font-medium mb-2">Model Comparison</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Dev Model:</span>
                        <span className="text-green-600">
                          ~30s, $0.003/image
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Max Model:</span>
                        <span className="text-blue-600">
                          ~60s, $0.055/image
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* General Settings */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="w-5 h-5" />
                    General Settings
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="auto-save"
                      checked={settings.general.autoSave}
                      onCheckedChange={(checked) =>
                        setSettings((prev) => ({
                          ...prev,
                          general: { ...prev.general, autoSave: checked },
                        }))
                      }
                    />
                    <Label htmlFor="auto-save">Auto-save to IndexedDB</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="show-costs"
                      checked={settings.general.showCostEstimates}
                      onCheckedChange={(checked) =>
                        setSettings((prev) => ({
                          ...prev,
                          general: {
                            ...prev.general,
                            showCostEstimates: checked,
                          },
                        }))
                      }
                    />
                    <Label htmlFor="show-costs">Show cost estimates</Label>
                  </div>
                  <div>
                    <Label className="text-sm font-medium mb-2 block">
                      Max Concurrent Jobs: {settings.general.maxConcurrentJobs}
                    </Label>
                    <Slider
                      value={[settings.general.maxConcurrentJobs]}
                      onValueChange={([value]) =>
                        setSettings((prev) => ({
                          ...prev,
                          general: {
                            ...prev.general,
                            maxConcurrentJobs: value,
                          },
                        }))
                      }
                      min={1}
                      max={5}
                      step={1}
                      className="w-full"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Cost Estimation */}
              {settings.general.showCostEstimates && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <DollarSign className="w-5 h-5" />
                      Cost Estimation
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                        <p className="text-sm font-medium text-blue-700 dark:text-blue-300">
                          Seedance Videos
                        </p>
                        <p className="text-lg font-bold text-blue-900 dark:text-blue-100">
                          ${(selectedCount * 0.12).toFixed(2)}
                        </p>
                        <p className="text-xs text-blue-600 dark:text-blue-400">
                          {selectedCount} selected × $0.12
                        </p>
                      </div>
                      <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                        <p className="text-sm font-medium text-green-700 dark:text-green-300">
                          Kontext Edits
                        </p>
                        <p className="text-lg font-bold text-green-900 dark:text-green-100">
                          $
                          {(
                            selectedCount *
                            (settings.kontext.model === "dev" ? 0.003 : 0.055)
                          ).toFixed(3)}
                        </p>
                        <p className="text-xs text-green-600 dark:text-green-400">
                          {selectedCount} selected × $
                          {settings.kontext.model === "dev" ? "0.003" : "0.055"}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
      {/* Fullscreen Image Modal */}
      {(fullscreenImage || fullscreenVideo) && (
        <div
          className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-4"
          onClick={closeFullscreenImage}
        >
          <div className="relative max-w-full max-h-full">
            {mode === "seedance" && fullscreenVideo ? (
              <video
                src={fullscreenVideo}
                controls
                autoPlay
                className="max-w-full max-h-[90vh] object-contain"
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <img
                src={fullscreenImage || "/placeholder.svg"}
                alt="Fullscreen preview"
                className="max-w-full max-h-[90vh] object-contain cursor-zoom-out"
                onClick={closeFullscreenImage}
              />
            )}
            {/* Close button */}
            <Button
              size="sm"
              variant="secondary"
              className="absolute top-4 right-4 h-8 w-8 p-0 bg-white bg-opacity-20 hover:bg-opacity-30"
              onClick={closeFullscreenImage}
            >
              <X className="w-3 h-3" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
