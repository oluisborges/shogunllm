"use client";

import { useState, useRef, useEffect, useCallback } from "react";

// ── Types ──────────────────────────────────────────────────────────────────

type Attachment = {
  name: string;
  type: string;
  dataUrl: string;
};

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  imageUrl?: string;
  attachments?: Attachment[];
  isGenerating?: boolean;
};

type Chat = {
  id: string;
  title: string;
  mode: "image" | "chat";
  agentId?: string;
  messages: Message[];
  createdAt: number;
};

type Agent = {
  id: string;
  name: string;
  emoji: string;
  description: string;
  systemPrompt: string;
};

const PRESET_SIZES = [
  { label: "1024 x 1024 (Quadrado)", value: "1024x1024" },
  { label: "1792 x 1024 (Paisagem)", value: "1792x1024" },
  { label: "1024 x 1792 (Retrato)", value: "1024x1792" },
  { label: "Personalizado", value: "custom" },
];

const IMAGE_MODELS = [
  { label: "GPT Image 1", value: "gpt-image-1" },
  { label: "DALL-E 3", value: "dall-e-3" },
  { label: "DALL-E 2", value: "dall-e-2" },
];

const DEFAULT_AGENTS: Agent[] = [
  {
    id: "default",
    name: "Assistente Shogun",
    emoji: "⚔️",
    description: "Assistente geral do Grupo Shogun",
    systemPrompt:
      "Voce e o assistente de IA do Grupo Shogun. Ajude os usuarios a criar prompts de geracao de imagens. Responda sempre em portugues do Brasil de forma amigavel e profissional.",
  },
];

// ── Icons ──────────────────────────────────────────────────────────────────

function IconPlus({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={className}>
      <path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" />
    </svg>
  );
}

function IconClose({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={className}>
      <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
    </svg>
  );
}

function IconMenu({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={className}>
      <path fillRule="evenodd" d="M2 4.75A.75.75 0 0 1 2.75 4h14.5a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 4.75Zm0 10.5a.75.75 0 0 1 .75-.75h7.5a.75.75 0 0 1 0 1.5h-7.5a.75.75 0 0 1-.75-.75ZM2 10a.75.75 0 0 1 .75-.75h14.5a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 10Z" clipRule="evenodd" />
    </svg>
  );
}

function IconGear({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={className}>
      <path fillRule="evenodd" d="M7.84 1.804A1 1 0 0 1 8.82 1h2.36a1 1 0 0 1 .98.804l.331 1.652a6.993 6.993 0 0 1 1.929 1.115l1.598-.54a1 1 0 0 1 1.186.447l1.18 2.044a1 1 0 0 1-.205 1.251l-1.267 1.113a7.047 7.047 0 0 1 0 2.228l1.267 1.113a1 1 0 0 1 .206 1.25l-1.18 2.045a1 1 0 0 1-1.187.447l-1.598-.54a6.993 6.993 0 0 1-1.929 1.115l-.33 1.652a1 1 0 0 1-.98.804H8.82a1 1 0 0 1-.98-.804l-.331-1.652a6.993 6.993 0 0 1-1.929-1.115l-1.598.54a1 1 0 0 1-1.186-.447l-1.18-2.044a1 1 0 0 1 .205-1.251l1.267-1.114a7.05 7.05 0 0 1 0-2.227L1.821 7.773a1 1 0 0 1-.206-1.25l1.18-2.045a1 1 0 0 1 1.187-.447l1.598.54A6.993 6.993 0 0 1 7.51 3.456l.33-1.652ZM10 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" clipRule="evenodd" />
    </svg>
  );
}

function IconTrash({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className={className}>
      <path fillRule="evenodd" d="M5 3.25V4H2.75a.75.75 0 0 0 0 1.5h.3l.815 8.15A1.5 1.5 0 0 0 5.357 15h5.285a1.5 1.5 0 0 0 1.493-1.35l.815-8.15h.3a.75.75 0 0 0 0-1.5H11v-.75A2.25 2.25 0 0 0 8.75 1h-1.5A2.25 2.25 0 0 0 5 3.25Zm2.25-.75a.75.75 0 0 0-.75.75V4h3v-.75a.75.75 0 0 0-.75-.75h-1.5ZM6.05 6a.75.75 0 0 1 .787.713l.275 5.5a.75.75 0 0 1-1.498.075l-.275-5.5A.75.75 0 0 1 6.05 6Zm3.9 0a.75.75 0 0 1 .712.787l-.275 5.5a.75.75 0 0 1-1.498-.075l.275-5.5A.75.75 0 0 1 9.95 6Z" clipRule="evenodd" />
    </svg>
  );
}

