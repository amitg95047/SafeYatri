import { useEffect, useRef, useState } from "react";
import { Bot, Copy, MessageCircle, RotateCcw, Send, Share2, WifiOff, X } from "lucide-react";
import type { AppUser } from "../services/auth";
import type { Incident } from "../types";
import {
  answerHelp,
  copySiteLink,
  journeyHelpBrief,
  shareSite,
  WHATSAPP_URL,
  type AppScreen,
  type HelpReply,
  type HelpContext,
} from "../services/help";
export function SupportMenu({
  onChat,
  onMessage,
}: {
  onChat: () => void;
  onMessage: (message: string) => void;
}) {
  return (
    <section className="support-menu">
      <span className="sidebar-label">NEED HELP?</span>
      <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer">
        <MessageCircle size={20} />
        WhatsApp Support
      </a>
      <button onClick={onChat}>
        <Bot size={20} />
        Chat with us
      </button>
      <button
        className="support-share"
        onClick={async () => {
          try {
            const message = await shareSite();
            if (message) onMessage(message);
          } catch (e) {
            onMessage(
              e instanceof Error
                ? e.message
                : "Sharing is unavailable. Try Copy Link.",
            );
          }
        }}
      >
        <Share2 size={20} />
        Share safeYatri
      </button>
      <button
        onClick={async () => {
          try {
            await copySiteLink();
            onMessage("Website link copied.");
          } catch (e) {
            onMessage(String(e));
          }
        }}
      >
        <Copy size={20} />
        Copy Link
      </button>
    </section>
  );
}
export function HelpPanel({
  user,
  reports,
  open,
  onOpen,
  onNavigate,
  context,
}: {
  user: AppUser;
  reports: Incident[];
  open: boolean;
  onOpen: (open: boolean) => void;
  onNavigate: (screen: AppScreen) => void;
  context?: HelpContext;
}) {
  const [messages, setMessages] = useState<
    { role: "user" | "assistant"; reply: HelpReply }[]
  >([]);
  const [input, setInput] = useState("");
  const end = useRef<HTMLDivElement>(null);
  const field = useRef<HTMLInputElement>(null);
  const launcher = useRef<HTMLButtonElement>(null);
  const resetConversation = () => {
    setMessages([
      {
        role: "assistant",
        reply: {
          text: `Hi ${user.name.split(" ")[0]}, I’m Yatri Help. I can explain mapped closures and alternatives for your journey, find community photos, help you prepare for lost signal, or answer account questions. I use loaded app data and prepared guidance, so check official notices before travelling.`,
          suggestions: ["Summarise my route", "Show route photos", "Offline information", "Travel checklist"],
        },
      },
    ]);
    setInput("");
  };
  useEffect(() => {
    resetConversation();
  }, [user.uid]);
  useEffect(() => {
    if (open) field.current?.focus();
  }, [open]);
  useEffect(() => {
    end.current?.scrollIntoView({ block: "nearest" });
  }, [messages]);
  const ask = (text: string) => {
    if (!text.trim()) return;
    const previousReply = messages.filter((message) => message.role === "assistant").at(-1)?.reply;
    const followUp = /^(yes|please|tell me more|more|go on)[.!?\s]*$/i.test(text.trim())
      ? previousReply?.suggestions?.[0]
      : undefined;
    setMessages((previous) => [
      ...previous.slice(-29),
      { role: "user", reply: { text: text.trim() } },
      { role: "assistant", reply: answerHelp(followUp || text, user, reports, context) },
    ]);
    setInput("");
  };
  const utility = async (action: "share" | "copy" | "brief") => {
    try {
      let message = "";
      if (action === "share") message = await shareSite();
      else if (action === "brief") {
        if (!context) throw new Error("Choose a journey in Explore first.");
        if (!navigator.clipboard?.writeText) throw new Error("Clipboard is unavailable in this browser. Use the journey summary to review your travel notes.");
        await navigator.clipboard.writeText(journeyHelpBrief(context, reports));
        message = "Journey brief copied, including its sync time. Paste it into your notes to keep it available without signal.";
      } else {
        await copySiteLink();
        message = "Website link copied.";
      }
      if (message)
        setMessages((previous) => [
          ...previous,
          { role: "assistant", reply: { text: message } },
        ]);
    } catch (error) {
      setMessages((previous) => [
        ...previous,
        {
          role: "assistant",
          reply: {
            text:
              error instanceof Error
                ? error.message
                : "That action is unavailable in this browser.",
          },
        },
      ]);
    }
  };
  const suggestions = messages.filter((message) => message.role === "assistant").at(-1)?.reply.suggestions || [
    "Summarise my route", "My account", "My report status",
    user.role === "reviewer" ? "Admin reviews" : "Travel checklist",
  ];
  const close = () => {
    onOpen(false);
    window.setTimeout(() => launcher.current?.focus(), 0);
  };
  return (
    <>
      {!open && (
        <button ref={launcher} className="chat-launcher" onClick={() => onOpen(true)} aria-haspopup="dialog" aria-expanded={false}>
          <Bot size={21} />
          Ask Yatri
        </button>
      )}
      {open && (
        <section
          className="chat-panel"
          role="dialog"
          aria-label="Yatri Help"
          onKeyDown={(e) => {
            if (e.key === "Escape") close();
          }}
        >
          <header>
            <span className="chat-bot-icon">
              <Bot size={22} />
            </span>
            <div>
              <strong>Yatri Help</strong>
              <small>{context?.offline ? "Available offline · saved app data" : context?.reportsSource === "cache" || context?.zonesSource === "cache" ? "Saved community information · guided help" : "Your journey companion · guided help"}</small>
            </div>
            <button
              className="icon-btn"
              aria-label="Start a new conversation"
              title="New conversation"
              onClick={() => { resetConversation(); field.current?.focus(); }}
            >
              <RotateCcw size={16} />
            </button>
            <button
              className="icon-btn"
              aria-label="Close chat"
              onClick={close}
            >
              <X size={18} />
            </button>
          </header>
          {context && (
            <div className={`chat-route-context${context.offline || context.reportsSource === "cache" || context.zonesSource === "cache" ? " is-offline" : ""}`}>
              {(context.offline || context.reportsSource === "cache" || context.zonesSource === "cache") && <WifiOff size={14} aria-hidden="true" />}
              <span>{context.from} → {context.to}</span>
              <small>{context.loading ? "Checking route…" : context.source === "cache" || context.offline ? "Last synced information" : "Selected journey"}</small>
            </div>
          )}
          <div className="chat-messages" role="log" aria-live="polite">
            {messages.map((m, index) => (
              <div className={`chat-message chat-${m.role}`} key={index}>
                <p>{m.reply.text}</p>
                {m.reply.utility === "whatsapp" && (
                  <a
                    className="chat-action-link"
                    href={WHATSAPP_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Open WhatsApp Support ↗
                  </a>
                )}
                {m.reply.utility && m.reply.utility !== "whatsapp" && (
                  <button
                    onClick={() =>
                      void utility(m.reply.utility as "share" | "copy" | "brief")
                    }
                  >
                    {m.reply.utility === "share" ? "Share safeYatri" : m.reply.utility === "brief" ? "Copy journey brief" : "Copy Link"}
                  </button>
                )}
                {m.reply.action && (
                  <button
                    onClick={() => {
                      onNavigate(m.reply.action!);
                      onOpen(false);
                    }}
                  >
                    {m.reply.label} →
                  </button>
                )}
              </div>
            ))}
            <div ref={end} />
          </div>
          <div className="chat-suggestions">
            {suggestions.map((q) => (
              <button key={q} onClick={() => ask(q)}>
                {q}
              </button>
            ))}
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              ask(input);
            }}
          >
            <input
              ref={field}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              maxLength={500}
              aria-label="Message Yatri Help"
              placeholder="How can I help?"
            />
            <button
              type="submit"
              disabled={!input.trim()}
              aria-label="Send message"
            >
              <Send size={18} />
            </button>
          </form>
        </section>
      )}
    </>
  );
}
