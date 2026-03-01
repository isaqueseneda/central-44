"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useState, useRef, useEffect } from "react";
import {
  Bot,
  Send,
  X,
  MessageSquare,
  Loader2,
  Trash2,
  Sparkles,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const QUICK_ACTIONS = [
  { label: "Resumo geral", prompt: "Me dê um resumo geral do sistema" },
  {
    label: "OS pendentes",
    prompt: "Quais OS estão pendentes sem funcionário?",
  },
  {
    label: "Carga de trabalho",
    prompt: "Como está a carga de trabalho dos funcionários?",
  },
  {
    label: "Calcular custo",
    prompt: "Quanto custaria uma OS para São Paulo (300km, pedágio R$80)?",
  },
];

function getMessageText(
  message: ReturnType<typeof useChat>["messages"][number]
): string {
  // AI SDK v6: messages have `parts` array
  if (message.parts) {
    return message.parts
      .filter((p) => p.type === "text")
      .map((p) => (p as { type: "text"; text: string }).text)
      .join("");
  }
  // Fallback for older format
  if ("content" in message && typeof message.content === "string") {
    return message.content;
  }
  return "";
}

function MarkdownContent({ content }: { content: string }) {
  const lines = content.split("\n");

  return (
    <div className="space-y-1 text-sm leading-relaxed">
      {lines.map((line, i) => {
        if (line.startsWith("### ")) {
          return (
            <h4 key={i} className="mt-2 font-semibold text-zinc-100">
              {line.slice(4)}
            </h4>
          );
        }
        if (line.startsWith("## ")) {
          return (
            <h3 key={i} className="mt-3 font-bold text-zinc-100">
              {line.slice(3)}
            </h3>
          );
        }
        if (line.startsWith("# ")) {
          return (
            <h2 key={i} className="mt-3 text-base font-bold text-zinc-100">
              {line.slice(2)}
            </h2>
          );
        }

        const boldParsed = line.replace(
          /\*\*(.*?)\*\*/g,
          '<strong class="font-semibold text-zinc-100">$1</strong>'
        );

        if (line.startsWith("- ") || line.startsWith("* ")) {
          return (
            <div key={i} className="flex gap-2 pl-2">
              <span className="mt-0.5 shrink-0 text-zinc-500">•</span>
              <span
                dangerouslySetInnerHTML={{ __html: boldParsed.slice(2) }}
              />
            </div>
          );
        }

        const numMatch = line.match(/^(\d+)\.\s(.+)/);
        if (numMatch) {
          return (
            <div key={i} className="flex gap-2 pl-2">
              <span className="mt-0.5 min-w-[1.2em] shrink-0 text-right text-zinc-500">
                {numMatch[1]}.
              </span>
              <span
                dangerouslySetInnerHTML={{
                  __html: boldParsed.slice(numMatch[0].indexOf(numMatch[2])),
                }}
              />
            </div>
          );
        }

        if (line.trim() === "") {
          return <div key={i} className="h-1" />;
        }

        return (
          <p key={i} dangerouslySetInnerHTML={{ __html: boldParsed }} />
        );
      })}
    </div>
  );
}

export function AIChatSidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const { messages, sendMessage, status, setMessages } = useChat({
    transport: new DefaultChatTransport({ api: "/api/ai/chat" }),
  });

  const isLoading = status === "submitted" || status === "streaming";

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Focus input when sidebar opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const handleSend = async (text?: string) => {
    const messageText = text || inputValue.trim();
    if (!messageText || isLoading) return;
    setInputValue("");
    await sendMessage({ text: messageText });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <>
      {/* Floating toggle button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-label={isOpen ? "Fechar assistente" : "Abrir assistente"}
        className={cn(
          "fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full shadow-lg transition-all duration-300 hover:scale-105",
          isOpen
            ? "bg-zinc-800 text-zinc-400 hover:text-zinc-200"
            : "bg-yellow-400 text-zinc-900 hover:bg-yellow-300"
        )}
      >
        {isOpen ? <X className="h-6 w-6" /> : <Bot className="h-6 w-6" />}
      </button>

      {/* Chat sidebar panel */}
      <div
        className={cn(
          "fixed inset-y-0 right-0 z-40 flex w-full flex-col border-l border-zinc-800 bg-zinc-950 shadow-2xl transition-transform duration-300 ease-in-out sm:w-[420px]",
          isOpen ? "translate-x-0" : "translate-x-full"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-yellow-400/10 p-1.5">
              <Sparkles className="h-5 w-5 text-yellow-400" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-zinc-100">
                Assistente Central 44
              </h2>
              <p className="text-xs text-zinc-500">
                Consulte dados, calcule custos, analise OS
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {messages.length > 0 && (
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 text-zinc-500 hover:text-zinc-300"
                onClick={() => setMessages([])}
                aria-label="Limpar conversa"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 text-zinc-500 hover:text-zinc-300"
              onClick={() => setIsOpen(false)}
              aria-label="Fechar chat"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4">
          {messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-6 px-4">
              <div className="rounded-2xl bg-zinc-900 p-4">
                <Bot className="h-10 w-10 text-yellow-400" />
              </div>
              <div className="text-center">
                <h3 className="text-sm font-semibold text-zinc-200">
                  Olá! Como posso ajudar?
                </h3>
                <p className="mt-1 text-xs text-zinc-500">
                  Consulte dados do sistema, calcule custos ou analise suas
                  ordens de serviço.
                </p>
              </div>
              <div className="grid w-full gap-2">
                {QUICK_ACTIONS.map((action) => (
                  <button
                    key={action.label}
                    onClick={() => handleSend(action.prompt)}
                    className="flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900/50 px-3 py-2.5 text-left text-xs text-zinc-300 transition-colors hover:border-zinc-700 hover:bg-zinc-900 hover:text-zinc-100"
                  >
                    <ChevronRight className="h-3 w-3 shrink-0 text-yellow-400" />
                    {action.label}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((message) => {
                const text = getMessageText(message);
                if (!text && message.role === "assistant") return null;

                return (
                  <div
                    key={message.id}
                    className={cn(
                      "flex gap-2",
                      message.role === "user"
                        ? "justify-end"
                        : "justify-start"
                    )}
                  >
                    {message.role === "assistant" && (
                      <div className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-yellow-400/10 p-1.5">
                        <Bot className="h-4 w-4 text-yellow-400" />
                      </div>
                    )}
                    <div
                      className={cn(
                        "max-w-[85%] rounded-xl px-3 py-2",
                        message.role === "user"
                          ? "bg-yellow-400/15 text-zinc-100"
                          : "bg-zinc-900 text-zinc-300"
                      )}
                    >
                      {message.role === "user" ? (
                        <p className="text-sm">{text}</p>
                      ) : (
                        <MarkdownContent content={text} />
                      )}
                    </div>
                    {message.role === "user" && (
                      <div className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-zinc-800 p-1.5">
                        <MessageSquare className="h-4 w-4 text-zinc-400" />
                      </div>
                    )}
                  </div>
                );
              })}

              {isLoading && (
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-yellow-400/10 p-1.5">
                    <Bot className="h-4 w-4 text-yellow-400" />
                  </div>
                  <div className="rounded-xl bg-zinc-900 px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin text-yellow-400" />
                      <span className="text-xs text-zinc-500">
                        Consultando dados...
                      </span>
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input */}
        <div className="border-t border-zinc-800 p-4">
          <div className="flex gap-2">
            <textarea
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Pergunte sobre OS, lojas, custos..."
              rows={1}
              className="flex-1 resize-none rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-yellow-400/50 focus:outline-none focus:ring-1 focus:ring-yellow-400/20"
              style={{
                minHeight: "40px",
                maxHeight: "120px",
              }}
              onInput={(e) => {
                const target = e.target as HTMLTextAreaElement;
                target.style.height = "40px";
                target.style.height = `${Math.min(target.scrollHeight, 120)}px`;
              }}
            />
            <Button
              type="button"
              size="icon"
              disabled={isLoading || !inputValue.trim()}
              onClick={() => handleSend()}
              className="h-10 w-10 shrink-0 bg-yellow-400 text-zinc-900 hover:bg-yellow-300 disabled:bg-zinc-800 disabled:text-zinc-600"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
          <p className="mt-2 text-center text-[10px] text-zinc-600">
            Powered by OpenRouter • Gemini 2.5 Flash
          </p>
        </div>
      </div>

      {/* Backdrop on mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 sm:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  );
}
