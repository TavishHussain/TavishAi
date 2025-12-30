
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  MessageSquare, 
  Plus, 
  Trash2, 
  Send, 
  Copy, 
  RefreshCw, 
  Menu, 
  X,
  Image as ImageIcon,
  LogOut,
  User as UserIcon,
  Moon,
  Sun,
  ChevronRight,
  Sparkles,
  Check,
  Smartphone
} from 'lucide-react';
import { getAIResponse } from './services/geminiService';
import { User, Chat, Message, Theme } from './types';

// --- Logo Component ---
const Logo: React.FC<{ size?: 'sm' | 'md' | 'lg' }> = ({ size = 'md' }) => {
  const dimensions = size === 'sm' ? 'w-6 h-6' : size === 'lg' ? 'w-12 h-12' : 'w-8 h-8';
  return (
    <div className="flex items-center gap-2 font-display font-extrabold tracking-tight">
      <div className={`${dimensions} premium-gradient rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20`}>
        <div className="w-1/2 h-1/2 bg-white rounded-sm rotate-45 transform"></div>
      </div>
      <span className={`${size === 'lg' ? 'text-4xl' : size === 'md' ? 'text-xl' : 'text-md'} dark:text-white text-slate-900`}>
        TAVISH<span className="text-blue-500">AI</span>
      </span>
    </div>
  );
};

