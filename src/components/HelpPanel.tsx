import { useEffect, useRef, useState } from "react";
import { Bot, Copy, MessageCircle, Send, Share2, X } from "lucide-react";
import type { AppUser } from "../services/auth";
import type { Incident } from "../types";
import {
  answerHelp,
  copySiteLink,
  shareSite,
  WHATSAPP_URL,
  type AppScreen,
  type HelpReply,
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
}: {
  user: AppUser;
  reports: Incident[];
  open: boolean;
  onOpen: (open: boolean) => void;
  onNavigate: (screen: AppScreen) => void;
}) {
  const [messages, setMessages] = useState<
    { role: "user" | "assistant"; reply: HelpReply }[]
  >([]);
  const [input, setInput] = useState("");
  const end = useRef<HTMLDivElement>(null);
  const field = useRef<HTMLInputElement>(null);
  useEffect(() => {
    setMessages([
      {
        role: "assistant",
        reply: {
          text: `Hi ${user.name.split(" ")[0]}, I’m Yatri Help. Ask about your account, reports, verification, rewards or Northeast destinations. I’m a guided helper; I don’t have live safety information.`,
        },
      },
    ]);
  }, [user.uid]);
  useEffect(() => {
    if (open) field.current?.focus();
  }, [open]);
  useEffect(() => {
    end.current?.scrollIntoView({ block: "nearest" });
  }, [messages]);
  const ask = (text: string) => {
    if (!text.trim()) return;
    setMessages((previous) => [
      ...previous.slice(-29),
      { role: "user", reply: { text: text.trim() } },
      { role: "assistant", reply: answerHelp(text, user, reports) },
    ]);
    setInput("");
  };
  const utility = async (action: "share" | "copy") => {
    try {
      const message =
        action === "share"
          ? await shareSite()
          : (await copySiteLink(), "Website link copied.");
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
  return (
    <>
      {!open && (
        <button className="chat-launcher" onClick={() => onOpen(true)}>
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
            if (e.key === "Escape") onOpen(false);
          }}
        >
          <header>
            <span className="chat-bot-icon">
              <Bot size={22} />
            </span>
            <div>
              <strong>Yatri Help</strong>
              <small>Guided assistant · no live road feed</small>
            </div>
            <button
              className="icon-btn"
              aria-label="Close chat"
              onClick={() => onOpen(false)}
            >
              <X size={18} />
            </button>
          </header>
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
                      void utility(m.reply.utility as "share" | "copy")
                    }
                  >
                    {m.reply.utility === "share"
                      ? "Share safeYatri"
                      : "Copy Link"}
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
            {[
              "My account",
              "Report a landslide",
              "My report status",
              user.role === "reviewer" ? "Admin reviews" : "Rewards",
            ].map((q) => (
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
