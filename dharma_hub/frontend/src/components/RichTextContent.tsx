"use client";

import React, { useMemo } from "react";
import DOMPurify from "isomorphic-dompurify";

type Props = {
  html?: string | null;
  className?: string;
  style?: React.CSSProperties;
};

function looksLikeHtml(s: string) {
  return /<\/?[a-z][\s\S]*>/i.test(s);
}

/**
 * Renders body/chapter content: HTML from rich editor, or plain text (legacy).
 */
export default function RichTextContent({ html, className = "", style }: Props) {
  const content = html || "";

  const sanitized = useMemo(() => {
    if (!content.trim()) return "";
    if (!looksLikeHtml(content)) {
      // Escape + preserve newlines for plain text
      const escaped = content
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\n/g, "<br/>");
      return `<div class="plain-legacy">${escaped}</div>`;
    }
    return DOMPurify.sanitize(content, {
      USE_PROFILES: { html: true },
      ADD_ATTR: ["data-indent", "style", "class", "target", "rel", "href"],
      ADD_TAGS: ["a", "s", "del", "u", "hr", "span"],
      // Cho phép style color / margin (màu chữ + thụt dòng từ editor)
      ALLOWED_URI_REGEXP:
        /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|sms|cid|xmpp|data):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
    });
  }, [content]);

  if (!sanitized) return null;

  return (
    <div
      className={`rich-content leading-relaxed text-justify ${className}`}
      style={style}
      dangerouslySetInnerHTML={{ __html: sanitized }}
    />
  );
}
