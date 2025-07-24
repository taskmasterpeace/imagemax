"use client";

import React, { useState, useRef, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { PenLine, Copy, Trash, Square, Eye, Image as ImageIcon, XCircle } from "lucide-react";
import { toast } from "@/components/ui/use-toast";

interface BoundingBox {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  text: string;
}

type DragMode = 'none' | 'move' | 'resize-nw' | 'resize-ne' | 'resize-sw' | 'resize-se';

const colors = [
  "#FF5733", // Coral
  "#33A1FD", // Blue
  "#4CAF50", // Green
  "#9C27B0", // Purple
  "#FF9800", // Orange
  "#E91E63", // Pink
  "#00BCD4", // Cyan
  "#8BC34A", // Light Green
  "#FFC107", // Amber
  "#795548", // Brown
];

const LayoutPlanner: React.FC = () => {
  const [aspectRatio, setAspectRatio] = useState<"16:9" | "9:16" | "1:1">("16:9");
  const [boxes, setBoxes] = useState<BoundingBox[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [currentBox, setCurrentBox] = useState<Partial<BoundingBox> | null>(null);
  const [selectedBox, setSelectedBox] = useState<string | null>(null);
  const [editingText, setEditingText] = useState<string | null>(null);
  const [dragMode, setDragMode] = useState<DragMode>('none');
  const [dragStartPos, setDragStartPos] = useState({ x: 0, y: 0 });
  const [draggedBox, setDraggedBox] = useState<BoundingBox | null>(null);
  const [overlayImage, setOverlayImage] = useState<string | null>(null);
  const [showOverlay, setShowOverlay] = useState(true);
  
  const canvasRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Generate a random color that hasn't been used recently
  const getNextColor = () => {
    if (boxes.length === 0) return colors[0];
    const recentColors = boxes.slice(-3).map(box => box.color);
    const availableColors = colors.filter(color => !recentColors.includes(color));
    if (availableColors.length === 0) return colors[Math.floor(Math.random() * colors.length)];
    return availableColors[Math.floor(Math.random() * availableColors.length)];
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!canvasRef.current) return;
    
    // If already in drag mode or editing text, don't start drawing
    if (dragMode !== 'none' || editingText) return;
    
    // If clicking on a selected box, don't start drawing
    if (selectedBox) {
      // Handled by the box's own mouse handlers
      return;
    }

    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    setIsDrawing(true);
    setStartPos({ x, y });
    
    const newBox: Partial<BoundingBox> = {
      id: Date.now().toString(),
      x,
      y,
      width: 0,
      height: 0,
      color: getNextColor(),
      text: '',
    };
    
    setCurrentBox(newBox);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Handle drawing a new box
    if (isDrawing && currentBox) {
      setCurrentBox({
        ...currentBox,
        width: x - startPos.x,
        height: y - startPos.y,
      });
      return;
    }
    
    // Handle dragging or resizing an existing box
    if (dragMode !== 'none' && draggedBox) {
      const dx = x - dragStartPos.x;
      const dy = y - dragStartPos.y;
      
      let updatedBox = { ...draggedBox };
      
      switch (dragMode) {
        case 'move':
          updatedBox.x = draggedBox.x + dx;
          updatedBox.y = draggedBox.y + dy;
          break;
          
        case 'resize-nw':
          updatedBox.x = draggedBox.x + dx;
          updatedBox.y = draggedBox.y + dy;
          updatedBox.width = draggedBox.width - dx;
          updatedBox.height = draggedBox.height - dy;
          break;
          
        case 'resize-ne':
          updatedBox.y = draggedBox.y + dy;
          updatedBox.width = draggedBox.width + dx;
          updatedBox.height = draggedBox.height - dy;
          break;
          
        case 'resize-sw':
          updatedBox.x = draggedBox.x + dx;
          updatedBox.width = draggedBox.width - dx;
          updatedBox.height = draggedBox.height + dy;
          break;
          
        case 'resize-se':
          updatedBox.width = draggedBox.width + dx;
          updatedBox.height = draggedBox.height + dy;
          break;
      }
      
      // Ensure width and height remain positive by flipping if necessary
      if (updatedBox.width < 0) {
        updatedBox.x = updatedBox.x + updatedBox.width;
        updatedBox.width = Math.abs(updatedBox.width);
      }
      
      if (updatedBox.height < 0) {
        updatedBox.y = updatedBox.y + updatedBox.height;
        updatedBox.height = Math.abs(updatedBox.height);
      }
      
      setDraggedBox(updatedBox);
      
      // Update the box in the main state
      setBoxes(boxes.map(box => 
        box.id === updatedBox.id ? updatedBox : box
      ));
      
      setDragStartPos({ x, y });
    }
  };

  const handleMouseUp = () => {
    // Handle finishing drawing a new box
    if (isDrawing && currentBox) {
      // Only add box if it has some size
      if (Math.abs((currentBox.width || 0)) > 5 && Math.abs((currentBox.height || 0)) > 5) {
        // Convert negative dimensions to positive with adjusted position
        let finalBox: BoundingBox = {
          id: currentBox.id || Date.now().toString(),
          x: (currentBox.width || 0) < 0 ? startPos.x + (currentBox.width || 0) : startPos.x,
          y: (currentBox.height || 0) < 0 ? startPos.y + (currentBox.height || 0) : startPos.y,
          width: Math.abs(currentBox.width || 0),
          height: Math.abs(currentBox.height || 0),
          color: currentBox.color || getNextColor(),
          text: '',
        };
        
        setBoxes([...boxes, finalBox]);
        setSelectedBox(finalBox.id);
        
        // Immediately enable text editing for the new box
        setTimeout(() => {
          setEditingText(finalBox.id);
          if (inputRef.current) {
            inputRef.current.focus();
          }
        }, 10);
      }
      
      setIsDrawing(false);
      setCurrentBox(null);
    }
    
    // Reset drag mode when mouse is released
    if (dragMode !== 'none') {
      setDragMode('none');
      setDraggedBox(null);
    }
  };

  const handleBoxClick = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setSelectedBox(id);
  };

  const handleBoxDoubleClick = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setSelectedBox(id);
    setEditingText(id);
    
    // Force focus on the input after a short delay
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }, 10);
  };
  
  const startDrag = (e: React.MouseEvent, box: BoundingBox, mode: DragMode) => {
    e.stopPropagation();
    
    if (!canvasRef.current) return;
    
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    setDragMode(mode);
    setDragStartPos({ x, y });
    setDraggedBox(box);
    setSelectedBox(box.id);
  };

  const updateBoxText = (id: string, text: string) => {
    setBoxes(boxes.map(box => 
      box.id === id ? { ...box, text } : box
    ));
  };

  const deleteBox = (id: string) => {
    setBoxes(boxes.filter(box => box.id !== id));
    setSelectedBox(null);
  };

  const copyToClipboard = async () => {
  if (!canvasRef.current) return;

  const CANVAS_W = 800;
  const CANVAS_H =
    aspectRatio === "16:9" ? 450 :
    aspectRatio === "9:16" ? 1422 : 800;

  const canvas = document.createElement("canvas");
  canvas.width = CANVAS_W;
  canvas.height = CANVAS_H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  // white background
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

  // overlay image
  if (overlayImage && showOverlay) {
    try {
      const img = await new Promise<HTMLImageElement>((res, rej) => {
        const im = document.createElement("img");
        im.crossOrigin = "anonymous";
        im.onload = () => res(im);
        im.onerror = rej;
        im.src = overlayImage;
      });
      ctx.drawImage(img, 0, 0, CANVAS_W, CANVAS_H);
    } catch {/* ignore load errors */}
  }

  // scale factors
  const sx = CANVAS_W / canvasRef.current.offsetWidth;
  const sy = CANVAS_H / canvasRef.current.offsetHeight;

  // boxes + text
  boxes.forEach(box => {
    ctx.strokeStyle = box.color;
    ctx.lineWidth = 2;
    ctx.strokeRect(box.x * sx, box.y * sy, box.width * sx, box.height * sy);
    ctx.fillStyle = box.color + "33";
    ctx.fillRect(box.x * sx, box.y * sy, box.width * sx, box.height * sy);
    if (box.text) {
      ctx.font = "16px Arial";
      ctx.fillStyle = "#000";
      ctx.fillText(box.text, (box.x + 5) * sx, (box.y + 20) * sy);
    }
  });

  // footer text
  ctx.font = "20px Arial";
  ctx.fillStyle = "#000";
  ctx.textAlign = "center";
  ctx.fillText("Machine King Labs, LLC", CANVAS_W / 2, CANVAS_H - 10);

  const blob = await new Promise<Blob>(r =>
    canvas.toBlob(b => r(b as Blob), "image/png")
  );
  await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);

  toast({ title: "Layout Copied", description: "Copied to clipboard" });
};

