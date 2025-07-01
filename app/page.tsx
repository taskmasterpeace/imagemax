"use client"

import type React from "react"

import { useState, useRef, useCallback, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Input } from "@/components/ui/input"
import {
  Upload,
  Download,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  History,
  ExternalLink,
  TestTube,
  PlayCircle,
  Edit,
  Trash2,
  ImageIcon,
  Video,
  DollarSign,
  Plus,
  X,
  Search,
  Play,
} from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { dbManager, type JobData } from "@/lib/indexeddb"
import { Progress } from "@/components/ui/progress"

interface ImageFile {
  id: string
  file: File
  preview: string
  prompt: string
  status: "pending" | "processing" | "completed" | "failed"
  outputUrl?: string
  error?: string
  // Kontext-specific fields
  editPrompt?: string
  editedVersions?: EditedVersion[]
}

interface EditedVersion {
  id: string
  prompt: string
  imageUrl: string
  createdAt: number
  status: "processing" | "completed" | "failed"
  error?: string
  model?: "dev" | "max"
}

interface JobStatus {
  jobId: string
  status: "processing" | "completed" | "failed" | "merging"
  tasks: Array<{
    filename: string
    prompt: string
    status: "queued" | "processing" | "completed" | "failed"
    outputUrl?: string
    error?: string
  }>
  total: number
  completed: number
  mergedOutputUrl?: string
  startedAt: number
}

interface Template {
  id: string
  name: string
  prompt: string
}

