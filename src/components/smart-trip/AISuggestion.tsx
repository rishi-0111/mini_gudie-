/**
 * AISuggestion — ChatGPT-style AI suggestion + direct chat input
 * Shows emoji-rich suggestions, quick emoji chips, typewriter effect, chat input
 */

import { useRef, useEffect, useState, useCallback } from "react";
import gsap from "gsap";
import { Send, Sparkles } from "lucide-react";

interface ChatMessage {
  role: "ai" | "user";
  text: string;
}

interface AISuggestionProps {
  suggestion: string | null;
  isVisible: boolean;
  onChat?: (message: string) => Promise<string>;
  chatLoading?: boolean;
}

const QUICK_CHIPS = [
  { emoji: "🍽", label: "Food options" },
  { emoji: "🏨", label: "Stays nearby" },
  { emoji: "🛕", label: "Temples" },
  { emoji: "💡", label: "Money tips" },
  { emoji: "🌿", label: "Hidden spots" },
  { emoji: "🚌", label: "Bus timings" },
];

export default function AISuggestion({ suggestion, isVisible, onChat, chatLoading }: AISuggestionProps) {
  const ref = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [chatInput, setChatInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [showChat, setShowChat] = useState(false);

  useEffect(() => {
    if (!ref.current || !isVisible || !suggestion) return;
    gsap.fromTo(ref.current, { y: 30, opacity: 0, scale: 0.97 }, { y: 0, opacity: 1, scale: 1, duration: 0.5, ease: "power3.out" });

    if (textRef.current) {
      const lines = textRef.current.querySelectorAll(".suggestion-line");
      gsap.fromTo(
        lines,
        { opacity: 0, x: -10 },
        { opacity: 1, x: 0, stagger: 0.15, duration: 0.3, ease: "power2.out", delay: 0.3 }
      );
    }
  }, [suggestion, isVisible]);

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = useCallback(async (text: string) => {
    if (!text.trim() || !onChat) return;
    const userMsg = text.trim();
    setChatInput("");
    setMessages((prev) => [...prev, { role: "user", text: userMsg }]);

    try {
      const reply = await onChat(userMsg);
      setMessages((prev) => [...prev, { role: "ai", text: reply }]);
    } catch {
      setMessages((prev) => [...prev, { role: "ai", text: "Sorry, couldn't process that 😅" }]);
    }
  }, [onChat]);

  const handleChip = (label: string) => {
    handleSend(label);
    setShowChat(true);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend(chatInput);
    }
  };

  if (!isVisible || !suggestion) return null;

  const lines = suggestion.split("\n").filter((l) => l.trim());

  return (
    <div ref={ref} className="glass-card rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 to-accent/5 relative overflow-hidden">
      {/* Decorative blobs */}
      <div className="absolute -top-10 -right-10 w-32 h-32 bg-primary/10 rounded-full blur-2xl" />
      <div className="absolute -bottom-8 -left-8 w-24 h-24 bg-accent/10 rounded-full blur-xl" />

      <div className="p-5">
        {/* Header */}
        <div className="flex items-center gap-2 mb-3 relative">
          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
            <span className="text-sm">🤖</span>
          </div>
          <div className="flex-1">
            <div className="text-sm font-semibold">AI Travel Assistant</div>
            <div className="text-xs text-muted-foreground">Personalized suggestion</div>
          </div>
          {onChat && (
            <button
              onClick={() => { setShowChat(!showChat); setTimeout(() => inputRef.current?.focus(), 100); }}
              className="text-xs px-2.5 py-1 rounded-full bg-primary/10 text-primary font-medium hover:bg-primary/20 transition flex items-center gap-1"
            >
              <Sparkles className="w-3 h-3" />
              {showChat ? "Close" : "Chat"}
            </button>
          )}
        </div>

        {/* Suggestion text */}
        <div ref={textRef} className="space-y-1 relative mb-3">
          {lines.map((line, i) => (
            <div key={i} className="suggestion-line text-sm leading-relaxed">
              {line}
            </div>
          ))}
        </div>

        {/* Quick chips */}
        {onChat && (
          <div className="flex gap-1.5 flex-wrap mb-2">
            {QUICK_CHIPS.map((c) => (
              <button
                key={c.label}
                onClick={() => handleChip(c.label)}
                disabled={chatLoading}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-muted/60 hover:bg-primary/10 text-xs font-medium transition-all hover:scale-105 active:scale-95"
              >
                <span>{c.emoji}</span>
                <span>{c.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Chat panel */}
      {showChat && onChat && (
        <div className="border-t border-border/50">
          {/* Messages */}
          {messages.length > 0 && (
            <div className="max-h-48 overflow-y-auto px-5 py-3 space-y-2">
              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[85%] px-3 py-2 rounded-2xl text-sm ${
                      msg.role === "user"
                        ? "bg-primary text-primary-foreground rounded-br-sm"
                        : "bg-muted/80 rounded-bl-sm"
                    }`}
                  >
                    {msg.text}
                  </div>
                </div>
              ))}
              {chatLoading && (
                <div className="flex justify-start">
                  <div className="bg-muted/80 px-3 py-2 rounded-2xl rounded-bl-sm">
                    <span className="flex gap-1">
                      <span className="w-2 h-2 rounded-full bg-primary/40 animate-bounce" style={{ animationDelay: "0ms" }} />
                      <span className="w-2 h-2 rounded-full bg-primary/40 animate-bounce" style={{ animationDelay: "150ms" }} />
                      <span className="w-2 h-2 rounded-full bg-primary/40 animate-bounce" style={{ animationDelay: "300ms" }} />
                    </span>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>
          )}

          {/* Input */}
          <div className="flex items-center gap-2 px-4 py-3 border-t border-border/30">
            <input
              ref={inputRef}
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about food, stays, tips..."
              className="flex-1 text-sm bg-muted/40 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-primary/30"
              disabled={chatLoading}
            />
            <button
              onClick={() => handleSend(chatInput)}
              disabled={!chatInput.trim() || chatLoading}
              className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center hover:bg-primary/90 transition disabled:opacity-40"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
