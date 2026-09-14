"use client";

import { useState, useRef, useEffect } from "react";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  imageUrl?: string;
  revisedPrompt?: string;
  isGenerating?: boolean;
};

const SIZES = [
  { label: "1024x1024", value: "1024x1024" },
  { label: "1792x1024", value: "1792x1024" },
  { label: "1024x1792", value: "1024x1792" },
] as const;

function ShogunLogo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 40 40"
      fill="none"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M20 4L8 12V28L20 36L32 28V12L20 4Z"
        fill="#2d5a3d"
        stroke="#a3d54a"
        strokeWidth="1.5"
      />
      <text
        x="20"
        y="24"
        textAnchor="middle"
        fill="#a3d54a"
        fontSize="12"
        fontWeight="bold"
        fontFamily="Arial"
      >
        SG
      </text>
    </svg>
  );
}

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [size, setSize] = useState("1024x1024");
  const [mode, setMode] = useState<"image" | "chat">("image");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height =
        Math.min(textareaRef.current.scrollHeight, 160) + "px";
    }
  }, [input]);

  const uid = () => crypto.randomUUID();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const prompt = input.trim();
    if (!prompt || loading) return;

    const userMsg: Message = { id: uid(), role: "user", content: prompt };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    if (mode === "image") {
      const placeholderId = uid();
      setMessages((prev) => [
        ...prev,
        {
          id: placeholderId,
          role: "assistant",
          content: "Gerando sua imagem...",
          isGenerating: true,
        },
      ]);

      try {
        const res = await fetch("/api/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt, size }),
        });
        const data = await res.json();

        if (data.error) {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === placeholderId
                ? { ...m, content: `Erro: ${data.error}`, isGenerating: false }
                : m
            )
          );
        } else {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === placeholderId
                ? {
                    ...m,
                    content: data.revisedPrompt || "Imagem gerada!",
                    imageUrl: data.imageUrl,
                    isGenerating: false,
                  }
                : m
            )
          );
        }
      } catch {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === placeholderId
              ? {
                  ...m,
                  content: "Erro de conexao. Tente novamente.",
                  isGenerating: false,
                }
              : m
          )
        );
      }
    } else {
      const chatHistory = messages
        .filter((m) => !m.imageUrl && !m.isGenerating)
        .map((m) => ({ role: m.role, content: m.content }));
      chatHistory.push({ role: "user", content: prompt });

      const assistantId = uid();
      setMessages((prev) => [
        ...prev,
        {
          id: assistantId,
          role: "assistant",
          content: "Pensando...",
          isGenerating: true,
        },
      ]);

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: chatHistory }),
        });
        const data = await res.json();

        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? {
                  ...m,
                  content: data.error
                    ? `Erro: ${data.error}`
                    : data.content,
                  isGenerating: false,
                }
              : m
          )
        );
      } catch {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? {
                  ...m,
                  content: "Erro de conexao. Tente novamente.",
                  isGenerating: false,
                }
              : m
          )
        );
      }
    }

    setLoading(false);
  }

  function clearChat() {
    setMessages([]);
  }

  return (
    <div className="flex h-screen flex-col bg-background">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-border px-4 py-3 sm:px-6">
        <div className="flex items-center gap-3">
          <ShogunLogo className="h-9 w-9" />
          <div>
            <h1 className="text-lg font-bold text-shogun-lime">Shogun AI</h1>
            <p className="text-xs text-muted">Gerador de Imagens</p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <div className="flex rounded-lg border border-border bg-surface p-0.5">
            <button
              onClick={() => setMode("image")}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                mode === "image"
                  ? "bg-shogun-green text-shogun-lime"
                  : "text-muted hover:text-foreground"
              }`}
            >
              Imagem
            </button>
            <button
              onClick={() => setMode("chat")}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                mode === "chat"
                  ? "bg-shogun-green text-shogun-lime"
                  : "text-muted hover:text-foreground"
              }`}
            >
              Chat
            </button>
          </div>

          <button
            onClick={clearChat}
            className="rounded-lg border border-border px-3 py-1.5 text-xs text-muted transition-colors hover:border-shogun-lime hover:text-shogun-lime"
          >
            Limpar
          </button>
        </div>
      </header>

      {/* Messages area */}
      <main className="flex-1 overflow-y-auto px-4 py-4 sm:px-6">
        {messages.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
            <ShogunLogo className="h-16 w-16 opacity-30" />
            <div>
              <h2 className="text-xl font-semibold text-foreground">
                {mode === "image"
                  ? "Crie imagens incriveis"
                  : "Converse com a IA"}
              </h2>
              <p className="mt-1 max-w-md text-sm text-muted">
                {mode === "image"
                  ? "Descreva a imagem que deseja gerar e nossa IA vai criar para voce."
                  : "Converse com o assistente do Grupo Shogun para criar prompts ou tirar duvidas."}
              </p>
            </div>
            {mode === "image" && (
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                {[
                  "Logo futurista para empresa de tecnologia",
                  "Samurai em estilo cyberpunk",
                  "Paisagem japonesa ao por do sol",
                ].map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => setInput(suggestion)}
                    className="rounded-full border border-border bg-surface px-4 py-2 text-xs text-foreground transition-colors hover:border-shogun-lime hover:text-shogun-lime"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="mx-auto max-w-3xl space-y-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${
                msg.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-3 sm:max-w-[75%] ${
                  msg.role === "user"
                    ? "bg-shogun-green text-foreground"
                    : "bg-surface text-foreground"
                }`}
              >
                {msg.isGenerating && (
                  <div className="mb-2 flex items-center gap-2">
                    <div className="flex gap-1">
                      <span className="inline-block h-2 w-2 animate-bounce rounded-full bg-shogun-lime [animation-delay:0ms]" />
                      <span className="inline-block h-2 w-2 animate-bounce rounded-full bg-shogun-lime [animation-delay:150ms]" />
                      <span className="inline-block h-2 w-2 animate-bounce rounded-full bg-shogun-lime [animation-delay:300ms]" />
                    </div>
                  </div>
                )}
                <p className="whitespace-pre-wrap text-sm leading-relaxed">
                  {msg.content}
                </p>
                {msg.imageUrl && (
                  <div className="mt-3">
                    <img
                      src={msg.imageUrl}
                      alt="Imagem gerada"
                      className="rounded-xl"
                    />
                    <a
                      href={msg.imageUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 inline-block text-xs text-shogun-lime underline"
                    >
                      Abrir imagem em nova aba
                    </a>
                  </div>
                )}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </main>

      {/* Input area */}
      <footer className="border-t border-border px-4 py-3 sm:px-6">
        <form
          onSubmit={handleSubmit}
          className="mx-auto flex max-w-3xl flex-col gap-2 sm:flex-row sm:items-end"
        >
          {mode === "image" && (
            <select
              value={size}
              onChange={(e) => setSize(e.target.value)}
              className="rounded-lg border border-border bg-surface px-3 py-2 text-xs text-foreground outline-none focus:border-shogun-lime sm:w-auto"
            >
              {SIZES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          )}

          <div className="flex flex-1 items-end gap-2 rounded-xl border border-border bg-surface px-3 py-2 focus-within:border-shogun-lime">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e);
                }
              }}
              placeholder={
                mode === "image"
                  ? "Descreva a imagem que deseja gerar..."
                  : "Digite sua mensagem..."
              }
              rows={1}
              className="flex-1 resize-none bg-transparent text-sm text-foreground outline-none"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-shogun-lime text-shogun-dark transition-opacity disabled:opacity-30"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                className="h-4 w-4"
              >
                <path d="M3.105 2.288a.75.75 0 0 0-.826.95l1.414 4.926A1.5 1.5 0 0 0 5.135 9.25h6.115a.75.75 0 0 1 0 1.5H5.135a1.5 1.5 0 0 0-1.442 1.086l-1.414 4.926a.75.75 0 0 0 .826.95l14.095-5.762a.75.75 0 0 0 0-1.4L3.105 2.288Z" />
              </svg>
            </button>
          </div>
        </form>
        <p className="mt-2 text-center text-[10px] text-muted">
          Powered by OpenAI &middot; Grupo Shogun
        </p>
      </footer>
    </div>
  );
}
