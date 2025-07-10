"use client";

import React, { DragEvent } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Upload } from "lucide-react";

export interface UploadAreaProps {
  handleFileUpload: (files: FileList | null) => void;
  handleDrop: (e: DragEvent) => void;
  handleDragOver: (e: DragEvent) => void;
  fileInputRef: React.RefObject<HTMLInputElement>;
}

export default function UploadArea({
  handleFileUpload,
  handleDrop,
  handleDragOver,
  fileInputRef,
}: UploadAreaProps) {
  // Handle paste event for images
  const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    if (e.clipboardData && e.clipboardData.files.length > 0) {
      handleFileUpload(e.clipboardData.files);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="w-5 h-5" />
          Upload Images
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div
          className="border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg p-8 text-center hover:border-purple-400 transition-colors cursor-pointer"
          onDrop={e => {
            if (e.target === e.currentTarget) handleDrop(e);
          }}
          onDragOver={e => {
            if (e.target === e.currentTarget) handleDragOver(e);
          }}
          onClick={e => {
            if (e.target === e.currentTarget) fileInputRef.current?.click();
          }}
          onPaste={e => {
            if (e.target === e.currentTarget) handlePaste(e);
          }}
        >
          <Upload className="w-12 h-12 mx-auto mb-4 text-slate-400" />
          <p className="text-lg font-medium mb-2">
            <span className="font-bold text-purple-600">Paste (Ctrl+V)</span>, drop, or click to upload images
          </p>
          <p className="text-slate-500">You can paste screenshots or images copied to your clipboard, or drag and drop files here. Support for JPG, PNG, WebP formats.</p>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*"
          className="hidden"
          onChange={(e) => handleFileUpload(e.target.files)}
        />
      </CardContent>
    </Card>
  );
}
