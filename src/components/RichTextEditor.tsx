import { useEffect, useRef, useState, type ClipboardEvent, type KeyboardEvent } from "react";
import { Bold, Italic, List, ListOrdered, Strikethrough, Underline } from "lucide-react";
import { Toggle } from "@/components/ui/toggle";
import { cn } from "@/lib/utils";
import { plainTextToRichText, richTextHasContent, sanitizeRichText } from "@/lib/richText";

type FormatCommand =
  | "bold"
  | "italic"
  | "underline"
  | "strikeThrough"
  | "insertOrderedList"
  | "insertUnorderedList";
type FormatState = Record<FormatCommand, boolean> & {
  fontSize: string;
};

type RichTextEditorProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
};

const EMPTY_FORMAT_STATE: FormatState = {
  bold: false,
  italic: false,
  underline: false,
  strikeThrough: false,
  insertOrderedList: false,
  insertUnorderedList: false,
  fontSize: "16",
};

const FORMAT_CONTROLS: Array<{
  command: FormatCommand;
  label: string;
  icon: typeof Bold;
}> = [
  { command: "bold", label: "Bold", icon: Bold },
  { command: "italic", label: "Italic", icon: Italic },
  { command: "underline", label: "Underline", icon: Underline },
  { command: "strikeThrough", label: "Strikethrough", icon: Strikethrough },
  { command: "insertOrderedList", label: "Numbered list", icon: ListOrdered },
  { command: "insertUnorderedList", label: "Bulleted list", icon: List },
];

const FONT_SIZE_OPTIONS = [
  { label: "12", value: "12", commandValue: "1" },
  { label: "14", value: "14", commandValue: "2" },
  { label: "16", value: "16", commandValue: "3" },
  { label: "18", value: "18", commandValue: "4" },
  { label: "24", value: "24", commandValue: "5" },
  { label: "30", value: "30", commandValue: "6" },
] as const;

const FONT_SIZE_VALUES = FONT_SIZE_OPTIONS.map((option) => option.value);

const normalizeFontSize = (rawFontSize: string | null | undefined) => {
  if (!rawFontSize) {
    return EMPTY_FORMAT_STATE.fontSize;
  }

  const parsed = Number.parseFloat(rawFontSize);
  if (Number.isNaN(parsed)) {
    return EMPTY_FORMAT_STATE.fontSize;
  }

  return FONT_SIZE_VALUES.reduce((closest, current) => {
    const currentDistance = Math.abs(Number(current) - parsed);
    const closestDistance = Math.abs(Number(closest) - parsed);
    return currentDistance < closestDistance ? current : closest;
  }, EMPTY_FORMAT_STATE.fontSize);
};

const selectionLivesInEditor = (editor: HTMLDivElement | null) => {
  if (!editor) {
    return false;
  }

  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) {
    return false;
  }

  const { anchorNode, focusNode } = selection;
  if (!anchorNode || !focusNode) {
    return false;
  }

  return editor.contains(anchorNode) && editor.contains(focusNode);
};

const isListElement = (element: Element | null): element is HTMLOListElement | HTMLUListElement =>
  Boolean(element && ["OL", "UL"].includes(element.tagName));

const getSelectionListItem = (editor: HTMLDivElement | null) => {
  if (!selectionLivesInEditor(editor)) {
    return null;
  }

  const selection = window.getSelection();
  const anchorNode = selection?.anchorNode;
  const startingElement =
    anchorNode?.nodeType === Node.TEXT_NODE ? anchorNode.parentElement : (anchorNode as HTMLElement | null);

  return startingElement?.closest("li") ?? null;
};

const isSelectionAtStartOfElement = (editor: HTMLDivElement | null, element: HTMLElement) => {
  if (!selectionLivesInEditor(editor)) {
    return false;
  }

  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0 || !selection.isCollapsed) {
    return false;
  }

  const range = selection.getRangeAt(0);
  const prefixRange = document.createRange();
  prefixRange.selectNodeContents(element);
  prefixRange.setEnd(range.startContainer, range.startOffset);

  return prefixRange.toString().length === 0;
};

const placeCaretAtStart = (element: HTMLElement) => {
  const selection = window.getSelection();
  if (!selection) {
    return;
  }

  const range = document.createRange();
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
  const firstTextNode = walker.nextNode();

  if (firstTextNode) {
    range.setStart(firstTextNode, 0);
  } else {
    range.setStart(element, 0);
  }

  range.collapse(true);
  selection.removeAllRanges();
  selection.addRange(range);
};

const cleanupEmptyList = (list: Element | null) => {
  if (isListElement(list) && list.children.length === 0) {
    list.remove();
  }
};

const outdentNestedListItem = (listItem: HTMLLIElement) => {
  const currentList = listItem.parentElement;
  const parentListItem = currentList?.closest("li");
  const parentList = parentListItem?.parentElement;

  if (!isListElement(currentList) || !parentListItem || !isListElement(parentList)) {
    return null;
  }

  parentList.insertBefore(listItem, parentListItem.nextSibling);
  cleanupEmptyList(currentList);
  return listItem;
};

