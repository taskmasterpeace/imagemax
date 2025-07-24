"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Check, X, RotateCcw } from 'lucide-react';

interface SimpleImageCropperProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  onCropComplete: (croppedImageData: string) => void;
}

const SimpleImageCropper: React.FC<SimpleImageCropperProps> = ({
  isOpen,
  onClose,
  imageUrl,
  onCropComplete
}) => {
  // Image and container references
  const imageRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // State for crop functionality
  const [aspectRatio, setAspectRatio] = useState<'free' | '1:1' | '16:9' | '9:16'>('free');
  const [cropBox, setCropBox] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [startPoint, setStartPoint] = useState({ x: 0, y: 0 });
  const [startCropBox, setStartCropBox] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const [imgLoaded, setImgLoaded] = useState(false);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  
  // Initialize crop box when image loads
  const initializeCropBox = () => {
    if (!imageRef.current || !containerRef.current) return;
    
    const container = containerRef.current;
    const containerRect = container.getBoundingClientRect();
    const img = imageRef.current;
    
    setContainerSize({
      width: containerRect.width,
      height: containerRect.height
    });
    
    // Set initial crop area to 75% of image size, centered
    const cropWidth = img.clientWidth * 0.75;
    const cropHeight = img.clientHeight * 0.75;
    
    setCropBox({
      x: (img.clientWidth - cropWidth) / 2,
      y: (img.clientHeight - cropHeight) / 2,
      width: cropWidth,
      height: cropHeight
    });
  };
  
  // Image load handler
  const handleImageLoad = () => {
    setImgLoaded(true);
    initializeCropBox();
  };
  
  // Initialize when modal opens and image loads
  useEffect(() => {
    if (!isOpen) return;
    
    // Wait for image to load, then initialize crop box
    const img = imageRef.current;
    if (img) {
      if (img.complete) {
        setImgLoaded(true);
        initializeCropBox();
      } else {
        const onLoad = () => {
          setImgLoaded(true);
          initializeCropBox();
          img.removeEventListener('load', onLoad);
        };
        img.addEventListener('load', onLoad);
        return () => img.removeEventListener('load', onLoad);
      }
    }
  }, [isOpen]);
  
  // Apply selected aspect ratio to crop box
  const applyAspectRatio = (newRatio: typeof aspectRatio) => {
    setAspectRatio(newRatio);
    
    if (!imgLoaded || !imageRef.current) return;
    
    const img = imageRef.current;
    const currentBox = { ...cropBox };
    
    if (newRatio === 'free') return;
    
    let newHeight = currentBox.height;
    
    // Calculate new height based on aspect ratio
    switch (newRatio) {
      case '1:1':
        newHeight = currentBox.width;
        break;
      case '16:9':
        newHeight = currentBox.width * (9/16);
        break;
      case '9:16':
        newHeight = currentBox.width * (16/9);
        break;
    }
    
    // Ensure crop box stays within image bounds
    if (currentBox.y + newHeight > img.clientHeight) {
      newHeight = img.clientHeight - currentBox.y;
      // Adjust width to maintain aspect ratio
      if (newRatio === '1:1') {
        currentBox.width = newHeight;
      } else if (newRatio === '16:9') {
        currentBox.width = newHeight * (16/9);
      } else if (newRatio === '9:16') {
        currentBox.width = newHeight * (9/16);
      }
    }
    
    setCropBox({
      ...currentBox,
      height: newHeight
    });
  };
  
  // Mouse down handler for dragging or resizing
  const handleMouseDown = (e: React.MouseEvent, action: 'move' | 'resize') => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!containerRef.current) return;
    
    const containerRect = containerRef.current.getBoundingClientRect();
    const clientX = e.clientX - containerRect.left;
    const clientY = e.clientY - containerRect.top;
    
    setStartPoint({ x: clientX, y: clientY });
    setStartCropBox({ ...cropBox });
    
    if (action === 'move') {
      setIsDragging(true);
      setIsResizing(false);
    } else {
      setIsResizing(true);
      setIsDragging(false);
    }
  };
  
  // Handle mouse move for drag or resize
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging && !isResizing) return;
    if (!containerRef.current || !imageRef.current) return;
    
    e.preventDefault();
    
    const containerRect = containerRef.current.getBoundingClientRect();
    const img = imageRef.current;
    
    const clientX = e.clientX - containerRect.left;
    const clientY = e.clientY - containerRect.top;
    
    const deltaX = clientX - startPoint.x;
    const deltaY = clientY - startPoint.y;
    
    if (isDragging) {
      // Move crop box, ensuring it stays within image bounds
      let newX = Math.max(0, Math.min(startCropBox.x + deltaX, img.clientWidth - startCropBox.width));
      let newY = Math.max(0, Math.min(startCropBox.y + deltaY, img.clientHeight - startCropBox.height));
      
      setCropBox({
        ...cropBox,
        x: newX,
        y: newY
      });
    }
    
    if (isResizing) {
      // Resize crop box with minimum dimensions
      let newWidth = Math.max(50, startCropBox.width + deltaX);
      let newHeight = Math.max(50, startCropBox.height + deltaY);
      
      // Enforce aspect ratio if needed
      if (aspectRatio !== 'free') {
        if (aspectRatio === '1:1') {
          // For 1:1, use the smaller dimension
          newWidth = newHeight = Math.min(newWidth, newHeight);
        } else if (aspectRatio === '16:9') {
          newHeight = newWidth * (9/16);
        } else if (aspectRatio === '9:16') {
          newHeight = newWidth * (16/9);
        }
      }
      
      // Ensure crop box stays within image bounds
      newWidth = Math.min(newWidth, img.clientWidth - startCropBox.x);
      newHeight = Math.min(newHeight, img.clientHeight - startCropBox.y);
      
      setCropBox({
        ...cropBox,
        width: newWidth,
        height: newHeight
      });
    }
  };
  
  // End drag or resize
  const handleMouseUp = () => {
    setIsDragging(false);
    setIsResizing(false);
  };
  
  // Reset crop to default position and size
  const resetCrop = () => {
    if (!imgLoaded || !imageRef.current) return;
    
    const img = imageRef.current;
    
    // Reset to 75% of image size, centered
    const width = img.clientWidth * 0.75;
    const height = img.clientHeight * 0.75;
    
    setCropBox({
      x: (img.clientWidth - width) / 2,
      y: (img.clientHeight - height) / 2,
      width,
      height
    });
    
    setAspectRatio('free');
  };
  
  // Apply crop and generate cropped image data
  const handleCrop = () => {
    if (!imageRef.current || !canvasRef.current) return;
    
    const img = imageRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Get the natural size of the image
    const { naturalWidth, naturalHeight } = img;
    
    // Calculate scale factors between displayed size and natural size
    const scaleX = naturalWidth / img.clientWidth;
    const scaleY = naturalHeight / img.clientHeight;
    
    // Set canvas size to match the cropped area
    canvas.width = cropBox.width * scaleX;
    canvas.height = cropBox.height * scaleY;
    
    // Draw the cropped area to the canvas
    ctx.drawImage(
      img,
      cropBox.x * scaleX,
      cropBox.y * scaleY,
      cropBox.width * scaleX,
      cropBox.height * scaleY,
      0,
      0,
      canvas.width,
      canvas.height
    );
    
    // Convert canvas to data URL and complete the crop
    const croppedData = canvas.toDataURL('image/png');
    onCropComplete(croppedData);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Crop Image
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex flex-col gap-4 max-h-[80vh]">
          {/* Aspect Ratio Buttons */}
          <div className="flex gap-2 justify-center flex-wrap">
            <Button
              variant={aspectRatio === 'free' ? 'default' : 'outline'}
              size="sm"
              onClick={() => applyAspectRatio('free')}
            >
              Free
            </Button>
            <Button
              variant={aspectRatio === '1:1' ? 'default' : 'outline'}
              size="sm"
              onClick={() => applyAspectRatio('1:1')}
            >
              1:1
            </Button>
            <Button
              variant={aspectRatio === '16:9' ? 'default' : 'outline'}
              size="sm"
              onClick={() => applyAspectRatio('16:9')}
            >
              16:9
            </Button>
            <Button
              variant={aspectRatio === '9:16' ? 'default' : 'outline'}
              size="sm"
              onClick={() => applyAspectRatio('9:16')}
            >
              9:16
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={resetCrop}
            >
              <RotateCcw className="w-4 h-4 mr-1" />
              Reset
            </Button>
          </div>
          
          {/* Crop Area Container */}
          <div className="flex-1 overflow-auto">
            <Card className="p-4">
              <div
                ref={containerRef}
                className="relative inline-block max-w-full"
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
              >
                {/* Image to crop */}
                <img
                  ref={imageRef}
                  src={imageUrl}
                  alt="Image to crop"
                  onLoad={handleImageLoad}
                  className="max-w-full max-h-[60vh] object-contain select-none pointer-events-none"
                  style={{ touchAction: 'none' }}
                  draggable={false}
                />
                
                {/* Crop box overlay */}
                {cropBox.width > 0 && cropBox.height > 0 && (
                  <div
                    className="absolute border-2 border-blue-500 bg-blue-500/20 cursor-move"
                    style={{
                      left: `${cropBox.x}px`,
                      top: `${cropBox.y}px`,
                      width: `${cropBox.width}px`,
                      height: `${cropBox.height}px`,
                    }}
                    onMouseDown={(e) => handleMouseDown(e, 'move')}
                    onTouchStart={(e) => {
                      // Touch support for mobile
                      if (e.touches.length !== 1) return;
                      e.preventDefault();
                      const touch = e.touches[0];
                      const targetRect = e.currentTarget.getBoundingClientRect();
                      const fakeEvent = {
                        clientX: touch.clientX,
                        clientY: touch.clientY,
                        preventDefault: () => {},
                        stopPropagation: () => {}
                      } as React.MouseEvent;
                      handleMouseDown(fakeEvent, 'move');
                    }}
                  >
                    {/* Resize handle */}
                    <div
                      className="absolute bottom-0 right-0 w-6 h-6 bg-blue-500 cursor-se-resize"
                      onMouseDown={(e) => handleMouseDown(e, 'resize')}
                      onTouchStart={(e) => {
                        // Touch support for mobile
                        if (e.touches.length !== 1) return;
                        e.preventDefault();
                        const touch = e.touches[0];
                        const fakeEvent = {
                          clientX: touch.clientX,
                          clientY: touch.clientY,
                          preventDefault: () => {},
                          stopPropagation: () => {}
                        } as React.MouseEvent;
                        handleMouseDown(fakeEvent, 'resize');
                      }}
                    />
                  </div>
                )}
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

export default SimpleImageCropper;
