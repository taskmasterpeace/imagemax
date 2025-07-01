interface JobData {
  jobId: string
  status: "processing" | "completed" | "failed" | "merging"
  tasks: TaskData[]
  startedAt: number
  mergeRequested: boolean
  mergedOutputUrl?: string
}

interface TaskData {
  filename: string
  prompt: string
  status: "queued" | "processing" | "completed" | "failed"
  outputUrl?: string
  error?: string
}

class IndexedDBManager {
  private dbName = "seedance-generator"
  private version = 1
  private db: IDBDatabase | null = null

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        this.db = request.result
        resolve()
      }

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result

        // Create jobs store
        if (!db.objectStoreNames.contains("jobs")) {
          const jobsStore = db.createObjectStore("jobs", { keyPath: "jobId" })
          jobsStore.createIndex("status", "status", { unique: false })
          jobsStore.createIndex("startedAt", "startedAt", { unique: false })
        }

        // Create images store for caching uploaded images
        if (!db.objectStoreNames.contains("images")) {
          const imagesStore = db.createObjectStore("images", { keyPath: "id" })
          imagesStore.createIndex("jobId", "jobId", { unique: false })
        }
      }
    })
  }

  async saveJob(job: JobData): Promise<void> {
    if (!this.db) throw new Error("Database not initialized")

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(["jobs"], "readwrite")
      const store = transaction.objectStore("jobs")
      const request = store.put(job)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve()
    })
  }

  async getJob(jobId: string): Promise<JobData | null> {
    if (!this.db) throw new Error("Database not initialized")

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(["jobs"], "readonly")
      const store = transaction.objectStore("jobs")
      const request = store.get(jobId)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve(request.result || null)
    })
  }

  async getAllJobs(): Promise<JobData[]> {
    if (!this.db) throw new Error("Database not initialized")

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(["jobs"], "readonly")
      const store = transaction.objectStore("jobs")
      const request = store.getAll()

      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve(request.result)
    })
  }

  async deleteJob(jobId: string): Promise<void> {
    if (!this.db) throw new Error("Database not initialized")

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(["jobs"], "readwrite")
      const store = transaction.objectStore("jobs")
      const request = store.delete(jobId)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve()
    })
  }

  async saveImage(id: string, jobId: string, file: File, preview: string): Promise<void> {
    if (!this.db) throw new Error("Database not initialized")

    const imageData = {
      id,
      jobId,
      filename: file.name,
      type: file.type,
      size: file.size,
      preview,
      data: await file.arrayBuffer(),
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(["images"], "readwrite")
      const store = transaction.objectStore("images")
      const request = store.put(imageData)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve()
    })
  }

  async getImage(id: string): Promise<File | null> {
    if (!this.db) throw new Error("Database not initialized")

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(["images"], "readonly")
      const store = transaction.objectStore("images")
      const request = store.get(id)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        const result = request.result
        if (result) {
          const file = new File([result.data], result.filename, { type: result.type })
          resolve(file)
        } else {
          resolve(null)
        }
      }
    })
  }

  async cleanupOldJobs(olderThanHours = 24): Promise<void> {
    if (!this.db) throw new Error("Database not initialized")

    const cutoffTime = Date.now() - olderThanHours * 60 * 60 * 1000
    const jobs = await this.getAllJobs()

    for (const job of jobs) {
      if (job.startedAt < cutoffTime) {
        await this.deleteJob(job.jobId)
      }
    }
  }
}

export const dbManager = new IndexedDBManager()
export type { JobData, TaskData }
