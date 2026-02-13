/**
 * AIChatPanel — Context-aware AI chat for devotional trips
 */
import { useState, useRef, useEffect } from "react";
import gsap from "gsap";
import { Send, X, MessageCircle, Sparkles } from "lucide-react";
import type { ChatMessage } from "@/hooks/useDevotional";

interface Props {
  messages: ChatMessage[];
  loading: boolean;
  onSendMessage: (message: string) => void;
  onClear: () => void;
  isOpen: boolean;
  onToggle: () => void;
  templeName?: string;
}

const AIChatPanel = ({ messages, loading, onSendMessage, onClear, isOpen, onToggle, templeName }: Props) => {
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const fabRef = useRef<HTMLButtonElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Panel slide animation
  useEffect(() => {
    if (!panelRef.current) return;
    if (isOpen) {
      gsap.fromTo(
        panelRef.current,
        { y: "100%", opacity: 0 },
        { y: 0, opacity: 1, duration: 0.4, ease: "power3.out" }
      );
    } else {
      gsap.to(panelRef.current, { y: "100%", opacity: 0, duration: 0.3, ease: "power2.in" });
    }
  }, [isOpen]);

  // FAB pulse
  useEffect(() => {
    if (!fabRef.current || isOpen) return;
    const anim = gsap.to(fabRef.current, {
      scale: 1.1,
      duration: 1,
      repeat: -1,
      yoyo: true,
      ease: "sine.inOut",
    });
    return () => { anim.kill(); };
  }, [isOpen]);

  const handleSend = () => {
    const msg = input.trim();
    if (!msg) return;
    onSendMessage(msg);
    setInput("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const quickQuestions = [
    "Is there early morning darshan?",
    "What about crowd today?",
    "Nearby food options?",
    "Can we reduce budget to ₹3000?",
  ];

  return (
    <>
      {/* FAB Toggle */}
      {!isOpen && (
        <button
          ref={fabRef}
          onClick={onToggle}
          className="fixed bottom-24 right-4 z-50 w-14 h-14 rounded-full
            bg-gradient-to-r from-orange-500 to-amber-500
            text-white shadow-lg flex items-center justify-center
            hover:shadow-xl transition-shadow"
          title="Ask AI about your trip"
        >
          <MessageCircle className="w-6 h-6" />
        </button>
      )}

      {/* Chat Panel */}
      <div
        ref={panelRef}
        className={`fixed bottom-0 left-0 right-0 z-50 ${isOpen ? "" : "pointer-events-none"}`}
        style={{ opacity: 0, transform: "translateY(100%)" }}
      >
        <div className="max-w-lg mx-auto bg-background/95 backdrop-blur-xl border border-border rounded-t-2xl shadow-2xl flex flex-col"
          style={{ height: "min(70vh, 500px)" }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-orange-500" />
              <div>
                <h3 className="font-bold text-sm">💬 Ask AI about your trip</h3>
                {templeName && (
                  <p className="text-xs text-muted-foreground">Context: {templeName}</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={onClear}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Clear
              </button>
              <button
                onClick={onToggle}
                className="w-8 h-8 rounded-full hover:bg-secondary flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
            {messages.length === 0 && (
              <div className="text-center py-6">
                <span className="text-4xl block mb-3">🛕</span>
                <p className="text-sm text-muted-foreground mb-4">
                  Ask anything about your devotional trip!
                </p>
                <div className="space-y-2">
                  {quickQuestions.map((q, i) => (
                    <button
                      key={i}
                      onClick={() => onSendMessage(q)}
                      className="block w-full text-left text-sm px-3 py-2 rounded-lg bg-secondary hover:bg-primary/10 transition-colors"
                    >
                      💬 {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] px-3 py-2 rounded-2xl text-sm whitespace-pre-line ${
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground rounded-br-md"
                      : "bg-secondary text-foreground rounded-bl-md"
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="bg-secondary px-4 py-2 rounded-2xl rounded-bl-md">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="px-4 py-3 border-t">
            <div className="flex items-center gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about darshan, budget, food..."
                className="flex-1 px-4 py-2.5 rounded-xl bg-secondary border-0 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                disabled={loading}
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || loading}
                className="w-10 h-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center
                  disabled:opacity-50 disabled:cursor-not-allowed
                  hover:bg-primary/90 transition-colors"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default AIChatPanel;
