import { SettingsType, Template } from "@/types";

export const MODES = {
  SEEDANCE: "seedance",
  KONTEXT: "kontext",
  GEN4: "gen4",
};

export const SEEDANCE_MODELS = [
  {
    name: "seedance-1-lite",
    value: "seedance-1-lite",
  },
  {
    name: "seedance-1-pro",
    value: "seedance-1-pro",
  },
];

export const SEEDANCE_DURATIONS = [
  {
    name: "5",
    value: 5,
  },
  {
    name: "10",
    value: 10,
  },
];

export const SEEDANCE_LITE_RESOLUTIONS = [
  {
    name: "480p",
    value: "480p",
  },
  {
    name: "720p",
    value: "720p",
  },
];

export const SEEDANCE_PRO_RESOLUTIONS = [
  {
    name: "480p",
    value: "480p",
  },
  {
    name: "1080p",
    value: "1080p",
  },
];

export const GEN4_RESOLUTIONS = [
  {
    name: "720p",
    value: "720p",
  },
  {
    name: "1080p",
    value: "1080p",
  },
];

export const defaultTemplates: Template[] = [
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

export const defaultSettings: SettingsType = {
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
};
