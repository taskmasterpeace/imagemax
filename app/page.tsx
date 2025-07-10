"use client";

import React, { useCallback, useState, useEffect, useRef } from "react";


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
import { Progress } from "@/components/ui/progress";
import { toast } from "@/hooks/use-toast";
import {
  Play,
  Trash2,
  Settings,
  ImageIcon,
  Sparkles,
  Check,
  X,
  Plus,
  Layers,
  Grid,
  List,
  SortAsc,
  SortDesc,
  Search,
} from "lucide-react";
import { defaultSettings, defaultTemplates } from "@/static/data";
import { dbManager } from "@/lib/indexeddb";
import { copyToClipboard, downloadFile, handleDragOver } from "@/lib/helpers";
import { convertToBase64 } from "@/lib/utils";
import {
  ImageData,
  Template,
  JobStatus,
  Gen4ReferenceImage,
  Gen4Generation,
} from "@/types";
import { useLoading } from "@/hooks/use-form-submit";
import ModeSelection from "@/app/views/ModeSelection";
import UploadArea from "@/app/views/UploadArea";
import TemplatesPanel from "@/app/views/TemplatesPanel";
import BulkActionsPanel from "@/app/views/BulkActionsPanel";
import Gen4 from "@/app/views/tab/Gen4";
import Setting from "./views/tab/Setting";