export default function App() {
  // --- Core State ---
  const [user, setUser] = useState<User>(() => {
    const saved = localStorage.getItem('tavish_user');
    return saved ? JSON.parse(saved) : { name: '', phone: '', isLoggedIn: false };
  });
  const [loginStep, setLoginStep] = useState<1 | 2>(1);
  const [theme, setTheme] = useState<Theme>(() => (localStorage.getItem('tavish_theme') as Theme) || 'dark');
  const [chats, setChats] = useState<Chat[]>(() => {
    const saved = localStorage.getItem('tavish_chats');
    return saved ? JSON.parse(saved) : [{ id: 'default', messages: [], title: 'New Conversation', createdAt: Date.now() }];
  });
  const [currentChatId, setCurrentChatId] = useState<string>(() => localStorage.getItem('tavish_active_chat') || 'default');
  const [inputText, setInputText] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [errorToast, setErrorToast] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // --- Theme Logic ---
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    localStorage.setItem('tavish_theme', theme);
    const gsap = (window as any).gsap;
    if (gsap) {
      gsap.to('body', {
        backgroundColor: theme === 'dark' ? '#0B0F14' : '#FDFDFD',
        duration: 0.6,
        ease: 'power2.inOut'
      });
    }
  }, [theme]);

  // --- Sidebar GSAP Animation ---
  useEffect(() => {
    const gsap = (window as any).gsap;
    if (!gsap || !overlayRef.current || !sidebarRef.current) return;

    if (isSidebarOpen) {
      gsap.to(overlayRef.current, { opacity: 1, display: 'block', pointerEvents: 'auto', duration: 0.3 });
      gsap.to(sidebarRef.current, { x: 0, opacity: 1, duration: 0.5, ease: 'expo.out' });
    } else {
      gsap.to(overlayRef.current, { 
        opacity: 0, 
        pointerEvents: 'none', 
        duration: 0.3, 
        onComplete: () => {
          if (overlayRef.current) overlayRef.current.style.display = 'none';
        }
      });
      gsap.to(sidebarRef.current, { x: '-100%', opacity: 0, duration: 0.4, ease: 'power2.in' });
    }
  }, [isSidebarOpen]);

  useEffect(() => {
    localStorage.setItem('tavish_user', JSON.stringify(user));
  }, [user]);

  useEffect(() => {
    localStorage.setItem('tavish_chats', JSON.stringify(chats));
  }, [chats]);

  useEffect(() => {
    localStorage.setItem('tavish_active_chat', currentChatId);
  }, [currentChatId]);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chats, currentChatId, isTyping]);

  // --- Handlers ---
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (loginStep === 1 && user.phone.length >= 10) {
      setLoginStep(2);
    } else if (loginStep === 2 && user.name.trim()) {
      setUser({ ...user, isLoggedIn: true });
    }
  };

  const handleLogout = () => {
    setUser({ name: '', phone: '', isLoggedIn: false });
    setLoginStep(1);
    localStorage.removeItem('tavish_user');
    localStorage.removeItem('tavish_active_chat');
    localStorage.removeItem('tavish_chats');
    setChats([{ id: 'default', messages: [], title: 'New Conversation', createdAt: Date.now() }]);
    setCurrentChatId('default');
  };

  const startNewChat = () => {
    const currentChat = chats.find(c => c.id === currentChatId);
    // VALIDATION: Only allow new chat if current one has messages
    if (!currentChat || currentChat.messages.length === 0) {
      showError("Please send at least one message before starting a new chat.");
      return;
    }
    const newId = Date.now().toString();
    const newChat: Chat = { id: newId, messages: [], title: 'New Conversation', createdAt: Date.now() };
    setChats([newChat, ...chats]);
    setCurrentChatId(newId);
    setIsSidebarOpen(false);
  };

  const showError = (msg: string) => {
    setErrorToast(msg);
    setTimeout(() => setErrorToast(null), 3000);
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputText.trim() && !selectedImage) return;

    const currentMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      text: inputText,
      timestamp: Date.now(),
      image: selectedImage || undefined
    };

    const targetId = currentChatId;
    setChats(prev => prev.map(c => {
      if (c.id === targetId) {
        const newTitle = c.messages.length === 0 ? (inputText.slice(0, 35) || 'Vision Analysis') : c.title;
        return { ...c, title: newTitle, messages: [...c.messages, currentMsg] };
      }
      return c;
    }));

    setInputText('');
    setSelectedImage(null);
    setIsTyping(true);

    try {
      const activeChatMessages = chats.find(c => c.id === targetId)?.messages || [];
      const response = await getAIResponse(currentMsg.text, [...activeChatMessages, currentMsg], user.name, currentMsg.image);
      
      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'ai',
        text: response,
        timestamp: Date.now()
      };

      setChats(prev => prev.map(c => {
        if (c.id === targetId) {
          return { ...c, messages: [...c.messages, aiMsg] };
        }
        return c;
      }));
    } catch (err) {
      showError(`Hey ${user.name.split(' ')[0]}, something went wrong. Please try again.`);
    } finally {
      setIsTyping(false);
      setTimeout(() => textareaRef.current?.focus(), 100);
    }
  };

  const activeChat = useMemo(() => chats.find(c => c.id === currentChatId) || chats[0], [chats, currentChatId]);

  if (!user.isLoggedIn) {
    return (
      <div className={`h-screen w-full flex items-center justify-center p-6 ${theme === 'dark' ? 'bg-[#0B0F14] text-white' : 'bg-[#F9FAFB] text-slate-900'}`}>
        <div className={`w-full max-w-md p-10 rounded-[2.5rem] border animate-in fade-in zoom-in-95 duration-700 ${theme === 'dark' ? 'glass-card border-white/10 shadow-2xl' : 'bg-white border-slate-200 shadow-2xl shadow-slate-200/50'} space-y-8`}>
          <div className="flex flex-col items-center">
            <Logo size="lg" />
            <p className="mt-4 opacity-40 text-xs font-semibold tracking-[0.3em] uppercase">Private Intelligence</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            {loginStep === 1 ? (
              <div className="space-y-4">
                <div className="relative">
                  <Smartphone className="absolute left-5 top-1/2 -translate-y-1/2 text-blue-500/40" size={18} />
                  <input 
                    type="tel" 
                    placeholder="Phone number" 
                    className={`w-full border rounded-2xl py-5 pl-14 pr-4 focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all ${theme === 'dark' ? 'bg-white/5 border-white/10 placeholder:text-slate-600 text-white' : 'bg-slate-50 border-slate-200 placeholder:text-slate-400 text-slate-900'}`}
                    value={user.phone}
                    onChange={(e) => setUser({ ...user, phone: e.target.value })}
                    required
                  />
                </div>
                <button type="submit" disabled={user.phone.length < 10} className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white py-5 rounded-2xl font-bold transition-all shadow-xl shadow-blue-500/20 flex items-center justify-center gap-2">
                  Continue <ChevronRight size={18} />
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="relative">
                  <UserIcon className="absolute left-5 top-1/2 -translate-y-1/2 text-blue-500/40" size={18} />
                  <input 
                    type="text" 
                    placeholder="Your name" 
                    className={`w-full border rounded-2xl py-5 pl-14 pr-4 focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all ${theme === 'dark' ? 'bg-white/5 border-white/10 placeholder:text-slate-600 text-white' : 'bg-slate-50 border-slate-200 placeholder:text-slate-400 text-slate-900'}`}
                    value={user.name}
                    onChange={(e) => setUser({ ...user, name: e.target.value })}
                    required
                    autoFocus
                  />
                </div>
                <button type="submit" disabled={!user.name.trim()} className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white py-5 rounded-2xl font-bold transition-all shadow-xl shadow-blue-500/20">
                  Begin Experience
                </button>
              </div>
            )}
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className={`h-screen w-full flex overflow-hidden flex-col md:flex-row transition-colors duration-500 ${theme === 'dark' ? 'bg-[#0B0F14] text-slate-100' : 'bg-[#FDFDFD] text-slate-800'}`}>
      
      {/* Toast */}
      {errorToast && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[100] bg-slate-900 text-white px-6 py-3 rounded-full shadow-2xl border border-white/10 text-sm font-medium flex items-center gap-3 animate-in slide-in-from-top-10">
          <Sparkles className="text-blue-400" size={16} />
          {errorToast}
        </div>
      )}

      {/* Navbar */}
      <nav className={`fixed top-0 left-0 right-0 h-16 z-50 flex items-center justify-between px-6 border-b backdrop-blur-2xl transition-all duration-500 ${theme === 'dark' ? 'border-white/5 bg-[#0B0F14]/80' : 'border-slate-200/40 bg-white/80'}`}>
        <div className="flex items-center gap-6">
          <button onClick={() => setIsSidebarOpen(true)} className={`p-2 rounded-xl transition-all active:scale-90 ${theme === 'dark' ? 'hover:bg-slate-500/10' : 'hover:bg-slate-100'}`}>
            <Menu size={22} />
          </button>
          <Logo size="md" />
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setTheme(prev => prev === 'dark' ? 'light' : 'dark')}
            className={`p-3 rounded-xl transition-all ${theme === 'dark' ? 'bg-white/5 text-yellow-400' : 'bg-slate-100 text-blue-600'}`}
          >
            {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
          </button>
          <button onClick={() => setChats(prev => prev.map(c => c.id === currentChatId ? { ...c, messages: [] } : c))} className={`p-3 rounded-xl transition-all ${theme === 'dark' ? 'bg-white/5 text-slate-400' : 'bg-slate-100 text-slate-500'}`} title="Clear Chat">
            <RefreshCw size={20} />
          </button>
        </div>
      </nav>

      {/* Sidebar Overlay */}
      <div 
        ref={overlayRef}
        onClick={() => setIsSidebarOpen(false)}
        className="fixed inset-0 z-[55] bg-black/40 backdrop-blur-[4px] hidden transition-opacity duration-300"
      />

      {/* Sidebar */}
      <aside 
        ref={sidebarRef}
        className={`fixed inset-y-0 left-0 w-80 z-[60] flex flex-col shadow-2xl transition-colors duration-500 transform -translate-x-full ${theme === 'dark' ? 'bg-[#0F172A] border-r border-white/5' : 'bg-white border-r border-slate-100'}`}
      >
        <div className={`h-16 flex items-center justify-between px-6 border-b ${theme === 'dark' ? 'border-white/5' : 'border-slate-100'}`}>
          <Logo size="sm" />
          <button onClick={() => setIsSidebarOpen(false)} className={`p-2 transition-all hover:bg-red-500/10 rounded-lg ${theme === 'dark' ? 'text-white/40 hover:text-red-400' : 'text-slate-400 hover:text-red-500'}`}>
            <X size={20} />
          </button>
        </div>
        
        <div className="p-4 flex-1 overflow-y-auto space-y-1.5 mt-2">
          <button onClick={startNewChat} className="w-full flex items-center gap-3 p-4 rounded-2xl bg-blue-600 text-white font-bold transition-all shadow-lg shadow-blue-600/20 active:scale-95 mb-6 hover:bg-blue-500">
            <Plus size={18} /> New Discussion
          </button>
          
          <div className="px-4 py-2 text-[10px] uppercase tracking-widest opacity-30 font-extrabold">History</div>
          {chats.map(chat => (
            <div 
              key={chat.id} 
              onClick={() => { setCurrentChatId(chat.id); setIsSidebarOpen(false); }}
              className={`group flex items-center justify-between p-3.5 rounded-2xl cursor-pointer transition-all ${currentChatId === chat.id ? (theme === 'dark' ? 'bg-blue-600/10 text-blue-500 font-semibold border border-blue-500/20' : 'bg-blue-50 text-blue-600 font-semibold border border-blue-500/10') : (theme === 'dark' ? 'hover:bg-white/5 opacity-50 hover:opacity-100 border border-transparent' : 'hover:bg-slate-50 opacity-60 hover:opacity-100 border border-transparent')}`}
            >
              <div className="flex items-center gap-3 truncate">
                <MessageSquare size={16} className={currentChatId === chat.id ? 'text-blue-500' : 'text-slate-400'} />
                <span className="truncate text-sm">{chat.title}</span>
              </div>
              <button 
                onClick={(e) => { e.stopPropagation(); setChats(prev => {
                  const filtered = prev.filter(c => c.id !== chat.id);
                  if (filtered.length === 0) return [{ id: 'default', messages: [], title: 'New Conversation', createdAt: Date.now() }];
                  return filtered;
                }); if (currentChatId === chat.id) setCurrentChatId('default'); }} 
                className="opacity-0 group-hover:opacity-100 p-1 rounded-lg hover:bg-red-500/10 hover:text-red-500 transition-all"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>

        <div className={`p-6 border-t space-y-4 ${theme === 'dark' ? 'border-white/5' : 'border-slate-100'}`}>
          <div className={`flex items-center gap-3 p-3 rounded-2xl ${theme === 'dark' ? 'bg-white/5' : 'bg-slate-50 border border-slate-100'}`}>
            <div className="w-10 h-10 rounded-xl premium-gradient flex items-center justify-center text-white font-bold shadow-lg">
              {user.name[0]}
            </div>
            <div className="flex flex-col min-w-0">
              <span className={`font-bold text-sm truncate ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{user.name}</span>
              <span className="text-[10px] opacity-40 font-bold uppercase tracking-wider">Access Tier: Pro</span>
            </div>
          </div>
          <button onClick={handleLogout} className="w-full flex items-center gap-2 p-3 rounded-xl hover:bg-red-500/10 text-red-500/60 hover:text-red-500 transition-all text-xs font-bold uppercase tracking-widest">
            <LogOut size={16} /> End Session
          </button>
        </div>
      </aside>

      {/* Main Container */}
      <main className="flex-1 flex flex-col h-full pt-16 relative overflow-hidden transition-all duration-500">
        <div className="flex-1 overflow-y-auto px-4 md:px-24 py-10 space-y-12">
          {activeChat.messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center space-y-8 max-w-2xl mx-auto py-20 animate-in fade-in slide-in-from-bottom-10 duration-1000">
              <div className={`w-24 h-24 rounded-[3rem] flex items-center justify-center transition-all duration-500 ${theme === 'dark' ? 'bg-blue-500/10 text-blue-400 shadow-[0_0_40px_rgba(59,130,246,0.1)]' : 'bg-blue-100 text-blue-600 shadow-2xl shadow-blue-500/10'}`}>
                <Sparkles size={48} className="animate-pulse" />
              </div>
              <div className="space-y-4">
                <h2 className="text-4xl md:text-6xl font-display font-extrabold tracking-tight">Elegance in Intelligence.</h2>
                <p className={`text-lg md:text-xl leading-relaxed font-light opacity-60 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-600'}`}>
                  Greetings, {user.name.split(' ')[0]}. I am <span className="text-blue-500 font-bold">Tavish</span>. 
                  How may I elevate your digital experience today?
                </p>
              </div>
              <div className="flex flex-wrap justify-center gap-3 w-full max-w-xl">
                {['Creative Strategy', 'Market Analysis', 'Professional Proposal', 'Refined Dialogue'].map(t => (
                  <button key={t} onClick={() => setInputText(`Help me with: ${t}`)} className={`px-6 py-3 rounded-2xl text-sm font-semibold transition-all active:scale-95 ${theme === 'dark' ? 'bg-white/5 border border-white/10 hover:border-blue-500/40 text-slate-300' : 'bg-white border border-slate-200 hover:border-blue-500/30 text-slate-600 shadow-md shadow-slate-200/20'}`}>
                    {t}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            activeChat.messages.map((msg) => (
              <div key={msg.id} className={`flex w-full ${msg.role === 'user' ? 'justify-end' : 'justify-start'} message-enter`}>
                <div className={`group flex flex-col gap-3 max-w-[85%] md:max-w-[75%] ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                  <div className={`relative p-6 rounded-[2.2rem] text-[15px] md:text-base leading-relaxed shadow-xl border transition-all duration-300 ${
                    msg.role === 'user' 
                    ? 'bg-blue-600 text-white rounded-tr-none border-blue-400 shadow-blue-500/10' 
                    : (theme === 'dark' ? 'bg-[#1E293B] text-slate-100 rounded-tl-none border-white/5' : 'bg-white text-slate-800 rounded-tl-none border-slate-100 shadow-2xl shadow-slate-200/40')
                  }`}>
                    {msg.image && <img src={msg.image} alt="Context" className="max-w-full rounded-2xl mb-4 border border-white/10 shadow-lg" />}
                    <div className="whitespace-pre-wrap">{msg.text}</div>

                    {msg.role === 'ai' && (
                      <button 
                        onClick={() => handleCopy(msg.text, msg.id)}
                        className={`absolute bottom-4 right-4 opacity-0 group-hover:opacity-40 hover:!opacity-100 transition-all ${theme === 'dark' ? 'text-white' : 'text-slate-400'}`}
                        title="Copy Response"
                      >
                        {copiedId === msg.id ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
                      </button>
                    )}
                  </div>
                  <span className="text-[10px] font-extrabold opacity-30 uppercase tracking-[0.3em] px-3">
                    {msg.role === 'user' ? 'Request' : 'Tavish Intelligence'} • {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            ))
          )}

          {isTyping && (
            <div className="flex justify-start message-enter">
              <div className={`px-7 py-5 rounded-[2rem] rounded-tl-none flex items-center gap-5 border transition-all duration-300 ${theme === 'dark' ? 'bg-[#1E293B] border-white/5' : 'bg-white border-slate-100 shadow-lg shadow-slate-200/30'}`}>
                <div className="flex gap-2">
                  <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                  <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                  <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></span>
                </div>
                <span className="text-[12px] font-bold text-blue-500 uppercase tracking-widest">Neural Processing...</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} className="h-44" />
        </div>

        {/* Floating Input Area */}
        <div className={`fixed bottom-0 left-0 right-0 p-5 md:p-12 z-40 transition-colors duration-500 ${theme === 'dark' ? 'bg-gradient-to-t from-[#0B0F14] via-[#0B0F14]/90 to-transparent' : 'bg-gradient-to-t from-[#FDFDFD] via-[#FDFDFD]/95 to-transparent'}`}>
          <div className="max-w-4xl mx-auto relative">
            {selectedImage && (
              <div className="mb-5 inline-block relative group animate-in slide-in-from-bottom-6 duration-400">
                <img src={selectedImage} alt="Preview" className="h-28 w-28 object-cover rounded-2xl border-2 border-blue-500 shadow-2xl transition-transform group-hover:scale-105" />
                <button onClick={() => setSelectedImage(null)} className="absolute -top-3 -right-3 bg-red-500 text-white p-2 rounded-full shadow-lg transition-all active:scale-90 hover:bg-red-600">
                  <X size={14} />
                </button>
              </div>
            )}
            
            <form onSubmit={handleSendMessage} className={`flex items-end gap-3 p-3.5 rounded-[2.5rem] border shadow-2xl transition-all backdrop-blur-3xl ${theme === 'dark' ? 'bg-slate-900/90 border-white/5 focus-within:border-blue-500/40' : 'bg-white/95 border-slate-200 focus-within:border-blue-500/40 shadow-slate-200/50'}`}>
              <div className="flex items-center">
                <input type="file" id="img-input" hidden accept="image/*" onChange={(e) => {
                  const file = e.target.files?.[0];
                  if(file) {
                    const reader = new FileReader();
                    reader.onload = () => setSelectedImage(reader.result as string);
                    reader.readAsDataURL(file);
                  }
                }} />
                <label htmlFor="img-input" className={`p-4 rounded-full cursor-pointer transition-all active:scale-90 ${theme === 'dark' ? 'hover:bg-white/5 text-blue-400' : 'hover:bg-slate-100 text-blue-600'}`}>
                  <ImageIcon size={24} />
                </label>
              </div>
              
              <textarea 
                ref={textareaRef}
                rows={1}
                placeholder="Compose a message..."
                className={`flex-1 bg-transparent border-none focus:outline-none py-4 text-base resize-none max-h-40 placeholder:opacity-40 font-medium ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}
                value={inputText}
                onChange={(e) => {
                  setInputText(e.target.value);
                  e.target.style.height = 'auto';
                  e.target.style.height = e.target.scrollHeight + 'px';
                }}
                onKeyDown={(e) => { if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }}
              />

              <button 
                type="submit"
                disabled={!inputText.trim() && !selectedImage}
                className={`p-4 rounded-full transition-all shadow-lg active:scale-90 ${inputText.trim() || selectedImage ? 'bg-blue-600 text-white shadow-blue-500/30' : 'bg-slate-500/10 text-slate-400 opacity-20 cursor-not-allowed'}`}
              >
                <Send size={24} />
              </button>
            </form>
            <div className={`text-[10px] text-center mt-6 opacity-40 uppercase tracking-[0.5em] font-extrabold font-display transition-colors duration-500 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
              Designed by <span className="text-blue-500">Tavish Hussain</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