const unwrapListItem = (listItem: HTMLLIElement) => {
  const list = listItem.parentElement;
  if (!isListElement(list)) {
    return null;
  }

  const parent = list.parentNode;
  if (!parent) {
    return null;
  }

  const hasPreviousItems = Boolean(listItem.previousElementSibling);
  const hasNextItems = Boolean(listItem.nextElementSibling);
  const listNextSibling = list.nextSibling;
  const paragraph = document.createElement("div");
  const trailingList = hasNextItems ? (list.cloneNode(false) as HTMLOListElement | HTMLUListElement) : null;
  const nestedLists: Array<HTMLOListElement | HTMLUListElement> = [];

  if (trailingList) {
    while (listItem.nextSibling) {
      trailingList.appendChild(listItem.nextSibling);
    }
  }

  while (listItem.firstChild) {
    const child = listItem.firstChild;

    if (child instanceof HTMLElement && isListElement(child)) {
      nestedLists.push(listItem.removeChild(child) as HTMLOListElement | HTMLUListElement);
      continue;
    }

    paragraph.appendChild(listItem.removeChild(child));
  }

  if (!paragraph.childNodes.length) {
    paragraph.appendChild(document.createElement("br"));
  }

  listItem.remove();

  if (hasPreviousItems) {
    parent.insertBefore(paragraph, listNextSibling);
    nestedLists.forEach((nestedList) => {
      parent.insertBefore(nestedList, listNextSibling);
    });
    if (trailingList && trailingList.children.length > 0) {
      parent.insertBefore(trailingList, listNextSibling);
    }
  } else {
    parent.insertBefore(paragraph, list);
    nestedLists.forEach((nestedList) => {
      parent.insertBefore(nestedList, list);
    });
    if (trailingList && trailingList.children.length > 0) {
      parent.insertBefore(trailingList, list);
    }
  }

  cleanupEmptyList(list);

  return paragraph;
};

const indentListItem = (listItem: HTMLLIElement) => {
  const currentList = listItem.parentElement;
  const previousSibling = listItem.previousElementSibling as HTMLLIElement | null;

  if (!isListElement(currentList) || !previousSibling) {
    return null;
  }

  const lastChild = previousSibling.lastElementChild;
  const nestedList =
    lastChild && isListElement(lastChild)
      ? lastChild
      : (document.createElement(currentList.tagName.toLowerCase()) as HTMLOListElement | HTMLUListElement);

  if (nestedList.parentElement !== previousSibling) {
    previousSibling.appendChild(nestedList);
  }

  nestedList.appendChild(listItem);
  cleanupEmptyList(currentList);
  return listItem;
};

const getSelectionFontSize = (editor: HTMLDivElement | null) => {
  if (!selectionLivesInEditor(editor)) {
    return EMPTY_FORMAT_STATE.fontSize;
  }

  const selection = window.getSelection();
  const anchorNode = selection?.anchorNode;
  const startingElement =
    anchorNode?.nodeType === Node.TEXT_NODE ? anchorNode.parentElement : (anchorNode as HTMLElement | null);

  if (!startingElement) {
    return EMPTY_FORMAT_STATE.fontSize;
  }

  const fontSize =
    startingElement.getAttribute?.("data-font-size") ??
    window.getComputedStyle(startingElement).fontSize;

  return normalizeFontSize(fontSize);
};

const getSelectionFormatState = (editor: HTMLDivElement | null): FormatState => {
  if (!selectionLivesInEditor(editor)) {
    return EMPTY_FORMAT_STATE;
  }

  try {
    return {
      bold: document.queryCommandState("bold"),
      italic: document.queryCommandState("italic"),
      underline: document.queryCommandState("underline"),
      strikeThrough: document.queryCommandState("strikeThrough"),
      insertOrderedList: document.queryCommandState("insertOrderedList"),
      insertUnorderedList: document.queryCommandState("insertUnorderedList"),
      fontSize: getSelectionFontSize(editor),
    };
  } catch {
    return EMPTY_FORMAT_STATE;
  }
};

