import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

import {
  CheckCircle2,
  Clock,
  Copy,
  Download,
  Search,
  Sparkles,
  Tag,
  Trash2,
  Upload,
  X,
  Clipboard,
} from "lucide-react";
import { GEN4_RESOLUTIONS } from "@/static/data";
import { Gen4Props, Gen4Settings, Generation, ImageReference } from "@/types";
import ReferenceLibraryBrowser from "@/app/components/ReferenceLibraryBrowser";
import { saveImageToLibrary, referenceLibraryDB, LibraryImageReference } from "@/lib/referenceLibrary";

function Gen4({
  gen4Generations,
  gen4Processing,
  openFullscreenImage,
  downloadFile,
  copyToClipboard,
  removeImage,
  removeGeneration,
  gen4FileInputRef,
  handleFileUpload,
  handleDrop,
  handleDragOver,
  gen4ReferenceImages,
  gen4Prompt,
  setGen4Prompt,
  generateGen4,
  activeTab,
  removeTagFromGen4Image,
  addTagToGen4Image,
  gen4Settings,
  setGen4Settings,
  replaceReferenceWithGen,
  sendGenerationToWorkspace,
  saveToLibrary,
}: Gen4Props) {

  const handleSaveToLibrary = async (generation: Generation) => {
    console.log('🔄 handleSaveToLibrary called with:', generation);
    
    if (!generation.outputUrl) {
      console.log('❌ No outputUrl found:', generation.outputUrl);
      return;
    }
    
    console.log('✅ Starting save process...');
    console.log('📝 Prompt:', gen4Prompt);
    console.log('⚙️ Settings:', gen4Settings);
    
    try {
      console.log('🗄️ Calling saveImageToLibrary...');
      const result = await saveImageToLibrary(
        generation.outputUrl,
        [], // Start with no tags, user can add them in the library
        gen4Prompt,
        'generated',
        gen4Settings
      );
      
      console.log('✅ Saved to library successfully! ID:', result);
      
      // Trigger a refresh of the library component
      window.dispatchEvent(new CustomEvent('libraryUpdated'));
      
    } catch (error) {
      console.error('❌ Error saving to library:', error);
      console.error('Error details:', error instanceof Error ? error.message : 'Unknown error', error instanceof Error ? error.stack : '');
    }
  };

  const handleSwapReference = async (libraryReferenceId: string, targetIndex: number) => {
    try {
      const libraryRef = await referenceLibraryDB.getReference(libraryReferenceId);
      if (!libraryRef) return;
      
      // Convert base64 to blob and then to File for Gen4ReferenceImage compatibility
      const response = await fetch(libraryRef.imageData);
      const blob = await response.blob();
      const file = new File([blob], `library-ref-${libraryRef.id}.png`, { type: 'image/png' });
      
      // Convert library reference to Gen4ReferenceImage format
      const newReference = {
        id: `swapped_${Date.now()}`,
        file: file,
        preview: libraryRef.imageData,
        tags: libraryRef.tags
      };
      
      // Call the existing replaceReferenceWithGen function with tags
      replaceReferenceWithGen?.(libraryRef.imageData, targetIndex, libraryRef.tags);
      
    } catch (error) {
      console.error('Error swapping reference:', error);
    }
  };
  
  return (
    <div
      className={`space-y-6 ${
        activeTab === "gen4" ? "" : "hidden"
      }`}
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5" />
                Gen 4 Image Generation
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Reference Images Upload */}
              <div>
                <Label className="text-base font-medium mb-3 block">
                  Reference Images
                </Label>
                <div
                  className="border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg p-6 text-center hover:border-purple-400 transition-colors cursor-pointer"
                  onDrop={(e) => {
                    if (e.target === e.currentTarget) handleDrop(e, true);
                  }}
                  onDragOver={(e) => {
                    if (e.target === e.currentTarget) handleDragOver(e);
                  }}
                  onClick={(e) => {
                    if (e.target === e.currentTarget) gen4FileInputRef.current?.click();
                  }}
                  onPaste={(e) => {
                    if (e.target === e.currentTarget && e.clipboardData && e.clipboardData.files.length > 0) {
                      handleFileUpload(e.clipboardData.files, true);
                    }
                  }}
                >
                <Upload className="w-8 h-8 mx-auto mb-2 text-slate-400" />
                <p className="font-medium mb-1">
                  <span className="font-bold text-purple-600">Paste (Ctrl+V)</span>, drop, or click to add reference images
                </p>
                <p className="text-sm text-slate-500">
                  You can paste screenshots or images copied to your clipboard, drag and drop, or click to select files. Up to 3 images for style reference.
                </p>
                <Button 
                  variant="secondary" 
                  className="mt-4 flex items-center gap-2"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigator.clipboard.read().then(items => {
                      for (const item of items) {
                        for (const type of item.types) {
                          if (type.startsWith('image/')) {
                            item.getType(type).then(blob => {
                              const files = new DataTransfer();
                              files.items.add(new File([blob], `pasted-image-${Date.now()}.${type.split('/')[1]}`, { type }));
                              handleFileUpload(files.files, true);
                            });
                          }
                        }
                      }
                    }).catch(err => {
                      console.error("Error accessing clipboard:", err);
                      alert("Unable to access clipboard. Please check permissions or try using Ctrl+V instead.");
                    });
                  }}
                >
                  <Clipboard className="w-4 h-4" />
                  Paste from Clipboard
                </Button>
              </div>
              <input
                ref={gen4FileInputRef}
                type="file"
                multiple
                accept="image/*"
                className="hidden"
                onChange={(e) => handleFileUpload(e.target.files, true)}
              />
            </div>

            {/* Reference Images Display */}
            {gen4ReferenceImages.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {gen4ReferenceImages.map((image, index) => (
                  <div
                    key={image.id}
                    className="relative group border rounded-lg overflow-hidden transition-colors"
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.currentTarget.classList.add('border-purple-400', 'bg-purple-50');
                    }}
                    onDragLeave={(e) => {
                      e.currentTarget.classList.remove('border-purple-400', 'bg-purple-50');
                    }}
                    onDrop={async (e) => {
                      e.preventDefault();
                      e.currentTarget.classList.remove('border-purple-400', 'bg-purple-50');
                      
                      try {
                        const data = JSON.parse(e.dataTransfer.getData('application/json'));
                        if (data.type === 'library-reference') {
                          await handleSwapReference(data.referenceId, index);
                        }
                      } catch (error) {
                        console.error('Error handling drop:', error);
                      }
                    }}
                  >
                    <div className="relative">
                      <img
                        src={
                          image.preview
                            ? image.preview.startsWith("data:") || image.preview.startsWith("blob:")
                              ? image.preview
                              : `data:image/png;base64,${image.preview}`
                            : "/placeholder.svg"
                        }
                        alt={`Reference ${index + 1}`}
                        className="w-full h-auto object-contain"
                      />
                      <div className="absolute top-2 left-2 opacity-100 group-hover:opacity-0 transition-opacity">
                        <Badge variant="secondary">
                          {index === 0 ? "1st" : index === 1 ? "2nd" : "3rd"}{" "}
                          Reference
                        </Badge>
                      </div>
                      <Button
                        size="sm"
                        variant="destructive"
                        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => removeImage(image.id, true)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() =>
                          openFullscreenImage(
                            image.preview || "/placeholder.svg",
                            "gen4"
                          )
                        }
                      >
                        <Search className="w-4 h-4" />
                      </Button>
                    </div>
                    <div className="p-3">
                      <div className="flex flex-wrap gap-1 mb-2">
                        {image.tags.map((tag, tagIndex) => (
                          <Badge
                            key={tagIndex}
                            variant="outline"
                            className="text-xs cursor-pointer hover:bg-red-100"
                            onClick={() =>
                              removeTagFromGen4Image(image.id, tag)
                            }
                          >
                            {tag} <X className="w-3 h-3 ml-1" />
                          </Badge>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <Input
                          placeholder="Add tag..."
                          className="text-sm"
                          onKeyPress={(e) => {
                            if (e.key === "Enter") {
                              addTagToGen4Image(
                                image.id,
                                e.currentTarget.value
                              );
                              e.currentTarget.value = "";
                            }
                          }}
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            const input = e.currentTarget
                              .previousElementSibling as HTMLInputElement;
                            addTagToGen4Image(image.id, input.value);
                            input.value = "";
                          }}
                        >
                          <Tag className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Generation Prompt */}
            <div>
              <Label
                htmlFor="gen4-prompt"
                className="text-base font-medium mb-3 block"
              >
                Generation Prompt
              </Label>
              <Textarea
                id="gen4-prompt"
                placeholder="Describe the image you want to generate..."
                value={gen4Prompt}
                onChange={(e) => setGen4Prompt(e.target.value)}
                onKeyDown={(e) => {
                  if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
                    e.preventDefault();
                    generateGen4();
                  }
                }}
                rows={4}
              />
            </div>

            {/* Generation Settings */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label className="text-sm font-medium mb-2 block">
                  Aspect Ratio
                </Label>
                <Select
                  value={gen4Settings.aspectRatio}
                  onValueChange={(value) =>
                    setGen4Settings((prev) => ({
                      ...prev,
                      aspectRatio: value,
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1:1">Square (1:1)</SelectItem>
                    <SelectItem value="16:9">Landscape (16:9)</SelectItem>
                    <SelectItem value="9:16">Portrait (9:16)</SelectItem>
                    <SelectItem value="4:3">Standard (4:3)</SelectItem>
                    <SelectItem value="3:4">Portrait (3:4)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-sm font-medium mb-2 block">
                  Resolution
                </Label>
                <Select
                  value={gen4Settings.resolution}
                  onValueChange={(value) =>
                    setGen4Settings((prev) => ({
                      ...prev,
                      resolution: value,
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {GEN4_RESOLUTIONS.map((aspectRatio) => (
                      <SelectItem
                        defaultValue={aspectRatio.value}
                        key={aspectRatio.value}
                        value={aspectRatio.value}
                      >
                        {aspectRatio.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-sm font-medium mb-2 block">
                  Seed (Optional)
                </Label>
                <Input
                  type="number"
                  placeholder="Random"
                  value={gen4Settings.seed || ""}
                  onChange={(e) =>
                    setGen4Settings((prev) => ({
                      ...prev,
                      seed: e.target.value
                        ? Number.parseInt(e.target.value)
                        : undefined,
                    }))
                  }
                />
              </div>
            </div>

            {/* Generate Button */}
            <Button
              onClick={generateGen4}
              disabled={
                !gen4Prompt.trim() ||
                gen4ReferenceImages.length === 0
              }
              className="w-full flex items-center gap-2"
              size="lg"
            >
              <div className="relative flex items-center justify-center w-full gap-2">
                {gen4Processing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
                    <span className="text-sm">Generating...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Generate with Gen 4</span>
                  </>
                )}
              </div>
            </Button>
          </CardContent>
        </Card>

        {/* Gen 4 Results */}
        <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
                Generated Images
              </CardTitle>
              <Badge variant="outline" className="text-xs">
                {gen4Generations.length} results
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="relative">
            {gen4Processing && (
              <div className="fixed top-4 right-4 flex items-center gap-2 bg-white/90 backdrop-blur-sm rounded-lg shadow-lg p-3 z-50 pointer-events-none">
                <div className="w-5 h-5 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
                <span className="text-sm text-gray-700">Generating...</span>
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {gen4Generations.length > 0 ? (
                gen4Generations.map((generation, index) => (
                  <div key={generation.id} className="group relative">
                    <div className="relative overflow-hidden rounded-lg border bg-white">
                      <img
                        src={
                          generation.outputUrl
                            ? generation.outputUrl
                            : "/placeholder.svg?height=512&width=512"
                        }
                        alt="Generated image"
                        className="w-full h-auto object-contain transition-transform group-hover:scale-105"
                      />

                      {/* Tag display/edit */}
                      <div 
                        className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs px-2 py-1 flex items-center gap-2 z-20"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {generation.tags?.length ? (
                          <div 
                            className="flex items-center gap-1 cursor-pointer hover:bg-black/40 px-2 py-1 rounded"
                            onClick={() => {
                              const input = document.getElementById(`tag-input-${generation.id}`);
                              if (input) {
                                input.style.display = 'block';
                                input.focus();
                              }
                            }}
                          >
                            <Tag className="w-3 h-3" />
                            <span>{generation.tags[0]}</span>
                          </div>
                        ) : (
                          <div 
                            className="flex items-center gap-1 cursor-pointer hover:bg-black/40 px-2 py-1 rounded text-white/50"
                            onClick={() => {
                              const input = document.getElementById(`tag-input-${generation.id}`);
                              if (input) {
                                input.style.display = 'block';
                                input.focus();
                              }
                            }}
                          >
                            <Tag className="w-3 h-3" />
                            <span>Add tag...</span>
                          </div>
                        )}
                        <Input
                          id={`tag-input-${generation.id}`}
                          type="text"
                          placeholder="Add tag..."
                          className="h-6 text-xs bg-transparent border-none focus:ring-0 text-white placeholder:text-white/50 w-full pointer-events-auto hidden"
                          defaultValue={generation.tags?.[0] || ''}
                          onKeyDown={(e) => {
                            e.stopPropagation();
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              const value = e.currentTarget.value.trim();
                              if (value) {
                                if (generation.tags?.length) {
                                  removeTagFromGen4Image(generation.id, generation.tags[0]);
                                }
                                addTagToGen4Image(generation.id, value);
                                e.currentTarget.style.display = 'none';
                              }
                            } else if (e.key === 'Escape') {
                              e.preventDefault();
                              e.currentTarget.style.display = 'none';
                            }
                          }}
                          onBlur={(e) => {
                            const value = e.target.value.trim();
                            if (value) {
                              if (generation.tags?.length) {
                                removeTagFromGen4Image(generation.id, generation.tags[0]);
                              }
                              addTagToGen4Image(generation.id, value);
                            }
                            e.target.style.display = 'none';
                          }}
                        />
                      </div>

                      {/* Overlay Actions */}
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors">
                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <div className="flex gap-1 mb-1">
                            <Button size="sm" variant="secondary" className="h-8 w-8 p-0" onClick={() => replaceReferenceWithGen(generation.outputUrl || '', 0)} title="Set as Ref 1">
                              1
                            </Button>
                            <Button size="sm" variant="secondary" className="h-8 w-8 p-0" onClick={() => replaceReferenceWithGen(generation.outputUrl || '', 1)} title="Set as Ref 2">
                              2
                            </Button>
                            <Button size="sm" variant="secondary" className="h-8 w-8 p-0" onClick={() => replaceReferenceWithGen(generation.outputUrl || '', 2)} title="Set as Ref 3">
                              3
                            </Button>
                            <Button size="sm" variant="secondary" className="h-8 w-8 p-0" onClick={() => sendGenerationToWorkspace(generation.outputUrl || '')} title="To Workspace">
                              <Upload className="w-3 h-3" />
                            </Button>
                            <Button 
                              size="sm" 
                              variant="secondary" 
                              className="h-8 w-8 p-0" 
                              onClick={(e) => {
                                e.stopPropagation();
                                e.preventDefault();
                                if (generation.outputUrl) {
                                  handleSaveToLibrary(generation);
                                }
                              }} 
                              disabled={!generation.outputUrl || generation.status !== 'completed'}
                              title="Save to Library"
                            >
                              <Tag className="w-3 h-3" />
                            </Button>
                          </div>
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="secondary"
                              className="h-8 w-8 p-0"
                              onClick={() =>
                                openFullscreenImage(
                                  generation?.outputUrl || "",
                                  "gen4"
                                )
                              }
                            >
                              <Search className="w-3 h-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              className="h-8 w-8 p-0"
                              onClick={(e) => {
                                e.stopPropagation();
                                e.preventDefault();
                                removeGeneration(generation.id);
                              }}
                              title="Delete Generated Image"
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Image Info */}
                    <div className="mt-2 space-y-2">
                      {/* Prompt Display */}
                      {generation.prompt && (
                        <div className="text-xs text-gray-700 bg-gray-50 p-2 rounded border">
                          <div className="font-medium text-gray-500 mb-1">Prompt:</div>
                          <div className="line-clamp-2" title={generation.prompt}>
                            {generation.prompt}
                          </div>
                        </div>
                      )}
                      
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(generation.timestamp).toLocaleString()}
                        </span>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex gap-1">
                        {generation?.outputUrl && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1 h-8 text-xs bg-transparent"
                            onClick={() => {
                              const timestamp = new Date(generation.timestamp)
                                .toISOString()
                                .replace(/[:.]/g, "-");
                              const filename = `gen4-${timestamp}-${generation.id.slice(
                                0,
                                8
                              )}.png`;
                              downloadFile(
                                generation?.outputUrl || "",
                                filename
                              );
                            }}
                          >
                            <Download className="w-3 h-3 mr-1" />
                            Download
                          </Button>
                        )}
                        {generation?.outputUrl && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 w-8 p-0 bg-transparent"
                            onClick={() =>
                              copyToClipboard(generation?.outputUrl || "")
                            }
                          >
                            <Copy className="w-3 h-3" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex items-center justify-center py-12 space-y-4">
                  <p>No generations found.</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
        </div>
      </div>
        
      {/* Reference Library Sidebar */}
      <div className="col-span-1">
        <ReferenceLibraryBrowser
          inline={true}
          showSwapButtons={true}
          currentReferenceImages={gen4ReferenceImages}
          onSwapReference={handleSwapReference}
        />
      </div>
      </div>
    </div>
  );
}

export default Gen4;
