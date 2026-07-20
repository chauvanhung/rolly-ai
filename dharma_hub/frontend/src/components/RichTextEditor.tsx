"use client";

import React, { useCallback, useEffect } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import Placeholder from "@tiptap/extension-placeholder";
import Link from "@tiptap/extension-link";
import { TextStyle, Color } from "@tiptap/extension-text-style";
import { Extension } from "@tiptap/core";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  List,
  ListOrdered,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Heading2,
  Heading3,
  Quote,
  Undo2,
  Redo2,
  IndentIncrease,
  IndentDecrease,
  Minus,
  Link as LinkIcon,
  Unlink,
  RemoveFormatting,
  Baseline,
} from "lucide-react";

/**
 * Palette màu chữ — ưu tiên tương phản cao trên nền kem (#FAF5EC / card trắng).
 * Tránh vàng nhạt / xám trung tính (dễ chìm nền).
 */
const TEXT_COLORS: { name: string; value: string | null }[] = [
  { name: "Mặc định", value: null },
  { name: "Đen", value: "#141210" },
  { name: "Nâu đậm", value: "#3d2910" },
  { name: "Vàng nâu", value: "#8a5a12" },
  { name: "Đỏ son", value: "#7a1f1a" },
  { name: "Xanh lá", value: "#1a3d2e" },
  { name: "Xanh dương", value: "#123a72" },
  { name: "Tím", value: "#4a2378" },
  { name: "Xám đậm", value: "#3a342e" },
  { name: "Cam đậm", value: "#9a3d12" },
];

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    indent: {
      indent: () => ReturnType;
      outdent: () => ReturnType;
    };
  }
}

/** Indent paragraphs / headings like Word (margin-left steps). */
const Indent = Extension.create({
  name: "indent",
  addGlobalAttributes() {
    return [
      {
        types: ["paragraph", "heading"],
        attributes: {
          indent: {
            default: 0,
            parseHTML: (el) => {
              const v = el.getAttribute("data-indent");
              return v ? parseInt(v, 10) || 0 : 0;
            },
            renderHTML: (attrs) => {
              if (!attrs.indent) return {};
              return {
                "data-indent": attrs.indent,
                style: `margin-left: ${Math.min(attrs.indent, 8) * 1.5}em`,
              };
            },
          },
        },
      },
    ];
  },
  addCommands() {
    return {
      indent:
        () =>
        ({ commands, state }) => {
          const { $from } = state.selection;
          const node = $from.parent;
          const current = (node.attrs.indent as number) || 0;
          if (current >= 8) return false;
          return commands.updateAttributes(node.type.name, { indent: current + 1 });
        },
      outdent:
        () =>
        ({ commands, state }) => {
          const { $from } = state.selection;
          const node = $from.parent;
          const current = (node.attrs.indent as number) || 0;
          if (current <= 0) return false;
          return commands.updateAttributes(node.type.name, { indent: current - 1 });
        },
    };
  },
  addKeyboardShortcuts() {
    return {
      Tab: () => {
        if (this.editor.commands.sinkListItem("listItem")) return true;
        return this.editor.commands.indent();
      },
      "Shift-Tab": () => {
        if (this.editor.commands.liftListItem("listItem")) return true;
        return this.editor.commands.outdent();
      },
    };
  },
});

type Props = {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: string;
  className?: string;
};

function looksLikeHtml(s: string) {
  return /<\/?[a-z][\s\S]*>/i.test(s || "");
}

function toEditorHtml(value: string) {
  if (!value?.trim()) return "";
  if (looksLikeHtml(value)) return value;
  return value
    .split(/\n{2,}/)
    .map((block) => `<p>${block.replace(/\n/g, "<br>")}</p>`)
    .join("");
}

function isEditorEmpty(html: string) {
  return !html || html === "<p></p>" || html === "<p><br></p>" || html === "<p></p>\n";
}

function ToolbarBtn({
  onClick,
  active,
  title,
  children,
  disabled,
}: {
  onClick: () => void;
  active?: boolean;
  title: string;
  children: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={(e) => {
        e.preventDefault();
        onClick();
      }}
      className={`inline-flex h-8 w-8 items-center justify-center rounded-md border text-xs transition ${
        active
          ? "border-primary bg-primary/15 text-primary"
          : "border-transparent text-muted hover:border-border hover:bg-muted/40 hover:text-foreground"
      } disabled:opacity-40`}
    >
      {children}
    </button>
  );
}