const RichTextEditor = ({ value, onChange, placeholder, className }: RichTextEditorProps) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const isFocusedRef = useRef(false);
  const [formatState, setFormatState] = useState<FormatState>(EMPTY_FORMAT_STATE);
  const [hasContent, setHasContent] = useState(() => richTextHasContent(value));

  useEffect(() => {
    const editor = editorRef.current;
    const nextValue = sanitizeRichText(value);

    if (!editor || isFocusedRef.current) {
      return;
    }

    if (editor.innerHTML !== nextValue) {
      editor.innerHTML = nextValue;
    }

    setHasContent(richTextHasContent(nextValue));
  }, [value]);

  useEffect(() => {
    const handleSelectionChange = () => {
      setFormatState(getSelectionFormatState(editorRef.current));
    };

    document.addEventListener("selectionchange", handleSelectionChange);
    return () => {
      document.removeEventListener("selectionchange", handleSelectionChange);
    };
  }, []);

  const syncValue = () => {
    const nextValue = editorRef.current?.innerHTML ?? "";
    setHasContent(richTextHasContent(nextValue));
    onChange(nextValue);
    setFormatState(getSelectionFormatState(editorRef.current));
  };

  const normalizeEditorValue = () => {
    const editor = editorRef.current;
    if (!editor) {
      return;
    }

    const normalizedValue = sanitizeRichText(editor.innerHTML);
    if (editor.innerHTML !== normalizedValue) {
      editor.innerHTML = normalizedValue;
    }

    setHasContent(richTextHasContent(normalizedValue));
    onChange(normalizedValue);
    setFormatState(getSelectionFormatState(editor));
  };

  const runCommand = (command: FormatCommand) => {
    editorRef.current?.focus();
    document.execCommand("styleWithCSS", false, "false");
    document.execCommand(command);
    syncValue();
  };

  const applyFontSize = (value: string) => {
    const option = FONT_SIZE_OPTIONS.find((item) => item.value === value);
    if (!option) {
      return;
    }

    editorRef.current?.focus();
    document.execCommand("styleWithCSS", false, "false");
    document.execCommand("fontSize", false, option.commandValue);
    syncValue();
  };

  const handlePaste = (event: ClipboardEvent<HTMLDivElement>) => {
    event.preventDefault();
    const text = event.clipboardData.getData("text/plain");
    document.execCommand("insertHTML", false, plainTextToRichText(text));
    syncValue();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const editor = editorRef.current;
    const selection = window.getSelection();
    if (!editor || !selection?.isCollapsed) {
      return;
    }

    const listItem = getSelectionListItem(editor);
    if (event.key === "Tab") {
      if (!listItem) {
        return;
      }

      event.preventDefault();
      const movedListItem = event.shiftKey
        ? outdentNestedListItem(listItem) ?? unwrapListItem(listItem)
        : indentListItem(listItem);

      if (!movedListItem) {
        return;
      }

      placeCaretAtStart(movedListItem);
      syncValue();
      return;
    }

    if (event.key !== "Backspace" || !listItem || !isSelectionAtStartOfElement(editor, listItem)) {
      return;
    }

    event.preventDefault();
    const nextTarget = outdentNestedListItem(listItem) ?? unwrapListItem(listItem);
    if (!nextTarget) {
      return;
    }

    placeCaretAtStart(nextTarget);
    syncValue();
  };

  return (
    <div className={cn("overflow-hidden rounded-xl border border-input bg-background shadow-sm", className)}>
      <div className="flex flex-wrap items-center gap-2 border-b border-border/70 bg-muted/40 px-3 py-2">
        <div className="flex flex-wrap items-center gap-1 rounded-lg border border-border/70 bg-background/80 p-1">
          {FONT_SIZE_OPTIONS.map((option) => (
            <Toggle
              key={option.value}
              type="button"
              variant="outline"
              size="sm"
              pressed={formatState.fontSize === option.value}
              aria-label={`Font size ${option.label}`}
              className="min-w-9 px-2 text-xs font-semibold"
              onMouseDown={(event) => event.preventDefault()}
              onPressedChange={() => applyFontSize(option.value)}
            >
              {option.label}
            </Toggle>
          ))}
        </div>

        {FORMAT_CONTROLS.map(({ command, label, icon: Icon }) => (
          <Toggle
            key={command}
            type="button"
            variant="outline"
            size="sm"
            pressed={formatState[command]}
            aria-label={label}
            onMouseDown={(event) => event.preventDefault()}
            onPressedChange={() => runCommand(command)}
          >
            <Icon className="h-4 w-4" />
          </Toggle>
        ))}
        <span className="text-xs text-muted-foreground">
          Select text, then choose size, format, or list style. Use Tab and Shift+Tab for sublists.
        </span>
      </div>

      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        data-placeholder={placeholder}
        data-empty={hasContent ? "false" : "true"}
        className="rich-text-editor min-h-[220px] px-4 py-3 text-base text-foreground focus:outline-none"
        onInput={syncValue}
        onBlur={() => {
          isFocusedRef.current = false;
          normalizeEditorValue();
        }}
        onKeyDown={handleKeyDown}
        onKeyUp={() => setFormatState(getSelectionFormatState(editorRef.current))}
        onMouseUp={() => setFormatState(getSelectionFormatState(editorRef.current))}
        onFocus={() => {
          isFocusedRef.current = true;
          setFormatState(getSelectionFormatState(editorRef.current));
        }}
        onPaste={handlePaste}
      />
    </div>
  );
};

export default RichTextEditor;
