export interface EditHistoryItem {
  id: string;
  prompt: string;
  imageUrl: string;
  timestamp: number;
  model: "dev" | "max";
}

export interface ImageData {
  filename?: any;
  id: string;
  file: File;
  type?: string;
  size?: number;
  fileUrl: string;
  preview: string;
  prompt: string;
  selected: boolean;
  status: "idle" | "processing" | "completed" | "failed";
  outputUrl?: string;
  videos?: string[];
  lastFrame?: File | null;
  lastFrameFile?: File | undefined;
  lastFramePreview?: string | null;
  error?: string;
  editHistory?: EditHistoryItem[];
  mode: "seedance" | "kontext";
}

export interface Template {
  id: string;
  name: string;
  prompt: string;
  category: string;
  favorite: boolean;
  usageCount: number;
}

export interface JobStatus {
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

export interface Gen4ReferenceImage {
  id: string;
  file: File;
  preview: string;
  tags: string[];
}

export interface Gen4Generation {
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

// Define types for better type safety
export type ImageReference = {
  id: string;
  preview?: string;
  tags: string[];
};

// Matches the Gen4Generation interface from the parent component
export type Generation = {
  id: string;
  prompt: string;
  referenceImages: Array<{
    id: string;
    preview?: string;
    tags: string[];
  }>;
  settings: {
    aspectRatio: string;
    resolution: string;
    seed?: number;
  };
  status: "idle" | "processing" | "completed" | "failed";
  outputUrl?: string;
  error?: string;
  timestamp: number;
  tags?: string[];
};

export interface Gen4Settings {
  aspectRatio: string;
  resolution: string;
  seed: number | undefined;
}

export interface SettingsType {
  seedance: {
    model: string;
    resolution: string;
    duration: number;
    cameraFixed: boolean;
  };
  kontext: {
    model: "dev" | "max";
  };
  general: {
    autoSave: boolean;
    showCostEstimates: boolean;
    maxConcurrentJobs: number;
  };
}

export interface SettingProps {
  settings: SettingsType;
  setSettings: (
    settings: SettingsType | ((prev: SettingsType) => SettingsType)
  ) => void;
  activeTab: string;
  selectedCount: number;
}

export interface Gen4Props {
  gen4Generations: Generation[];
  gen4Processing: boolean;
  gen4Settings: Gen4Settings;
  setGen4Settings: (
    settings: Gen4Settings | ((prev: Gen4Settings) => Gen4Settings)
  ) => void;
  openFullscreenImage: (url: string, mode: string) => void;
  downloadFile: (url: string, filename: string) => void;
  copyToClipboard: (url: string) => void;
  removeImage: (id: string, isGen4?: boolean) => void;
  removeGeneration: (id: string) => void;
  gen4FileInputRef: React.RefObject<HTMLInputElement>;
  handleFileUpload: (files: FileList | null, isGen4?: boolean) => void;
  handleDrop: (e: React.DragEvent, isGen4?: boolean) => void;
  handleDragOver: (e: React.DragEvent) => void;
  gen4ReferenceImages: Gen4ReferenceImage[];
  gen4Prompt: string;
  setGen4Prompt: (prompt: string) => void;
  generateGen4: () => void;
  activeTab: string;
  removeTagFromGen4Image: (imageId: string, tag: string) => void;
  addTagToGen4Image: (imageId: string, tag: string) => void;
  replaceReferenceWithGen: (url: string, index: number, tags?: string[]) => void;
  sendGenerationToWorkspace: (url: string) => void;
  saveToLibrary: (generation: Generation) => Promise<void>;
}
