// Background script for shopAI side panel extension
import { ConversationManager } from '@/services/ConversationManager';

let currentHostname: string | null = null;

chrome.runtime.onInstalled.addListener(() => {
  console.log('shopAI extension installed');
});

// Handle extension icon click to open side panel
chrome.action.onClicked.addListener((tab) => {
  if (tab.id) {
    chrome.sidePanel.open({ windowId: tab.windowId });
  }
});

// Listen for tab changes
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  const tab = await chrome.tabs.get(activeInfo.tabId);
  if (tab.url) {
    const conversationManager = ConversationManager.getInstance();
    const hostname = conversationManager.extractHostname(tab.url);
    
    if (hostname !== currentHostname) {
      currentHostname = hostname;
      
      // Notify sidepanel about hostname change
      try {
        await chrome.runtime.sendMessage({
          type: 'HOSTNAME_CHANGED',
          data: { hostname }
        });
      } catch (error) {
        // Sidepanel might not be open, that's okay
      }
    }
  }
});

// Listen for tab URL changes
chrome.tabs.onUpdated.addListener(async (_tabId, changeInfo, tab) => {
  if (changeInfo.url && tab.active) {
    const conversationManager = ConversationManager.getInstance();
    const hostname = conversationManager.extractHostname(changeInfo.url);
    
    if (hostname !== currentHostname) {
      currentHostname = hostname;
      
      // Notify sidepanel about hostname change
      try {
        await chrome.runtime.sendMessage({
          type: 'HOSTNAME_CHANGED',
          data: { hostname }
        });
      } catch (error) {
        // Sidepanel might not be open, that's okay
      }
    }
  }
});

// Enhanced message handling
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  console.log('Received message:', message);
  
  const handleMessage = async () => {
    const conversationManager = ConversationManager.getInstance();
    
    switch (message.type) {
      case 'PING':
        return { success: true, message: 'pong' };
        
      case 'GET_CURRENT_HOSTNAME':
        const hostname = await conversationManager.getCurrentHostname();
        currentHostname = hostname;
        return { hostname };
        
      case 'GET_CONVERSATION':
        const conversation = await conversationManager.getConversation(message.data.hostname);
        return { conversation };
        
      case 'SAVE_MESSAGE':
        await conversationManager.addMessage(message.data.hostname, message.data.message);
        return { success: true };
        
      case 'CLEAR_CONVERSATION':
        await conversationManager.clearConversation(message.data.hostname);
        return { success: true };
        
      default:
        return { error: 'Unknown message type' };
    }
  };
  
  handleMessage()
    .then(sendResponse)
    .catch(error => sendResponse({ error: error.message }));
    
  return true; // Will respond asynchronously
});