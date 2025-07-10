"use client";

import React, { useEffect, useState, useCallback } from "react";
import { dbManager } from "@/lib/indexeddb";
import { cn } from "@/lib/utils";
import { X, PlusSquare, Trash2, Search } from "lucide-react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent } from "@/components/ui/dialog";

export interface ReferenceItem {
  id: string;
  thumbUrl: string; // blob URL
  fullBlob: Blob;
  tags: string[];
}

interface ReferenceLibraryProps {
  onSelectAsReference?: (file: File, tags: string[]) => void;
}

export const ReferenceLibrary: React.FC<ReferenceLibraryProps> = ({
  onSelectAsReference,
}) => {
  const [items, setItems] = useState<ReferenceItem[]>([]);
  const [filter, setFilter] = useState<string>("");
  const [modalItem, setModalItem] = useState<ReferenceItem | null>(null);

  // Load from DB
  const load = useCallback(async () => {
    const refs = await dbManager.getAllReferences();
    const mapped: ReferenceItem[] = refs.map((r) => ({
      id: r.id,
      thumbUrl: URL.createObjectURL(r.thumbBlob),
      fullBlob: r.fullBlob,
      tags: r.tags,
    }));
    setItems(mapped);
  }, []);

  useEffect(() => {
    load();
    // No DB change listener yet – could reload on focus.
  }, [load]);

  const filteredItems = items.filter((it) =>
    filter.trim()
      ? it.tags.some((t) => t.toLowerCase().includes(filter.toLowerCase()))
      : true
  );

  const handleDelete = async (id: string) => {
    await dbManager.deleteReference(id);
    load();
  };

  const handleUse = (it: ReferenceItem) => {
    if (!onSelectAsReference) return;
    const file = new File([it.fullBlob], `${it.id}.png`, { type: "image/png" });
    onSelectAsReference(file, it.tags);
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center gap-2">
        <Search size={18} />
        <Input
          placeholder="Filter by tag…"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
      </div>

      <div
        className="grid gap-3"
        style={{ gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))" }}
      >
        {filteredItems.map((it) => (
          <div
            key={it.id}
            className="relative group border rounded hover:shadow cursor-pointer"
          >
            <Image
              src={it.thumbUrl}
              alt="thumb"
              width={120}
              height={120}
              className="object-contain w-full h-full rounded"
              onClick={() => setModalItem(it)}
            />
            <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              {onSelectAsReference && (
                <Button
                  size="iconSm"
                  variant="ghost"
                  onClick={() => handleUse(it)}
                >
                  <PlusSquare size={16} />
                </Button>
              )}
              <Button
                size="iconSm"
                variant="ghost"
                onClick={() => handleDelete(it.id)}
              >
                <Trash2 size={16} />
              </Button>
            </div>
            <div className="flex flex-wrap gap-1 p-1">
              {it.tags.map((tag) => (
                <span
                  key={tag}
                  className="bg-muted px-1 text-xs rounded"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Magnifier Modal */}
      <Dialog open={!!modalItem} onOpenChange={() => setModalItem(null)}>
        <DialogContent className="max-w-fit p-2">
          {modalItem && (
            <Image
              src={URL.createObjectURL(modalItem.fullBlob)}
              alt="full"
              width={800}
              height={800}
              className="object-contain max-h-[80vh] w-auto h-auto"
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ReferenceLibrary;
