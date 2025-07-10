"use client";

import React, { useEffect } from "react";

interface UploadAreaPasteListenerProps {
  onPasteFiles: (files: FileList) => void;
}

// This component attaches a paste event to the whole document (or a parent container)
// so users can paste images even if the upload area is not focused.
export default function UploadAreaPasteListener({ onPasteFiles }: UploadAreaPasteListenerProps) {
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const active = document.activeElement as HTMLElement | null;
      const isInput =
        active && (
          active.tagName === "INPUT" ||
          active.tagName === "TEXTAREA" ||
          active.isContentEditable
        );
      if (!isInput && e.clipboardData && e.clipboardData.files.length > 0) {
        onPasteFiles(e.clipboardData.files);
      }
    };
    document.addEventListener("paste", handlePaste);
    return () => document.removeEventListener("paste", handlePaste);
  }, [onPasteFiles]);
  return null;
}
