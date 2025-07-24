"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Crop, Check, X, RotateCcw } from 'lucide-react';

interface ImageCropperProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  onCropComplete: (croppedImageData: string) => void;
}

const ImageCropper: React.FC<ImageCropperProps> = ({
  isOpen,
  onClose,
  imageUrl,
  onCropComplete
}) => {
  // Simple state - like Layout Planner
  const [aspectRatio, setAspectRatio] = useState<'free' | '1:1' | '16:9' | '9:16'>('free');
  const [cropBox, setCropBox] = useState({ x: 100, y: 100, width: 200, height: 200 });
  const [dragMode, setDragMode] = useState<'none' | 'move' | 'resize'>('none');
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Reset initialization when modal opens
  useEffect(() => {
    if (isOpen) {
      setInitialized(false);
    } else {
      // Reset crop area when modal closes
      setCropArea({ x: 50, y: 50, width: 200, height: 200 });
    }
  }, [isOpen]);

  // Initialize crop area when image loads
  useEffect(() => {
    if (imageRef.current && isOpen && !initialized) {
      const img = imageRef.current;
      
      const initializeCropArea = () => {
        // Wait a bit for the image to be properly rendered
        setTimeout(() => {
          const rect = img.getBoundingClientRect();
          if (rect.width > 0 && rect.height > 0) {
            const newImageSize = { width: rect.width, height: rect.height };
            setImageSize(newImageSize);
            
            // Set initial crop area to center 50% of image
            const initialWidth = rect.width * 0.5;
            const initialHeight = rect.height * 0.5;
            const newCropArea = {
              x: (rect.width - initialWidth) / 2,
              y: (rect.height - initialHeight) / 2,
              width: initialWidth,
              height: initialHeight
            };
            setCropArea(newCropArea);
            setInitialized(true);
          }
        }, 100);
      };
      
      if (img.complete && img.naturalWidth > 0) {
        initializeCropArea();
      } else {
        img.onload = initializeCropArea;
      }
    }
  }, [isOpen, imageUrl, initialized]);

  // Update crop area when aspect ratio changes
  useEffect(() => {
    if (aspectRatio !== 'free' && imageSize.width > 0 && cropArea.width > 0) {
      const centerX = cropArea.x + cropArea.width / 2;
      const centerY = cropArea.y + cropArea.height / 2;
      
      let newWidth = cropArea.width;
      let newHeight = cropArea.height;
      
      switch (aspectRatio) {
        case '1:1':
          const size = Math.min(newWidth, newHeight);
          newWidth = size;
          newHeight = size;
          break;
        case '16:9':
          newHeight = newWidth * (9 / 16);
          break;
        case '9:16':
          newHeight = newWidth * (16 / 9);
          break;
      }
      
      // Ensure crop area stays within image bounds
      newWidth = Math.min(newWidth, imageSize.width);
      newHeight = Math.min(newHeight, imageSize.height);
      
      // Center the crop area
      const newX = Math.max(0, Math.min(centerX - newWidth / 2, imageSize.width - newWidth));
      const newY = Math.max(0, Math.min(centerY - newHeight / 2, imageSize.height - newHeight));
      
      setCropArea({
        x: newX,
        y: newY,
        width: newWidth,
        height: newHeight
      });
    }
  }, [aspectRatio, imageSize.width, imageSize.height, cropArea.width, cropArea.height, cropArea.x, cropArea.y]);

  // Simple mouse event handlers
  const handleMouseDown = (e: React.MouseEvent, action: 'drag' | 'resize') => {
    e.preventDefault();
    e.stopPropagation();
    
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    if (action === 'drag') {
      setIsDragging(true);
      dragStartRef.current = {
        x: mouseX,
        y: mouseY,
        cropX: cropArea.x,
        cropY: cropArea.y
      };
    } else {
      setIsResizing(true);
      dragStartRef.current = {
        x: mouseX,
        y: mouseY,
        cropX: cropArea.width,
        cropY: cropArea.height
      };
    }
  };

  // Mouse move handler
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging && !isResizing) return;
    
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    if (isDragging) {
      const deltaX = mouseX - dragStartRef.current.x;
      const deltaY = mouseY - dragStartRef.current.y;
      
      const newX = Math.max(0, Math.min(dragStartRef.current.cropX + deltaX, imageSize.width - cropArea.width));
      const newY = Math.max(0, Math.min(dragStartRef.current.cropY + deltaY, imageSize.height - cropArea.height));
      
      setCropArea(prev => ({ ...prev, x: newX, y: newY }));
    } else if (isResizing) {
      const deltaX = mouseX - dragStartRef.current.x;
      const deltaY = mouseY - dragStartRef.current.y;
      
      let newWidth = Math.max(50, dragStartRef.current.cropX + deltaX);
      let newHeight = Math.max(50, dragStartRef.current.cropY + deltaY);
      
      // Apply aspect ratio constraints
      if (aspectRatio === '1:1') {
        const size = Math.min(newWidth, newHeight);
        newWidth = size;
        newHeight = size;
      } else if (aspectRatio === '16:9') {
        newHeight = newWidth * (9 / 16);
      } else if (aspectRatio === '9:16') {
        newHeight = newWidth * (16 / 9);
      }
      
      // Ensure crop area stays within image bounds
      newWidth = Math.min(newWidth, imageSize.width - cropArea.x);
      newHeight = Math.min(newHeight, imageSize.height - cropArea.y);
      
      setCropArea(prev => ({ ...prev, width: newWidth, height: newHeight }));
    }
  };

  // Mouse up handler
  const handleMouseUp = () => {
    setIsDragging(false);
    setIsResizing(false);
  };



  const handleCrop = () => {
    if (!imageRef.current || !canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const img = imageRef.current;
    
    if (!ctx) return;
    
    // Calculate scale factor between displayed image and actual image
    const scaleX = img.naturalWidth / img.offsetWidth;
    const scaleY = img.naturalHeight / img.offsetHeight;
    
    // Set canvas size to crop area size
    canvas.width = cropArea.width * scaleX;
    canvas.height = cropArea.height * scaleY;
    
    // Draw cropped portion of image
    ctx.drawImage(
      img,
      cropArea.x * scaleX,
      cropArea.y * scaleY,
      cropArea.width * scaleX,
      cropArea.height * scaleY,
      0,
      0,
      canvas.width,
      canvas.height
    );
    
    // Convert to base64
    const croppedImageData = canvas.toDataURL('image/png');
    onCropComplete(croppedImageData);
    onClose();
  };

  const resetCrop = () => {
    if (imageSize.width > 0 && imageSize.height > 0) {
      // Reset aspect ratio to free first
      setAspectRatio('free');
      
      // Set crop area to center 50% of image
      const initialWidth = imageSize.width * 0.5;
      const initialHeight = imageSize.height * 0.5;
      
      setCropArea({
        x: (imageSize.width - initialWidth) / 2,
        y: (imageSize.height - initialHeight) / 2,
        width: initialWidth,
        height: initialHeight
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Crop className="w-5 h-5" />
            Crop Image
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 overflow-hidden flex flex-col gap-4">
          {/* Aspect Ratio Controls */}
          <div className="flex gap-2 flex-wrap">
            <Button
              variant={aspectRatio === 'free' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setAspectRatio('free')}
              className="h-9 min-w-[60px]"
            >
              Free
            </Button>
            <Button
              variant={aspectRatio === '1:1' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setAspectRatio('1:1')}
              className="h-9 min-w-[60px]"
            >
              1:1
            </Button>
            <Button
              variant={aspectRatio === '16:9' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setAspectRatio('16:9')}
              className="h-9 min-w-[60px]"
            >
              16:9
            </Button>
            <Button
              variant={aspectRatio === '9:16' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setAspectRatio('9:16')}
              className="h-9 min-w-[60px]"
            >
              9:16
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={resetCrop}
              className="h-9 min-w-[60px]"
            >
              <RotateCcw className="w-4 h-4 mr-1" />
              Reset
            </Button>
          </div>
          
          {/* Crop Area */}
          <div className="flex-1 overflow-auto">
            <Card className="p-4">
              <div
                ref={containerRef}
                className="relative inline-block max-w-full"
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
              >
                <img
                  ref={imageRef}
                  src={imageUrl}
                  alt="Crop preview"
                  className="max-w-full max-h-[60vh] object-contain select-none"
                  draggable={false}
                />
                
                {/* Crop Overlay */}
                <div
                  className="absolute border-2 border-blue-500 bg-blue-500/20 cursor-move"
                  style={{
                    left: `${cropArea.x}px`,
                    top: `${cropArea.y}px`,
                    width: `${cropArea.width}px`,
                    height: `${cropArea.height}px`,
                  }}
                  onMouseDown={(e) => handleMouseDown(e, 'drag')}
                >
                  {/* Resize Handle */}
                  <div
                    className="absolute bottom-0 right-0 w-4 h-4 bg-blue-500 cursor-se-resize"
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      handleMouseDown(e, 'resize');
                    }}
                  />
                </div>
                
                {/* Dark overlay outside crop area */}
                <div className="absolute inset-0 pointer-events-none">
                  {/* Top */}
                  <div
                    className="absolute top-0 left-0 right-0 bg-black/50"
                    style={{ height: `${cropArea.y}px` }}
                  />
                  {/* Bottom */}
                  <div
                    className="absolute left-0 right-0 bg-black/50"
                    style={{
                      top: `${cropArea.y + cropArea.height}px`,
                      bottom: 0
                    }}
                  />
                  {/* Left */}
                  <div
                    className="absolute left-0 bg-black/50"
                    style={{
                      top: `${cropArea.y}px`,
                      width: `${cropArea.x}px`,
                      height: `${cropArea.height}px`
                    }}
                  />
                  {/* Right */}
                  <div
                    className="absolute right-0 bg-black/50"
                    style={{
                      top: `${cropArea.y}px`,
                      left: `${cropArea.x + cropArea.width}px`,
                      height: `${cropArea.height}px`,
                      width: `${imageSize.width - cropArea.x - cropArea.width}px`
                    }}
                  />
                </div>
              </div>
            </Card>
          </div>
          
          {/* Action Buttons */}
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={onClose}>
              <X className="w-4 h-4 mr-1" />
              Cancel
            </Button>
            <Button onClick={handleCrop}>
              <Check className="w-4 h-4 mr-1" />
              Apply Crop
            </Button>
          </div>
        </div>
        
        {/* Hidden canvas for cropping */}
        <canvas ref={canvasRef} className="hidden" />
      </DialogContent>
    </Dialog>
  );
};

export default ImageCropper;
