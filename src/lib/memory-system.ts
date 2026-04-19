interface MemoryEntry {
  id: string;
  type: 'file' | 'command' | 'chat' | 'note';
  content: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export class MemorySystem {
  private memories: Map<string, MemoryEntry> = new Map();
  private maxMemories = 1000;

  addMemory(entry: Omit<MemoryEntry, 'id' | 'timestamp'>): MemoryEntry {
    const memory: MemoryEntry = {
      ...entry,
      id: `mem-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date()
    };

    this.memories.set(memory.id, memory);

    // Prune old memories if we exceed the limit
    if (this.memories.size > this.maxMemories) {
      const entries = Array.from(this.memories.entries());
      entries.sort((a, b) => a[1].timestamp.getTime() - b[1].timestamp.getTime());
      const toDelete = entries.slice(0, this.memories.size - this.maxMemories);
      toDelete.forEach(([id]) => this.memories.delete(id));
    }

    return memory;
  }

  getMemory(id: string): MemoryEntry | undefined {
    return this.memories.get(id);
  }

  getMemoriesByType(type: MemoryEntry['type']): MemoryEntry[] {
    return Array.from(this.memories.values())
      .filter(memory => memory.type === type)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  searchMemories(query: string): MemoryEntry[] {
    const lowerQuery = query.toLowerCase();
    return Array.from(this.memories.values())
      .filter(memory => 
        memory.content.toLowerCase().includes(lowerQuery) ||
        JSON.stringify(memory.metadata || {}).toLowerCase().includes(lowerQuery)
      )
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  deleteMemory(id: string): boolean {
    return this.memories.delete(id);
  }

  getAllMemories(): MemoryEntry[] {
    return Array.from(this.memories.values())
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  clearMemories(): void {
    this.memories.clear();
  }

  getStats(): { total: number; byType: Record<string, number> } {
    const byType: Record<string, number> = {};
    this.memories.forEach(memory => {
      byType[memory.type] = (byType[memory.type] || 0) + 1;
    });
    return {
      total: this.memories.size,
      byType
    };
  }
}

// Singleton instance
export const memorySystem = new MemorySystem();
