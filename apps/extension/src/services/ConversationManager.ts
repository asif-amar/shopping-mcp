import { 
  Message, 
  Conversation, 
  StorageData, 
  DEFAULT_STORAGE_SETTINGS 
} from '@/types/storage';

export class ConversationManager {
  private static instance: ConversationManager;
  private storageKey = 'shopai_conversations';

  private constructor() {}

  public static getInstance(): ConversationManager {
    if (!ConversationManager.instance) {
      ConversationManager.instance = new ConversationManager();
    }
    return ConversationManager.instance;
  }

  // Extract hostname from URL
  public extractHostname(url: string): string {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname;
    } catch {
      return 'unknown';
    }
  }

  // Get all storage data
  private async getStorageData(): Promise<StorageData> {
    return new Promise((resolve) => {
      chrome.storage.local.get([this.storageKey], (result) => {
        const data = result[this.storageKey] || {
          conversations: {},
          settings: DEFAULT_STORAGE_SETTINGS
        };
        resolve(data);
      });
    });
  }

  // Save storage data
  private async saveStorageData(data: StorageData): Promise<void> {
    return new Promise((resolve) => {
      chrome.storage.local.set({ [this.storageKey]: data }, () => {
        resolve();
      });
    });
  }

  // Get conversation for hostname
  public async getConversation(hostname: string): Promise<Conversation | null> {
    const data = await this.getStorageData();
    return data.conversations[hostname] || null;
  }

  // Create new conversation
  public async createConversation(hostname: string): Promise<Conversation> {
    const conversation: Conversation = {
      id: `conv_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
      hostname,
      messages: [],
      createdAt: new Date(),
      lastUpdated: new Date()
    };

    const data = await this.getStorageData();
    
    // Check if we need to cleanup old conversations
    await this.cleanupOldConversations(data);
    
    data.conversations[hostname] = conversation;
    await this.saveStorageData(data);
    
    return conversation;
  }

  // Add message to conversation
  public async addMessage(hostname: string, message: Message): Promise<void> {
    const data = await this.getStorageData();
    
    let conversation = data.conversations[hostname];
    if (!conversation) {
      conversation = await this.createConversation(hostname);
      data.conversations[hostname] = conversation;
    }

    // Add message
    conversation.messages.push(message);
    conversation.lastUpdated = new Date();

    // Limit messages per conversation
    if (conversation.messages.length > data.settings.maxMessagesPerConversation) {
      conversation.messages = conversation.messages.slice(-data.settings.maxMessagesPerConversation);
    }

    await this.saveStorageData(data);
  }

  // Get all conversations (for debugging/management)
  public async getAllConversations(): Promise<Record<string, Conversation>> {
    const data = await this.getStorageData();
    return data.conversations;
  }

  // Clear conversation for hostname
  public async clearConversation(hostname: string): Promise<void> {
    const data = await this.getStorageData();
    
    if (data.conversations[hostname]) {
      data.conversations[hostname].messages = [];
      data.conversations[hostname].lastUpdated = new Date();
      await this.saveStorageData(data);
    }
  }

  // Delete conversation completely
  public async deleteConversation(hostname: string): Promise<void> {
    const data = await this.getStorageData();
    delete data.conversations[hostname];
    await this.saveStorageData(data);
  }

  // Cleanup old conversations when limit is reached
  private async cleanupOldConversations(data: StorageData): Promise<void> {
    const conversations = Object.values(data.conversations);
    
    if (conversations.length >= data.settings.maxConversations) {
      // Sort by lastUpdated and remove oldest
      conversations.sort((a, b) => 
        new Date(a.lastUpdated).getTime() - new Date(b.lastUpdated).getTime()
      );
      
      const toRemove = conversations.slice(0, conversations.length - data.settings.maxConversations + 1);
      
      for (const conv of toRemove) {
        delete data.conversations[conv.hostname];
      }
    }
  }

  // Get current active tab hostname
  public async getCurrentHostname(): Promise<string> {
    return new Promise((resolve) => {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]?.url) {
          resolve(this.extractHostname(tabs[0].url));
        } else {
          resolve('unknown');
        }
      });
    });
  }

  // Load conversation for current tab
  public async loadCurrentConversation(): Promise<Conversation | null> {
    const hostname = await this.getCurrentHostname();
    return await this.getConversation(hostname);
  }
}