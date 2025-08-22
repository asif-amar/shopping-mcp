import React, { useState, useRef, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import '@/styles/global.css';
import { Message } from '@/types/storage';

import { experimental_createMCPClient, generateText, stepCountIs } from 'ai';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp';
import { createGoogleGenerativeAI } from '@ai-sdk/google';

interface ChatMessage extends Message {}

const SidePanel: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentHostname, setCurrentHostname] = useState<string>('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Load conversation when component mounts or hostname changes
  const loadConversation = async (hostname: string) => {
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'GET_CONVERSATION',
        data: { hostname },
      });

      if (response.conversation) {
        const conversationMessages = response.conversation.messages.map(
          (msg: any) => ({
            ...msg,
            timestamp: new Date(msg.timestamp),
          })
        );
        setMessages(conversationMessages);
      } else {
        setMessages([]);
      }
    } catch (error) {
      console.error('Failed to load conversation:', error);
      setMessages([]);
    }
  };

  // Get current hostname and load conversation
  const initializeConversation = async () => {
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'GET_CURRENT_HOSTNAME',
      });

      if (response.hostname) {
        setCurrentHostname(response.hostname);
        await loadConversation(response.hostname);
      }
    } catch (error) {
      console.error('Failed to get current hostname:', error);
    }
  };

  // Listen for hostname changes from background script
  useEffect(() => {
    const handleMessage = (message: any) => {
      if (message.type === 'HOSTNAME_CHANGED') {
        const newHostname = message.data.hostname;
        setCurrentHostname(newHostname);
        loadConversation(newHostname);
      }
    };

    chrome.runtime.onMessage.addListener(handleMessage);

    // Initialize on mount
    initializeConversation();

    return () => {
      chrome.runtime.onMessage.removeListener(handleMessage);
    };
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isLoading || !currentHostname) return;

    const userMessage: ChatMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
      text: inputText.trim(),
      isUser: true,
      timestamp: new Date(),
    };

    // Add message to UI immediately
    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsLoading(true);

    // Save user message to storage
    try {
      await chrome.runtime.sendMessage({
        type: 'SAVE_MESSAGE',
        data: {
          hostname: currentHostname,
          message: userMessage,
        },
      });
    } catch (error) {
      console.error('Failed to save user message:', error);
    }

    const httpTransport = new StreamableHTTPClientTransport(
      new URL('http://localhost:8787/mcp')
    );

    const mcpClient = await experimental_createMCPClient({
      transport: httpTransport,
    });

    const tools = await mcpClient.tools();

    const google = createGoogleGenerativeAI({
      apiKey: 'AIzaSyAIXUQLMeXMefTYdOZuIZGA8DPw9ligsJU',
    });

    const response = await generateText({
      model: google('gemini-2.0-flash-exp'),
      tools,
      stopWhen: stepCountIs(5),
      messages: [
        {
          role: 'user',
          content: [{ type: 'text', text: inputText.trim() }],
        },
      ],
    });

    const assistantResponse = response.text;

    const botMessage: ChatMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
      text: assistantResponse,
      isUser: false,
      timestamp: new Date(),
    };

    // Add bot message to UI immediately
    setMessages(prev => [...prev, botMessage]);
    setIsLoading(false);

    // Save bot message to storage
    try {
      await chrome.runtime.sendMessage({
        type: 'SAVE_MESSAGE',
        data: {
          hostname: currentHostname,
          message: botMessage,
        },
      });
    } catch (error) {
      console.error('Failed to save bot message:', error);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as any);
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const clearConversation = async () => {
    if (confirm('Are you sure you want to clear this conversation?')) {
      setMessages([]);

      // Clear conversation in storage
      if (currentHostname) {
        try {
          await chrome.runtime.sendMessage({
            type: 'CLEAR_CONVERSATION',
            data: { hostname: currentHostname },
          });
        } catch (error) {
          console.error('Failed to clear conversation:', error);
        }
      }
    }
  };

  return (
    <div
      style={{
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        background: '#f8f9fa',
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '16px 20px',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          borderBottom: '1px solid #e9ecef',
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '32px',
              height: '32px',
              background: 'rgba(255,255,255,0.2)',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '16px',
            }}
          >
            🛍️
          </div>
          <div style={{ flex: 1 }}>
            <h1
              style={{
                margin: 0,
                fontSize: '18px',
                fontWeight: '600',
              }}
            >
              shopAI Chat
            </h1>
            <p
              style={{
                margin: '2px 0 0 0',
                fontSize: '12px',
                opacity: 0.8,
              }}
            >
              {currentHostname || 'Loading...'}
            </p>
          </div>
          <button
            onClick={clearConversation}
            style={{
              background: 'rgba(255,255,255,0.2)',
              border: 'none',
              color: 'white',
              borderRadius: '4px',
              padding: '6px 8px',
              fontSize: '12px',
              cursor: 'pointer',
              transition: 'background-color 0.2s ease',
            }}
            onMouseOver={e =>
              (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.3)')
            }
            onMouseOut={e =>
              (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.2)')
            }
            title="Clear conversation"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Messages */}
      <div
        style={{
          flex: 1,
          overflow: 'auto',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
        }}
      >
        {messages.map(message => (
          <div
            key={message.id}
            style={{
              display: 'flex',
              flexDirection: message.isUser ? 'row-reverse' : 'row',
              alignItems: 'flex-start',
              gap: '8px',
            }}
          >
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                background: message.isUser
                  ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                  : '#e9ecef',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '14px',
                flexShrink: 0,
              }}
            >
              {message.isUser ? '👤' : '🤖'}
            </div>

            <div
              style={{
                maxWidth: '70%',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
              }}
            >
              <div
                style={{
                  background: message.isUser ? '#667eea' : 'white',
                  color: message.isUser ? 'white' : '#333',
                  padding: '12px 16px',
                  borderRadius: message.isUser
                    ? '18px 18px 4px 18px'
                    : '18px 18px 18px 4px',
                  fontSize: '14px',
                  lineHeight: '1.4',
                  border: message.isUser ? 'none' : '1px solid #e9ecef',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                }}
              >
                {message.text}
              </div>
              <div
                style={{
                  fontSize: '11px',
                  color: '#6c757d',
                  textAlign: message.isUser ? 'right' : 'left',
                  paddingLeft: message.isUser ? '0' : '4px',
                  paddingRight: message.isUser ? '4px' : '0',
                }}
              >
                {formatTime(message.timestamp)}
              </div>
            </div>
          </div>
        ))}

        {isLoading && (
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '8px',
            }}
          >
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                background: '#e9ecef',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '14px',
                flexShrink: 0,
              }}
            >
              🤖
            </div>
            <div
              style={{
                background: 'white',
                padding: '12px 16px',
                borderRadius: '18px 18px 18px 4px',
                border: '1px solid #e9ecef',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  gap: '4px',
                  alignItems: 'center',
                }}
              >
                <div
                  style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    background: '#6c757d',
                    animation: 'pulse 1.4s infinite ease-in-out',
                  }}
                />
                <div
                  style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    background: '#6c757d',
                    animation: 'pulse 1.4s infinite ease-in-out 0.2s',
                  }}
                />
                <div
                  style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    background: '#6c757d',
                    animation: 'pulse 1.4s infinite ease-in-out 0.4s',
                  }}
                />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div
        style={{
          padding: '16px 20px',
          background: 'white',
          borderTop: '1px solid #e9ecef',
          flexShrink: 0,
        }}
      >
        <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '8px' }}>
          <textarea
            value={inputText}
            onChange={e => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your message..."
            disabled={isLoading}
            style={{
              flex: 1,
              minHeight: '40px',
              maxHeight: '120px',
              padding: '10px 12px',
              border: '1px solid #e9ecef',
              borderRadius: '20px',
              fontSize: '14px',
              fontFamily: 'inherit',
              resize: 'none',
              outline: 'none',
              transition: 'border-color 0.2s ease',
              background: isLoading ? '#f8f9fa' : 'white',
            }}
            onFocus={e => (e.target.style.borderColor = '#667eea')}
            onBlur={e => (e.target.style.borderColor = '#e9ecef')}
          />
          <button
            type="submit"
            disabled={!inputText.trim() || isLoading}
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              border: 'none',
              background:
                !inputText.trim() || isLoading
                  ? '#e9ecef'
                  : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              cursor:
                !inputText.trim() || isLoading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '16px',
              transition: 'all 0.2s ease',
              flexShrink: 0,
            }}
          >
            {isLoading ? '⏳' : '➤'}
          </button>
        </form>
      </div>

      <style>
        {`
          @keyframes pulse {
            0%, 60%, 100% { 
              transform: scale(0.8);
              opacity: 0.5;
            }
            30% { 
              transform: scale(1);
              opacity: 1;
            }
          }
        `}
      </style>
    </div>
  );
};

// Initialize the side panel
const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<SidePanel />);
}