export default function RichTextEditor({
  value,
  onChange,
  placeholder = "Nhập nội dung…",
  minHeight = "220px",
  className = "",
}: Props) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
      }),
      TextStyle,
      Color,
      Underline,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Placeholder.configure({ placeholder }),
      Link.configure({
        openOnClick: false,
        autolink: true,
        linkOnPaste: true,
        HTMLAttributes: {
          class: "text-primary underline underline-offset-2",
          rel: "noopener noreferrer",
          target: "_blank",
        },
      }),
      Indent,
    ],
    content: toEditorHtml(value),
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class:
          "prose prose-sm max-w-none dark:prose-invert focus:outline-none px-3 py-2 font-serif leading-relaxed min-h-[180px]",
        style: `min-height: ${minHeight}; color: #1a1612;`,
      },
      handlePaste: (_view, event) => {
        // Let TipTap parse HTML from Word/Docs; plain text still works.
        const html = event.clipboardData?.getData("text/html");
        if (html && html.includes("<")) {
          return false; // default TipTap HTML paste
        }
        return false;
      },
    },
    onUpdate: ({ editor: ed }) => {
      const html = ed.getHTML();
      onChange(isEditorEmpty(html) ? "" : html);
    },
  });

  // Soft-sync: only fill when editor still empty (parent loaded content after mount)
  useEffect(() => {
    if (!editor || editor.isFocused) return;
    const next = toEditorHtml(value || "");
    if (!editor.getText().trim() && next) {
      editor.commands.setContent(next, { emitUpdate: false });
    }
  }, [value, editor]);

  const setLink = useCallback(() => {
    if (!editor) return;
    const prev = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("Nhập URL liên kết (https://…)", prev || "https://");
    if (url === null) return;
    if (url.trim() === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    const href = url.trim().startsWith("http") ? url.trim() : `https://${url.trim()}`;
    editor.chain().focus().extendMarkRange("link").setLink({ href }).run();
  }, [editor]);

  const applyColor = useCallback(
    (color: string | null) => {
      if (!editor) return;
      if (!color) {
        editor.chain().focus().unsetColor().run();
      } else {
        editor.chain().focus().setColor(color).run();
      }
    },
    [editor]
  );

  if (!editor) {
    return (
      <div className="rounded-lg border border-border bg-muted/20 px-3 py-8 text-center text-xs text-muted">
        Đang tải trình soạn thảo…
      </div>
    );
  }

  const currentColor = (editor.getAttributes("textStyle").color as string | undefined) || "";

  return (
    <div className={`overflow-hidden rounded-lg border border-border bg-card ${className}`}>
      <div className="sticky top-0 z-10 flex flex-wrap items-center gap-0.5 border-b border-border bg-muted/30 px-1.5 py-1.5 backdrop-blur-sm">
        <ToolbarBtn
          title="In đậm (Ctrl+B)"
          active={editor.isActive("bold")}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          <Bold size={14} />
        </ToolbarBtn>
        <ToolbarBtn
          title="In nghiêng (Ctrl+I)"
          active={editor.isActive("italic")}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          <Italic size={14} />
        </ToolbarBtn>
        <ToolbarBtn
          title="Gạch chân (Ctrl+U)"
          active={editor.isActive("underline")}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
        >
          <UnderlineIcon size={14} />
        </ToolbarBtn>
        <ToolbarBtn
          title="Gạch ngang"
          active={editor.isActive("strike")}
          onClick={() => editor.chain().focus().toggleStrike().run()}
        >
          <Strikethrough size={14} />
        </ToolbarBtn>

        {/* Màu chữ */}
        <span className="mx-1 h-5 w-px bg-border" />
        <div className="flex items-center gap-0.5" title="Màu chữ">
          <Baseline size={14} className="mx-0.5 text-muted" style={{ color: currentColor || undefined }} />
          {TEXT_COLORS.map((c) => (
            <button
              key={c.name}
              type="button"
              title={c.name}
              onClick={(e) => {
                e.preventDefault();
                applyColor(c.value);
              }}
              className={`h-5 w-5 shrink-0 rounded-full border transition ${
                (c.value === null && !currentColor) ||
                (c.value && currentColor.toLowerCase() === c.value.toLowerCase())
                  ? "border-primary ring-2 ring-primary/40"
                  : "border-border hover:scale-110"
              }`}
              style={
                c.value
                  ? { backgroundColor: c.value }
                  : {
                      background:
                        "linear-gradient(135deg, #fff 45%, #ccc 45%, #ccc 55%, #fff 55%), linear-gradient(#e5e5e5, #e5e5e5)",
                    }
              }
            />
          ))}
          <label
            className="relative ml-0.5 inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-md border border-border hover:bg-muted/40"
            title="Chọn màu tùy chỉnh"
          >
            <span
              className="h-3.5 w-3.5 rounded-sm border border-border"
              style={{ backgroundColor: currentColor || "#d49c2a" }}
            />
            <input
              type="color"
              value={currentColor && /^#[0-9a-fA-F]{6}$/.test(currentColor) ? currentColor : "#d49c2a"}
              onChange={(e) => applyColor(e.target.value)}
              className="absolute inset-0 cursor-pointer opacity-0"
              aria-label="Chọn màu chữ tùy chỉnh"
            />
          </label>
        </div>

        <span className="mx-1 h-5 w-px bg-border" />

        <ToolbarBtn
          title="Tiêu đề lớn"
          active={editor.isActive("heading", { level: 2 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        >
          <Heading2 size={14} />
        </ToolbarBtn>
        <ToolbarBtn
          title="Tiêu đề nhỏ"
          active={editor.isActive("heading", { level: 3 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        >
          <Heading3 size={14} />
        </ToolbarBtn>
        <ToolbarBtn
          title="Trích dẫn"
          active={editor.isActive("blockquote")}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
        >
          <Quote size={14} />
        </ToolbarBtn>

        <span className="mx-1 h-5 w-px bg-border" />

        <ToolbarBtn
          title="Danh sách chấm"
          active={editor.isActive("bulletList")}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          <List size={14} />
        </ToolbarBtn>
        <ToolbarBtn
          title="Danh sách số"
          active={editor.isActive("orderedList")}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          <ListOrdered size={14} />
        </ToolbarBtn>
        <ToolbarBtn title="Thụt vào (Tab)" onClick={() => editor.chain().focus().indent().run()}>
          <IndentIncrease size={14} />
        </ToolbarBtn>
        <ToolbarBtn title="Thụt ra (Shift+Tab)" onClick={() => editor.chain().focus().outdent().run()}>
          <IndentDecrease size={14} />
        </ToolbarBtn>

        <span className="mx-1 h-5 w-px bg-border" />

        <ToolbarBtn
          title="Căn trái"
          active={editor.isActive({ textAlign: "left" })}
          onClick={() => editor.chain().focus().setTextAlign("left").run()}
        >
          <AlignLeft size={14} />
        </ToolbarBtn>
        <ToolbarBtn
          title="Căn giữa"
          active={editor.isActive({ textAlign: "center" })}
          onClick={() => editor.chain().focus().setTextAlign("center").run()}
        >
          <AlignCenter size={14} />
        </ToolbarBtn>
        <ToolbarBtn
          title="Căn phải"
          active={editor.isActive({ textAlign: "right" })}
          onClick={() => editor.chain().focus().setTextAlign("right").run()}
        >
          <AlignRight size={14} />
        </ToolbarBtn>
        <ToolbarBtn
          title="Căn đều"
          active={editor.isActive({ textAlign: "justify" })}
          onClick={() => editor.chain().focus().setTextAlign("justify").run()}
        >
          <AlignJustify size={14} />
        </ToolbarBtn>

        <span className="mx-1 h-5 w-px bg-border" />

        <ToolbarBtn title="Chèn liên kết" active={editor.isActive("link")} onClick={setLink}>
          <LinkIcon size={14} />
        </ToolbarBtn>
        <ToolbarBtn
          title="Gỡ liên kết"
          disabled={!editor.isActive("link")}
          onClick={() => editor.chain().focus().unsetLink().run()}
        >
          <Unlink size={14} />
        </ToolbarBtn>
        <ToolbarBtn title="Đường kẻ ngang" onClick={() => editor.chain().focus().setHorizontalRule().run()}>
          <Minus size={14} />
        </ToolbarBtn>
        <ToolbarBtn
          title="Xóa định dạng"
          onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()}
        >
          <RemoveFormatting size={14} />
        </ToolbarBtn>

        <span className="mx-1 h-5 w-px bg-border" />

        <ToolbarBtn title="Hoàn tác (Ctrl+Z)" onClick={() => editor.chain().focus().undo().run()}>
          <Undo2 size={14} />
        </ToolbarBtn>
        <ToolbarBtn title="Làm lại (Ctrl+Y)" onClick={() => editor.chain().focus().redo().run()}>
          <Redo2 size={14} />
        </ToolbarBtn>
      </div>

      <EditorContent editor={editor} />
      <p className="border-t border-border/50 px-3 py-1 text-[10px] text-muted">
        Soạn như Word: đậm / nghiêng / <strong>màu chữ</strong> (ô tròn hoặc bảng màu) ·{" "}
        <kbd className="rounded border border-border px-1">Tab</kbd> thụt dòng · dán từ Word/Docs giữ màu.
      </p>
    </div>
  );
}
