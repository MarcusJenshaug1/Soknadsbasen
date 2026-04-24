"use client";

import { useCallback, useEffect, useRef } from "react";
import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin";
import { AutoFocusPlugin } from "@lexical/react/LexicalAutoFocusPlugin";
import { OnChangePlugin } from "@lexical/react/LexicalOnChangePlugin";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import LexicalErrorBoundary from "@lexical/react/LexicalErrorBoundary";
import { $generateHtmlFromNodes, $generateNodesFromDOM } from "@lexical/html";
import { $getRoot, $insertNodes, FORMAT_TEXT_COMMAND, EditorState, LexicalEditor } from "lexical";
import { HeadingNode, QuoteNode } from "@lexical/rich-text";
import { ListNode, ListItemNode } from "@lexical/list";
import { LinkNode } from "@lexical/link";
import { INSERT_UNORDERED_LIST_COMMAND, INSERT_ORDERED_LIST_COMMAND } from "@lexical/list";
import { ListPlugin } from "@lexical/react/LexicalListPlugin";
import { Bold, Italic, Underline, List, ListOrdered, Link } from "lucide-react";

// ── Toolbar ──────────────────────────────────────────────────────────────────

function ToolbarPlugin() {
  const [editor] = useLexicalComposerContext();

  const fmt = (format: "bold" | "italic" | "underline") => {
    editor.dispatchCommand(FORMAT_TEXT_COMMAND, format);
  };

  const insertLink = () => {
    const url = window.prompt("URL:");
    if (!url) return;
    editor.focus();
    // Insert link text as selected node
    editor.update(() => {
      const selection = editor.getRootElement()?.ownerDocument?.getSelection();
      if (!selection) return;
    });
    document.execCommand("createLink", false, url);
  };

  const btn = "p-1.5 rounded hover:bg-black/8 text-ink/60 hover:text-ink transition-colors";

  return (
    <div className="flex items-center gap-0.5 px-3 py-2 border-b border-black/8 bg-bg/80">
      <button type="button" onMouseDown={(e) => { e.preventDefault(); fmt("bold"); }} className={btn} title="Fet (Ctrl+B)">
        <Bold size={13} />
      </button>
      <button type="button" onMouseDown={(e) => { e.preventDefault(); fmt("italic"); }} className={btn} title="Kursiv (Ctrl+I)">
        <Italic size={13} />
      </button>
      <button type="button" onMouseDown={(e) => { e.preventDefault(); fmt("underline"); }} className={btn} title="Understrek (Ctrl+U)">
        <Underline size={13} />
      </button>
      <div className="w-px h-4 bg-black/10 mx-1" />
      <button
        type="button"
        onMouseDown={(e) => { e.preventDefault(); editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined); }}
        className={btn}
        title="Punktliste"
      >
        <List size={13} />
      </button>
      <button
        type="button"
        onMouseDown={(e) => { e.preventDefault(); editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined); }}
        className={btn}
        title="Nummerert liste"
      >
        <ListOrdered size={13} />
      </button>
    </div>
  );
}

// ── HTML init plugin ──────────────────────────────────────────────────────────

function InitHtmlPlugin({ html }: { html: string }) {
  const [editor] = useLexicalComposerContext();
  const initialised = useRef(false);

  useEffect(() => {
    if (initialised.current || !html) return;
    initialised.current = true;
    editor.update(() => {
      const parser = new DOMParser();
      const dom = parser.parseFromString(html, "text/html");
      const nodes = $generateNodesFromDOM(editor, dom);
      const root = $getRoot();
      root.clear();
      $insertNodes(nodes);
    });
  }, [editor, html]);

  return null;
}

// ── Change → emit ─────────────────────────────────────────────────────────────

function ChangePlugin({ onChange }: { onChange: (html: string, text: string) => void }) {
  const [editor] = useLexicalComposerContext();

  const handleChange = useCallback(
    (_state: EditorState, ed: LexicalEditor) => {
      ed.update(() => {
        const html = $generateHtmlFromNodes(ed);
        const text = $getRoot().getTextContent();
        onChange(html, text);
      });
    },
    [onChange],
  );

  return <OnChangePlugin onChange={handleChange} />;
}

// ── Public component ──────────────────────────────────────────────────────────

export interface EmailEditorProps {
  onChange: (html: string, text: string) => void;
  initialHtml?: string;
  autoFocus?: boolean;
  placeholder?: string;
  className?: string;
}

const theme = {
  text: {
    bold: "font-bold",
    italic: "italic",
    underline: "underline",
  },
  list: {
    ul: "list-disc list-inside",
    ol: "list-decimal list-inside",
  },
};

export function EmailEditor({
  onChange,
  initialHtml,
  autoFocus = true,
  placeholder = "Skriv melding…",
  className = "",
}: EmailEditorProps) {
  const config = {
    namespace: "EmailEditor",
    theme,
    nodes: [HeadingNode, QuoteNode, ListNode, ListItemNode, LinkNode],
    onError: (err: Error) => console.error("[EmailEditor]", err),
  };

  return (
    <div className={`flex flex-col min-h-0 ${className}`}>
      <LexicalComposer initialConfig={config}>
        <ToolbarPlugin />
        <div className="relative flex-1 overflow-y-auto">
          <RichTextPlugin
            contentEditable={
              <ContentEditable className="min-h-[120px] px-4 py-3 text-[14px] leading-relaxed outline-none" />
            }
            placeholder={
              <div className="absolute top-3 left-4 text-[14px] text-ink/30 pointer-events-none select-none">
                {placeholder}
              </div>
            }
            ErrorBoundary={LexicalErrorBoundary}
          />
          <HistoryPlugin />
          <ListPlugin />
          {autoFocus && <AutoFocusPlugin />}
          {initialHtml && <InitHtmlPlugin html={initialHtml} key={initialHtml} />}
          <ChangePlugin onChange={onChange} />
        </div>
      </LexicalComposer>
    </div>
  );
}