function IconSend({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={className}>
      <path d="M3.105 2.288a.75.75 0 0 0-.826.95l1.414 4.926A1.5 1.5 0 0 0 5.135 9.25h6.115a.75.75 0 0 1 0 1.5H5.135a1.5 1.5 0 0 0-1.442 1.086l-1.414 4.926a.75.75 0 0 0 .826.95l14.095-5.762a.75.75 0 0 0 0-1.4L3.105 2.288Z" />
    </svg>
  );
}

function IconPaperclip({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={className}>
      <path fillRule="evenodd" d="M15.621 4.379a3 3 0 0 0-4.242 0l-7 7a3 3 0 0 0 4.241 4.243h.001l.497-.5a.75.75 0 0 1 1.064 1.057l-.498.501-.002.002a4.5 4.5 0 0 1-6.364-6.364l7-7a4.5 4.5 0 0 1 6.368 6.36l-3.455 3.553A2.625 2.625 0 1 1 9.52 9.52l3.45-3.451a.75.75 0 1 1 1.061 1.06l-3.45 3.451a1.125 1.125 0 0 0 1.587 1.595l3.454-3.553a3 3 0 0 0 0-4.242Z" clipRule="evenodd" />
    </svg>
  );
}

function IconRobot({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={className}>
      <path d="M10 2a.75.75 0 0 1 .75.75v1.5a.75.75 0 0 1-1.5 0v-1.5A.75.75 0 0 1 10 2ZM4 7a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7Zm3 2a1 1 0 1 0 0 2 1 1 0 0 0 0-2Zm5 1a1 1 0 1 1 2 0 1 1 0 0 1-2 0ZM7.5 14a.75.75 0 0 0 0 1.5h5a.75.75 0 0 0 0-1.5h-5Z" />
    </svg>
  );
}

function ShogunLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" fill="none" className={className}>
      <path d="M20 4L8 12V28L20 36L32 28V12L20 4Z" fill="#2d5a3d" stroke="#a3d54a" strokeWidth="1.5" />
      <text x="20" y="24" textAnchor="middle" fill="#a3d54a" fontSize="12" fontWeight="bold" fontFamily="Arial">SG</text>
    </svg>
  );
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function useLocalStorage<T>(key: string, initial: T): [T, (v: T | ((prev: T) => T)) => void] {
  const [value, setValue] = useState<T>(() => {
    try {
      const stored = localStorage.getItem(key);
      return stored ? JSON.parse(stored) : initial;
    } catch {
      return initial;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch { /* quota */ }
  }, [key, value]);

  return [value, setValue];
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsText(file);
  });
}

function isImageType(type: string) {
  return type.startsWith("image/");
}

// ── Main Component ──────────────────────────────────────────────────────────

