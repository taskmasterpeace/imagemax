"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Library,
  Tag,
  X,
  Trash2,
  RefreshCw,
  Plus,
  Crop,
  Download,
  Upload,
  FileText,
  Copy
} from "lucide-react";
import { 
  referenceLibraryDB, 
  LibraryImageReference, 
  getLibraryTags 
} from "@/lib/referenceLibrary";
import { toast } from "@/hooks/use-toast";
import SimpleImageCropper from './SimpleImageCropper';

interface ReferenceLibraryBrowserProps {
  onSelectReference?: (reference: LibraryImageReference) => void;
  onSwapReference?: (referenceId: string, targetIndex: number) => void;
  showSwapButtons?: boolean;
  currentReferenceImages?: any[];
  inline?: boolean; // New prop for inline display
}

export default function ReferenceLibraryBrowser({
  onSelectReference,
  onSwapReference,
  showSwapButtons = false,
  currentReferenceImages = [],
  inline = false
}: ReferenceLibraryBrowserProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [references, setReferences] = useState<LibraryImageReference[]>([]);
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingTags, setEditingTags] = useState<string | null>(null);
  const [newTag, setNewTag] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filteredTags, setFilteredTags] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'people' | 'places' | 'props' | 'unorganized'>('all');
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [cropImageData, setCropImageData] = useState<{ id: string; imageUrl: string } | null>(null);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importMode, setImportMode] = useState<'merge' | 'overwrite'>('merge');

  const categories = [
    { id: 'people', label: 'People', icon: '👥' },
    { id: 'places', label: 'Places', icon: '🏞️' },
    { id: 'props', label: 'Props', icon: '📦' },
    { id: 'unorganized', label: 'Unorganized', icon: '📂' }
  ];

  const filteredReferences = references.filter(ref => {
    // Handle existing references without category field (migration)
    const refCategory = ref.category || 'unorganized';
    return refCategory === selectedCategory;
  });

  const loadReferences = async () => {
    setLoading(true);
    try {
      const refs = await referenceLibraryDB.getAllReferences();
      setReferences(refs.sort((a: LibraryImageReference, b: LibraryImageReference) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
      
      const tags = await getLibraryTags();
      setAvailableTags(tags);
    } catch (error) {
      console.error('Error loading references:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen || inline) {
      loadReferences();
    }
  }, [isOpen, inline]);

  // Listen for library updates
  useEffect(() => {
    const handleLibraryUpdate = () => {
      console.log('📚 Library update event received, refreshing...');
      loadReferences();
    };

    window.addEventListener('libraryUpdated', handleLibraryUpdate);
    return () => window.removeEventListener('libraryUpdated', handleLibraryUpdate);
  }, []);

  const handleDeleteReference = async (id: string) => {
    try {
      await referenceLibraryDB.deleteReference(id);
      await loadReferences();
      toast({
        title: "Reference deleted",
        description: "Reference has been removed from your library.",
      });
    } catch (error) {
      console.error('Error deleting reference:', error);
      toast({
        title: "Error",
        description: "Failed to delete reference.",
        variant: "destructive",
      });
    }
  };

  const handleCropImage = (reference: LibraryImageReference) => {
    setCropImageData({ id: reference.id, imageUrl: reference.imageData });
    setCropModalOpen(true);
  };

  const handleCropComplete = async (croppedImageData: string) => {
    if (!cropImageData) return;
    
    try {
      const reference = references.find(ref => ref.id === cropImageData.id);
      if (reference) {
        const updatedReference = { ...reference, imageData: croppedImageData };
        await referenceLibraryDB.saveReference(updatedReference);
        await loadReferences();
        toast({
          title: "Image cropped",
          description: "Reference image has been updated.",
        });
      }
    } catch (error) {
      console.error('Error saving cropped image:', error);
      toast({
        title: "Error",
        description: "Failed to save cropped image.",
        variant: "destructive",
      });
    }
    setCropModalOpen(false);
    setCropImageData(null);
  };

  const handleExportLibrary = async () => {
    try {
      const blob = await referenceLibraryDB.exportLibrary();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `reference-library-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast({
        title: "Library exported",
        description: "Your reference library has been exported successfully.",
      });
    } catch (error) {
      console.error('Error exporting library:', error);
      toast({
        title: "Error",
        description: "Failed to export library.",
        variant: "destructive",
      });
    }
  };

  const handleImportLibrary = async (file: File) => {
    try {
      const result = await referenceLibraryDB.importLibrary(file, importMode);
      await loadReferences();
      
      const messages = [`Imported: ${result.imported} references`];
      if (result.skipped > 0) messages.push(`Skipped: ${result.skipped} duplicates`);
      if (result.errors.length > 0) messages.push(`Errors: ${result.errors.length}`);
      
      toast({
        title: "Library imported",
        description: messages.join(', '),
      });
      
      setImportModalOpen(false);
    } catch (error) {
      console.error('Error importing library:', error);
      toast({
        title: "Error",
        description: "Failed to import library.",
        variant: "destructive",
      });
    }
  };

  const handlePasteFromClipboard = async () => {
    try {
      const clipboardItems = await navigator.clipboard.read();
      
      for (const clipboardItem of clipboardItems) {
        for (const type of clipboardItem.types) {
          if (type.startsWith('image/')) {
            const blob = await clipboardItem.getType(type);
            const reader = new FileReader();
            
            reader.onload = async (e) => {
              const imageData = e.target?.result as string;
              if (imageData) {
                const id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
                const reference: LibraryImageReference = {
                  id,
                  imageData,
                  tags: [],
                  category: 'unorganized',
                  createdAt: new Date(),
                  source: 'uploaded'
                };
                
                await referenceLibraryDB.saveReference(reference);
                await loadReferences();
                
                toast({
                  title: "Image pasted",
                  description: "Image has been added to your reference library.",
                });
              }
            };
            
            reader.readAsDataURL(blob);
            return; // Only process the first image
          }
        }
      }
      
      // If no image found in clipboard
      toast({
        title: "No image found",
        description: "Please copy an image to your clipboard first.",
        variant: "destructive",
      });
      
    } catch (error) {
      console.error('Error pasting from clipboard:', error);
      toast({
        title: "Paste failed",
        description: "Unable to paste from clipboard. Make sure you've copied an image.",
        variant: "destructive",
      });
    }
  };

  const handleTagInputChange = (value: string) => {
    setNewTag(value);
    
    // Check if @ is typed and show suggestions
    if (value.includes('@')) {
      const afterAt = value.split('@').pop() || '';
      const filtered = availableTags.filter((tag: string) => 
        tag.toLowerCase().includes(afterAt.toLowerCase())
      );
      setFilteredTags(filtered);
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
    }
  };

  const handleAddTag = async (referenceId: string, tag: string) => {
    if (!tag.trim()) return;
    
    // Remove @ symbol if present
    const cleanTag = tag.replace('@', '').trim();
    if (!cleanTag) return;
    
    try {
      const reference = references.find(r => r.id === referenceId);
      if (!reference) return;
      
      const newTags = [...reference.tags, cleanTag];
      await referenceLibraryDB.updateReferenceTags(referenceId, newTags);
      await loadReferences();
      setNewTag("");
      setShowSuggestions(false);
    } catch (error) {
      console.error('Error adding tag:', error);
    }
  };

  const handleSuggestionClick = (referenceId: string, suggestion: string) => {
    handleAddTag(referenceId, suggestion);
  };

  const handleRemoveTag = async (referenceId: string, tagToRemove: string) => {
    try {
      const reference = references.find(r => r.id === referenceId);
      if (!reference) return;
      
      const newTags = reference.tags.filter(tag => tag !== tagToRemove);
      await referenceLibraryDB.updateReferenceTags(referenceId, newTags);
      await loadReferences();
    } catch (error) {
      console.error('Error removing tag:', error);
    }
  };

  const handleCategoryChange = async (referenceId: string, newCategory: 'people' | 'places' | 'props' | 'unorganized') => {
    try {
      await referenceLibraryDB.updateReferenceCategory(referenceId, newCategory);
      await loadReferences();
    } catch (error) {
      console.error('Error updating category:', error);
    }
  };

  const LibraryContent = () => (
    <div className="flex-1 overflow-y-auto">
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="w-6 h-6 animate-spin" />
        </div>
      ) : filteredReferences.length === 0 ? (
        <div className="flex items-center justify-center py-12 text-gray-500">
          No saved references yet. Save some images from your generations!
        </div>
      ) : (
        <div className="space-y-3 p-3">
          {filteredReferences.map((reference: LibraryImageReference) => (
            <div
              key={reference.id}
              className="group relative bg-white border rounded-lg p-3 hover:shadow-md transition-shadow cursor-grab active:cursor-grabbing"
              draggable={true}
              onDragStart={(e) => {
                e.dataTransfer.setData('application/json', JSON.stringify({
                  type: 'library-reference',
                  referenceId: reference.id,
                  tags: reference.tags
                }));
                e.dataTransfer.effectAllowed = 'copy';
              }}
            >
              <div className="flex items-start gap-3">
                {/* Larger Thumbnail */}
                <div className="relative w-16 h-16 flex-shrink-0">
                  <img
                    src={reference.imageData}
                    alt="Reference"
                    className="w-full h-full object-cover rounded cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={() => onSelectReference?.(reference)}
                  />
                </div>
                
                {/* Content - More Space */}
                <div className="flex-1 min-w-0 space-y-2">
                  {/* Category Picker */}
                  <div>
                    <select
                      value={reference.category || 'unorganized'}
                      onChange={(e) => handleCategoryChange(reference.id, e.target.value as any)}
                      className="text-xs border rounded px-2 py-1 bg-white hover:bg-gray-50 cursor-pointer min-w-[100px]"
                    >
                      <option value="people">👥 People</option>
                      <option value="places">🏞️ Places</option>
                      <option value="props">📦 Props</option>
                      <option value="unorganized">📂 Unorganized</option>
                    </select>
                  </div>
                  
                  {/* Tags - Show only first 3 with more space */}
                  {reference.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {reference.tags.slice(0, 3).map((tag) => (
                        <Badge
                          key={tag}
                          variant="secondary"
                          className="text-xs px-2 py-1"
                        >
                          {tag}
                        </Badge>
                      ))}
                      {reference.tags.length > 3 && (
                        <Badge variant="outline" className="text-xs px-2 py-1">
                          +{reference.tags.length - 3}
                        </Badge>
                      )}
                    </div>
                  )}
                  
                  {/* Date */}
                  <div className="text-xs text-gray-500">
                    {new Date(reference.createdAt).toLocaleDateString()}
                  </div>
                </div>
                
                {/* Action Buttons - Better Spacing */}
                <div className="flex flex-col gap-2 items-end">
                  {/* Swap Buttons */}
                  {showSwapButtons && (
                    <div className="flex gap-1">
                      {[0, 1, 2].map((index) => (
                        <Button
                          key={index}
                          size="sm"
                          variant="secondary"
                          className="h-6 w-6 p-0 text-xs font-medium"
                          onClick={() => onSwapReference?.(reference.id, index)}
                          title={`Send to Reference ${index + 1}`}
                        >
                          {index + 1}
                        </Button>
                      ))}
                    </div>
                  )}
                  
                  {/* Action Buttons Row */}
                  <div className="flex gap-1">
                    {/* Crop Button */}
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 w-6 p-0 opacity-60 hover:opacity-100 hover:bg-blue-100 hover:text-blue-600"
                      onClick={() => handleCropImage(reference)}
                      title="Crop Image"
                    >
                      <Crop className="w-3 h-3" />
                    </Button>
                    
                    {/* Delete Button */}
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 w-6 p-0 opacity-60 hover:opacity-100 hover:bg-red-100 hover:text-red-600"
                      onClick={() => handleDeleteReference(reference.id)}
                      title="Delete"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </div>
              
              {/* Expanded Tag Management - Show on hover/click */}
              {editingTags === reference.id && (
                <div className="mt-2 pt-2 border-t">
                  <div className="space-y-2">
                    {/* All Tags */}
                    <div className="flex flex-wrap gap-1">
                      {reference.tags.map((tag) => (
                        <Badge
                          key={tag}
                          variant="secondary"
                          className="text-xs cursor-pointer hover:bg-red-100 hover:text-red-700"
                          onClick={() => handleRemoveTag(reference.id, tag)}
                        >
                          {tag}
                          <X className="w-2 h-2 ml-1" />
                        </Badge>
                      ))}
                    </div>
                    
                    {/* Add Tag Input */}
                    <div className="relative">
                      <div className="flex gap-1">
                        <Input
                          value={newTag}
                          onChange={(e) => handleTagInputChange(e.target.value)}
                          placeholder="Type @ for suggestions..."
                          className="h-6 text-xs"
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                              handleAddTag(reference.id, newTag);
                              setEditingTags(null);
                            }
                          }}
                          autoFocus
                        />
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0"
                          onClick={() => {
                            handleAddTag(reference.id, newTag);
                            setEditingTags(null);
                          }}
                        >
                          <Plus className="w-3 h-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0"
                          onClick={() => setEditingTags(null)}
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                      
                      {/* Tag Suggestions */}
                      {showSuggestions && filteredTags.length > 0 && (
                        <div className="absolute top-7 left-0 right-0 bg-white border rounded shadow-lg z-10 max-h-32 overflow-y-auto">
                          {filteredTags.slice(0, 5).map((tag) => (
                            <div
                              key={tag}
                              className="px-2 py-1 text-xs hover:bg-gray-100 cursor-pointer"
                              onClick={() => handleSuggestionClick(reference.id, tag)}
                            >
                              {tag}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
              
              {/* Tag Edit Button */}
              {editingTags !== reference.id && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="absolute top-1 right-1 h-5 w-5 p-0 opacity-0 group-hover:opacity-60 hover:opacity-100"
                  onClick={() => setEditingTags(reference.id)}
                  title="Edit Tags"
                >
                  <Tag className="w-3 h-3" />
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className={inline ? "" : "w-full max-w-4xl mx-auto p-4"}>
      <Card className="overflow-hidden">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <Library className="w-5 h-5" />
              Reference Library
            </CardTitle>
            
            {/* Action Buttons */}
            <div className="flex gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePasteFromClipboard}
                className="h-8 px-2 text-xs"
                title="Paste image from clipboard"
              >
                <Copy className="w-3 h-3 xl:mr-1" />
                <span className="hidden xl:inline">Paste</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportLibrary}
                className="h-8 px-2 text-xs"
              >
                <Download className="w-3 h-3 xl:mr-1" />
                <span className="hidden xl:inline">Export</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setImportModalOpen(true)}
                className="h-8 px-2 text-xs"
              >
                <Upload className="w-3 h-3 xl:mr-1" />
                <span className="hidden xl:inline">Import</span>
              </Button>
            </div>
          </div>
          
          {/* Responsive Category Tabs */}
          <div className="flex gap-1 flex-wrap -mx-1">
            <Button
              variant={selectedCategory === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedCategory('all')}
              className="h-8 px-2 text-xs flex-shrink-0"
              title={`All (${references.length})`}
            >
              <span className="sm:hidden">📚</span>
              <span className="hidden sm:inline">All ({references.length})</span>
            </Button>
            {categories.map(category => {
              const count = references.filter(ref => ref.category === category.id).length;
              return (
                <Button
                  key={category.id}
                  variant={selectedCategory === category.id ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedCategory(category.id as any)}
                  className="h-8 px-2 text-xs flex-shrink-0"
                  title={`${category.label} (${count})`}
                >
                  <span className="sm:hidden">{category.icon}</span>
                  <span className="hidden sm:inline">{category.icon} {category.label} ({count})</span>
                </Button>
              );
            })}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <LibraryContent />
        </CardContent>
      </Card>
      
      {/* Image Cropper Modal */}
      {cropImageData && (
        <SimpleImageCropper
          isOpen={cropModalOpen}
          onClose={() => {
            setCropModalOpen(false);
            setCropImageData(null);
          }}
          imageUrl={cropImageData.imageUrl}
          onCropComplete={handleCropComplete}
        />
      )}
      
      {/* Import Modal */}
      <Dialog open={importModalOpen} onOpenChange={setImportModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="w-5 h-5" />
              Import Reference Library
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">
                Import Mode:
              </label>
              <div className="flex gap-2">
                <Button
                  variant={importMode === 'merge' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setImportMode('merge')}
                  className="flex-1"
                >
                  Merge
                </Button>
                <Button
                  variant={importMode === 'overwrite' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setImportMode('overwrite')}
                  className="flex-1"
                >
                  Overwrite
                </Button>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {importMode === 'merge' 
                  ? 'Add new references, skip duplicates'
                  : 'Replace entire library with imported data'
                }
              </p>
            </div>
            
            <div>
              <label className="text-sm font-medium mb-2 block">
                Select Library File:
              </label>
              <input
                type="file"
                accept=".json"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    handleImportLibrary(file);
                  }
                }}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
              <p className="text-xs text-gray-500 mt-1">
                Select a JSON file exported from Reference Library
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );

  return (
    <div className={inline ? "" : "w-full max-w-4xl mx-auto p-4"}>
      <Card className="overflow-hidden">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <Library className="w-5 h-5" />
              Reference Library
            </CardTitle>
            
            {/* Action Buttons */}
            <div className="flex gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePasteFromClipboard}
                className="h-8 px-2 text-xs"
                title="Paste image from clipboard"
              >
                <Copy className="w-3 h-3 xl:mr-1" />
                <span className="hidden xl:inline">Paste</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportLibrary}
                className="h-8 px-2 text-xs"
              >
                <Download className="w-3 h-3 xl:mr-1" />
                <span className="hidden xl:inline">Export</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setImportModalOpen(true)}
                className="h-8 px-2 text-xs"
              >
                <Upload className="w-3 h-3 xl:mr-1" />
                <span className="hidden xl:inline">Import</span>
              </Button>
            </div>
          </div>
          
          {/* Responsive Category Tabs */}
          <div className="flex gap-1 flex-wrap -mx-1">
            <Button
              variant={selectedCategory === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedCategory('all')}
              className="h-8 px-2 text-xs flex-shrink-0"
              title={`All (${references.length})`}
            >
              <span className="sm:hidden">📚</span>
              <span className="hidden sm:inline">All ({references.length})</span>
            </Button>
            {categories.map(category => {
              const count = references.filter(ref => ref.category === category.id).length;
              return (
                <Button
                  key={category.id}
                  variant={selectedCategory === category.id ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedCategory(category.id as any)}
                  className="h-8 px-2 text-xs flex-shrink-0"
                  title={`${category.label} (${count})`}
                >
                  <span className="sm:hidden">{category.icon}</span>
                  <span className="hidden sm:inline">{category.icon} {category.label} ({count})</span>
                </Button>
              );
            })}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <LibraryContent />
        </CardContent>
      </Card>
      
      {/* Image Cropper Modal */}
      {cropImageData && (
        <SimpleImageCropper
          isOpen={cropModalOpen}
          onClose={() => {
            setCropModalOpen(false);
            setCropImageData(null);
          }}
          imageUrl={cropImageData.imageUrl}
          onCropComplete={handleCropComplete}
        />
      )}
    </div>
  );

  if (inline) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Library className="w-5 h-5" />
            Reference Library
            <Button
              size="sm"
              variant="ghost"
              onClick={loadReferences}
              disabled={loading}
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <LibraryContent />
        </CardContent>
      </Card>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="flex items-center gap-2">
          <Library className="w-4 h-4" />
          Reference Library
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-6xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Library className="w-5 h-5" />
            Reference Library
            <Button
              size="sm"
              variant="ghost"
              onClick={loadReferences}
              disabled={loading}
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 flex flex-col">
          <LibraryContent />
        </div>
      </DialogContent>
    </Dialog>
  );
}