export default function VideoGeneratorApp() {
  // State management
  const [activeTab, setActiveTab] = useState("workspace");
  const [mode, setMode] = useState<"seedance" | "kontext">("seedance");
  const [images, setImages] = useState<ImageData[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [bulkPrompt, setBulkPrompt] = useState("");
  const [jobStatus, setJobStatus] = useState<JobStatus | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [showOnlySelected, setShowOnlySelected] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"name" | "date" | "status">("date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);
  const [fullscreenVideo, setFullscreenVideo] = useState<string | null>(null);
  const [filteredImages, setFilteredImages] = useState<ImageData[]>([]);
  const [carouselIndex, setCarouselIndex] = useState<{ [key: string]: number }>(
    {}
  );
  const [generatedVideos, setGeneratedVideos] = useState<
    {
      filename: string;
      prompt: string;
      status: string;
      outputUrl?: string;
    }[]
  >([]);

  // Gen 4 specific state
  const [gen4ReferenceImages, setGen4ReferenceImages] = useState<
    Gen4ReferenceImage[]
  >([]);
  const [gen4Prompt, setGen4Prompt] = useState("");
  const [gen4Settings, setGen4Settings] = useState({
    aspectRatio: "16:9",
    resolution: "720p",
    seed: undefined as number | undefined,
  });
  const [gen4Generations, setGen4Generations] = useState<Gen4Generation[]>([]);

  // Settings state
  const [settings, setSettings] = useState(defaultSettings);

  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const gen4FileInputRef = useRef<HTMLInputElement>(null);

  // Load data from IndexedDB on mount
  useEffect(() => {
    loadFromIndexedDB();
    loadTemplatesFromDB();
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
      const images = await dbManager.getImages();
      setImages(images);
      return images;
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

  const loadTemplatesFromDB = async () => {
    try {
      const stored = await dbManager.getTemplates();
      if (stored && stored.length > 0) {
        setTemplates(stored);
      } else {
        setTemplates(defaultTemplates);
        await dbManager.saveTemplates(defaultTemplates);
      }
    } catch (err) {
      console.error("Error loading templates:", err);
      setTemplates(defaultTemplates);
    }
  };

  const handleFileUpload = async (files: FileList | null, isGen4 = false) => {
    try {
      if (!files) return;

      const newImages: ImageData[] = [];
      const newGen4Images: Gen4ReferenceImage[] = [];

      const filesArray = Array.from(files);

      for await (const file of filesArray) {
        if (file.type.startsWith("image/")) {
          const id =
            Date.now().toString() + Math.random().toString(36).substr(2, 9);
          const previewData = URL.createObjectURL(file);

          const base64Data = await convertToBase64(file);

          if (isGen4) {
            newGen4Images.push({
              id,
              file,
              preview: previewData,
              tags: [],
            });
          } else {
            newImages.push({
              id,
              file,
              fileUrl: "",
              preview: base64Data,
              prompt: "",
              selected: false,
              status: "idle",
              mode: mode,
            });
            // save uploaded images to indexedDB
            await dbManager.saveImages(newImages);
          }
        }
      }

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
    } catch (error) {
      console.error("Error uploading images:", error);
    }
  };

  const handleDrop = (e: React.DragEvent, isGen4 = false) => {
    e.preventDefault();
    handleFileUpload(e.dataTransfer.files, isGen4);
  };

  const removeImage = async (id: string, isGen4 = false) => {
    if (isGen4) {
      setGen4ReferenceImages((prev) => prev.filter((img) => img.id !== id));
    } else {
      setImages((prev) => prev.filter((img) => img.id !== id));
    }
    await dbManager.removeImage(id);
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

    // persist usageCount update
    dbManager.saveTemplates(
      templates.map((t) =>
        t.id === selectedTemplate ? { ...t, usageCount: t.usageCount + 1 } : t
      )
    ).catch(console.error);

    toast({
      title: "Template applied",
      description: `Applied "${template.name}" to selected images`,
    });
  };

  const addTemplate = async (template: Template) => {
    setTemplates((prev) => [...prev, template]);
    try {
      await dbManager.saveTemplate(template);
    } catch (err) {
      console.error("Failed to save template", err);
    }
  };

  const resetTemplates = async () => {
    try {
      await dbManager.clearTemplates();
      await dbManager.saveTemplates(defaultTemplates);
      setTemplates(defaultTemplates);
      setSelectedTemplate("");
    } catch (err) {
      console.error("Failed to reset templates", err);
    }
  };

  const updateTemplate = async (template: Template) => {
    setTemplates((prev) => prev.map((t) => (t.id === template.id ? template : t)));
    try {
      await dbManager.saveTemplate(template);
    } catch (err) {
      console.error("Failed to update template", err);
    }
  };

  const deleteTemplate = async (id: string) => {
    setTemplates((prev) => prev.filter((t) => t.id !== id));
    if (selectedTemplate === id) setSelectedTemplate("");
    try {
      await dbManager.removeTemplate(id);
    } catch (err) {
      console.error("Failed to remove template", err);
    }
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

  const uploadFile = async (fileOrUrl: File | string) => {
    // If fileOrUrl is already a URL string, just return it
    if (typeof fileOrUrl === "string") {
      return fileOrUrl;
    }

    // Otherwise, it's a File object that needs to be uploaded
    const formData = new FormData();
    formData.append("media", fileOrUrl);
    try {
      const response = await fetch("/api/upload-media", {
        method: "POST",
        body: formData,
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error || `File upload failed: ${response.statusText}`
        );
      }
      const result = await response.json();
      if (!result.urls || !result.urls.get) {
        throw new Error("Invalid response from upload API");
      }
      return result.urls.get as string;
    } catch (error) {
      console.error("Upload error:", error);
      toast({
        title: "Upload Failed",
        description:
          error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive",
      });
      throw error;
    }
  };

  const startGeneration = async (
    mode: "seedance" | "kontext",
    images: ImageData[]
  ) => {
    const modeImages = images.filter((img) => img?.mode === mode);
    const selectedImages = modeImages.filter(
      (img) => img?.selected && img?.prompt?.trim()
    );

    if (selectedImages.length === 0) {
      toast({
        title: "No images selected",
        description: "Please select images with prompts to generate videos",
        variant: "destructive",
      });
      return;
    }

    // Mark selected images as processing
    setImages((prev) =>
      prev.map((img) =>
        img.selected && img.mode === mode
          ? { ...img, status: "processing" }
          : img
      )
    );

    try {
      const fileUrls = await Promise.all(
        selectedImages.map(async (img) => {
          if (img.file) {
            return uploadFile(img.file);
          }

          const dbImg = await dbManager.getImage(img.id);
          if (dbImg?.fileUrl) return dbImg.fileUrl;

          if (dbImg?.preview) {
            try {
              const blob = await (
                await fetch(`data:image/png;base64,${dbImg.preview}`)
              ).blob();
              const file = new File([blob], `image-${img.id}.png`, {
                type: "image/png",
              });
              return uploadFile(file);
            } catch (error) {
              console.error("Error converting base64 to blob:", error);
            }
          }

          return "";
        })
      );

      const payload = {
        fileUrls,
        prompts: selectedImages.map((img) => img.prompt),
        seedanceModel: settings?.seedance?.model,
        resolution: settings?.seedance?.resolution,
        duration: settings?.seedance?.duration,
        camera_fixed: settings?.seedance?.cameraFixed,
        mode,
      };

      const response = await fetch("/api/generate-media", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      const generated = result?.generatedResponse || [];

      setGeneratedVideos(generated);
      setJobStatus({ ...result, tasks: generated });

      // Mark completed
      setImages((prev) =>
        prev.map((img) =>
          img.selected && img.mode === mode
            ? { ...img, status: "completed" }
            : img
        )
      );

      for (let i = 0; i < modeImages.length; i++) {
        const image = modeImages[i];
        const dbImage = await dbManager.getImage(image.id);
        if (!dbImage) continue;

        const newVideoUrl = generated[i]?.outputUrl;
        const fileUrl = generated[i]?.fileUrl || dbImage.fileUrl || "";

        const existingVideos = Array.isArray(dbImage.videos)
          ? [...dbImage.videos]
          : [];

        if (newVideoUrl && !existingVideos.includes(newVideoUrl)) {
          existingVideos.push(newVideoUrl);
        }

        const updatedImageData = {
          name: image.file?.name ?? dbImage.filename ?? "Unnamed Image",
          type: image.file?.type ?? dbImage.type ?? "image/png",
          size: image.file?.size ?? dbImage.size ?? 0,
        };

        await dbManager.saveImage(
          image.id,
          updatedImageData,
          fileUrl,
          image.preview ?? dbImage.preview,
          image.prompt ?? dbImage.prompt,
          image.selected ?? dbImage.selected,
          image.status ?? dbImage.status,
          existingVideos,
          image.mode ?? dbImage.mode
        );
      }

      loadFromIndexedDB();

      toast({
        title: "Generation started",
        description: `Processing ${selectedImages.length} image(s)`,
      });
    } catch (error) {
      console.error("Generation error:", error);
      toast({
        title: "Generation failed",
        description:
          error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
    }
  };

  const { onSubmit: startSeedanceGeneration, processing: seedanceProcessing } =
    useLoading(() => startGeneration("seedance", images));

  const { onSubmit: startKontextGeneration, processing: kontextProcessing } =
    useLoading(() => startGeneration("kontext", images));

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

  const { onSubmit: generateGen4, processing: gen4Processing } = useLoading(
    async () => {
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

      try {
        const referenceImages = await Promise.all(
          gen4ReferenceImages.map((img) => uploadFile(img.file))
        );

        const payload = {
          prompt: gen4Prompt,
          aspectRatio: gen4Settings.aspectRatio,
          resolution: gen4Settings.resolution,
          seed: gen4Settings.seed,
          referenceImages,
          referenceTags: gen4ReferenceImages.map((img) => img.tags.join(",")),
        };

        const response = await fetch("/api/gen4", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
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
      }
    }
  );

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
  const filteredImagesData = useCallback(
    () =>
      images
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
        }),
    [images, showOnlySelected, searchQuery, sortBy, sortOrder]
  );

  const selectedCount = images.filter((img) => img.selected).length;
  const gen4ImageCount = gen4ReferenceImages.length;
  const gen4GenerationCount = gen4Generations.length;

  const openFullscreenImage = (src: string, mode: string) => {
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

  useEffect(() => {
    setFilteredImages(filteredImagesData);
  }, [filteredImagesData]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="container 2xl:max-w-[1825px] mx-auto p-6">
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
          <TabsContent value="workspace" className="space-y-6" forceMount>
            <div
              className={`space-y-6 ${
                activeTab === "workspace" ? "" : "hidden"
              }`}
            >
              {/* Mode Selection */}
              <ModeSelection mode={mode} setMode={setMode} />

              {/* Upload Area */}
              <UploadArea
                handleFileUpload={handleFileUpload}
                handleDrop={handleDrop}
                handleDragOver={handleDragOver}
                fileInputRef={fileInputRef}
              />

              {/* Templates and Bulk Actions */}
              {images.length > 0 && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <TemplatesPanel
                    templates={templates}
                    selectedTemplate={selectedTemplate}
                    setSelectedTemplate={setSelectedTemplate}
                    selectedCount={selectedCount}
                    applyTemplateToSelected={applyTemplateToSelected}
                    addTemplate={addTemplate}
                    deleteTemplate={deleteTemplate}
                    updateTemplate={updateTemplate}
                    resetTemplates={resetTemplates}
                  />

                  <BulkActionsPanel
                    bulkPrompt={bulkPrompt}
                    setBulkPrompt={setBulkPrompt}
                    selectedCount={selectedCount}
                    applyBulkPrompt={applyBulkPrompt}
                    sendToGen4={sendToGen4}
                  />
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
                          ? "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4"
                          : "space-y-4"
                      }
                    >
                      {filteredImages
                        .reverse()
                        .filter((image) => image.mode === mode)
                        .map((image) => {
                          const videos =
                            image.videos && image.videos.length > 0
                              ? image.videos
                              : image.outputUrl
                              ? [image.outputUrl]
                              : [];
                          const currentIdx = carouselIndex[image.id] ?? 0;
                          const mediaUrl =
                            videos[currentIdx] ??
                            generatedVideos.find(
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
                                  src={
                                    `data:image/png;base64,${image.preview}` ||
                                    "/placeholder.svg"
                                  }
                                  alt={image?.file?.name}
                                  className="w-full h-full object-cover"
                                />
                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                  <div className="flex gap-2">
                                    <Button
                                      size="sm"
                                      variant="secondary"
                                      onClick={() =>
                                        toggleImageSelection(image.id)
                                      }
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
                                  viewMode === "list" ? "flex-1" : "pt-3"
                                }`}
                              >
                                <div className="px-3 mb-3">
                                  <p className="font-medium text-sm truncate mb-2">
                                    {image?.file?.name}
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
                                </div>
                                {mode === "kontext" && image.prompt && (
                                  <Button
                                    size="sm"
                                    onClick={() =>
                                      startKontextGeneration("kontext")
                                    }
                                    disabled={kontextProcessing}
                                    className="mt-2 w-full"
                                  >
                                    {kontextProcessing
                                      ? "Editing..."
                                      : "Edit with Kontext"}
                                  </Button>
                                )}
                                {mediaUrl && (
                                  <div className="mt-2 relative overflow-hidden rounded-es-lg rounded-ee-lg border bg-white group z-[10]">
                                    {mode === "seedance" ? (
                                      <video
                                        src={mediaUrl}
                                        controls
                                        className="w-full h-[180px] relative z-[10]"
                                      />
                                    ) : (
                                      <img
                                        src={mediaUrl}
                                        alt="Edited"
                                        className="w-full rounded"
                                      />
                                    )}
                                    {videos.length > 1 && (
                                      <div className="absolute flex items-center justify-between px-2 top-0 right-0 bottom-0 left-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                          className="bg-black/50 text-white rounded-full flex items-center justify-center w-[24px] h-[24px] z-[999]"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setCarouselIndex((prev) => ({
                                              ...prev,
                                              [image.id]:
                                                (currentIdx -
                                                  1 +
                                                  videos.length) %
                                                videos.length,
                                            }));
                                          }}
                                        >
                                          ‹
                                        </button>
                                        <button
                                          className="bg-black/50 text-white rounded-full w-[24px] h-[24px] flex items-center justify-center z-[999]"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setCarouselIndex((prev) => ({
                                              ...prev,
                                              [image.id]:
                                                (currentIdx + 1) %
                                                videos.length,
                                            }));
                                          }}
                                        >
                                          ›
                                        </button>
                                      </div>
                                    )}

                                    <div className="absolute top-2 right-2 opacity-0 bg-black/0 group-hover:bg-black/20 group-hover:opacity-100 transition-opacity z-[999]">
                                      <div className="flex gap-1">
                                        <Button
                                          size="sm"
                                          variant="secondary"
                                          className="h-8 w-8 p-0"
                                          onClick={() =>
                                            openFullscreenImage(
                                              mediaUrl || "/placeholder.svg",
                                              mode === "seedance"
                                                ? "seedance"
                                                : "kontext"
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
                          );
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
                        onClick={() => startSeedanceGeneration("seedance")}
                        disabled={seedanceProcessing || selectedCount === 0}
                        className="flex items-center gap-2"
                      >
                        {seedanceProcessing ? (
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
            </div>
          </TabsContent>

          {/* Gen 4 Tab */}
          <TabsContent value="gen4" className="space-y-6" forceMount>
            <Gen4
              gen4Settings={gen4Settings}
              setGen4Settings={setGen4Settings}
              addTagToGen4Image={addTagToGen4Image}
              removeTagFromGen4Image={removeTagFromGen4Image}
              activeTab={activeTab}
              gen4Generations={gen4Generations}
              gen4Processing={gen4Processing}
              openFullscreenImage={openFullscreenImage}
              downloadFile={downloadFile}
              copyToClipboard={copyToClipboard}
              removeImage={removeImage}
              gen4FileInputRef={gen4FileInputRef}
              handleFileUpload={handleFileUpload}
              handleDrop={handleDrop}
              handleDragOver={handleDragOver}
              gen4ReferenceImages={gen4ReferenceImages}
              gen4Prompt={gen4Prompt}
              setGen4Prompt={setGen4Prompt}
              generateGen4={generateGen4}
            />
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-6" forceMount>
            <Setting
              settings={settings}
              setSettings={setSettings}
              activeTab={activeTab}
              selectedCount={images.filter((img) => img.selected).length}
            />
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
