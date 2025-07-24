"use client";

import React from "react";
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import Gen4LibraryBar from "./components/Gen4LibraryBar";
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
import { toast } from "@/components/ui/use-toast";
import {
  Search,
  Upload,
  X,
  Check,
  Plus,
  ChevronLeft,
  ChevronRight,
  Trash2,
  ImageIcon,
  Settings,
  Grid,
  List,
  SortAsc,
  SortDesc,
  Play,
  Download,
  Copy,
  Layers,
  Sparkles,
  Layout as LayoutIcon,
} from "lucide-react";
import { defaultSettings, defaultTemplates } from "@/static/data";
import { dbManager } from "@/lib/indexeddb";
import type { Generation } from "@/types";
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
import Gen4LibraryTab from "@/app/components/Gen4LibraryTab";
import LayoutPlanner from "@/app/components/LayoutPlanner";

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

  // --- Tag library helper ---
  const sendLibraryItemToRef = useCallback(
    (blob: Blob, tag: string, slot: 0 | 1 | 2) => {
      const id = Date.now().toString();
      const preview = URL.createObjectURL(blob);
      const file = new File([blob], `lib-${id}.png`, { type: "image/png" });

      setGen4ReferenceImages((prev) => {
        const updated = [...prev];
        const newItem = {
          id,
          file,
          preview,
          tags: [tag],
        } as Gen4ReferenceImage;

        // Ensure array has exactly 3 slots
        const arr = [undefined, undefined, undefined] as Array<
          Gen4ReferenceImage | undefined
        >;
        // copy previous but not duplicates
        for (let i = 0; i < updated.length && i < 3; i++) {
          arr[i] = updated[i];
        }
        arr[slot] = newItem;
        return arr.filter(Boolean) as Gen4ReferenceImage[];
      });
    },
    []
  );

  // ----- Template CRUD handlers -----
  const addTemplate = (template: Template) => {
    setTemplates((prev) => [...prev, template]);
  };

  const deleteTemplate = (id: string) => {
    setTemplates((prev) => prev.filter((t) => t.id !== id));
  };

  const updateTemplate = (template: Template) => {
    setTemplates((prev) =>
      prev.map((t) => (t.id === template.id ? template : t))
    );
  };

  const resetTemplates = () => {
    setTemplates(defaultTemplates);
  };

  // ----- Gen 4 helper handlers (stub implementations for now) -----
  const [libraryRefresh, setLibraryRefresh] = useState<number>(0);

  const replaceReferenceWithGen = async (src: string | Blob, slot: number, tags: string[] = []) => {
    try {
      let file: File;
      if (typeof src === "string") {
        const response = await fetch(src);
        const blob = await response.blob();
        file = new File([blob], `ref_${Date.now()}.png`, { type: blob.type });
      } else {
        file = new File([src], `ref_${Date.now()}.png`, { type: src.type });
      }

      const id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
      const preview = URL.createObjectURL(file);

      setGen4ReferenceImages((prev) => {
        const newArr = [...prev];
        newArr[slot] = { id, file, preview, tags: tags } as any;
        return newArr;
      });

      const tagText = tags.length > 0 ? ` with ${tags.length} tag(s)` : '';
      toast({ title: `Reference ${slot + 1} set`, description: `Image set as reference${tagText}.` });
    } catch (err) {
      console.error("replaceReferenceWithGen error", err);
      toast({
        title: "Error",
        description: "Failed to set reference image.",
        variant: "destructive",
      });
    }
  };

  const deleteReferenceFromLibrary = async (id: string) => {
    await dbManager.deleteReference(id);
    setLibraryRefresh((v) => v + 1);
  };

  // sendGenerationToWorkspace is implemented below

  // Settings state
  const [settings, setSettings] = useState(defaultSettings);

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

  const loadTemplates = () => {
    setTemplates(defaultTemplates);
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

  const removeGeneration = (id: string) => {
    setGen4Generations((prev) => prev.filter((gen) => gen.id !== id));
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

  const uploadFile = async (fileOrUrl: File | string) => {
    // If fileOrUrl is already a URL string, ensure it contains a file extension
    if (typeof fileOrUrl === "string") {
      const extensionRegex = /\.[a-zA-Z0-9]{3,4}(?:$|\?)/;
      if (extensionRegex.test(fileOrUrl)) {
        return fileOrUrl;
      }
      // Attempt to fetch metadata from the Replicate file endpoint to get a
      // proper download_url (which includes extension)
      try {
        const metaRes = await fetch(fileOrUrl);
        if (metaRes.ok) {
          const meta = await metaRes.json();
          if (meta.download_url && extensionRegex.test(meta.download_url)) {
            return meta.download_url as string;
          }
        }
      } catch (err) {
        console.warn("Could not resolve extension for", fileOrUrl, err);
      }
      // As a fallback, append a default .png extension so downstream code
      // treats it as an image. This will still work for most image viewers.
      return `${fileOrUrl}.png`;
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
      // Handle multiple possible response shapes from Replicate `/files` endpoint
      // 1. Current (mid-2024+) → `download_url`
      // 2. Docs/examples         → `url`
      // 3. Legacy (old code)     → `urls.get`
      let uploadedUrl: string | undefined =
        result.download_url ??
        result.url ??
        result.urls?.get;

      if (!uploadedUrl) {
        throw new Error("Invalid response from upload API – no URL returned");
      }

      // Some Replicate file URLs (e.g. the `url` field) do not include a file
      // extension which can break downstream consumers that expect one. If the
      // chosen URL lacks an extension, try to repair it by preferring
      // `download_url` (which always has the original filename). As a final
      // fallback, fetch the metadata and look for a `download_url` field there.
      const extensionRegex = /\.[a-zA-Z0-9]{3,4}(?:$|\?)/;
      if (!extensionRegex.test(uploadedUrl)) {
        if (result.download_url && extensionRegex.test(result.download_url)) {
          uploadedUrl = result.download_url;
        } else {
          try {
            const metaRes = await fetch(uploadedUrl);
            if (metaRes.ok) {
              const meta = await metaRes.json();
              if (meta.download_url && extensionRegex.test(meta.download_url)) {
                uploadedUrl = meta.download_url;
              }
            }
          } catch (metaErr) {
            console.warn("Could not resolve extended URL for", uploadedUrl, metaErr);
          }
        }
      }

      return uploadedUrl as string;
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
            return { id: img.id, url: await uploadFile(img.file) };
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

      // Create Promise.all for the generate-media API calls
      const generationPromises = selectedImages.map(async (img, index) => {
        const fileUrl = fileUrls[index];

        if (!fileUrl) {
          return {
            filename: img.id,
            prompt: img.prompt || "",
            status: "failed",
            error: "Failed to get image URL",
          };
        }

        // If a last frame file exists, upload it and obtain its URL
        let lastFrameUrl: string | undefined;
        if (img.lastFrameFile) {
          try {
            lastFrameUrl = await uploadFile(img.lastFrameFile);
          } catch (err) {
            console.error("Failed to upload last frame:", err);
          }
        }

        // Create payload for this specific image
        const payload = {
          fileUrl: typeof fileUrl === "string" ? fileUrl : fileUrl.url,
          lastFrameUrl, // may be undefined if none
          prompt: img.prompt || "",
          seedanceModel: settings?.seedance?.model,
          resolution: settings?.seedance?.resolution,
          duration: settings?.seedance?.duration,
          camera_fixed: settings?.seedance?.cameraFixed,
          mode,
          filename: img.id,
        };

        try {
          const response = await fetch("/api/generate-media", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });

          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }

          const result = await response.json();
          return result.generatedResponse;
        } catch (error) {
          console.error(`Error generating video for image ${img.id}:`, error);
          return {
            filename: img.id,
            prompt: img.prompt || "",
            status: "failed",
            error: error instanceof Error ? error.message : "Unknown error occurred",
          };
        }
      });

      // Wait for all generation API calls to complete
      const generated = await Promise.all(generationPromises);

      setGeneratedVideos(generated);
      setJobStatus({ 
        jobId: `batch-${Date.now()}`, // Adding the required jobId field
        status: "completed", 
        total: selectedImages.length,
        completed: generated.filter(g => g.status === "completed").length,
        tasks: generated 
      });

      // Mark completed
      setImages((prev) =>
        prev.map((img) =>
          img.selected && img.mode === mode
            ? { ...img, status: "completed" }
            : img
        )
      );

      // Update indexed DB with new videos
      for (const image of modeImages) {
        const dbImage = await dbManager.getImage(image.id);
        if (!dbImage) continue;

        // Find the generated result for this image
        const genResult = generated.find(g => g.filename === image.id);
        if (!genResult) continue;
        
        const newVideoUrl = genResult?.outputUrl;
        const fileUrl = genResult?.fileUrl || dbImage.fileUrl || "";

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

  const sendGenerationToWorkspace = async (imageUrl: string) => {
    try {
      if (!imageUrl) return;

      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const file = new File([blob], `gen4_${Date.now()}.png`, { type: 'image/png' });
      
      const id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
      const base64Data = await convertToBase64(file);

      const newImage: ImageData = {
        id,
        file,
        fileUrl: imageUrl,
        preview: base64Data,
        prompt: '',
        selected: false,
        status: 'idle',
        mode: mode,
      };

      setImages(prev => [...prev, newImage]);
      await dbManager.saveImages([newImage]);

      toast({
        title: 'Added to Workspace',
        description: 'Image has been added to your workspace.',
      });
    } catch (error) {
      console.error('Error sending to workspace:', error);
      toast({
        title: 'Error',
        description: 'Failed to add image to workspace.',
        variant: 'destructive',
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

      let tempId: string = "";
      try {
        tempId = Date.now().toString();
        setGen4Generations((prev) => [
          {
            id: tempId,
            prompt: gen4Prompt,
            referenceImages: [...gen4ReferenceImages],
            settings: { ...gen4Settings },
            status: "processing",
            timestamp: Date.now(),
          },
          ...prev,
        ]);

        const referenceImages = await Promise.all(
          gen4ReferenceImages.map((img) => uploadFile(img.file))
        );

        const payload = {
          prompt: gen4Prompt,
          seed: gen4Settings.seed ?? null,
          resolution: gen4Settings.resolution,
          aspect_ratio: gen4Settings.aspectRatio,
          reference_tags: gen4ReferenceImages.map((img) => img.tags.join(",")),
          reference_images: referenceImages,
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

        setGen4Generations((prev) =>
          prev.map((gen) =>
            gen.id === tempId
              ? { ...gen, status: "completed", outputUrl: result.imageUrl }
              : gen
          )
        );

        toast({
          title: "Gen 4 generation completed",
          description: "Your image has been generated successfully",
        });
      } catch (error) {
        console.error("Gen 4 generation error:", error);
        // Mark placeholder as failed
        setGen4Generations((prev) =>
          prev.map((gen) =>
            gen.id === tempId ? { ...gen, status: "failed" } : gen
          )
        );
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

  const removeTagFromGen4Image = (imageId: string, tagToRemove: string) => {
    setGen4ReferenceImages((prev) =>
      prev.map((img) => {
        if (img.id === imageId) {
          const newTags = img.tags.filter(tag => tag !== tagToRemove);
          return { ...img, tags: newTags };
        }
        return img;
      })
    );
  };

  const filteredImagesData = useMemo(
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

  const saveToLibrary = async (generation: Generation) => {
    try {
      if (!generation.outputUrl) return;
      const response = await fetch(generation.outputUrl);
      const fullBlob = await response.blob();
      
      // Create a thumbnail blob
      const img = new Image();
      img.src = URL.createObjectURL(fullBlob);
      await new Promise((resolve) => (img.onload = resolve));
      
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      const maxSize = 200;
      const scale = Math.min(maxSize / img.width, maxSize / img.height);
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      
      const thumbBlob = await new Promise<Blob>((resolve) =>
        canvas.toBlob((blob) => resolve(blob!), 'image/jpeg', 0.8)
      );
      
      await dbManager.addReference(
        generation.id,
        thumbBlob,
        fullBlob,
        ['gen4']
      );

      toast({
        title: 'Saved to Library',
        description: 'Image has been saved to your Gen4 library.',
      });
    } catch (error) {
      console.error('Error saving to library:', error);
      toast({
        title: 'Error',
        description: 'Failed to save image to library.',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="container 2xl:max-w-[1825px] mx-auto p-6">
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 bg-gradient-to-br from-cyan-400 via-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
              <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
                <div className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-b-[8px] border-b-blue-600 ml-1"></div>
              </div>
            </div>
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-cyan-500 via-blue-600 to-purple-600 bg-clip-text text-transparent">
                ImageMax
              </h1>
              <p className="text-slate-600 dark:text-slate-400 mt-1">
                Transform your images into stunning videos with AI
              </p>
            </div>
          </div>
        </div>

        <Tabs
          defaultValue="workspace"
          value={activeTab}
          onValueChange={setActiveTab}
          className="space-y-6"
        >
          <TabsList className="grid w-full grid-cols-4 lg:w-[540px]">
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
            <TabsTrigger value="layoutPlanner" className="flex items-center gap-2">
              <LayoutIcon className="w-4 h-4" />
              Layout Planner
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
                                    ? "w-32 h-32 flex-shrink-0"
                                    : ""
                                }`}
                              >
                                <img
                                  src={
                                    image.preview ? `data:image/png;base64,${image.preview}` : "/placeholder.svg"
                                  }
                                  alt={image?.file?.name}
                                  className="w-full h-full object-contain bg-black/10"
                                  onError={(e) => {
                                    console.error('🖼️ Image failed to load:', {
                                      imageId: image.id,
                                      fileName: image?.file?.name,
                                      previewLength: image.preview?.length || 0,
                                      previewStart: image.preview?.substring(0, 50) || 'No preview data'
                                    });
                                    e.currentTarget.src = '/placeholder.svg';
                                  }}
                                  onLoad={() => {
                                    console.log('✅ Image loaded successfully:', image?.file?.name);
                                  }}
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
                                          image.preview ? `data:image/png;base64,${image.preview}` : "/placeholder.svg",
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
                                  <div className="relative">
                                    <textarea
                                      placeholder={
                                        mode === "seedance"
                                          ? "Enter video prompt..."
                                          : "Enter edit prompt..."
                                      }
                                      value={image.prompt}
                                      ref={(el) => {
                                        // Use a ref to attach native event listeners
                                        if (el) {
                                          // Clean event handling - no need to remove listeners as React will handle this
                                          
                                          // Add a native event listener
                                          el.addEventListener('input', (e) => {
                                            const target = e.target as HTMLTextAreaElement;
                                            const newValue = target.value;
                                            
                                            // Use requestAnimationFrame to avoid React batching issues
                                            requestAnimationFrame(() => {
                                              setImages((prev) => {
                                                return prev.map((img) => {
                                                  if (img.id === image.id) {
                                                    return { ...img, prompt: newValue };
                                                  }
                                                  return img;
                                                });
                                              });
                                            });
                                          });
                                        }
                                      }}
                                      rows={2}
                                      className="resize-none border rounded-md p-2 w-full text-sm pr-8"
                                    />
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      className="absolute top-0 right-0"
                                      onClick={async () => {
                                        try {
                                          const text = await navigator.clipboard.readText();
                                          if (text) {
                                            setImages((prev) =>
                                              prev.map((img) =>
                                                img.id === image.id ? { ...img, prompt: text } : img
                                              )
                                            );
                                          }
                                        } catch (err) {
                                          console.error("Clipboard read failed", err);
                                          toast({ title: "Clipboard read failed", variant: "destructive" });
                                        }
                                      }}
                                    >
                                      <Copy className="w-4 h-4" />
                                    </Button>
                                  </div>

                                  {/* Final frame uploader / preview */}
                                  {(!image.lastFramePreview) ? (
                                    <div className="mt-2 text-xs">
                                      <label className="cursor-pointer text-purple-600 hover:underline inline-flex items-center gap-1">
                                        <ImageIcon className="w-4 h-4" />
                                        <input
                                          type="file"
                                          accept="image/*"
                                          className="hidden"
                                          onChange={(e) => {
                                            const file = e.target.files?.[0];
                                            if (!file) return;
                                            const reader = new FileReader();
                                            reader.onload = (ev) => {
                                              const preview = ev.target?.result as string;
                                              setImages((prev) =>
                                                prev.map((img) =>
                                                  img.id === image.id
                                                    ? { ...img, lastFramePreview: preview, lastFrameFile: file }
                                                    : img
                                                )
                                              );
                                            };
                                            reader.readAsDataURL(file);
                                          }}
                                        />
                                      </label>
                                    </div>
                                  ) : (
                                    <div className="mt-2 relative group">
                                      <img
                                        src={image.lastFramePreview}
                                        alt="Final frame preview"
                                        className="w-full max-h-40 object-contain rounded border"
                                      />
                                      <button
                                        type="button"
                                        className="absolute top-1 right-1 bg-black/60 text-white rounded-full w-5 h-5 text-xs hidden group-hover:flex items-center justify-center"
                                        onClick={() =>
                                          setImages((prev) =>
                                            prev.map((img) =>
                                              img.id === image.id
                                                ? { ...img, lastFramePreview: null, lastFrameFile: undefined }
                                                : img
                                            )
                                          )
                                        }
                                      >
                                        ×
                                      </button>
                                    </div>
                                  )}
                                </div>
                                {mode === "kontext" && image.prompt && (
                                  <Button
                                    size="sm"
                                    onClick={() => {
                                      // Make sure this image is selected first
                                      setImages((prev) =>
                                        prev.map((img) => ({
                                          ...img,
                                          selected: img.id === image.id
                                        }))
                                      );
                                      // Then start the generation
                                      setTimeout(() => startKontextGeneration(), 0);
                                    }}
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
              removeGeneration={removeGeneration}
              gen4FileInputRef={gen4FileInputRef}
              handleFileUpload={handleFileUpload}
              handleDrop={handleDrop}
              handleDragOver={handleDragOver}
              gen4ReferenceImages={gen4ReferenceImages}
              gen4Prompt={gen4Prompt}
              setGen4Prompt={setGen4Prompt}
              generateGen4={generateGen4}
              replaceReferenceWithGen={replaceReferenceWithGen}
              sendGenerationToWorkspace={sendGenerationToWorkspace}
              saveToLibrary={saveToLibrary}
            />
          </TabsContent>



          {/* Layout Planner Tab */}
          <TabsContent value="layoutPlanner" className="space-y-6" forceMount>
            <div
              className={`space-y-6 ${
                activeTab === "layoutPlanner" ? "" : "hidden"
              }`}
            >
              <LayoutPlanner />
            </div>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-6" forceMount>
            <Setting
              settings={settings}
              setSettings={setSettings}
              activeTab={activeTab}
              selectedCount={selectedCount}
            />
          </TabsContent>
        </Tabs>
        {activeTab === 'gen4' && (
          <Gen4LibraryBar
            onSetRef={replaceReferenceWithGen}
            onDelete={deleteReferenceFromLibrary}
            refreshTrigger={libraryRefresh}
          />
        )}
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
