import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../lib/AuthContext';
import { supabase } from '../lib/supabase';
import { MessageSquare, Send, User } from 'lucide-react';

export const Chat = () => {
  const { bureauId, bureauName, user, role } = useAuth();
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const fetchMessages = async () => {
    if (!bureauId) return;
    try {
      const { data, error } = await supabase
        .from('messages')
        .select(`
          *,
          sender:profiles(id, full_name, role)
        `)
        .eq('bureau_id', bureauId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data || []);
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setLoading(false);
      scrollToBottom();
    }
  };

  useEffect(() => {
    fetchMessages();

    if (bureauId) {
      const channel = supabase
        .channel('public:messages')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
            filter: `bureau_id=eq.${bureauId}`
          },
          (payload) => {
            // Fetch the entire message with the sender info since payload only has raw row
            fetchNewMessageData(payload.new.id);
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [bureauId]);

  const fetchNewMessageData = async (messageId: string) => {
    const { data, error } = await supabase
      .from('messages')
      .select(`
        *,
        sender:profiles(id, full_name, role)
      `)
      .eq('id', messageId)
      .single();
      
    if (!error && data) {
      setMessages(prev => {
        // Prevent duplicate messages if already present
        if (prev.find(m => m.id === data.id)) return prev;
        return [...prev, data];
      });
      setTimeout(scrollToBottom, 100);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user?.id || !bureauId) return;

    const content = newMessage.trim();
    setNewMessage(''); // clear input immediately for better UX

    try {
      const { error } = await supabase
        .from('messages')
        .insert([
          {
            bureau_id: bureauId,
            sender_id: user.id,
            content: content
          }
        ]);

      if (error) throw error;
      // Realtime subscription will handle appending to the UI
    } catch (error) {
      console.error('Error sending message:', error);
      alert("Erreur lors de l'envoi du message.");
    }
  };

  const formatMessageTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getRoleColor = (roleName: string) => {
    const colors: Record<string, string> = {
      'Super_admin': 'text-red-500 bg-red-50 border-red-100',
      'admin': 'text-purple-500 bg-purple-50 border-purple-100',
      'agent': 'text-blue-500 bg-blue-50 border-blue-100',
      'Secrétaire': 'text-emerald-500 bg-emerald-50 border-emerald-100',
      'Vagmeustre': 'text-amber-500 bg-amber-50 border-amber-100',
      'Directeur': 'text-indigo-500 bg-indigo-50 border-indigo-100',
      'client': 'text-gray-500 bg-gray-50 border-gray-100',
    };
    return colors[roleName] || 'text-gray-500 bg-gray-50 border-gray-100';
  };

  if (!bureauId && role !== 'Super_admin') {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-8rem)]">
        <p className="text-gray-500 font-medium">Vous n'êtes associé à aucun bureau pour utiliser le chat.</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto h-[calc(100vh-6rem)] flex flex-col bg-white shadow-xl rounded-3xl overflow-hidden border border-gray-100">
      {/* Header */}
      <div className="border-b border-gray-100 bg-white p-6 shadow-sm z-10 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="h-12 w-12 rounded-2xl bg-blue-50 flex items-center justify-center border border-blue-100 shadow-sm">
            <MessageSquare className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-gray-900 tracking-tight">Espace d'Échange</h1>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mt-1">
              {bureauName ? `Bureau : ${bureauName}` : 'Communication interne'}
            </p>
          </div>
        </div>
        <div className="hidden sm:flex items-center space-x-2">
          <div className="flex -space-x-2 overflow-hidden">
             {/* Decorative avatars representing team */}
            <div className="inline-block h-8 w-8 rounded-full ring-2 ring-white bg-blue-100 flex items-center justify-center"><User className="h-4 w-4 text-blue-500"/></div>
            <div className="inline-block h-8 w-8 rounded-full ring-2 ring-white bg-purple-100 flex items-center justify-center"><User className="h-4 w-4 text-purple-500"/></div>
            <div className="inline-block h-8 w-8 rounded-full ring-2 ring-white bg-amber-100 flex items-center justify-center"><User className="h-4 w-4 text-amber-500"/></div>
          </div>
          <span className="text-xs font-bold text-gray-400 bg-gray-50 px-2 py-1 rounded-full border border-gray-100">
            En direct
          </span>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-6 bg-gray-50/50 space-y-6">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="flex flex-col items-center space-y-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="text-sm font-bold text-gray-400">Chargement des messages...</p>
            </div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-4 opacity-50">
            <div className="h-16 w-16 bg-white rounded-full flex items-center justify-center shadow-sm mb-2">
              <MessageSquare className="h-8 w-8 text-gray-400" />
            </div>
            <p className="text-gray-500 font-medium">Aucun message pour le moment.</p>
            <p className="text-sm text-gray-400">Soyez le premier à lancer la discussion !</p>
          </div>
        ) : (
          messages.map((message, index) => {
            const isMine = message.sender_id === user?.id;
            const showHeader = index === 0 || messages[index - 1].sender_id !== message.sender_id;

            return (
              <div key={message.id} className={`flex w-full ${isMine ? 'justify-end' : 'justify-start'}`}>
                <div className={`flex max-w-[80%] ${isMine ? 'flex-row-reverse' : 'flex-row'}`}>
                  
                  {/* Avatar */}
                  {!isMine && showHeader ? (
                    <div className="flex-shrink-0 mr-3 mt-1">
                      <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center border border-gray-200 shadow-sm">
                        <span className="text-sm font-black text-gray-600 uppercase">
                          {message.sender?.full_name?.charAt(0) || 'U'}
                        </span>
                      </div>
                    </div>
                  ) : !isMine && !showHeader ? (
                    <div className="w-9 mr-3 flex-shrink-0"></div>
                  ) : null}

                  {/* Message Bubble container */}
                  <div className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}>
                    
                    {/* Sender Info (Only show if not mine and if previous message was from someone else) */}
                    {!isMine && showHeader && (
                      <div className="flex items-center space-x-2 mb-1.5 ml-1">
                        <span className="text-xs font-black text-gray-700">{message.sender?.full_name || 'Utilisateur inconnu'}</span>
                        <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border ${getRoleColor(message.sender?.role)}`}>
                          {message.sender?.role || 'Rôle inconnu'}
                        </span>
                      </div>
                    )}

                    {/* Bubble */}
                    <div 
                      className={`relative px-5 py-3.5 shadow-sm text-[15px] leading-relaxed ${
                        isMine 
                          ? 'bg-blue-600 text-white rounded-[1.5rem] rounded-tr-sm' 
                          : 'bg-white text-gray-800 rounded-[1.5rem] rounded-tl-sm border border-gray-100'
                      }`}
                    >
                      {message.content}
                      <span 
                        className={`block text-[10px] mt-2 font-medium ${
                          isMine ? 'text-blue-200 text-right' : 'text-gray-400 text-right'
                        }`}
                      >
                        {formatMessageTime(message.created_at)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="bg-white p-4 sm:p-5 border-t border-gray-100 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.02)] z-10 transition-all focus-within:bg-gray-50/50">
        <form onSubmit={handleSendMessage} className="flex items-end space-x-3 max-w-4xl mx-auto">
          <div className="relative flex-1">
            <textarea
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage(e);
                }
              }}
              placeholder="Écrivez votre message à l'équipe..."
              className="w-full bg-gray-100/50 border-gray-200 focus:bg-white rounded-2xl pl-5 pr-12 py-3.5 text-[15px] font-medium text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-blue-500 transition-all resize-none min-h-[52px] max-h-[120px]"
              rows={1}
              style={{
                height: "auto",
              }}
            />
          </div>
          <button
            type="submit"
            disabled={!newMessage.trim()}
            className="flex-shrink-0 h-[52px] px-6 rounded-2xl border border-transparent bg-blue-600 text-white font-bold hover:bg-blue-700 shadow-md transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center group"
          >
            <span className="hidden sm:inline mr-2">Envoyer</span>
            <Send className="h-5 w-5 sm:h-4 sm:w-4 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 transition-transform" />
          </button>
        </form>
        <p className="text-center text-[10px] text-gray-400 font-medium mt-3">
          Appuyez sur <kbd className="font-mono bg-gray-100 border border-gray-200 rounded px-1.5 py-0.5 mx-0.5 text-gray-500">Entrée</kbd> pour envoyer, <kbd className="font-mono bg-gray-100 border border-gray-200 rounded px-1.5 py-0.5 mx-0.5 text-gray-500">Maj + Entrée</kbd> pour revenir à la ligne.
        </p>
      </div>

    </div>
  );
};
