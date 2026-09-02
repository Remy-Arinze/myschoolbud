'use client';

import React, { useState, useRef, useEffect } from 'react';
import { 
  Send, 
  Paperclip, 
  Trash2, 
  Sparkles, 
  Bot, 
  User, 
  Loader2, 
  Copy,
  Plus,
  ChevronDown,
  FileText,
  ArrowUp
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import { FadeInUp } from '@/components/ui/FadeInUp';
import { useAskAiMutation } from '@/lib/store/api/aiApi';
import { useGetMyTeacherProfileQuery } from '@/lib/store/api/schoolAdminApi';
import toast from 'react-hot-toast';
import { useTheme } from '@/contexts/ThemeContext';
import { useSelector } from 'react-redux';
import { RootState } from '@/lib/store/store';
import { streamErrorFromRtk, toastTextFromStreamError } from '@/lib/ai-chat-errors';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

interface AgoraAssistantProps {
  schoolId: string;
}

export const AgoraAssistant: React.FC<AgoraAssistantProps> = ({ schoolId }) => {
  const { theme } = useTheme();
  const user = useSelector((state: RootState) => state.auth.user);
  const { data: profileResponse } = useGetMyTeacherProfileQuery(undefined, {
    skip: user?.role !== 'TEACHER'
  });
  const firstName = profileResponse?.data?.firstName || user?.firstName || 'Teacher';
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [askAi, { isLoading }] = useAskAiMutation();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSendMessage = async (textOverride?: string) => {
    const text = textOverride || inputValue;
    if (!text.trim() || isLoading) return;

    const userMessage: Message = {
      role: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');

    try {
      const response = await askAi({
        schoolId,
        body: {
          messages: [...messages, userMessage].map(({ role, content }) => ({ role, content })),
        },
      }).unwrap();

      const assistantMessage: Message = {
        role: 'assistant',
        content: response.response,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error: unknown) {
      const payload = streamErrorFromRtk(error);
      toast.error(toastTextFromStreamError(payload), { duration: 8000 });
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  return (
    <div className="flex flex-col h-full bg-transparent text-light-text-primary dark:text-white overflow-hidden transition-colors duration-300" style={{ fontFamily: 'var(--font-sans)' }}>
      {/* Header */}
      <div className="px-6 py-4 flex items-center justify-between border-b border-light-border dark:border-white/5 bg-white/40 dark:bg-transparent backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-agora-blue dark:bg-indigo-600 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <h2 className="text-base font-semibold tracking-tight" style={{ fontFamily: 'var(--font-heading)' }}>Docs Assistant</h2>
        </div>
        <div className="flex items-center gap-2">
          <button className="p-2 rounded-xl hover:bg-light-hover dark:hover:bg-white/5 text-light-text-muted dark:text-white/40 transition-colors">
            <Plus size={20} />
          </button>
          <button className="p-2 rounded-xl hover:bg-light-hover dark:hover:bg-white/5 text-light-text-muted dark:text-white/40 transition-colors">
            <ChevronDown size={20} />
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto px-6 py-8 scrollbar-hide">
        {messages.length === 0 ? (
          <FadeInUp duration={0.6} className="space-y-8">
            <div className="space-y-2">
              <p className="text-[9px] items-center uppercase font-semibold tracking-[0.3em] text-light-text-muted dark:text-white/30">Authenticated: {firstName}</p>
              <h2 className="text-xl md:text-2xl font-semibold text-light-text-primary dark:text-white tracking-tight leading-tight" style={{ fontFamily: 'var(--font-heading)' }}>
                How can I help, <br className="md:hidden" /><span className="text-agora-blue">{firstName}?</span>
              </h2>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-2 text-light-text-primary dark:text-white/80 mb-2">
                <FileText size={16} className="text-light-text-muted dark:text-white/40" />
                <span className="text-xs font-semibold tracking-tight uppercase" style={{ fontFamily: 'var(--font-heading)' }}>Example Questions</span>
              </div>
              
              <div className="space-y-3">
                {[
                  "How do I get started with Conversational AI?",
                  "How do I integrate the Video SDK?",
                  "What is the Signaling SDK?"
                ].map((q, i) => (
                  <button 
                    key={i}
                    onClick={() => handleSendMessage(q)}
                    className="w-full p-4 rounded-xl bg-white/60 dark:bg-white/[0.03] border border-light-border dark:border-white/5 text-left text-light-text-primary dark:text-white/80 hover:bg-white/80 dark:hover:bg-white/[0.05] hover:border-agora-blue/30 dark:hover:border-white/10 transition-all font-medium text-sm shadow-sm"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          </FadeInUp>
        ) : (
          <div className="space-y-8">
            {messages.map((msg, idx) => (
              <FadeInUp key={idx} duration={0.4} delay={0}>
                <div className={cn(
                  "flex gap-4",
                  msg.role === 'user' ? "flex-row-reverse" : "flex-row"
                )}>
                  <div className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm transition-transform",
                    msg.role === 'assistant' ? "bg-agora-blue dark:bg-indigo-600 text-white" : "bg-light-card dark:bg-white/10 text-light-text-primary dark:text-white"
                  )}>
                    {msg.role === 'assistant' ? <Bot size={16} /> : <User size={16} />}
                  </div>
                  
                  <div className={cn(
                    "flex flex-col gap-2",
                    msg.role === 'user' ? "max-w-[85%] items-end" : "max-w-[85%] items-start"
                  )}>
                    <div className={cn(
                      "p-5 rounded-2xl md:rounded-[1.5rem] text-[15px] leading-relaxed shadow-sm",
                      msg.role === 'user' 
                        ? "bg-agora-blue text-white rounded-tr-none shadow-blue-500/20" 
                        : "bg-white/60 dark:bg-white/[0.03] border border-light-border dark:border-white/5 text-light-text-primary dark:text-white/90 rounded-tl-none"
                    )}>
                      {msg.content}
                    </div>
                    <div className="flex items-center gap-3 px-1">
                      <span className="text-[10px] text-light-text-muted dark:text-white/20 font-bold uppercase tracking-widest">{msg.timestamp}</span>
                      {msg.role === 'assistant' && (
                        <button onClick={() => handleCopy(msg.content)} className="text-light-text-muted dark:text-white/20 hover:text-agora-blue dark:hover:text-white transition-colors">
                          <Copy size={12} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </FadeInUp>
            ))}
            {isLoading && (
              <div className="flex gap-4 animate-in fade-in duration-500">
                <div className="w-8 h-8 rounded-lg bg-agora-blue dark:bg-indigo-600 flex items-center justify-center flex-shrink-0 animate-pulse">
                  <Bot size={16} />
                </div>
                <div className="bg-light-card/40 dark:bg-white/[0.03] border border-light-border dark:border-white/5 p-5 rounded-2xl rounded-tl-none flex gap-1.5 items-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-agora-blue animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-1.5 h-1.5 rounded-full bg-agora-blue animate-bounce" style={{ animationDelay: '200ms' }} />
                  <div className="w-1.5 h-1.5 rounded-full bg-agora-blue animate-bounce" style={{ animationDelay: '400ms' }} />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} className="h-4" />
          </div>
        )}
      </div>

      {/* Footer Info */}
      {messages.length === 0 && (
        <div className="px-6 py-4 bg-light-card/10 dark:bg-white/[0.01] border-t border-light-border dark:border-white/5">
          <p className="text-[11px] leading-relaxed text-light-text-muted dark:text-white/20 font-medium">
            This AI assistant provides automated answers based on our documentation and may not always reflect the most current or complete information. For critical or complex issues, please refer to the official documentation or <span className="text-agora-blue dark:text-indigo-400 underline underline-offset-4 cursor-pointer">contact support</span>
          </p>
        </div>
      )}

      {/* Input Section */}
      <div className="p-6 pt-2 bg-transparent">
        <div className="flex gap-3 items-end">
          <div className="flex-1 relative bg-white/60 dark:bg-white/[0.03] border border-light-border dark:border-white/10 rounded-2xl overflow-hidden focus-within:border-agora-blue dark:focus-within:border-white/20 transition-all shadow-sm">
            <textarea
              placeholder="Ask about Myschoolbud products..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              className="w-full bg-transparent border-none text-light-text-primary dark:text-white placeholder:text-light-text-muted dark:placeholder:text-white/20 p-4 focus:ring-0 text-[15px] font-medium resize-none max-h-32 min-h-[52px]"
              rows={1}
            />
          </div>
          <Button 
            onClick={() => handleSendMessage()}
            className="w-[52px] h-[52px] p-0 rounded-2xl bg-agora-blue dark:bg-white/[0.1] hover:bg-agora-blue/90 dark:hover:bg-white/20 text-white border-none shadow-none shrink-0 transition-all active:scale-95"
          >
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <ArrowUp className="w-5 h-5" />}
          </Button>
        </div>
      </div>
    </div>
  );
};
