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
  // 1. Rap Performance Templates
  {
    id: "rap1",
    name: "Energetic Rap",
    prompt: "Person rapping energetically, moving hands with expressive gestures and nodding to the beat.",
    category: "Rap Performance",
    favorite: false,
    usageCount: 0,
  },
  {
    id: "rap2",
    name: "Microphone Gestures",
    prompt: "Character holding a microphone, making classic rap hand motions, occasionally pointing at the camera.",
    category: "Rap Performance",
    favorite: false,
    usageCount: 0,
  },
  {
    id: "rap3",
    name: "Head Bob Rap",
    prompt: "Performer bobbing their head, using one hand to emphasize lyrics, other hand on chest or making rhythmic gestures.",
    category: "Rap Performance",
    favorite: false,
    usageCount: 0,
  },
  {
    id: "rap4",
    name: "Side-Step Punchlines",
    prompt: "Rapper stepping side to side, using both hands to accentuate punchlines, intense facial expressions.",
    category: "Rap Performance",
    favorite: false,
    usageCount: 0,
  },
  // 2. Natural, Casual Actions
  {
    id: "casual1",
    name: "Casual Stand",
    prompt: "Person standing casually, looking around the room, smiling softly, occasionally glancing at the camera.",
    category: "Natural Casual",
    favorite: false,
    usageCount: 0,
  },
  {
    id: "casual2",
    name: "Adjusting Clothes",
    prompt: "Character adjusting their jacket or shirt, smoothing their clothes, and giving a relaxed smile.",
    category: "Natural Casual",
    favorite: false,
    usageCount: 0,
  },
  {
    id: "casual3",
    name: "Weight Shift",
    prompt: "Individual shifting weight from one foot to another, checking their watch or phone, then looking up and smiling.",
    category: "Natural Casual",
    favorite: false,
    usageCount: 0,
  },
  {
    id: "casual4",
    name: "Natural Laughter",
    prompt: "Natural laughter, covering mouth briefly, then brushing hair back or tucking it behind an ear.",
    category: "Natural Casual",
    favorite: false,
    usageCount: 0,
  },
  // 3. Gestures & Poses
  {
    id: "gesture1",
    name: "Peace Sign",
    prompt: "Person flashing a peace sign with one hand, smiling confidently at the camera.",
    category: "Gestures & Poses",
    favorite: false,
    usageCount: 0,
  },
  {
    id: "gesture2",
    name: "Friendly Wave",
    prompt: "Character waving hello or goodbye, hand raised in a friendly gesture.",
    category: "Gestures & Poses",
    favorite: false,
    usageCount: 0,
  },
  {
    id: "gesture3",
    name: "Thumbs Up",
    prompt: "Performer giving a thumbs up, nodding approvingly.",
    category: "Gestures & Poses",
    favorite: false,
    usageCount: 0,
  },
  {
    id: "gesture4",
    name: "Arms Fold & Pockets",
    prompt: "Individual folding arms, then unfolding and placing hands in pockets.",
    category: "Gestures & Poses",
    favorite: false,
    usageCount: 0,
  },
  // 4. Expressive & Emotional Actions
  {
    id: "express1",
    name: "Surprised to Smile",
    prompt: "Character expressing surprise, widening eyes and raising eyebrows, then relaxing into a smile.",
    category: "Expressive Emotional",
    favorite: false,
    usageCount: 0,
  },
  {
    id: "express2",
    name: "Story Gesture",
    prompt: "Person clapping hands together once, then spreading arms as if telling a story.",
    category: "Expressive Emotional",
    favorite: false,
    usageCount: 0,
  },
  {
    id: "express3",
    name: "Heartfelt Gesture",
    prompt: "Performer putting a hand over their heart, then gesturing outward to the audience.",
    category: "Expressive Emotional",
    favorite: false,
    usageCount: 0,
  },
  // 5. Establishing & Cinematic Shots
  {
    id: "cinematic1",
    name: "City Zoom Out",
    prompt: "Slow zoom out from the character standing in a city street, looking around at the environment.",
    category: "Establishing Cinematic",
    favorite: false,
    usageCount: 0,
  },
  {
    id: "cinematic2",
    name: "Approach & Gaze",
    prompt: "Character walking toward the camera, then stopping and gazing into the distance.",
    category: "Establishing Cinematic",
    favorite: false,
    usageCount: 0,
  },
  {
    id: "cinematic3",
    name: "Over-Shoulder Sunset",
    prompt: "Over-the-shoulder shot of the character looking at a sunset or skyline, wind moving their hair or clothes.",
    category: "Establishing Cinematic",
    favorite: false,
    usageCount: 0,
  },
  {
    id: "cinematic4",
    name: "Rainy Window",
    prompt: "Person standing at a window, watching the rain, hand resting on the glass.",
    category: "Establishing Cinematic",
    favorite: false,
    usageCount: 0,
  },
  // 6. Phone & Tech Actions
  {
    id: "tech1",
    name: "Talking on Phone",
    prompt: "Person talking on a phone, gesturing with free hand, occasional nods and expressive face.",
    category: "Phone & Tech",
    favorite: false,
    usageCount: 0,
  },
  {
    id: "tech2",
    name: "Texting Message",
    prompt: "Character texting rapidly on a smartphone, eyes shifting between screen and surroundings with subtle smiles.",
    category: "Phone & Tech",
    favorite: false,
    usageCount: 0,
  },
  {
    id: "tech3",
    name: "Typing on Computer",
    prompt: "Individual focused on a laptop, typing quickly, occasional pauses to think, subtle facial expressions.",
    category: "Phone & Tech",
    favorite: false,
    usageCount: 0,
  },
  {
    id: "tech4",
    name: "Walking – Camera Follow",
    prompt: "Person walking forward while the camera follows steadily, natural arm swings, casual gaze ahead.",
    category: "Phone & Tech",
    favorite: false,
    usageCount: 0,
  }
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
