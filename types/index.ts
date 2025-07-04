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
