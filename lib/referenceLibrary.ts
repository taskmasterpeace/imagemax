// Reference Library Storage using IndexedDB
export interface LibraryImageReference {
  id: string;
  imageData: string; // base64 encoded image
  preview?: string;
  tags: string[];
  category: 'people' | 'places' | 'props' | 'unorganized';
  prompt?: string;
  createdAt: Date;
  source: 'generated' | 'uploaded';
  settings?: any; // Gen4 settings used for generation
}

class ReferenceLibraryDB {
  private dbName = 'ReferenceLibrary';
  private version = 2;
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // Create references store
        if (!db.objectStoreNames.contains('references')) {
          const store = db.createObjectStore('references', { keyPath: 'id' });
          store.createIndex('tags', 'tags', { multiEntry: true });
          store.createIndex('createdAt', 'createdAt');
          store.createIndex('source', 'source');
          store.createIndex('category', 'category');
        }
        
        // Create tags store for autocomplete
        if (!db.objectStoreNames.contains('tags')) {
          const tagStore = db.createObjectStore('tags', { keyPath: 'name' });
          tagStore.createIndex('usage', 'usage');
        }
      };
    });
  }

  async saveReference(reference: LibraryImageReference): Promise<void> {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['references', 'tags'], 'readwrite');
      const referenceStore = transaction.objectStore('references');
      const tagStore = transaction.objectStore('tags');
      
      // Save the reference
      referenceStore.put(reference);
      
      // Update tag usage counts for autocomplete
      reference.tags.forEach(async (tagName) => {
        const tagRequest = tagStore.get(tagName);
        tagRequest.onsuccess = () => {
          const existingTag = tagRequest.result;
          const updatedTag = existingTag 
            ? { ...existingTag, usage: existingTag.usage + 1 }
            : { name: tagName, usage: 1 };
          tagStore.put(updatedTag);
        };
      });
      
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  async getAllReferences(): Promise<LibraryImageReference[]> {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['references'], 'readonly');
      const store = transaction.objectStore('references');
      const request = store.getAll();
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getReference(id: string): Promise<LibraryImageReference | null> {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['references'], 'readonly');
      const store = transaction.objectStore('references');
      const request = store.get(id);
      
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  async deleteReference(id: string): Promise<void> {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['references'], 'readwrite');
      const store = transaction.objectStore('references');
      const request = store.delete(id);
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getAllTags(): Promise<string[]> {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['tags'], 'readonly');
      const store = transaction.objectStore('tags');
      const request = store.getAll();
      
      request.onsuccess = () => {
        const tags = request.result
          .sort((a: any, b: any) => b.usage - a.usage) // Sort by usage count
          .map((tag: any) => tag.name);
        resolve(tags);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async updateReferenceTags(id: string, newTags: string[]): Promise<void> {
    if (!this.db) await this.init();
    
    const reference = await this.getReference(id);
    if (!reference) throw new Error('Reference not found');
    
    const oldTags = reference.tags;
    reference.tags = newTags;
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['references', 'tags'], 'readwrite');
      const referenceStore = transaction.objectStore('references');
      const tagStore = transaction.objectStore('tags');
      
      // Update the reference
      referenceStore.put(reference);
      
      // Update tag usage counts
      // Decrease count for removed tags
      oldTags.forEach(tagName => {
        if (!newTags.includes(tagName)) {
          const tagRequest = tagStore.get(tagName);
          tagRequest.onsuccess = () => {
            const tag = tagRequest.result;
            if (tag && tag.usage > 1) {
              tagStore.put({ ...tag, usage: tag.usage - 1 });
            } else if (tag) {
              tagStore.delete(tagName);
            }
          };
        }
      });
      
      // Increase count for new tags
      newTags.forEach(tagName => {
        if (!oldTags.includes(tagName)) {
          const tagRequest = tagStore.get(tagName);
          tagRequest.onsuccess = () => {
            const existingTag = tagRequest.result;
            const updatedTag = existingTag 
              ? { ...existingTag, usage: existingTag.usage + 1 }
              : { name: tagName, usage: 1 };
            tagStore.put(updatedTag);
          };
        }
      });
      
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  async updateReferenceCategory(id: string, category: 'people' | 'places' | 'props' | 'unorganized'): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['references'], 'readwrite');
      const store = transaction.objectStore('references');
      
      const getRequest = store.get(id);
      getRequest.onsuccess = () => {
        const reference = getRequest.result;
        if (reference) {
          reference.category = category;
          const putRequest = store.put(reference);
          putRequest.onsuccess = () => resolve();
          putRequest.onerror = () => reject(putRequest.error);
        } else {
          resolve();
        }
      };
      getRequest.onerror = () => reject(getRequest.error);
      
      transaction.onerror = () => reject(transaction.error);
    });
  }

  async exportLibrary(): Promise<Blob> {
    const references = await this.getAllReferences();
    
    // For now, export as JSON with embedded base64 images
    // We can add JSZip later if needed
    const exportData = {
      version: '1.0',
      exportDate: new Date().toISOString(),
      references: references.map(ref => ({
        id: ref.id,
        imageData: ref.imageData,
        tags: ref.tags,
        category: ref.category,
        createdAt: ref.createdAt,
        source: ref.source
      }))
    };
    
    const jsonString = JSON.stringify(exportData, null, 2);
    return new Blob([jsonString], { type: 'application/json' });
  }

  async importLibrary(jsonFile: File, mode: 'merge' | 'overwrite'): Promise<{ imported: number; skipped: number; errors: string[] }> {
    if (!this.db) throw new Error('Database not initialized');
    
    try {
      const fileText = await jsonFile.text();
      const importData = JSON.parse(fileText);
      
      if (!importData.references || !Array.isArray(importData.references)) {
        throw new Error('Invalid library file: missing or invalid references array');
      }
      
      // Clear existing data if overwrite mode
      if (mode === 'overwrite') {
        await this.clearAllReferences();
      }
      
      let imported = 0;
      let skipped = 0;
      const errors: string[] = [];
      
      // Process each reference
      for (const refData of importData.references) {
        try {
          // Check if reference already exists (for merge mode)
          if (mode === 'merge') {
            const existing = await this.getReference(refData.id);
            if (existing) {
              skipped++;
              continue;
            }
          }
          
          // Create reference object
          const reference: LibraryImageReference = {
            id: refData.id || Date.now().toString() + Math.random().toString(36).substr(2, 9),
            imageData: refData.imageData || '',
            tags: refData.tags || [],
            category: refData.category || 'unorganized',
            createdAt: new Date(refData.createdAt || Date.now()),
            source: refData.source || 'uploaded'
          };
          
          // Save to database
          await this.saveReference(reference);
          imported++;
          
        } catch (error) {
          errors.push(`Error importing reference: ${error}`);
        }
      }
      
      return { imported, skipped, errors };
      
    } catch (error) {
      throw new Error(`Failed to import library: ${error}`);
    }
  }

  private async clearAllReferences(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['references'], 'readwrite');
      const store = transaction.objectStore('references');
      
      const clearRequest = store.clear();
      clearRequest.onsuccess = () => resolve();
      clearRequest.onerror = () => reject(clearRequest.error);
      
      transaction.onerror = () => reject(transaction.error);
    });
  }
}

// Singleton instance
export const referenceLibraryDB = new ReferenceLibraryDB();

// Helper functions
export async function saveImageToLibrary(
  imageUrl: string,
  tags: string[] = [],
  prompt?: string,
  source: 'generated' | 'uploaded' = 'generated',
  settings?: any,
  category: 'people' | 'places' | 'props' | 'unorganized' = 'unorganized'
): Promise<string> {
  // Convert image URL to base64
  const response = await fetch(imageUrl);
  const blob = await response.blob();
  const base64 = await new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.readAsDataURL(blob);
  });
  
  const reference: LibraryImageReference = {
    id: `ref_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    imageData: base64,
    preview: base64, // Use same image as preview for now
    tags,
    category,
    prompt,
    createdAt: new Date(),
    source,
    settings
  };
  
  await referenceLibraryDB.saveReference(reference);
  return reference.id;
}

export async function getLibraryTags(): Promise<string[]> {
  return await referenceLibraryDB.getAllTags();
}