export default function Home() {
  const [chats, setChats] = useLocalStorage<Chat[]>("shogun-chats", []);
  const [activeChatId, setActiveChatId] = useLocalStorage<string | null>("shogun-active-chat", null);
  const [apiKey, setApiKey] = useLocalStorage<string>("shogun-api-key", "");
  const [agents, setAgents] = useLocalStorage<Agent[]>("shogun-agents", DEFAULT_AGENTS);
  const [selectedAgentId, setSelectedAgentId] = useLocalStorage<string>("shogun-selected-agent", "default");

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [size, setSize] = useState("1024x1024");
  const [customW, setCustomW] = useState("1024");
  const [customH, setCustomH] = useState("1024");
  const [imageModel, setImageModel] = useState("gpt-image-1");
  const [mode, setMode] = useState<"image" | "chat">("image");
  const [pendingFiles, setPendingFiles] = useState<Attachment[]>([]);

  const [showSettings, setShowSettings] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  const [showAgents, setShowAgents] = useState(false);
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);
  const [tempKey, setTempKey] = useState("");

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const activeChat = chats.find((c) => c.id === activeChatId) ?? null;
  const messages = activeChat?.messages ?? [];
  const selectedAgent = agents.find((a) => a.id === selectedAgentId) ?? agents[0];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 160) + "px";
    }
  }, [input]);

  const uid = () => crypto.randomUUID();
  const resolvedSize = size === "custom" ? `${customW}x${customH}` : size;

  const updateChatMessages = useCallback(
    (chatId: string, updater: (msgs: Message[]) => Message[]) => {
      setChats((prev) =>
        prev.map((c) => (c.id === chatId ? { ...c, messages: updater(c.messages) } : c))
      );
    },
    [setChats]
  );

  function createNewChat() {
    const newChat: Chat = {
      id: uid(),
      title: mode === "image" ? "Nova geracao" : "Nova conversa",
      mode,
      agentId: mode === "chat" ? selectedAgentId : undefined,
      messages: [],
      createdAt: Date.now(),
    };
    setChats((prev) => [newChat, ...prev]);
    setActiveChatId(newChat.id);
    setShowSidebar(false);
    return newChat.id;
  }

  function deleteChat(chatId: string) {
    setChats((prev) => prev.filter((c) => c.id !== chatId));
    if (activeChatId === chatId) setActiveChatId(null);
  }

  function selectChat(chatId: string) {
    const chat = chats.find((c) => c.id === chatId);
    if (chat) {
      setMode(chat.mode);
      if (chat.agentId) setSelectedAgentId(chat.agentId);
      setActiveChatId(chatId);
      setShowSidebar(false);
    }
  }

  function reqHeaders() {
    const h: Record<string, string> = { "Content-Type": "application/json" };
    if (apiKey) h["x-api-key"] = apiKey;
    return h;
  }

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files) return;

    const newAttachments: Attachment[] = [];
    for (const file of Array.from(files)) {
      if (file.size > 20 * 1024 * 1024) continue;
      const dataUrl = isImageType(file.type)
        ? await readFileAsDataUrl(file)
        : await readFileAsText(file).then(
            (text) => `data:text/plain;base64,${btoa(unescape(encodeURIComponent(text)))}`
          );
      newAttachments.push({ name: file.name, type: file.type, dataUrl });
    }
    setPendingFiles((prev) => [...prev, ...newAttachments]);
    e.target.value = "";
  }

  function removeFile(index: number) {
    setPendingFiles((prev) => prev.filter((_, i) => i !== index));
  }

  function buildChatMessages(chatMsgs: Message[]) {
    return chatMsgs
      .filter((m) => !m.isGenerating)
      .map((m) => {
        if (m.attachments && m.attachments.length > 0) {
          const parts: Array<
            | { type: "text"; text: string }
            | { type: "image_url"; image_url: { url: string } }
          > = [];
          if (m.content) parts.push({ type: "text", text: m.content });
          for (const att of m.attachments) {
            if (isImageType(att.type)) {
              parts.push({ type: "image_url", image_url: { url: att.dataUrl } });
            } else {
              const text = atob(att.dataUrl.split(",")[1] || "");
              parts.push({
                type: "text",
                text: `[Arquivo: ${att.name}]\n${text}`,
              });
            }
          }
          return { role: m.role, content: parts };
        }
        return { role: m.role, content: m.content };
      });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const prompt = input.trim();
    if ((!prompt && pendingFiles.length === 0) || loading) return;

    let chatId = activeChatId;
    if (!chatId) chatId = createNewChat();

    const title = prompt
      ? prompt.length > 40
        ? prompt.slice(0, 40) + "..."
        : prompt
      : pendingFiles[0]?.name ?? "Arquivo";

    setChats((prev) =>
      prev.map((c) =>
        c.id === chatId && c.messages.length === 0
          ? { ...c, title, mode, agentId: mode === "chat" ? selectedAgentId : undefined }
          : c
      )
    );

    const userMsg: Message = {
      id: uid(),
      role: "user",
      content: prompt,
      attachments: pendingFiles.length > 0 ? [...pendingFiles] : undefined,
    };
    updateChatMessages(chatId, (msgs) => [...msgs, userMsg]);
    const attachments = [...pendingFiles];
    setInput("");
    setPendingFiles([]);
    setLoading(true);

    if (mode === "image") {
      const placeholderId = uid();
      updateChatMessages(chatId, (msgs) => [
        ...msgs,
        { id: placeholderId, role: "assistant", content: "Gerando sua imagem...", isGenerating: true },
      ]);

      try {
        const res = await fetch("/api/generate", {
          method: "POST",
          headers: reqHeaders(),
          body: JSON.stringify({ prompt, size: resolvedSize, model: imageModel }),
        });
        const data = await res.json();

        updateChatMessages(chatId, (msgs) =>
          msgs.map((m) =>
            m.id === placeholderId
              ? {
                  ...m,
                  content: data.error ? `Erro: ${data.error}` : data.revisedPrompt || "Imagem gerada!",
                  imageUrl: data.error ? undefined : data.imageUrl,
                  isGenerating: false,
                }
              : m
          )
        );
      } catch {
        updateChatMessages(chatId, (msgs) =>
          msgs.map((m) =>
            m.id === placeholderId
              ? { ...m, content: "Erro de conexao. Tente novamente.", isGenerating: false }
              : m
          )
        );
      }
    } else {
      const currentChat = chats.find((c) => c.id === chatId);
      const allMsgs = [...(currentChat?.messages ?? []), userMsg];
      const chatHistory = buildChatMessages(allMsgs);

      const agent = agents.find((a) => a.id === (currentChat?.agentId || selectedAgentId));

      const assistantId = uid();
      updateChatMessages(chatId, (msgs) => [
        ...msgs,
        { id: assistantId, role: "assistant", content: "Pensando...", isGenerating: true },
      ]);

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: reqHeaders(),
          body: JSON.stringify({
            messages: chatHistory,
            systemPrompt: agent?.systemPrompt,
          }),
        });
        const data = await res.json();

        updateChatMessages(chatId, (msgs) =>
          msgs.map((m) =>
            m.id === assistantId
              ? { ...m, content: data.error ? `Erro: ${data.error}` : data.content, isGenerating: false }
              : m
          )
        );
      } catch {
        updateChatMessages(chatId, (msgs) =>
          msgs.map((m) =>
            m.id === assistantId
              ? { ...m, content: "Erro de conexao. Tente novamente.", isGenerating: false }
              : m
          )
        );
      }
    }

    setLoading(false);
  }

  // ── Agent CRUD ────────────────────────────────────────────────────────────

  function saveAgent(agent: Agent) {
    setAgents((prev) => {
      const exists = prev.find((a) => a.id === agent.id);
      if (exists) return prev.map((a) => (a.id === agent.id ? agent : a));
      return [...prev, agent];
    });
    setEditingAgent(null);
  }

  function deleteAgent(agentId: string) {
    if (agentId === "default") return;
    setAgents((prev) => prev.filter((a) => a.id !== agentId));
    if (selectedAgentId === agentId) setSelectedAgentId("default");
  }

  // ── Grouped chats ─────────────────────────────────────────────────────────

  const groupedChats = (() => {
    const now = Date.now();
    const day = 86400000;
    const today: Chat[] = [];
    const week: Chat[] = [];
    const older: Chat[] = [];
    for (const c of chats) {
      const age = now - c.createdAt;
      if (age < day) today.push(c);
      else if (age < 7 * day) week.push(c);
      else older.push(c);
    }
    return { today, week, older };
  })();

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex h-screen bg-background">
      {showSidebar && (
        <div className="fixed inset-0 z-30 bg-black/50 lg:hidden" onClick={() => setShowSidebar(false)} />
      )}

      {/* ─── Sidebar ─────────────────────────────────────────────────────── */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-72 flex-col border-r border-border bg-surface transition-transform lg:static lg:translate-x-0 ${
          showSidebar ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="flex items-center gap-2">
            <ShogunLogo className="h-7 w-7" />
            <span className="text-sm font-bold text-shogun-lime">Shogun AI</span>
          </div>
          <button onClick={() => setShowSidebar(false)} className="text-muted hover:text-foreground lg:hidden">
            <IconClose className="h-5 w-5" />
          </button>
        </div>

        <div className="flex gap-2 px-3 pt-3">
          <button
            onClick={createNewChat}
            className="flex flex-1 items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm text-foreground transition-colors hover:border-shogun-lime hover:text-shogun-lime"
          >
            <IconPlus className="h-4 w-4" />
            Novo chat
          </button>
          <button
            onClick={() => { setShowAgents(true); setShowSidebar(false); }}
            className="flex items-center gap-1 rounded-lg border border-border px-2.5 py-2 text-sm text-foreground transition-colors hover:border-shogun-lime hover:text-shogun-lime"
            title="Agentes"
          >
            <IconRobot className="h-4 w-4" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-2">
          {[
            { label: "Hoje", items: groupedChats.today },
            { label: "Esta semana", items: groupedChats.week },
            { label: "Anteriores", items: groupedChats.older },
          ].map(
            (group) =>
              group.items.length > 0 && (
                <div key={group.label} className="mb-3">
                  <p className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-wider text-muted">
                    {group.label}
                  </p>
                  {group.items.map((chat) => {
                    const chatAgent = chat.agentId ? agents.find((a) => a.id === chat.agentId) : null;
                    return (
                      <div
                        key={chat.id}
                        className={`group flex items-center rounded-lg px-2 py-1.5 text-sm transition-colors cursor-pointer ${
                          chat.id === activeChatId
                            ? "bg-shogun-green/30 text-shogun-lime"
                            : "text-foreground hover:bg-surface-hover"
                        }`}
                        onClick={() => selectChat(chat.id)}
                      >
                        <span className="mr-2 text-xs opacity-60">
                          {chat.mode === "image" ? "🖼" : chatAgent?.emoji || "💬"}
                        </span>
                        <span className="flex-1 truncate">{chat.title}</span>
                        <button
                          onClick={(e) => { e.stopPropagation(); deleteChat(chat.id); }}
                          className="ml-1 hidden text-muted hover:text-red-400 group-hover:block"
                        >
                          <IconTrash className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )
          )}
          {chats.length === 0 && (
            <p className="px-2 py-8 text-center text-xs text-muted">Nenhum chat ainda</p>
          )}
        </nav>

        <div className="border-t border-border p-3">
          <button
            onClick={() => { setTempKey(apiKey); setShowSettings(true); setShowSidebar(false); }}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted transition-colors hover:bg-surface-hover hover:text-foreground"
          >
            <IconGear className="h-4 w-4" />
            Configuracoes
            {!apiKey && (
              <span className="ml-auto rounded bg-red-500/20 px-1.5 py-0.5 text-[10px] text-red-400">Sem chave</span>
            )}
          </button>
        </div>
      </aside>

      {/* ─── Main ────────────────────────────────────────────────────────── */}
      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="flex items-center gap-3">
            <button onClick={() => setShowSidebar(true)} className="text-muted hover:text-foreground lg:hidden">
              <IconMenu className="h-5 w-5" />
            </button>
            <h2 className="text-sm font-medium text-foreground truncate max-w-[200px] sm:max-w-none">
              {activeChat?.title ?? "Shogun AI"}
            </h2>
          </div>

          <div className="flex items-center gap-2">
            {/* Agent selector (chat mode) */}
            {mode === "chat" && (
              <select
                value={selectedAgentId}
                onChange={(e) => setSelectedAgentId(e.target.value)}
                className="rounded-lg border border-border bg-surface px-2 py-1.5 text-xs text-foreground outline-none focus:border-shogun-lime"
              >
                {agents.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.emoji} {a.name}
                  </option>
                ))}
              </select>
            )}

            <div className="flex rounded-lg border border-border bg-surface p-0.5">
              <button
                onClick={() => setMode("image")}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  mode === "image" ? "bg-shogun-green text-shogun-lime" : "text-muted hover:text-foreground"
                }`}
              >
                Imagem
              </button>
              <button
                onClick={() => setMode("chat")}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  mode === "chat" ? "bg-shogun-green text-shogun-lime" : "text-muted hover:text-foreground"
                }`}
              >
                Chat
              </button>
            </div>
          </div>
        </header>

        {/* ─── Messages ──────────────────────────────────────────────────── */}
        <main className="flex-1 overflow-y-auto px-4 py-4 sm:px-6">
          {messages.length === 0 && (
            <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
              <ShogunLogo className="h-16 w-16 opacity-30" />
              <div>
                <h2 className="text-xl font-semibold text-foreground">
                  {mode === "image" ? "Crie imagens incriveis" : `${selectedAgent?.emoji || "💬"} ${selectedAgent?.name || "Chat"}`}
                </h2>
                <p className="mt-1 max-w-md text-sm text-muted">
                  {mode === "image"
                    ? "Descreva a imagem que deseja gerar e nossa IA vai criar para voce."
                    : selectedAgent?.description || "Converse com o assistente."}
                </p>
              </div>
              {!apiKey && (
                <button
                  onClick={() => { setTempKey(""); setShowSettings(true); }}
                  className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-xs text-red-400 transition-colors hover:bg-red-500/20"
                >
                  Configure sua API Key para comecar
                </button>
              )}
              {mode === "image" && apiKey && (
                <div className="mt-2 flex flex-wrap justify-center gap-2">
                  {["Logo futurista para empresa de tecnologia", "Samurai em estilo cyberpunk", "Paisagem japonesa ao por do sol"].map(
                    (s) => (
                      <button
                        key={s}
                        onClick={() => setInput(s)}
                        className="rounded-full border border-border bg-surface px-4 py-2 text-xs text-foreground transition-colors hover:border-shogun-lime hover:text-shogun-lime"
                      >
                        {s}
                      </button>
                    )
                  )}
                </div>
              )}
            </div>
          )}

          <div className="mx-auto max-w-3xl space-y-4">
            {messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-3 sm:max-w-[75%] ${
                    msg.role === "user" ? "bg-shogun-green text-foreground" : "bg-surface text-foreground"
                  }`}
                >
                  {msg.isGenerating && (
                    <div className="mb-2 flex gap-1">
                      <span className="inline-block h-2 w-2 animate-bounce rounded-full bg-shogun-lime [animation-delay:0ms]" />
                      <span className="inline-block h-2 w-2 animate-bounce rounded-full bg-shogun-lime [animation-delay:150ms]" />
                      <span className="inline-block h-2 w-2 animate-bounce rounded-full bg-shogun-lime [animation-delay:300ms]" />
                    </div>
                  )}
                  {/* Attachments */}
                  {msg.attachments && msg.attachments.length > 0 && (
                    <div className="mb-2 flex flex-wrap gap-2">
                      {msg.attachments.map((att, i) =>
                        isImageType(att.type) ? (
                          <img
                            key={i}
                            src={att.dataUrl}
                            alt={att.name}
                            className="h-24 w-24 rounded-lg object-cover"
                          />
                        ) : (
                          <div key={i} className="flex items-center gap-1.5 rounded-lg bg-background/50 px-2 py-1">
                            <IconPaperclip className="h-3 w-3 text-muted" />
                            <span className="text-xs text-muted">{att.name}</span>
                          </div>
                        )
                      )}
                    </div>
                  )}
                  <p className="whitespace-pre-wrap text-sm leading-relaxed">{msg.content}</p>
                  {msg.imageUrl && (
                    <div className="mt-3">
                      <img src={msg.imageUrl} alt="Imagem gerada" className="rounded-xl" />
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

        {/* ─── Input ─────────────────────────────────────────────────────── */}
        <footer className="border-t border-border px-4 py-3 sm:px-6">
          <form onSubmit={handleSubmit} className="mx-auto flex max-w-3xl flex-col gap-2">
            {mode === "image" && (
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={imageModel}
                  onChange={(e) => setImageModel(e.target.value)}
                  className="rounded-lg border border-border bg-surface px-3 py-1.5 text-xs text-foreground outline-none focus:border-shogun-lime"
                >
                  {IMAGE_MODELS.map((m) => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
                <select
                  value={size}
                  onChange={(e) => setSize(e.target.value)}
                  className="rounded-lg border border-border bg-surface px-3 py-1.5 text-xs text-foreground outline-none focus:border-shogun-lime"
                >
                  {PRESET_SIZES.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
                {size === "custom" && (
                  <div className="flex items-center gap-1">
                    <input type="number" min="256" max="4096" step="64" value={customW} onChange={(e) => setCustomW(e.target.value)} className="w-20 rounded-lg border border-border bg-surface px-2 py-1.5 text-xs text-foreground outline-none focus:border-shogun-lime" placeholder="Largura" />
                    <span className="text-xs text-muted">x</span>
                    <input type="number" min="256" max="4096" step="64" value={customH} onChange={(e) => setCustomH(e.target.value)} className="w-20 rounded-lg border border-border bg-surface px-2 py-1.5 text-xs text-foreground outline-none focus:border-shogun-lime" placeholder="Altura" />
                  </div>
                )}
              </div>
            )}

            {/* Pending files preview */}
            {pendingFiles.length > 0 && (
              <div className="flex flex-wrap gap-2 rounded-lg border border-border bg-surface px-3 py-2">
                {pendingFiles.map((f, i) => (
                  <div key={i} className="group relative">
                    {isImageType(f.type) ? (
                      <img src={f.dataUrl} alt={f.name} className="h-16 w-16 rounded-lg object-cover" />
                    ) : (
                      <div className="flex h-16 items-center gap-1.5 rounded-lg bg-background px-3">
                        <IconPaperclip className="h-4 w-4 text-muted" />
                        <span className="max-w-[100px] truncate text-xs text-foreground">{f.name}</span>
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => removeFile(i)}
                      className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white opacity-0 transition-opacity group-hover:opacity-100"
                    >
                      <IconClose className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-end gap-2 rounded-xl border border-border bg-surface px-3 py-2 focus-within:border-shogun-lime">
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*,.txt,.csv,.json,.md,.py,.js,.ts,.html,.css,.pdf,.doc,.docx"
                onChange={handleFileSelect}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted transition-colors hover:text-shogun-lime"
                title="Anexar arquivo"
              >
                <IconPaperclip className="h-4 w-4" />
              </button>
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
                placeholder={mode === "image" ? "Descreva a imagem que deseja gerar..." : "Digite sua mensagem..."}
                rows={1}
                className="flex-1 resize-none bg-transparent text-sm text-foreground outline-none"
                disabled={loading}
              />
              <button
                type="submit"
                disabled={loading || (!input.trim() && pendingFiles.length === 0)}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-shogun-lime text-shogun-dark transition-opacity disabled:opacity-30"
              >
                <IconSend className="h-4 w-4" />
              </button>
            </div>
          </form>
          <p className="mt-2 text-center text-[10px] text-muted">Powered by OpenAI &middot; Grupo Shogun</p>
        </footer>
      </div>

      {/* ─── Settings Modal ──────────────────────────────────────────────── */}
      {showSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-foreground">Configuracoes</h3>
              <button onClick={() => setShowSettings(false)} className="text-muted hover:text-foreground">
                <IconClose className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">OpenAI API Key</label>
                <p className="mb-2 text-xs text-muted">
                  Sua chave fica salva apenas no seu navegador (localStorage). Ela nunca e armazenada no servidor.
                </p>
                <input
                  type="password"
                  value={tempKey}
                  onChange={(e) => setTempKey(e.target.value)}
                  placeholder="sk-..."
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-shogun-lime"
                />
              </div>
              {apiKey && (
                <div className="flex items-center gap-2 rounded-lg bg-shogun-green/20 px-3 py-2">
                  <span className="inline-block h-2 w-2 rounded-full bg-shogun-lime" />
                  <span className="text-xs text-shogun-lime">Chave configurada</span>
                </div>
              )}
              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => { setApiKey(tempKey); setShowSettings(false); }}
                  className="flex-1 rounded-lg bg-shogun-lime px-4 py-2 text-sm font-medium text-shogun-dark transition-opacity hover:opacity-90"
                >
                  Salvar
                </button>
                {apiKey && (
                  <button
                    onClick={() => { setApiKey(""); setTempKey(""); }}
                    className="rounded-lg border border-red-500/30 px-4 py-2 text-sm text-red-400 transition-colors hover:bg-red-500/10"
                  >
                    Remover
                  </button>
                )}
              </div>
            </div>

            <div className="mt-6 border-t border-border pt-4">
              <h4 className="mb-2 text-sm font-medium text-foreground">Limpar historico</h4>
              <p className="mb-3 text-xs text-muted">Apaga todas as conversas salvas no navegador.</p>
              <button
                onClick={() => { setChats([]); setActiveChatId(null); }}
                className="rounded-lg border border-red-500/30 px-4 py-2 text-xs text-red-400 transition-colors hover:bg-red-500/10"
              >
                Apagar tudo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Agents Modal ────────────────────────────────────────────────── */}
      {showAgents && !editingAgent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-lg rounded-2xl border border-border bg-surface p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-foreground">Agentes</h3>
              <button onClick={() => setShowAgents(false)} className="text-muted hover:text-foreground">
                <IconClose className="h-5 w-5" />
              </button>
            </div>
            <p className="mb-4 text-xs text-muted">
              Crie agentes com instrucoes personalizadas. Cada agente tem seu proprio prompt de sistema.
            </p>

            <div className="mb-4 space-y-2 max-h-72 overflow-y-auto">
              {agents.map((agent) => (
                <div
                  key={agent.id}
                  className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 transition-colors ${
                    selectedAgentId === agent.id ? "border-shogun-lime bg-shogun-green/20" : "border-border"
                  }`}
                >
                  <span className="text-xl">{agent.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{agent.name}</p>
                    <p className="text-xs text-muted truncate">{agent.description}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setSelectedAgentId(agent.id)}
                      className={`rounded px-2 py-1 text-[10px] font-medium transition-colors ${
                        selectedAgentId === agent.id
                          ? "bg-shogun-lime text-shogun-dark"
                          : "text-muted hover:text-foreground"
                      }`}
                    >
                      {selectedAgentId === agent.id ? "Ativo" : "Usar"}
                    </button>
                    <button
                      onClick={() => setEditingAgent({ ...agent })}
                      className="rounded p-1 text-muted hover:text-foreground"
                    >
                      <IconGear className="h-3.5 w-3.5" />
                    </button>
                    {agent.id !== "default" && (
                      <button
                        onClick={() => deleteAgent(agent.id)}
                        className="rounded p-1 text-muted hover:text-red-400"
                      >
                        <IconTrash className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={() =>
                setEditingAgent({
                  id: crypto.randomUUID(),
                  name: "",
                  emoji: "🤖",
                  description: "",
                  systemPrompt: "",
                })
              }
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-border py-2.5 text-sm text-muted transition-colors hover:border-shogun-lime hover:text-shogun-lime"
            >
              <IconPlus className="h-4 w-4" />
              Criar novo agente
            </button>
          </div>
        </div>
      )}

      {/* ─── Agent Editor Modal ──────────────────────────────────────────── */}
      {editingAgent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-lg rounded-2xl border border-border bg-surface p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-foreground">
                {agents.find((a) => a.id === editingAgent.id) ? "Editar agente" : "Novo agente"}
              </h3>
              <button onClick={() => setEditingAgent(null)} className="text-muted hover:text-foreground">
                <IconClose className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="flex gap-3">
                <div>
                  <label className="mb-1 block text-xs text-muted">Emoji</label>
                  <input
                    value={editingAgent.emoji}
                    onChange={(e) => setEditingAgent({ ...editingAgent, emoji: e.target.value })}
                    className="w-16 rounded-lg border border-border bg-background px-2 py-2 text-center text-lg outline-none focus:border-shogun-lime"
                    maxLength={4}
                  />
                </div>
                <div className="flex-1">
                  <label className="mb-1 block text-xs text-muted">Nome</label>
                  <input
                    value={editingAgent.name}
                    onChange={(e) => setEditingAgent({ ...editingAgent, name: e.target.value })}
                    placeholder="Ex: Copywriter"
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-shogun-lime"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted">Descricao curta</label>
                <input
                  value={editingAgent.description}
                  onChange={(e) => setEditingAgent({ ...editingAgent, description: e.target.value })}
                  placeholder="Ex: Especialista em textos persuasivos"
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-shogun-lime"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted">Instrucoes do sistema (System Prompt)</label>
                <textarea
                  value={editingAgent.systemPrompt}
                  onChange={(e) => setEditingAgent({ ...editingAgent, systemPrompt: e.target.value })}
                  placeholder="Ex: Voce e um copywriter profissional. Responda sempre em portugues..."
                  rows={5}
                  className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-shogun-lime"
                />
              </div>
            </div>

            <div className="mt-4 flex gap-2">
              <button
                onClick={() => {
                  if (!editingAgent.name.trim()) return;
                  saveAgent(editingAgent);
                }}
                disabled={!editingAgent.name.trim()}
                className="flex-1 rounded-lg bg-shogun-lime px-4 py-2 text-sm font-medium text-shogun-dark transition-opacity hover:opacity-90 disabled:opacity-40"
              >
                Salvar agente
              </button>
              <button
                onClick={() => setEditingAgent(null)}
                className="rounded-lg border border-border px-4 py-2 text-sm text-muted transition-colors hover:text-foreground"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
