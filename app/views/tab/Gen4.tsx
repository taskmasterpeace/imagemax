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
  Upload,
  X,
} from "lucide-react";
import { GEN4_RESOLUTIONS } from "@/static/data";
import { Gen4Props, Gen4Settings, Generation, ImageReference } from "@/types";

function Gen4({
  gen4Generations,
  gen4Processing,
  openFullscreenImage,
  downloadFile,
  copyToClipboard,
  removeImage,
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
}: Gen4Props) {
  return (
    <div
      className={`grid grid-cols-1 lg:grid-cols-3 gap-6 ${
        activeTab === "gen4" ? "" : "hidden"
      }`}
    >
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
                onDrop={(e: React.DragEvent<HTMLDivElement>) =>
                  handleDrop(e, true)
                }
                onDragOver={(e: React.DragEvent<HTMLDivElement>) =>
                  handleDragOver(e)
                }
                onClick={() => gen4FileInputRef.current?.click()}
              >
                <Upload className="w-8 h-8 mx-auto mb-2 text-slate-400" />
                <p className="font-medium mb-1">Add reference images</p>
                <p className="text-sm text-slate-500">
                  Up to 3 images for style reference
                </p>
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
                    className="relative group border rounded-lg overflow-hidden"
                  >
                    <div className="aspect-square relative">
                      <img
                        src={image.preview || "/placeholder.svg"}
                        alt={`Reference ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute top-2 left-2">
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
                              removeTagFromGen4Image(image.id, tagIndex)
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
                gen4Processing ||
                !gen4Prompt.trim() ||
                gen4ReferenceImages.length === 0
              }
              className="w-full flex items-center gap-2"
              size="lg"
            >
              {gen4Processing ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Generate with Gen 4
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
      {/* Gen 4 Results */}
      <div className="space-y-6 ">
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
          <CardContent>
            {gen4Processing ? (
              <div className="flex flex-col items-center justify-center py-12 space-y-4">
                <div className="w-16 h-16 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin"></div>
                <p className="text-sm text-gray-600">
                  Generating your images...
                </p>
                <div className="w-full bg-gray-200 rounded-full h-2 max-w-xs">
                  <div
                    className="bg-purple-600 h-2 rounded-full animate-pulse"
                    style={{ width: "60%" }}
                  ></div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
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
                          width={300}
                          height={300}
                          className="w-full aspect-square object-cover transition-transform group-hover:scale-105"
                        />

                        {/* Overlay Actions */}
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors">
                          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
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
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Image Info */}
                      <div className="mt-2 space-y-2">
                        <div className="flex items-center justify-between text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {generation.timestamp}
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
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default Gen4;