export default function SeedanceGenerator() {
  const [images, setImages] = useState<ImageFile[]>([])
  const [model, setModel] = useState<"lite" | "pro">("lite")
  const [cameraFixed, setCameraFixed] = useState(false)
  const [mergeVideos, setMergeVideos] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [currentJob, setCurrentJob] = useState<string | null>(null)
  const [jobStatus, setJobStatus] = useState<JobStatus | null>(null)
  const [elapsedTime, setElapsedTime] = useState(0)
  const [startTime, setStartTime] = useState<number | null>(null)
  const [previousJobs, setPreviousJobs] = useState<JobData[]>([])
  const [showHistory, setShowHistory] = useState(false)
  const [apiStatus, setApiStatus] = useState<"unknown" | "testing" | "connected" | "error">("unknown")
  const [fullscreenImage, setFullscreenImage] = useState<{ src: string; alt: string } | null>(null)

  // New state for mode switching
  const [isKontextMode, setIsKontextMode] = useState(false)
  const [kontextModel, setKontextModel] = useState<"dev" | "max">("dev")
  const [processingEdits, setProcessingEdits] = useState<Set<string>>(new Set())

  const [selectedImages, setSelectedImages] = useState<Set<string>>(new Set())
  const [showBulkActions, setShowBulkActions] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  // Add cost calculation state:
  const [totalCost, setTotalCost] = useState(0)
  const [budget, setBudget] = useState<number | null>(null)

  // Add drag state:
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)

  // Add template state and data:
  const [showTemplates, setShowTemplates] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<string | null>(null)
  const [newTemplateName, setNewTemplateName] = useState("")
  const [newTemplatePrompt, setNewTemplatePrompt] = useState("")
  const [editTemplateName, setEditTemplateName] = useState("")
  const [editTemplatePrompt, setEditTemplatePrompt] = useState("")

  const [templates, setTemplates] = useState({
    seedance: [
      {
        id: "1",
        name: "Product Showcase",
        prompt: "Smooth 360-degree rotation showcasing the product with professional lighting",
      },
      {
        id: "2",
        name: "Nature Scene",
        prompt: "Gentle camera movement through a serene natural landscape with flowing elements",
      },
      {
        id: "3",
        name: "Portrait Animation",
        prompt: "Subtle facial animation with natural breathing and eye movement",
      },
      {
        id: "4",
        name: "Architecture Tour",
        prompt: "Cinematic walkthrough of the building with dramatic lighting changes",
      },
      {
        id: "5",
        name: "Food Styling",
        prompt: "Appetizing close-up with steam effects and rotating presentation",
      },
    ],
    kontext: [
      {
        id: "1",
        name: "Style Transfer",
        prompt: "Convert to watercolor painting style with visible brush strokes",
      },
      {
        id: "2",
        name: "Season Change",
        prompt: "Change the season to autumn with colorful falling leaves",
      },
      {
        id: "3",
        name: "Time of Day",
        prompt: "Change to golden hour lighting with warm sunset colors",
      },
      {
        id: "4",
        name: "Weather Effect",
        prompt: "Add gentle rain with realistic water droplets and reflections",
      },
      {
        id: "5",
        name: "Background Swap",
        prompt: "Replace background with a modern minimalist studio setting",
      },
    ],
  })

  // Initialize IndexedDB
  useEffect(() => {
    const initDB = async () => {
      try {
        await dbManager.init()
        await loadPreviousJobs()
        await dbManager.cleanupOldJobs(24)
        loadTemplatesFromStorage()
      } catch (error) {
        console.error("Failed to initialize IndexedDB:", error)
      }
    }
    initDB()
  }, [])

  const loadTemplatesFromStorage = () => {
    try {
      const savedTemplates = localStorage.getItem("seedance-templates")
      if (savedTemplates) {
        setTemplates(JSON.parse(savedTemplates))
      }
    } catch (error) {
      console.error("Failed to load templates:", error)
    }
  }

  const saveTemplatesToStorage = (newTemplates: typeof templates) => {
    try {
      localStorage.setItem("seedance-templates", JSON.stringify(newTemplates))
    } catch (error) {
      console.error("Failed to save templates:", error)
    }
  }

  const addNewTemplate = () => {
    if (!newTemplateName.trim() || !newTemplatePrompt.trim()) {
      toast({
        title: "Missing Information",
        description: "Please enter both template name and prompt",
        variant: "destructive",
      })
      return
    }

    const newTemplate: Template = {
      id: Date.now().toString(),
      name: newTemplateName.trim(),
      prompt: newTemplatePrompt.trim(),
    }

    const currentTemplates = isKontextMode ? templates.kontext : templates.seedance
    const updatedTemplates = {
      ...templates,
      [isKontextMode ? "kontext" : "seedance"]: [...currentTemplates, newTemplate],
    }

    setTemplates(updatedTemplates)
    saveTemplatesToStorage(updatedTemplates)
    setNewTemplateName("")
    setNewTemplatePrompt("")

    toast({
      title: "Template Added",
      description: `"${newTemplate.name}" has been added to your templates`,
    })
  }

  const startEditingTemplate = (template: Template) => {
    setEditingTemplate(template.id)
    setEditTemplateName(template.name)
    setEditTemplatePrompt(template.prompt)
  }

  const saveEditingTemplate = (templateId: string) => {
    if (!editTemplateName.trim() || !editTemplatePrompt.trim()) {
      toast({
        title: "Missing Information",
        description: "Please enter both template name and prompt",
        variant: "destructive",
      })
      return
    }

    const currentTemplates = isKontextMode ? templates.kontext : templates.seedance
    const updatedCurrentTemplates = currentTemplates.map((template) =>
      template.id === templateId
        ? { ...template, name: editTemplateName.trim(), prompt: editTemplatePrompt.trim() }
        : template,
    )

    const updatedTemplates = {
      ...templates,
      [isKontextMode ? "kontext" : "seedance"]: updatedCurrentTemplates,
    }

    setTemplates(updatedTemplates)
    saveTemplatesToStorage(updatedTemplates)
    setEditingTemplate(null)
    setEditTemplateName("")
    setEditTemplatePrompt("")

    toast({
      title: "Template Updated",
      description: "Template has been saved successfully",
    })
  }

  const cancelEditingTemplate = () => {
    setEditingTemplate(null)
    setEditTemplateName("")
    setEditTemplatePrompt("")
  }

  const deleteTemplate = (templateId: string) => {
    const currentTemplates = isKontextMode ? templates.kontext : templates.seedance
    const updatedCurrentTemplates = currentTemplates.filter((template) => template.id !== templateId)

    const updatedTemplates = {
      ...templates,
      [isKontextMode ? "kontext" : "seedance"]: updatedCurrentTemplates,
    }

    setTemplates(updatedTemplates)
    saveTemplatesToStorage(updatedTemplates)

    toast({
      title: "Template Deleted",
      description: "Template has been removed",
    })
  }

  const applyTemplate = (template: Template) => {
    if (selectedImages.size === 0) {
      toast({
        title: "No Images Selected",
        description: "Please select images first, then apply the template",
        variant: "destructive",
      })
      return
    }

    setImages((prev) =>
      prev.map((img) =>
        selectedImages.has(img.id) ? { ...img, [isKontextMode ? "editPrompt" : "prompt"]: template.prompt } : img,
      ),
    )

    toast({
      title: "Template Applied",
      description: `"${template.name}" applied to ${selectedImages.size} selected images`,
    })
  }

  const loadPreviousJobs = async () => {
    try {
      const jobs = await dbManager.getAllJobs()
      setPreviousJobs(jobs.sort((a, b) => b.startedAt - a.startedAt))
    } catch (error) {
      console.error("Failed to load previous jobs:", error)
    }
  }

  const testReplicateAPI = async () => {
    setApiStatus("testing")
    try {
      const response = await fetch("/api/test-replicate")
      const result = await response.json()

      if (result.success) {
        setApiStatus("connected")
        toast({
          title: "API Connection Successful",
          description: "Replicate API is working correctly",
        })
      } else {
        setApiStatus("error")
        toast({
          title: "API Connection Failed",
          description: result.error || "Unknown error",
          variant: "destructive",
        })
      }
    } catch (error) {
      setApiStatus("error")
      toast({
        title: "API Test Failed",
        description: "Unable to test API connection",
        variant: "destructive",
      })
    }
  }

  // Timer effect
  useEffect(() => {
    if (startTime && isGenerating) {
      intervalRef.current = setInterval(() => {
        setElapsedTime(Math.floor((Date.now() - startTime) / 1000))
      }, 1000)
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [startTime, isGenerating])

  // Job status polling with better error handling
  useEffect(() => {
    let pollInterval: NodeJS.Timeout

    if (currentJob && isGenerating) {
      pollInterval = setInterval(async () => {
        try {
          const response = await fetch(`/api/job-status/${currentJob}`)
          if (response.ok) {
            const status: JobStatus = await response.json()
            setJobStatus(status)

            // Save to IndexedDB
            const jobData: JobData = {
              jobId: status.jobId,
              status: status.status,
              tasks: status.tasks.map((task) => ({
                filename: task.filename,
                prompt: task.prompt,
                status: task.status,
                outputUrl: task.outputUrl,
                error: task.error,
              })),
              startedAt: status.startedAt,
              mergeRequested: !!status.mergedOutputUrl,
              mergedOutputUrl: status.mergedOutputUrl,
            }
            await dbManager.saveJob(jobData)

            if (status.status === "completed" || status.status === "failed") {
              setIsGenerating(false)
              setCurrentJob(null)
              await loadPreviousJobs()

              if (status.status === "completed") {
                const completedCount = status.tasks.filter((t) => t.status === "completed").length
                toast({
                  title: "Generation Complete!",
                  description: `${completedCount} of ${status.total} videos generated successfully in ${formatTime(elapsedTime)}`,
                })
              } else {
                toast({
                  title: "Generation Failed",
                  description: "Some videos failed to generate. Check individual errors below.",
                  variant: "destructive",
                })
              }
            }
          } else {
            console.error("Failed to fetch job status:", response.status)
          }
        } catch (error) {
          console.error("Error polling job status:", error)
        }
      }, 3000) // Poll every 3 seconds
    }

    return () => {
      if (pollInterval) clearInterval(pollInterval)
    }
  }, [currentJob, isGenerating, elapsedTime])

  // Add this useEffect to calculate costs:
  useEffect(() => {
    if (isKontextMode) {
      const cost = images.length * (kontextModel === "dev" ? 0.025 : 0.08)
      setTotalCost(cost)
    } else {
      // Seedance costs (approximate)
      const cost = images.length * (model === "lite" ? 0.18 : 0.74)
      setTotalCost(cost)
    }
  }, [images.length, isKontextMode, kontextModel, model])

  const handleFileSelect = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(event.target.files || [])

      if (files.length === 0) {
        return
      }

      console.log(`Selected ${files.length} files`)

      const newImages: ImageFile[] = await Promise.all(
        files.map(async (file) => {
          const id = `img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
          const preview = URL.createObjectURL(file)

          console.log(`Processing file: ${file.name}, size: ${file.size}, type: ${file.type}`)

          // Save to IndexedDB for persistence
          try {
            await dbManager.saveImage(id, "", file, preview)
          } catch (error) {
            console.error("Failed to save image to IndexedDB:", error)
          }

          return {
            id,
            file,
            preview,
            prompt: isKontextMode ? "" : "",
            editPrompt: isKontextMode ? "" : undefined,
            editedVersions: isKontextMode ? [] : undefined,
            status: "pending" as const,
          }
        }),
      )

      setImages((prev) => {
        const updated = [...prev, ...newImages]
        console.log(`Total images now: ${updated.length}`)
        return updated
      })

      // Clear the input so the same files can be selected again if needed
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }

      toast({
        title: "Images Added",
        description: `Added ${newImages.length} image(s). Total: ${images.length + newImages.length}`,
      })
    },
    [images.length, isKontextMode],
  )

  const updatePrompt = useCallback((index: number, prompt: string) => {
    setImages((prev) => prev.map((img, i) => (i === index ? { ...img, prompt } : img)))
  }, [])

  const updateEditPrompt = useCallback((index: number, editPrompt: string) => {
    setImages((prev) => prev.map((img, i) => (i === index ? { ...img, editPrompt } : img)))
  }, [])

  const removeImage = useCallback((index: number) => {
    setImages((prev) => {
      const newImages = [...prev]
      URL.revokeObjectURL(newImages[index].preview)
      newImages.splice(index, 1)
      console.log(`Removed image, total now: ${newImages.length}`)
      return newImages
    })
  }, [])

  const removeEditedVersion = useCallback((imageIndex: number, versionId: string) => {
    setImages((prev) =>
      prev.map((img, i) =>
        i === imageIndex
          ? {
              ...img,
              editedVersions: img.editedVersions?.filter((v) => v.id !== versionId) || [],
            }
          : img,
      ),
    )
    toast({
      title: "Edited Version Removed",
      description: "The edited image has been deleted",
    })
  }, [])

  const generateKontextEdit = async (imageIndex: number) => {
    const image = images[imageIndex]
    if (!image.editPrompt?.trim()) {
      toast({
        title: "Missing Edit Prompt",
        description: "Please add a description of how you want to edit this image",
        variant: "destructive",
      })
      return
    }

    const editId = `edit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    // Add to processing set
    setProcessingEdits((prev) => new Set([...prev, editId]))

    // Add pending edit to the image
    const newEdit: EditedVersion = {
      id: editId,
      prompt: image.editPrompt,
      imageUrl: "",
      createdAt: Date.now(),
      status: "processing",
      model: kontextModel,
    }

    setImages((prev) =>
      prev.map((img, i) =>
        i === imageIndex
          ? {
              ...img,
              editedVersions: [...(img.editedVersions || []), newEdit],
            }
          : img,
      ),
    )

    try {
      const formData = new FormData()
      formData.append("image", image.file)
      formData.append("prompt", image.editPrompt)
      formData.append("editId", editId)
      formData.append("model", kontextModel)

      const response = await fetch("/api/kontext-edit", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const result = await response.json()

      // Update the edit with the result
      setImages((prev) =>
        prev.map((img, i) =>
          i === imageIndex
            ? {
                ...img,
                editedVersions:
                  img.editedVersions?.map((edit) =>
                    edit.id === editId ? { ...edit, status: "completed", imageUrl: result.imageUrl } : edit,
                  ) || [],
              }
            : img,
        ),
      )

      toast({
        title: "Image Edit Complete!",
        description: `Your edited image is ready (${kontextModel.toUpperCase()} model)`,
      })
    } catch (error) {
      console.error("Error editing image:", error)

      // Update edit with error
      setImages((prev) =>
        prev.map((img, i) =>
          i === imageIndex
            ? {
                ...img,
                editedVersions:
                  img.editedVersions?.map((edit) =>
                    edit.id === editId
                      ? {
                          ...edit,
                          status: "failed",
                          error: error instanceof Error ? error.message : "Edit failed",
                        }
                      : edit,
                  ) || [],
              }
            : img,
        ),
      )

      toast({
        title: "Edit Failed",
        description: error instanceof Error ? error.message : "Failed to edit image",
        variant: "destructive",
      })
    } finally {
      // Remove from processing set
      setProcessingEdits((prev) => {
        const newSet = new Set(prev)
        newSet.delete(editId)
        return newSet
      })
    }
  }

  const generateVideos = async () => {
    if (images.length === 0) {
      toast({
        title: "No Images Selected",
        description: "Please select at least one image to generate videos",
        variant: "destructive",
      })
      return
    }

    const emptyPrompts = images.filter((img) => !img.prompt.trim())
    if (emptyPrompts.length > 0) {
      toast({
        title: "Missing Prompts",
        description: `Please add prompts for all ${emptyPrompts.length} images`,
        variant: "destructive",
      })
      return
    }

    console.log("Starting video generation with", images.length, "images")
    console.log("API Status:", apiStatus)

    setIsGenerating(true)
    setStartTime(Date.now())
    setElapsedTime(0)

    try {
      const formData = new FormData()

      // Add images
      images.forEach((img, index) => {
        console.log(`Adding image ${index + 1}: ${img.file.name}`)
        formData.append("images", img.file)
      })

      // Add metadata with 480p as default for Lite model
      const metadata = {
        prompts: images.map((img) => img.prompt),
        model,
        resolution: model === "lite" ? "480p" : "1080p",
        duration: 10,
        camera_fixed: cameraFixed,
        merge: mergeVideos,
      }

      console.log("Metadata:", metadata)
      formData.append("metadata", JSON.stringify(metadata))

      console.log("Sending request to generate videos...")

      const response = await fetch("/api/generate-videos", {
        method: "POST",
        body: formData,
      })

      console.log("Response status:", response.status)

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Unknown error" }))
        throw new Error(errorData.error || `HTTP ${response.status}`)
      }

      const result = await response.json()
      console.log("Generation started:", result)

      setCurrentJob(result.jobId)
      setJobStatus(result)

      toast({
        title: "Generation Started",
        description: `Processing ${images.length} images with ${model === "lite" ? "Seedance Lite (480p)" : "Seedance Pro (1080p)"}. This may take several minutes per video.`,
      })
    } catch (error) {
      console.error("Error starting generation:", error)
      setIsGenerating(false)
      setStartTime(null)
      toast({
        title: "Generation Failed",
        description: error instanceof Error ? error.message : "Failed to start video generation",
        variant: "destructive",
      })
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case "failed":
        return <XCircle className="h-4 w-4 text-red-500" />
      case "processing":
        return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />
      default:
        return <Clock className="h-4 w-4 text-gray-400" />
    }
  }

  const getApiStatusColor = () => {
    switch (apiStatus) {
      case "connected":
        return "text-green-600"
      case "error":
        return "text-red-600"
      case "testing":
        return "text-yellow-600"
      default:
        return "text-gray-600"
    }
  }

  const getKontextModelInfo = (modelType: "dev" | "max") => {
    if (modelType === "dev") {
      return {
        name: "Kontext Dev",
        price: "$0.025",
        description: "Open-weight, fast, commercial use",
        color: "text-green-600",
        bgColor: "bg-green-50",
        borderColor: "border-green-200",
      }
    } else {
      return {
        name: "Kontext Max",
        price: "$0.08",
        description: "Premium, maximum performance, improved typography",
        color: "text-purple-600",
        bgColor: "bg-purple-50",
        borderColor: "border-purple-200",
      }
    }
  }

  const handleVideoDownload = (url: string, filename: string) => {
    try {
      const link = document.createElement("a")
      link.href = url
      link.download = filename
      link.target = "_blank"
      link.rel = "noopener noreferrer"
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      toast({
        title: "Download Started",
        description: `Downloading ${filename}`,
      })
    } catch (error) {
      console.error("Download error:", error)
      toast({
        title: "Download Failed",
        description: "Unable to download video. Try opening in new tab.",
        variant: "destructive",
      })
    }
  }

  const handleImageDownload = (url: string, filename: string) => {
    try {
      const link = document.createElement("a")
      link.href = url
      link.download = filename
      link.target = "_blank"
      link.rel = "noopener noreferrer"
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      toast({
        title: "Download Started",
        description: `Downloading ${filename}`,
      })
    } catch (error) {
      console.error("Download error:", error)
      toast({
        title: "Download Failed",
        description: "Unable to download image. Try opening in new tab.",
        variant: "destructive",
      })
    }
  }

  const handleVideoPlay = (videoElement: HTMLVideoElement) => {
    try {
      videoElement.currentTime = 0
      videoElement.play().catch((error) => {
        console.error("Video play error:", error)
        toast({
          title: "Playback Error",
          description: "Unable to play video. Try downloading it instead.",
          variant: "destructive",
        })
      })
    } catch (error) {
      console.error("Video play error:", error)
    }
  }

  const openFullscreenImage = (src: string, alt: string) => {
    setFullscreenImage({ src, alt })
  }

  const closeFullscreenImage = () => {
    setFullscreenImage(null)
  }

  // Handle escape key to close fullscreen
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && fullscreenImage) {
        closeFullscreenImage()
      }
    }

    if (fullscreenImage) {
      document.addEventListener("keydown", handleEscape)
      document.body.style.overflow = "hidden" // Prevent background scrolling
    } else {
      document.body.style.overflow = "unset"
    }

    return () => {
      document.removeEventListener("keydown", handleEscape)
      document.body.style.overflow = "unset"
    }
  }, [fullscreenImage])

  // Add auto-save effect:
  useEffect(() => {
    const saveToLocalStorage = () => {
      const dataToSave = {
        images: images.map((img) => ({
          id: img.id,
          fileName: img.file.name,
          prompt: img.prompt,
          editPrompt: img.editPrompt,
        })),
        settings: { model, kontextModel, cameraFixed, mergeVideos, isKontextMode },
      }
      localStorage.setItem("seedance-autosave", JSON.stringify(dataToSave))
    }

    const timeoutId = setTimeout(saveToLocalStorage, 1000) // Auto-save after 1 second of inactivity
    return () => clearTimeout(timeoutId)
  }, [images, model, kontextModel, cameraFixed, mergeVideos, isKontextMode])

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">
              {isKontextMode ? "Kontext Image Editor" : "Seedance Video Generator"}
            </h1>
            <p className="text-muted-foreground">
              {isKontextMode
                ? "Edit and transform your images using AI-powered text prompts. Create multiple variations and manage your edits."
                : "Transform your images into dynamic videos using AI. Each video takes 2-5 minutes to generate."}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={testReplicateAPI} disabled={apiStatus === "testing"}>
              <TestTube className="mr-2 h-4 w-4" />
              {apiStatus === "testing" ? "Testing..." : "Test API"}
            </Button>
            <Button variant="outline" onClick={() => setShowHistory(!showHistory)}>
              <History className="mr-2 h-4 w-4" />
              History ({previousJobs.length})
            </Button>
            {/* Add auto-save indicator in the header: */}
            <div className="flex items-center gap-2 text-xs text-green-600">
              <CheckCircle className="h-3 w-3" />
              Auto-saved
            </div>
          </div>
        </div>

        {/* Mode Switch */}
        <div className="mt-4 flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-2">
            <Video className="h-5 w-5 text-blue-600" />
            <Label htmlFor="mode-switch" className="text-sm font-medium">
              Seedance (Video)
            </Label>
          </div>
          <Switch id="mode-switch" checked={isKontextMode} onCheckedChange={setIsKontextMode} disabled={isGenerating} />
          <div className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5 text-purple-600" />
            <Label htmlFor="mode-switch" className="text-sm font-medium">
              Kontext (Image Edit)
            </Label>
          </div>
          <Badge variant={isKontextMode ? "default" : "secondary"}>
            {isKontextMode ? "Image Editing Mode" : "Video Generation Mode"}
          </Badge>
        </div>

        {/* API Status Indicator */}
        <div className={`mt-2 text-sm ${getApiStatusColor()}`}>
          API Status: {apiStatus === "unknown" && "Not tested"}
          {apiStatus === "testing" && "Testing connection..."}
          {apiStatus === "connected" && "✓ Connected"}
          {apiStatus === "error" && "✗ Connection failed"}
        </div>
        {/* Debug Info - Add this right after the API Status indicator */}
        {process.env.NODE_ENV === "development" && (
          <div className="mt-2 text-xs text-gray-500 space-y-1">
            <div>Images: {images.length}</div>
            <div>Empty prompts: {images.filter((img) => !img.prompt.trim()).length}</div>
            <div>Is generating: {isGenerating.toString()}</div>
            <div>API Status: {apiStatus}</div>
            <div>
              Button should be enabled: {(!isGenerating && !images.some((img) => !img.prompt.trim())).toString()}
            </div>
          </div>
        )}
      </div>

      {/* History Panel */}
      {showHistory && previousJobs.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Previous Jobs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {previousJobs.map((job) => (
                <div key={job.jobId} className="flex items-center justify-between p-2 border rounded">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(job.status)}
                    <span className="text-sm">
                      {job.tasks.length} images • {new Date(job.startedAt).toLocaleString()}
                    </span>
                  </div>
                  <Badge variant={job.status === "completed" ? "default" : "secondary"}>{job.status}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Settings Panel */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>{isKontextMode ? "Kontext Settings" : "Seedance Settings"}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {isKontextMode ? (
            /* Kontext Settings */
            <div className="space-y-4">
              <div>
                <Label htmlFor="kontext-model">Kontext Model</Label>
                <Select
                  value={kontextModel}
                  onValueChange={(value: "dev" | "max") => setKontextModel(value)}
                  disabled={isGenerating}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dev">
                      <div className="flex items-center gap-2">
                        <span>Kontext Dev</span>
                        <Badge variant="outline" className="text-green-600">
                          $0.025/image
                        </Badge>
                      </div>
                    </SelectItem>
                    <SelectItem value="max">
                      <div className="flex items-center gap-2">
                        <span>Kontext Max</span>
                        <Badge variant="outline" className="text-purple-600">
                          $0.08/image
                        </Badge>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Model Info Card */}
              <div
                className={`p-4 rounded-lg border ${getKontextModelInfo(kontextModel).bgColor} ${getKontextModelInfo(kontextModel).borderColor}`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign className={`h-4 w-4 ${getKontextModelInfo(kontextModel).color}`} />
                  <span className={`font-medium ${getKontextModelInfo(kontextModel).color}`}>
                    {getKontextModelInfo(kontextModel).name}
                  </span>
                  <Badge variant="outline" className={getKontextModelInfo(kontextModel).color}>
                    {getKontextModelInfo(kontextModel).price} per image
                  </Badge>
                </div>
                <p className="text-sm text-gray-600">{getKontextModelInfo(kontextModel).description}</p>
                {kontextModel === "dev" && (
                  <div className="mt-2 text-xs text-green-700">
                    ✓ Open-weight • ✓ Commercial use • ✓ Fast processing
                  </div>
                )}
                {kontextModel === "max" && (
                  <div className="mt-2 text-xs text-purple-700">
                    ✓ Maximum performance • ✓ Superior typography • ✓ Best quality
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Seedance Settings */
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="model">Model</Label>
                <Select
                  value={model}
                  onValueChange={(value: "lite" | "pro") => setModel(value)}
                  disabled={isGenerating}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="lite">Seedance Lite (480p, 2-3 min/video)</SelectItem>
                    <SelectItem value="pro">Seedance Pro (1080p, 4-5 min/video)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="camera-fixed"
                  checked={cameraFixed}
                  onCheckedChange={setCameraFixed}
                  disabled={isGenerating}
                />
                <Label htmlFor="camera-fixed">Lock Camera Position</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="merge-videos"
                  checked={mergeVideos}
                  onCheckedChange={setMergeVideos}
                  disabled={isGenerating}
                />
                <Label htmlFor="merge-videos">Merge into Single Video</Label>
              </div>
            </div>
          )}

          {!isKontextMode && (
            <div className="text-sm text-muted-foreground">
              Duration: 10 seconds • Frame Rate: 24 FPS • Resolution: {model === "lite" ? "480p" : "1080p"}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add cost display card after the settings panel: */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Cost Estimate
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">${totalCost.toFixed(2)}</div>
              <div className="text-sm text-muted-foreground">
                {images.length} images × $
                {isKontextMode ? (kontextModel === "dev" ? "0.025" : "0.08") : model === "lite" ? "0.18" : "0.74"}
              </div>
            </div>
            <div className="text-center">
              <input
                type="number"
                placeholder="Set budget"
                className="w-full p-2 border rounded text-center"
                value={budget || ""}
                onChange={(e) => setBudget(e.target.value ? Number.parseFloat(e.target.value) : null)}
              />
              <div className="text-xs text-muted-foreground mt-1">Budget limit</div>
            </div>
            <div className="text-center">
              {budget && (
                <div className={`text-lg font-medium ${totalCost > budget ? "text-red-600" : "text-green-600"}`}>
                  {totalCost > budget ? "⚠️ Over Budget" : "✅ Within Budget"}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Enhanced Templates Panel */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              Quick Templates
              {selectedImages.size > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {selectedImages.size} selected
                </Badge>
              )}
            </div>
            <Button variant="outline" size="sm" onClick={() => setShowTemplates(!showTemplates)}>
              {showTemplates ? "Hide" : "Show"} Templates
            </Button>
          </CardTitle>
        </CardHeader>
        {showTemplates && (
          <CardContent className="space-y-4">
            {/* Selection Notice */}
            {selectedImages.size === 0 && (
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800">
                  💡 <strong>Tip:</strong> Select images first, then click a template to apply it only to selected
                  images.
                </p>
              </div>
            )}

            {/* Add New Template */}
            <div className="p-4 border rounded-lg bg-gray-50">
              <h4 className="font-medium mb-3">Create New Template</h4>
              <div className="space-y-3">
                <Input
                  placeholder="Template name (e.g., 'My Custom Style')"
                  value={newTemplateName}
                  onChange={(e) => setNewTemplateName(e.target.value)}
                />
                <Textarea
                  placeholder="Template prompt..."
                  value={newTemplatePrompt}
                  onChange={(e) => setNewTemplatePrompt(e.target.value)}
                  className="min-h-[60px]"
                />
                <Button onClick={addNewTemplate} size="sm" className="w-full">
                  <Plus className="h-3 w-3 mr-1" />
                  Add Template
                </Button>
              </div>
            </div>

            {/* Existing Templates */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {(isKontextMode ? templates.kontext : templates.seedance).map((template) => (
                <div key={template.id} className="border rounded-lg p-3 bg-white">
                  {editingTemplate === template.id ? (
                    <div className="space-y-3">
                      <Input
                        value={editTemplateName}
                        onChange={(e) => setEditTemplateName(e.target.value)}
                        placeholder="Template name"
                      />
                      <Textarea
                        value={editTemplatePrompt}
                        onChange={(e) => setEditTemplatePrompt(e.target.value)}
                        placeholder="Template prompt"
                        className="min-h-[60px]"
                      />
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => saveEditingTemplate(template.id)} className="flex-1">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Save
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={cancelEditingTemplate}
                          className="flex-1 bg-transparent"
                        >
                          <X className="h-3 w-3 mr-1" />
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <h5 className="font-medium text-sm">{template.name}</h5>
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 w-6 p-0"
                            onClick={() => startEditingTemplate(template)}
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                            onClick={() => deleteTemplate(template.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                      <p className="text-xs text-gray-600 mb-2">{template.prompt}</p>
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full text-xs bg-transparent"
                        onClick={() => applyTemplate(template)}
                        disabled={selectedImages.size === 0}
                      >
                        Apply to Selected ({selectedImages.size})
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        )}
      </Card>

      {/* Image Upload */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>
            Select Images ({images.length} selected)
            {isKontextMode && (
              <span className="text-sm font-normal text-muted-foreground ml-2">- Upload images to edit with AI</span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
            <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <p className="text-lg mb-2">Drop images here or click to browse</p>
            <p className="text-sm text-muted-foreground mb-4">
              Supports JPG, PNG, WebP. Select multiple files at once.
            </p>
            <Button onClick={() => fileInputRef.current?.click()} disabled={isGenerating}>
              Choose Images
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>
        </CardContent>
      </Card>

      {showBulkActions && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-between">
          <span className="text-sm text-blue-800">{selectedImages.size} images selected</span>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                // Apply same prompt to all selected
                const prompt = window.prompt("Enter prompt for all selected images:")
                if (prompt) {
                  setImages((prev) => prev.map((img) => (selectedImages.has(img.id) ? { ...img, prompt } : img)))
                }
              }}
            >
              Apply Same Prompt
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setImages((prev) => prev.filter((img) => !selectedImages.has(img.id)))
                setSelectedImages(new Set())
                setShowBulkActions(false)
              }}
            >
              Remove Selected
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setSelectedImages(new Set())
                setShowBulkActions(false)
              }}
            >
              Clear Selection
            </Button>
          </div>
        </div>
      )}

      {/* Image Grid */}
      {images.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>
              {isKontextMode ? "Images & Edit Prompts" : "Images & Prompts"} ({images.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-6">
              {images.map((image, index) => {
                const taskStatus = jobStatus?.tasks[index]
                const hasVideo = taskStatus?.outputUrl && taskStatus.status === "completed"

                return (
                  <div
                    key={image.id}
                    className="border rounded-lg p-4 cursor-move"
                    draggable
                    onDragStart={(e) => {
                      setDraggedIndex(index)
                      e.dataTransfer.effectAllowed = "move"
                    }}
                    onDragOver={(e) => {
                      e.preventDefault()
                      e.dataTransfer.dropEffect = "move"
                    }}
                    onDrop={(e) => {
                      e.preventDefault()
                      if (draggedIndex !== null && draggedIndex !== index) {
                        const newImages = [...images]
                        const draggedImage = newImages[draggedIndex]
                        newImages.splice(draggedIndex, 1)
                        newImages.splice(index, 0, draggedImage)
                        setImages(newImages)
                      }
                      setDraggedIndex(null)
                    }}
                    style={{
                      opacity: draggedIndex === index ? 0.5 : 1,
                      transform: draggedIndex === index ? "rotate(2deg)" : "none",
                    }}
                  >
                    <div className="flex gap-4">
                      <div className="relative group">
                        <img
                          src={image.preview || "/placeholder.svg"}
                          alt={`Preview ${index + 1}`}
                          className="w-24 h-24 object-cover rounded cursor-pointer"
                        />

                        {/* Magnifying glass overlay */}
                        <div
                          className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-200 rounded flex items-center justify-center cursor-pointer"
                          onClick={() => openFullscreenImage(image.preview, `Preview ${index + 1}`)}
                        >
                          <Search className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                        </div>

                        {!isGenerating && (
                          <Button
                            size="sm"
                            variant="destructive"
                            className="absolute -top-2 -right-2 h-6 w-6 p-0 z-10"
                            onClick={() => removeImage(index)}
                          >
                            ×
                          </Button>
                        )}
                      </div>

                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2 mb-2">
                          <Checkbox
                            checked={selectedImages.has(image.id)}
                            onCheckedChange={(checked) => {
                              const newSelected = new Set(selectedImages)
                              if (checked) {
                                newSelected.add(image.id)
                              } else {
                                newSelected.delete(image.id)
                              }
                              setSelectedImages(newSelected)
                              setShowBulkActions(newSelected.size > 0)
                            }}
                          />
                          <Badge variant="outline">{image.file.name}</Badge>
                        </div>

                        {/* Kontext Mode - Edit Prompt */}
                        {isKontextMode ? (
                          <div className="space-y-3">
                            <div className="flex gap-2">
                              <Textarea
                                placeholder="Describe how you want to edit this image (e.g., 'Make the sky purple', 'Add sunglasses to the person', 'Change background to a beach')..."
                                value={image.editPrompt || ""}
                                onChange={(e) => updateEditPrompt(index, e.target.value)}
                                className="min-h-[80px] flex-1"
                                disabled={isGenerating}
                              />
                              <div className="flex flex-col gap-2">
                                <Button
                                  onClick={() => generateKontextEdit(index)}
                                  disabled={!image.editPrompt?.trim() || processingEdits.has(`edit_${index}`)}
                                  size="sm"
                                  className="self-end"
                                >
                                  {processingEdits.size > 0 ? (
                                    <>
                                      <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                      Edit
                                    </>
                                  ) : (
                                    <>
                                      <Edit className="h-3 w-3 mr-1" />
                                      Edit
                                    </>
                                  )}
                                </Button>
                                <Badge
                                  variant="outline"
                                  className={`text-xs ${getKontextModelInfo(kontextModel).color}`}
                                >
                                  {getKontextModelInfo(kontextModel).name}
                                </Badge>
                              </div>
                            </div>

                            {/* Show edited versions */}
                            {image.editedVersions && image.editedVersions.length > 0 && (
                              <div className="space-y-3 p-3 bg-purple-50 rounded-lg border border-purple-200">
                                <h4 className="text-sm font-medium text-purple-800">
                                  Edited Versions ({image.editedVersions.length})
                                </h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                  {image.editedVersions.map((version) => (
                                    <div key={version.id} className="border rounded-lg p-3 bg-white">
                                      <div className="flex items-center gap-2 mb-2">
                                        {getStatusIcon(version.status)}
                                        <span className="text-xs text-gray-500">
                                          {new Date(version.createdAt).toLocaleTimeString()}
                                        </span>
                                        {version.model && (
                                          <Badge
                                            variant="outline"
                                            className={`text-xs ${getKontextModelInfo(version.model).color}`}
                                          >
                                            {version.model.toUpperCase()}
                                          </Badge>
                                        )}
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          className="h-6 w-6 p-0 ml-auto text-red-500 hover:text-red-700"
                                          onClick={() => removeEditedVersion(index, version.id)}
                                        >
                                          <Trash2 className="h-3 w-3" />
                                        </Button>
                                      </div>

                                      <p className="text-xs text-gray-600 mb-2">"{version.prompt}"</p>

                                      {version.status === "completed" && version.imageUrl && (
                                        <div className="space-y-2">
                                          <div className="relative group">
                                            <img
                                              src={version.imageUrl || "/placeholder.svg"}
                                              alt="Edited version"
                                              className="w-full h-32 object-cover rounded cursor-pointer"
                                            />
                                            <div
                                              className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-200 rounded flex items-center justify-center cursor-pointer"
                                              onClick={() =>
                                                openFullscreenImage(version.imageUrl, `Edited: ${version.prompt}`)
                                              }
                                            >
                                              <Search className="h-4 w-4 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                                            </div>
                                          </div>
                                          <div className="flex gap-1">
                                            <Button
                                              size="sm"
                                              variant="outline"
                                              className="flex-1 text-xs bg-transparent"
                                              onClick={() =>
                                                handleImageDownload(
                                                  version.imageUrl,
                                                  `${image.file.name.split(".")[0]}_edited_${version.model}_${version.id}.jpg`,
                                                )
                                              }
                                            >
                                              <Download className="h-3 w-3 mr-1" />
                                              Save
                                            </Button>
                                            <Button
                                              size="sm"
                                              variant="outline"
                                              className="flex-1 text-xs bg-transparent"
                                              onClick={() => window.open(version.imageUrl, "_blank")}
                                            >
                                              <ExternalLink className="h-3 w-3 mr-1" />
                                              Open
                                            </Button>
                                          </div>
                                        </div>
                                      )}

                                      {version.status === "failed" && (
                                        <div className="text-xs text-red-500 p-2 bg-red-50 rounded">
                                          <strong>Error:</strong> {version.error}
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        ) : (
                          /* Seedance Mode - Video Prompt */
                          <Textarea
                            placeholder="Describe the video you want to generate from this image..."
                            value={image.prompt}
                            onChange={(e) => updatePrompt(index, e.target.value)}
                            className="min-h-[80px]"
                            disabled={isGenerating}
                          />
                        )}

                        {/* Video Result Section - Only for Seedance mode */}
                        {!isKontextMode && hasVideo && (
                          <div className="mt-4 space-y-3 p-3 bg-green-50 rounded-lg border border-green-200">
                            <div className="flex items-center gap-2">
                              <CheckCircle className="h-4 w-4 text-green-600" />
                              <span className="text-sm font-medium text-green-800">Video Generated!</span>
                            </div>

                            {/* Video Player */}
                            <div className="relative">
                              <video
                                key={taskStatus.outputUrl} // Force re-render when URL changes
                                controls
                                className="w-full max-w-sm rounded-lg shadow-sm"
                                poster={image.preview}
                                preload="metadata"
                                style={{ backgroundColor: "#000" }}
                                onLoadStart={() => console.log("Video loading started")}
                                onCanPlay={() => console.log("Video can play")}
                                onError={(e) => {
                                  console.error("Video error:", e)
                                  toast({
                                    title: "Video Error",
                                    description: "Unable to load video. Try downloading it.",
                                    variant: "destructive",
                                  })
                                }}
                              >
                                <source src={taskStatus.outputUrl} type="video/mp4" />
                                <source src={taskStatus.outputUrl} type="video/webm" />
                                Your browser does not support the video tag.
                              </video>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex gap-2 flex-wrap">
                              <Button
                                size="sm"
                                variant="default"
                                onClick={() => {
                                  const video = document.querySelector(
                                    `video[src="${taskStatus.outputUrl}"]`,
                                  ) as HTMLVideoElement
                                  if (video) {
                                    handleVideoPlay(video)
                                  }
                                }}
                              >
                                <PlayCircle className="h-3 w-3 mr-1" />
                                Play
                              </Button>

                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                  handleVideoDownload(
                                    taskStatus.outputUrl!,
                                    `${image.file.name.split(".")[0]}_video.mp4`,
                                  )
                                }
                              >
                                <Download className="h-3 w-3 mr-1" />
                                Download
                              </Button>

                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  window.open(taskStatus.outputUrl, "_blank", "noopener,noreferrer")
                                }}
                              >
                                <ExternalLink className="h-3 w-3 mr-1" />
                                Open
                              </Button>
                            </div>

                            {/* Video URL for debugging */}
                            <div className="text-xs text-gray-500 break-all">URL: {taskStatus.outputUrl}</div>
                          </div>
                        )}

                        {/* Error Display */}
                        {!isKontextMode && taskStatus?.error && (
                          <div className="text-sm text-red-500 p-3 bg-red-50 rounded border border-red-200">
                            <strong>Error:</strong> {taskStatus.error}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Generation Controls - Only for Seedance mode */}
      {!isKontextMode && images.length > 0 && (
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button
                  onClick={generateVideos}
                  disabled={isGenerating || images.some((img) => !img.prompt.trim())}
                  size="lg"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Play className="mr-2 h-4 w-4" />
                      Generate {images.length} Videos
                    </>
                  )}
                </Button>

                {isGenerating && (
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    <span className="font-mono">{formatTime(elapsedTime)}</span>
                    <span className="text-sm text-muted-foreground">
                      (~{model === "lite" ? "2-3" : "4-5"} min per video)
                    </span>
                  </div>
                )}
              </div>

              {jobStatus && (
                <div className="text-right">
                  <div className="text-sm text-muted-foreground">
                    {jobStatus.completed} of {jobStatus.total} completed
                  </div>
                  <Progress value={(jobStatus.completed / jobStatus.total) * 100} className="w-32" />
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Merged Video Result - Only for Seedance mode */}
      {!isKontextMode && jobStatus?.mergedOutputUrl && (
        <Card>
          <CardHeader>
            <CardTitle>Merged Video Result</CardTitle>
          </CardHeader>
          <CardContent>
            <video controls className="w-full max-w-2xl mx-auto rounded-lg" preload="metadata">
              <source src={jobStatus.mergedOutputUrl} type="video/mp4" />
              Your browser does not support the video tag.
            </video>
            <div className="mt-4 text-center">
              <Button onClick={() => handleVideoDownload(jobStatus.mergedOutputUrl!, "merged-video.mp4")}>
                <Download className="mr-2 h-4 w-4" />
                Download Merged Video
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Fullscreen Image Modal */}
      {fullscreenImage && (
        <div
          className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-4"
          onClick={closeFullscreenImage}
        >
          <div className="relative max-w-full max-h-full">
            <img
              src={fullscreenImage.src || "/placeholder.svg"}
              alt={fullscreenImage.alt}
              className="max-w-full max-h-full object-contain cursor-pointer"
              onClick={closeFullscreenImage}
            />

            {/* Close button */}
            <Button
              size="sm"
              variant="secondary"
              className="absolute top-4 right-4 h-8 w-8 p-0 bg-white bg-opacity-20 hover:bg-opacity-30"
              onClick={closeFullscreenImage}
            >
              ×
            </Button>

            {/* Instructions */}
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 text-white text-sm bg-black bg-opacity-50 px-3 py-1 rounded">
              Click image or press ESC to close
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
