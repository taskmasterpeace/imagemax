import { useEffect, useState } from "react";
import { dbManager } from "@/lib/indexeddb";
import { Button } from "@/components/ui/button";
import { Tag } from "lucide-react";

interface ReferenceItem {
  id: string;
  thumbUrl: string;
  fullBlob: Blob;
  tags: string[];
}

interface Props {
  onSetRef: (blob: Blob, slot: number) => void;
  onDelete: (id: string) => void;
  refreshTrigger: number;
}

export default function Gen4LibraryBar({ onSetRef, onDelete, refreshTrigger }: Props) {
  const [items, setItems] = useState<ReferenceItem[]>([]);

  const load = async () => {
    const refs = await dbManager.getAllReferences();
    const mapped: ReferenceItem[] = await Promise.all(
      refs.map(async (r) => {
        const thumbUrl = URL.createObjectURL(r.thumbBlob);
        return { id: r.id, thumbUrl, fullBlob: r.fullBlob, tags: r.tags };
      })
    );
    setItems(mapped);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshTrigger]);

  if (items.length === 0) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-gray-900/90 backdrop-blur-sm p-2 z-30">
      <div className="flex gap-2 overflow-x-auto">
        {items.map((item) => (
          <div key={item.id} className="relative shrink-0">
            <img
              src={item.thumbUrl}
              alt="ref"
              className="w-24 h-24 object-cover rounded border"
            />
            <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[10px] truncate px-1 flex items-center gap-1">
              <Tag className="w-3 h-3" /> {item.tags[0] ?? ""}
            </div>
            <div className="absolute top-1 right-1 flex flex-col gap-1">
              {[1, 2, 3].map((slot) => (
                <Button
                  key={slot}
                  size="sm"
                  className="h-5 w-5 p-0 text-[10px]"
                  title={`Set ref ${slot}`}
                  onClick={() => onSetRef(item.fullBlob, slot - 1)}
                >
                  {slot}
                </Button>
              ))}
              <Button
                size="sm"
                variant="destructive"
                className="h-5 w-5 p-0 text-[10px]"
                onClick={() => onDelete(item.id)}
              >
                ×
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
