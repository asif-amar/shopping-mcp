export interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
}

export interface Conversation {
  id: string;
  hostname: string;
  messages: Message[];
  createdAt: Date;
  lastUpdated: Date;
}

export interface StorageData {
  conversations: Record<string, Conversation>;
  settings: {
    maxConversations: number;
    maxMessagesPerConversation: number;
  };
}

export interface StorageEvent {
  type: 'TAB_CHANGE' | 'MESSAGE_SAVED' | 'CONVERSATION_LOADED';
  data: {
    hostname?: string;
    conversationId?: string;
    message?: Message;
  };
}

export const DEFAULT_STORAGE_SETTINGS = {
  maxConversations: 50,
  maxMessagesPerConversation: 100
};