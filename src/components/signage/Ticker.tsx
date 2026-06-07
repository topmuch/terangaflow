"use client";

import { motion } from "framer-motion";
import { AlertCircle, Info, Megaphone } from "lucide-react";
import type { TickerMessage } from "@/types/signage";

interface TickerProps {
  messages: TickerMessage[];
}

function getMessageIcon(type: TickerMessage["type"]) {
  switch (type) {
    case "urgent":
      return <AlertCircle className="h-4 w-4 text-red-500 shrink-0" />;
    case "ad":
      return <Megaphone className="h-4 w-4 text-amber-500 shrink-0" />;
    case "info":
    default:
      return <Info className="h-4 w-4 text-blue-500 shrink-0" />;
  }
}

export function Ticker({ messages }: TickerProps) {
  if (messages.length === 0) return null;

  // Create a scrolling content by repeating messages
  const scrollingContent = [...messages, ...messages];

  return (
    <div className="overflow-hidden border-t bg-gray-900 text-white">
      {/* Label */}
      <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 text-xs font-bold uppercase tracking-wider">
        <Info className="h-3 w-3" />
        Infos
      </div>

      {/* Scrolling messages */}
      <div className="relative h-10 overflow-hidden">
        <motion.div
          className="flex items-center gap-12 whitespace-nowrap h-full px-4"
          animate={{ x: ["0%", "-50%"] }}
          transition={{
            x: {
              repeat: Infinity,
              repeatType: "loop",
              duration: messages.length * 8,
              ease: "linear",
            },
          }}
        >
          {scrollingContent.map((msg, index) => (
            <div
              key={`${msg.id}-${index}`}
              className="flex items-center gap-2 text-sm"
            >
              {getMessageIcon(msg.type)}
              <span className="text-gray-300">{msg.text}</span>
              <span className="text-gray-600">•</span>
            </div>
          ))}
        </motion.div>
      </div>
    </div>
  );
}
