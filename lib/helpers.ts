import { toast } from "@/hooks/use-toast";

/**
 * Copy a file URL to clipboard and show toast notification.
 */
export const copyToClipboard = async (fileUrl: string): Promise<void> => {
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

/**
 * Download a file from a given URL handling CORS and displaying errors in console.
 */
export const downloadFile = async (fileUrl: string): Promise<void> => {
  const fileName = fileUrl.split("/").pop() || "file";
  try {
    const response = await fetch(fileUrl, { mode: "cors" });
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

/**
 * Prevents the default action for a drag-over event.
 */
export const handleDragOver = (e: React.DragEvent): void => {
  e.preventDefault();
};