const clearCanvas = () => {
    setBoxes([]);
    setSelectedBox(null);
  };

  // Prevent canvas drawing when editing text
  const handleCanvasClick = () => {
    if (!editingText) setSelectedBox(null);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    const file = files[0];
    const reader = new FileReader();
    
    reader.onload = (event) => {
      if (event.target?.result) {
        setOverlayImage(event.target.result as string);
        setShowOverlay(true);
      }
    };
    
    reader.readAsDataURL(file);
  };
  
  const triggerImageUpload = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };
  
  const removeOverlayImage = () => {
    setOverlayImage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-4">
      <Card className="mx-0 sm:mx-auto">
        <CardHeader className="py-3 px-3 sm:px-6">
          <div className="space-y-3">
            <CardTitle className="flex items-center gap-2">
              <PenLine className="w-5 h-5" />
              Layout Planner
            </CardTitle>
            
            {/* Mobile-friendly controls */}
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
              {/* Aspect Ratio Controls */}
              <div className="flex gap-2">
                <Button
                  variant={aspectRatio === '16:9' ? 'default' : 'outline'}
                  onClick={() => setAspectRatio('16:9')}
                  className="text-xs h-9 min-w-[44px]"
                  size="sm"
                >
                  16:9
                </Button>
                <Button
                  variant={aspectRatio === '9:16' ? 'default' : 'outline'}
                  onClick={() => setAspectRatio('9:16')}
                  className="text-xs h-9 min-w-[44px]"
                  size="sm"
                >
                  9:16
                </Button>
                <Button
                  variant={aspectRatio === '1:1' ? 'default' : 'outline'}
                  onClick={() => setAspectRatio('1:1')}
                  className="text-xs h-9 min-w-[44px]"
                  size="sm"
                >
                  1:1
                </Button>
              </div>
              
              {/* Action Buttons */}
              <div className="flex gap-2 flex-wrap">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={copyToClipboard}
                  className="flex items-center gap-1 h-9 min-w-[44px]"
                >
                  <Copy className="w-4 h-4" />
                  <span className="hidden sm:inline">Copy</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearCanvas}
                  className="flex items-center gap-1 h-9 min-w-[44px]"
                >
                  <Trash className="w-4 h-4" />
                  <span className="hidden sm:inline">Clear</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={triggerImageUpload}
                  className="flex items-center gap-1 h-9 min-w-[44px]"
                >
                  <ImageIcon className="w-4 h-4" />
                  <span className="hidden sm:inline">Add</span>
                </Button>
                
                {/* Overlay Image Controls */}
                {overlayImage && (
                  <>
                    <Button
                      variant={showOverlay ? "default" : "outline"}
                      size="sm"
                      onClick={() => setShowOverlay(!showOverlay)}
                      className="flex items-center gap-1 h-9 min-w-[44px]"
                    >
                      <Eye className="w-4 h-4" />
                      <span className="hidden sm:inline">{showOverlay ? "Hide" : "Show"}</span>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={removeOverlayImage}
                      className="flex items-center gap-1 h-9 min-w-[44px] text-red-500"
                    >
                      <XCircle className="w-4 h-4" />
                      <span className="hidden sm:inline">Remove</span>
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="py-3 px-3 sm:px-6">
          <div className="space-y-3">
            {/* Hidden file input for image upload */}
            <input 
              type="file" 
              ref={fileInputRef}
              accept="image/*" 
              className="hidden" 
              onChange={handleImageUpload} 
            />
            <div className="bg-slate-100 border rounded-lg relative mx-auto w-full sm:max-w-2xl">
              {/* Canvas area */}
              <div
                ref={canvasRef}
                className={`relative border border-gray-300 mx-auto w-full ${
                  aspectRatio === "16:9" 
                    ? "max-w-none sm:max-w-lg" 
                    : aspectRatio === "9:16" 
                    ? "max-w-xs sm:max-w-xs" 
                    : "max-w-sm sm:max-w-md"
                }`}
                style={{
                  aspectRatio: aspectRatio === "16:9" ? '16/9' : aspectRatio === "9:16" ? '9/16' : '1/1'
                }}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onClick={handleCanvasClick}
              >
                {/* Background overlay image if available */}
                {overlayImage && showOverlay && (
                  <img
                    src={overlayImage}
                    alt="Overlay"
                    className="absolute top-0 left-0 w-full h-full object-contain pointer-events-none z-0"
                  />
                )}
                
                {/* Draw existing boxes */}
                {boxes.map((box) => (
                  <div
                    key={box.id}
                    className={`absolute border-2 ${selectedBox === box.id ? 'ring-2 ring-blue-500' : ''}`}
                    style={{
                      left: `${box.x}px`,
                      top: `${box.y}px`,
                      width: `${box.width}px`,
                      height: `${box.height}px`,
                      borderColor: box.color,
                      backgroundColor: box.color + '33', // Add transparency
                      cursor: selectedBox === box.id ? 'move' : 'pointer',
                    }}
                    onClick={(e) => handleBoxClick(e, box.id)}
                    onDoubleClick={(e) => handleBoxDoubleClick(e, box.id)}
                    onMouseDown={(e) => startDrag(e, box, 'move')}
                  >
                    {/* Always show text with a bg so it's readable */}
                    <div 
                      className="absolute top-0 left-0 right-0 bg-white/70 px-1 py-0.5 text-sm font-medium text-black truncate z-10"
                      onClick={(e) => e.stopPropagation()}
                      onDoubleClick={(e) => {
                        e.stopPropagation();
                        handleBoxDoubleClick(e, box.id);
                      }}
                    >
                      {box.text || 'Double-click to add text'}
                    </div>

                    {/* Show edit controls when selected */}
                    {selectedBox === box.id && (
                      <>
                        {/* Text editing controls */}
                        <div className="absolute -top-10 left-0 right-0 flex bg-white shadow-md rounded-md p-1 z-20">
                          <Input
                            ref={editingText === box.id ? inputRef : undefined}
                            type="text"
                            value={box.text}
                            onChange={(e) => updateBoxText(box.id, e.target.value)}
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingText(box.id);
                            }}
                            onBlur={() => setEditingText(null)}
                            autoFocus={editingText === box.id}
                            className="h-7 text-sm"
                            placeholder="Enter box name"
                          />
                          <Button
                            variant="destructive"
                            size="sm"
                            className="h-7 w-7 p-0 ml-1 flex-shrink-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteBox(box.id);
                            }}
                          >
                            <Trash className="w-3 h-3" />
                          </Button>
                        </div>
                        
                        {/* Resize handles - Larger for mobile touch */}
                        <div 
                          className="absolute w-6 h-6 sm:w-4 sm:h-4 bg-white border-2 border-gray-400 rounded-full -left-3 sm:-left-2 -top-3 sm:-top-2 cursor-nw-resize z-10 touch-manipulation"
                          onMouseDown={(e) => startDrag(e, box, 'resize-nw')}
                          onTouchStart={(e) => startDrag(e as any, box, 'resize-nw')}
                        />
                        <div 
                          className="absolute w-6 h-6 sm:w-4 sm:h-4 bg-white border-2 border-gray-400 rounded-full -right-3 sm:-right-2 -top-3 sm:-top-2 cursor-ne-resize z-10 touch-manipulation"
                          onMouseDown={(e) => startDrag(e, box, 'resize-ne')}
                          onTouchStart={(e) => startDrag(e as any, box, 'resize-ne')}
                        />
                        <div 
                          className="absolute w-6 h-6 sm:w-4 sm:h-4 bg-white border-2 border-gray-400 rounded-full -left-3 sm:-left-2 -bottom-3 sm:-bottom-2 cursor-sw-resize z-10 touch-manipulation"
                          onMouseDown={(e) => startDrag(e, box, 'resize-sw')}
                          onTouchStart={(e) => startDrag(e as any, box, 'resize-sw')}
                        />
                        <div 
                          className="absolute w-6 h-6 sm:w-4 sm:h-4 bg-white border-2 border-gray-400 rounded-full -right-3 sm:-right-2 -bottom-3 sm:-bottom-2 cursor-se-resize z-10 touch-manipulation"
                          onMouseDown={(e) => startDrag(e, box, 'resize-se')}
                          onTouchStart={(e) => startDrag(e as any, box, 'resize-se')}
                        />
                      </>
                    )}
                  </div>
                ))}
                
                {/* Draw the box being created */}
                {isDrawing && currentBox && (
                  <div
                    className="absolute border-2"
                    style={{
                      left: `${currentBox.width! < 0 ? startPos.x + currentBox.width! : startPos.x}px`,
                      top: `${currentBox.height! < 0 ? startPos.y + currentBox.height! : startPos.y}px`,
                      width: `${Math.abs(currentBox.width!)}px`,
                      height: `${Math.abs(currentBox.height!)}px`,
                      borderColor: currentBox.color,
                      backgroundColor: currentBox.color + '33', // Add transparency
                    }}
                  />
                )}
              </div>
            </div>
            
            <div className="text-sm text-slate-500 mx-auto max-w-2xl px-4">
              <p className="font-medium mb-2">Instructions:</p>
              <ul className="list-disc pl-5 space-y-1 text-xs sm:text-sm">
                <li>Click and drag to draw boxes</li>
                <li>Click on a box to select it</li>
                <li>Drag selected boxes to move them</li>
                <li>Use corner handles to resize boxes</li>
                <li>Double-click inside a box to edit its name</li>
                <li>Click "Copy" to copy layout to clipboard</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default LayoutPlanner;
