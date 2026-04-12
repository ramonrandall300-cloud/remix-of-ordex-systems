import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageCircle, Send, Bot, User, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import ReactMarkdown from "react-markdown";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface Props {
  cultureId: string;
  cultureName: string;
}

export function CultureAIChat({ cultureId, cultureName }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;
    const userMsg: Message = { role: "user", content: input.trim() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("cellculture-ai", {
        body: { cultureId, analysisType: "chat", chatMessages: newMessages },
      });

      if (error) {
        try {
          const ctx = (error as any).context;
          if (ctx && typeof ctx.json === "function") {
            const body = await ctx.json();
            if (body?.error) throw new Error(body.error);
          }
        } catch (parseErr) {
          if (parseErr instanceof Error && parseErr.message !== error.message) throw parseErr;
        }
        throw error;
      }

      if (data?.error) throw new Error(data.error);

      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data?.reply || data?.result?.reply || "I couldn't generate a response." },
      ]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: `Error: ${err.message}` },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) {
    return (
      <Button variant="outline" className="gap-2 w-full" onClick={() => setIsOpen(true)}>
        <MessageCircle className="w-4 h-4" />
        Ask AI about this culture
      </Button>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Bot className="w-4 h-4 text-primary" />
            AI Assistant — {cultureName}
          </CardTitle>
          <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => setIsOpen(false)}>
            Minimize
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <ScrollArea className="h-[300px] pr-3" ref={scrollRef}>
          {messages.length === 0 && (
            <div className="text-center py-8 text-muted-foreground text-xs space-y-2">
              <Bot className="w-8 h-8 mx-auto opacity-40" />
              <p>Ask anything about this culture:</p>
              <div className="flex flex-wrap gap-1.5 justify-center">
                {["Why is viability dropping?", "Should I split today?", "Recommend optimal medium"].map((q) => (
                  <Button
                    key={q}
                    variant="outline"
                    size="sm"
                    className="text-[10px] h-6"
                    onClick={() => {
                      setInput(q);
                    }}
                  >
                    {q}
                  </Button>
                ))}
              </div>
            </div>
          )}
          <div className="space-y-3">
            {messages.map((msg, i) => (
              <div key={i} className={`flex gap-2 ${msg.role === "user" ? "justify-end" : ""}`}>
                {msg.role === "assistant" && <Bot className="w-5 h-5 text-primary mt-0.5 shrink-0" />}
                <div
                  className={`rounded-lg px-3 py-2 text-xs max-w-[85%] ${
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted"
                  }`}
                >
                  {msg.role === "assistant" ? (
                    <div className="prose prose-sm dark:prose-invert max-w-none text-xs">
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    </div>
                  ) : (
                    msg.content
                  )}
                </div>
                {msg.role === "user" && <User className="w-5 h-5 text-muted-foreground mt-0.5 shrink-0" />}
              </div>
            ))}
            {isLoading && (
              <div className="flex gap-2">
                <Bot className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                <div className="bg-muted rounded-lg px-3 py-2">
                  <Loader2 className="w-4 h-4 animate-spin text-primary" />
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            sendMessage();
          }}
        >
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about this culture..."
            className="text-xs"
            disabled={isLoading}
          />
          <Button type="submit" size="sm" disabled={!input.trim() || isLoading}>
            <Send className="w-4 h-4" />
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
