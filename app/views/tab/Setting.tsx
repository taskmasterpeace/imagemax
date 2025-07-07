import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ImageIcon, Settings, Video } from "lucide-react";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { DollarSign } from "lucide-react";
import {
  SEEDANCE_DURATIONS,
  SEEDANCE_LITE_RESOLUTIONS,
  SEEDANCE_MODELS,
  SEEDANCE_PRO_RESOLUTIONS,
} from "@/static/data";
import { SettingProps, SettingsType } from "@/types";

function Setting({
  settings,
  setSettings,
  activeTab,
  selectedCount,
}: SettingProps) {
  return (
    <div
      className={`grid grid-cols-1 lg:grid-cols-2 gap-6 ${
        activeTab === "settings" ? "" : "hidden"
      }`}
    >
      {/* Seedance Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Video className="w-5 h-5" />
            Seedance Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-sm font-medium mb-2 block">Model</Label>
            <Select
              value={settings.seedance.model}
              onValueChange={(value: string) =>
                setSettings((prev: SettingsType) => ({
                  ...prev,
                  seedance: { ...prev.seedance, model: value },
                }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SEEDANCE_MODELS.map((model) => (
                  <SelectItem key={model.value} value={model.value}>
                    {model.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-sm font-medium mb-2 block">Resolution</Label>
            <Select
              value={settings.seedance.resolution}
              onValueChange={(value: string) =>
                setSettings((prev: SettingsType) => ({
                  ...prev,
                  seedance: { ...prev.seedance, resolution: value },
                }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {settings?.seedance?.model === SEEDANCE_MODELS[0].value
                  ? SEEDANCE_LITE_RESOLUTIONS.map((resolution) => (
                      <SelectItem
                        defaultValue={SEEDANCE_LITE_RESOLUTIONS[0].value}
                        key={resolution.value}
                        value={resolution.value}
                      >
                        {resolution.name}
                      </SelectItem>
                    ))
                  : SEEDANCE_PRO_RESOLUTIONS.map((resolution) => (
                      <SelectItem
                        defaultValue={SEEDANCE_PRO_RESOLUTIONS[0].value}
                        key={resolution.value}
                        value={resolution.value}
                      >
                        {resolution.name}
                      </SelectItem>
                    ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-sm font-medium mb-2 block">
              Duration: {settings.seedance.duration}s
            </Label>
            <Select
              value={settings.seedance.duration.toString()}
              onValueChange={(value: string) =>
                setSettings((prev: SettingsType) => ({
                  ...prev,
                  seedance: {
                    ...prev.seedance,
                    duration: Number(value),
                  },
                }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SEEDANCE_DURATIONS.map((duration) => (
                  <SelectItem
                    key={duration.value}
                    value={duration.value.toString()}
                  >
                    {duration.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center space-x-2">
            <Switch
              id="camera-fixed"
              checked={settings.seedance.cameraFixed}
              onCheckedChange={(checked: boolean) =>
                setSettings((prev: SettingsType) => ({
                  ...prev,
                  seedance: { ...prev.seedance, cameraFixed: checked },
                }))
              }
            />
            <Label htmlFor="camera-fixed">Fixed Camera</Label>
          </div>
        </CardContent>
      </Card>

      {/* Kontext Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ImageIcon className="w-5 h-5" />
            Kontext Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-sm font-medium mb-2 block">Model</Label>
            <Select
              value={settings.kontext.model}
              onValueChange={(value: "dev" | "max") =>
                setSettings((prev: SettingsType) => ({
                  ...prev,
                  kontext: { ...prev.kontext, model: value },
                }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="dev">Dev (Fast & Affordable)</SelectItem>
                <SelectItem value="max">Max (Premium Quality)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
            <h4 className="font-medium mb-2">Model Comparison</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Dev Model:</span>
                <span className="text-green-600">~30s, $0.003/image</span>
              </div>
              <div className="flex justify-between">
                <span>Max Model:</span>
                <span className="text-blue-600">~60s, $0.055/image</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* General Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            General Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2">
            <Switch
              id="auto-save"
              checked={settings.general.autoSave}
              onCheckedChange={(checked: boolean) =>
                setSettings((prev: SettingsType) => ({
                  ...prev,
                  general: { ...prev.general, autoSave: checked },
                }))
              }
            />
            <Label htmlFor="auto-save">Auto-save to IndexedDB</Label>
          </div>
          <div className="flex items-center space-x-2">
            <Switch
              id="show-costs"
              checked={settings.general.showCostEstimates}
              onCheckedChange={(checked: boolean) =>
                setSettings((prev: SettingsType) => ({
                  ...prev,
                  general: {
                    ...prev.general,
                    showCostEstimates: checked,
                  },
                }))
              }
            />
            <Label htmlFor="show-costs">Show cost estimates</Label>
          </div>
          <div>
            <Label className="text-sm font-medium mb-2 block">
              Max Concurrent Jobs: {settings.general.maxConcurrentJobs}
            </Label>
            <Slider
              value={[settings.general.maxConcurrentJobs]}
              onValueChange={([value]: [number]) =>
                setSettings((prev: SettingsType) => ({
                  ...prev,
                  general: {
                    ...prev.general,
                    maxConcurrentJobs: value,
                  },
                }))
              }
              min={1}
              max={5}
              step={1}
              className="w-full"
            />
          </div>
        </CardContent>
      </Card>

      {/* Cost Estimation */}
      {settings.general.showCostEstimates && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5" />
              Cost Estimation
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <p className="text-sm font-medium text-blue-700 dark:text-blue-300">
                  Seedance Videos
                </p>
                <p className="text-lg font-bold text-blue-900 dark:text-blue-100">
                  ${(selectedCount * 0.12).toFixed(2)}
                </p>
                <p className="text-xs text-blue-600 dark:text-blue-400">
                  {selectedCount} selected × $0.12
                </p>
              </div>
              <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <p className="text-sm font-medium text-green-700 dark:text-green-300">
                  Kontext Edits
                </p>
                <p className="text-lg font-bold text-green-900 dark:text-green-100">
                  $
                  {(
                    selectedCount *
                    (settings.kontext.model === "dev" ? 0.003 : 0.055)
                  ).toFixed(3)}
                </p>
                <p className="text-xs text-green-600 dark:text-green-400">
                  {selectedCount} selected × $
                  {settings.kontext.model === "dev" ? "0.003" : "0.055"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default Setting;
