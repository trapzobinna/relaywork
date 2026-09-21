import React, { useState, useEffect, useRef } from 'react';
import { jobsApi } from '../api/endpoints';
import type { Message, User } from '../types';
import { Send } from 'lucide-react';

interface ChatBoxProps {
  jobId: number;
  currentUser: User;
}

export const ChatBox: React.FC<ChatBoxProps> = ({ jobId, currentUser }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const history = await jobsApi.getMessages(jobId);
        setMessages(history);
        scrollToBottom();
      } catch (err) {
        console.error('Failed to load chat history', err);
      }
    };

    fetchHistory();

    const token = localStorage.getItem('relaywork_token');
    const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';
    const wsBase = apiBase.replace(/^http/, 'ws');
    const wsUrl = `${wsBase}/chat/ws/${jobId}?token=${token}`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onmessage = (event) => {
      try {
        const newMsg: Message = JSON.parse(event.data);
        setMessages((prev) => [...prev, newMsg]);
        scrollToBottom();
      } catch (e) {
        console.error('WS parse error', e);
      }
    };

    return () => {
      ws.close();
    };
  }, [jobId]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const content = input.trim();
    setInput('');

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(content);
    } else {
      try {
        setLoading(true);
        const sent = await jobsApi.sendMessage(jobId, content);
        setMessages((prev) => [...prev, sent]);
        scrollToBottom();
      } catch (err) {
        console.error('Failed to send message via HTTP', err);
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="flex flex-col h-96 bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
      <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex items-center justify-between">
        <h3 className="font-bold text-gray-800 text-sm">Job Discussion & Quote Chat</h3>
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
          Live
        </span>
      </div>

      <div className="flex-1 p-4 overflow-y-auto space-y-3">
        {messages.length === 0 ? (
          <p className="text-center text-xs text-gray-400 my-auto py-12">
            No messages yet. Clarify job details or negotiate quotes here!
          </p>
        ) : (
          messages.map((msg, index) => {
            const isMe = msg.sender_id === currentUser.id;
            const timeString = msg.sent_at || msg.created_at ? new Date(msg.sent_at || msg.created_at || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
            return (
              <div
                key={msg.id || index}
                className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-xs md:max-w-md px-4 py-2.5 rounded-2xl text-sm ${
                    isMe
                      ? 'bg-blue-600 text-white rounded-br-none'
                      : 'bg-gray-100 text-gray-900 rounded-bl-none'
                  }`}
                >
                  <p>{msg.content}</p>
                </div>
                <span className="text-[10px] text-gray-400 mt-1 px-1">
                  {msg.sender_name || msg.sender?.full_name || (isMe ? 'You' : 'Other')} • {timeString}
                </span>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSend} className="p-3 bg-gray-50 border-t border-gray-200 flex space-x-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type your message or negotiate quote..."
          className="flex-1 border border-gray-300 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          type="submit"
          disabled={!input.trim() || loading}
          className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-2 rounded-xl flex items-center justify-center transition"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};
