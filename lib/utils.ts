import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const convertToBase64 = async (file: File): Promise<string> => {
  const base64Data: Promise<string> = new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.readAsDataURL(file);

    reader.onload = () => {
      const result = reader.result as string;
      const base64String = result.split(',')[1]; // remove data:*/*;base64, prefix
      resolve(base64String);
    };

    reader.onerror = (error) => reject(error);
  });

  return base64Data;
};

