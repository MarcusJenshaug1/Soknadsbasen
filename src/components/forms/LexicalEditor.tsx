"use client";

import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin";
import { ListPlugin } from "@lexical/react/LexicalListPlugin";
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary";
import { OnChangePlugin } from "@lexical/react/LexicalOnChangePlugin";
import {
  ListItemNode,
  ListNode,
  INSERT_UNORDERED_LIST_COMMAND,
  INSERT_ORDERED_LIST_COMMAND,
} from "@lexical/list";
import { $getRoot, FORMAT_TEXT_COMMAND } from "lexical";
import {
  $generateHtmlFromNodes,
  $generateNodesFromDOM,
} from "@lexical/html";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { useEffect } from "react";

const theme = {
  paragraph: "mb-3 text-[14px] leading-[1.6] text-[#14110e]",
  list: {
    nested: { listitem: "list-none" },
    ol: "list-decimal ml-6 mb-3",
    ul: "list-disc ml-6 mb-3",
    listitem: "mb-1 text-[14px] text-[#14110e] leading-[1.6]",
  },
  text: {
    bold: "font-medium",
    italic: "italic",
    underline: "underline",
  },
};

export function LexicalEditor({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
}) {
  const initialConfig = {
    namespace: "SoknadsbasenEditor",
    theme,
    onError: (error: Error) => console.error(error),
    nodes: [ListNode, ListItemNode],
  };

  return (
    <div className="relative rounded-2xl bg-white border border-black/8 focus-within:border-[#c15a3a] transition-colors overflow-hidden">
      <LexicalComposer initialConfig={initialConfig}>
        <Toolbar />
        <RichTextPlugin
          contentEditable={
            <ContentEditable className="min-h-[320px] px-5 py-4 outline-none text-[14px] text-[#14110e] leading-[1.6]" />
          }
          placeholder={
            <div className="absolute top-[60px] left-5 text-[14px] text-[#14110e]/35 pointer-events-none">
              {placeholder ?? "Begynn å skrive …"}
            </div>
          }
          ErrorBoundary={LexicalErrorBoundary}
        />
        <HistoryPlugin />
        <ListPlugin />
        <OnChangePlugin
          onChange={(_state, editor) => {
            editor.update(() => {
              const html = $generateHtmlFromNodes(editor);
              onChange(html);
            });
          }}
        />
        <InitialValue value={value} />
      </LexicalComposer>
    </div>
  );
}

function InitialValue({ value }: { value: string }) {
  const [editor] = useLexicalComposerContext();
  useEffect(() => {
    editor.update(() => {
      const root = $getRoot();
      if (root.getFirstChild()) return;
      if (value) {
        const parser = new DOMParser();
        const dom = parser.parseFromString(value, "text/html");
        const nodes = $generateNodesFromDOM(editor, dom);
        root.append(...nodes);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}

function Toolbar() {
  const [editor] = useLexicalComposerContext();
  const btn =
    "px-2.5 py-1 rounded-full text-[11px] uppercase tracking-[0.12em] text-[#14110e]/70 hover:bg-[#eee9df]";
  return (
    <div className="flex items-center gap-1 px-3 py-2 border-b border-black/5 bg-[#faf8f5]/50">
      <button
        type="button"
        onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "bold")}
        className={btn}
        aria-label="Fet"
      >
        <span className="font-medium">B</span>
      </button>
      <button
        type="button"
        onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "italic")}
        className={btn}
        aria-label="Kursiv"
      >
        <span className="italic">I</span>
      </button>
      <span className="w-px h-4 bg-black/10 mx-1" />
      <button
        type="button"
        onClick={() =>
          editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined)
        }
        className={btn}
      >
        Liste
      </button>
      <button
        type="button"
        onClick={() =>
          editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined)
        }
        className={btn}
      >
        Nummerert
      </button>
    </div>
  );
}
