// "use client" directive for Next.js app router components
"use client";

import React, { useEffect, useState, useCallback } from "react";
import Image from "next/image";
import { dbManager } from "@/lib/indexeddb";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";

interface LibraryItem {
  id: string;
  thumbUrl: string; // object URL
  fullBlob: Blob;
  tag: string; // single tag
}

interface Gen4LibraryTabProps {
  onSendToRef: (blob: Blob, tag: string, slot: 0 | 1 | 2) => void;
}

const Gen4LibraryTab: React.FC<Gen4LibraryTabProps> = ({ onSendToRef }) => {
  const [items, setItems] = useState<LibraryItem[]>([]);

  const load = useCallback(async () => {
    const refs = await dbManager.getAllReferences();
    const mapped: LibraryItem[] = refs.map((r: any) => ({
      id: r.id,
      thumbUrl: URL.createObjectURL(r.thumbBlob),
      fullBlob: r.fullBlob,
      tag: (r.tags && r.tags.length ? r.tags[0] : "") as string,
    }));
    setItems(mapped);
  }, []);

  useEffect(() => {
    load();
    // Consider reloading on window focus to catch updates from other tabs.
    const onFocus = () => load();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [load]);

  const handleDelete = async (id: string) => {
    await dbManager.deleteReference(id);
    load();
  };

  const handleSend = (item: LibraryItem, slot: 0 | 1 | 2) => {
    onSendToRef(item.fullBlob, item.tag, slot);
  };

  return (
    <div className="p-4 space-y-4">
      <div
        className="grid gap-3"
        style={{ gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))" }}
      >
        {items.map((item) => (
          <div
            key={item.id}
            className="group relative border rounded overflow-hidden"
          >
            <Image
              src={item.thumbUrl}
              alt={item.tag}
              width={140}
              height={140}
              className="object-cover w-full h-full"
            />
            {/* Tag label */}
            <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs px-1 truncate">
              {item.tag}
            </div>
            {/* Overlay buttons */}
            <div className="absolute inset-0 flex flex-col justify-between opacity-0 group-hover:opacity-100 transition-opacity bg-black/20">
              <div className="flex justify-end p-1 gap-1">
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => handleDelete(item.id)}
                  title="Delete from library"
                >
                  <Trash2 size={16} className="text-white" />
                </Button>
              </div>
              <div className="flex justify-center gap-1 pb-1">
                {[0, 1, 2].map((s) => (
                  <Button
                    key={s}
                    size="icon"
                    variant="secondary"
                    className="h-7 w-7 p-0"
                    onClick={() => handleSend(item, s as 0 | 1 | 2)}
                    title={`Send to Ref ${s + 1}`}
                  >
                    {s + 1}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Gen4LibraryTab;
