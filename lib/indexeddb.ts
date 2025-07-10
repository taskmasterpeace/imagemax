import { ImageData, Template } from "@/types";

export interface JobData {
  jobId: string;
  status: "processing" | "completed" | "failed" | "merging";
  tasks: TaskData[];
  startedAt: number;
  mergeRequested: boolean;
  mergedOutputUrl?: string;
}

export interface TaskData {
  filename: string;
  prompt: string;
  status: "queued" | "processing" | "completed" | "failed";
  outputUrl?: string;
  error?: string;
}

class IndexedDBManager {
  private dbName = "seedance-generator";
  private version = 3;
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (typeof window === "undefined") {
        resolve();
        return;
      }
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create jobs store
        if (!db.objectStoreNames.contains("jobs")) {
          const jobsStore = db.createObjectStore("jobs", { keyPath: "jobId" });
          jobsStore.createIndex("status", "status", { unique: false });
          jobsStore.createIndex("startedAt", "startedAt", { unique: false });
        }

        // Create images store for caching uploaded images
        if (!db.objectStoreNames.contains("images")) {
          const imagesStore = db.createObjectStore("images", { keyPath: "id" });
          imagesStore.createIndex("jobId", "jobId", { unique: false });
        }

        // Create referenceLibrary store for saved reference images
        if (!db.objectStoreNames.contains("referenceLibrary")) {
          const refStore = db.createObjectStore("referenceLibrary", { keyPath: "id" });
          refStore.createIndex("tags", "tags", { unique: false, multiEntry: true });
        }

        // Create templates store for user-defined prompt templates
        if (!db.objectStoreNames.contains("templates")) {
          db.createObjectStore("templates", { keyPath: "id" });
        }
      };
    });
  }

  constructor() {
    this.init();
  }

  async saveJob(job: JobData): Promise<void> {
    if (!this.db) throw new Error("Database not initialized");

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(["jobs"], "readwrite");
      const store = transaction.objectStore("jobs");
      const request = store.put(job);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async getJob(jobId: string): Promise<JobData | null> {
    if (!this.db) throw new Error("Database not initialized");

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(["jobs"], "readonly");
      const store = transaction.objectStore("jobs");
      const request = store.get(jobId);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result || null);
    });
  }

  async getAllJobs(): Promise<JobData[]> {
    if (!this.db) throw new Error("Database not initialized");

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(["jobs"], "readonly");
      const store = transaction.objectStore("jobs");
      const request = store.getAll();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
  }

  async deleteJob(jobId: string): Promise<void> {
    if (!this.db) throw new Error("Database not initialized");

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(["jobs"], "readwrite");
      const store = transaction.objectStore("jobs");
      const request = store.delete(jobId);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async saveImage(
    id: string,
    file: { name: string; type: string; size: number },
    fileUrl: string,
    preview: string,
    prompt: string,
    selected: boolean,
    status: string,
    videos: string[],
    mode: "seedance" | "kontext"
  ): Promise<void> {
    if (!this.db) throw new Error("Database not initialized");

    const imageData = {
      id,
      filename: file.name,
      type: file.type,
      size: file.size,
      fileUrl,
      preview,
      prompt,
      selected,
      status,
      videos,
      mode,
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(["images"], "readwrite");
      const store = transaction.objectStore("images");
      const request = store.put(imageData);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async getImage(id: string): Promise<ImageData | null> {
    if (!this.db) throw new Error("Database not initialized");

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(["images"], "readonly");
      const store = transaction.objectStore("images");
      const request = store.get(id);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const result = request.result;
        if (result) {
          resolve(result);
        } else {
          resolve(null);
        }
      };
    });
  }

  async cleanupOldJobs(olderThanHours = 24): Promise<void> {
    if (!this.db) throw new Error("Database not initialized");

    const cutoffTime = Date.now() - olderThanHours * 60 * 60 * 1000;
    const jobs = await this.getAllJobs();

    for (const job of jobs) {
      if (job.startedAt < cutoffTime) {
        await this.deleteJob(job.jobId);
      }
    }
  }

  async getImages(): Promise<ImageData[]> {
    if (!this.db) throw new Error("Database not initialized");

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(["images"], "readonly");
      const store = transaction.objectStore("images");
      const request = store.getAll();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
  }

    /* ------------------------------------------------------------------
   * Reference Library helpers
   * ------------------------------------------------------------------*/

  async addReference(id: string, thumbBlob: Blob, fullBlob: Blob, tags: string[]): Promise<void> {
    if (!this.db) throw new Error("Database not initialized");
    const data = { id, thumbBlob, fullBlob, tags };
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(["referenceLibrary"], "readwrite");
      const store = tx.objectStore("referenceLibrary");
      const req = store.put(data);
      req.onerror = () => reject(req.error);
      req.onsuccess = () => resolve();
    });
  }

  async getAllReferences(): Promise<Array<{ id: string; thumbBlob: Blob; fullBlob: Blob; tags: string[] }>> {
    if (!this.db) throw new Error("Database not initialized");
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(["referenceLibrary"], "readonly");
      const store = tx.objectStore("referenceLibrary");
      const req = store.getAll();
      req.onerror = () => reject(req.error);
      req.onsuccess = () => resolve(req.result ?? []);
    });
  }

  async deleteReference(id: string): Promise<void> {
    if (!this.db) throw new Error("Database not initialized");
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(["referenceLibrary"], "readwrite");
      const store = tx.objectStore("referenceLibrary");
      const req = store.delete(id);
      req.onerror = () => reject(req.error);
      req.onsuccess = () => resolve();
    });
  }

  async removeImage(id: string): Promise<void> {
    if (!this.db) throw new Error("Database not initialized");

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(["images"], "readwrite");
      const store = transaction.objectStore("images");
      const request = store.delete(id);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async saveTemplates(templates: Template[]): Promise<void> {
    if (!this.db) throw new Error("Database not initialized");
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(["templates"], "readwrite");
      const store = transaction.objectStore("templates");
      templates.forEach((t) => store.put(t));
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  async saveTemplate(template: Template): Promise<void> {
    if (!this.db) throw new Error("Database not initialized");
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(["templates"], "readwrite");
      const store = transaction.objectStore("templates");
      const request = store.put(template);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async getTemplates(): Promise<Template[]> {
    if (!this.db) throw new Error("Database not initialized");
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(["templates"], "readonly");
      const store = transaction.objectStore("templates");
      const request = store.getAll();
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result ?? []);
    });
  }

  async removeTemplate(id: string): Promise<void> {
    if (!this.db) throw new Error("Database not initialized");
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(["templates"], "readwrite");
      const store = transaction.objectStore("templates");
      const request = store.delete(id);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async clearTemplates(): Promise<void> {
    if (!this.db) throw new Error("Database not initialized");
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(["templates"], "readwrite");
      const store = transaction.objectStore("templates");
      const request = store.clear();
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async saveImages(images: ImageData[]): Promise<void> {
    // save images to indexedDB
    for (const image of images) {
      await this.saveImage(
        image.id,
        image.file,
        image.fileUrl,
        image.preview,
        image.prompt,
        image.selected,
        image.status,
        image.videos || [],
        image.mode
      );
    }
  }
}

export const dbManager = new IndexedDBManager();
