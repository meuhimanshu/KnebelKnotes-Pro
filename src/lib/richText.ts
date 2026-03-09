const INLINE_TAG_MAP = new Map<string, string>([
  ["b", "strong"],
  ["strong", "strong"],
  ["i", "em"],
  ["em", "em"],
  ["u", "u"],
  ["s", "s"],
  ["strike", "s"],
]);

const BLOCK_TAGS = new Set(["p", "div", "ul", "ol", "li"]);
const FONT_SIZE_VALUES = new Set(["12", "14", "16", "18", "24", "30"]);
const LEGACY_FONT_SIZE_MAP = new Map<string, string>([
  ["1", "12"],
  ["2", "14"],
  ["3", "16"],
  ["4", "18"],
  ["5", "24"],
  ["6", "30"],
  ["7", "30"],
]);

const createHtmlDocument = () => document.implementation.createHTMLDocument("");

const appendTextWithBreaks = (doc: Document, target: Node, text: string) => {
  const parts = text.replace(/\r\n?/g, "\n").split("\n");

  parts.forEach((part, index) => {
    if (part) {
      target.appendChild(doc.createTextNode(part));
    }

    if (index < parts.length - 1) {
      target.appendChild(doc.createElement("br"));
    }
  });
};

const sanitizeNode = (node: Node, doc: Document): Node => {
  if (node.nodeType === Node.TEXT_NODE) {
    const fragment = doc.createDocumentFragment();
    appendTextWithBreaks(doc, fragment, node.textContent ?? "");
    return fragment;
  }

  if (node.nodeType !== Node.ELEMENT_NODE) {
    return doc.createDocumentFragment();
  }

  const element = node as HTMLElement;
  const tagName = element.tagName.toLowerCase();

  if (tagName === "br") {
    return doc.createElement("br");
  }

  const fragment = doc.createDocumentFragment();
  Array.from(element.childNodes).forEach((childNode) => {
    fragment.appendChild(sanitizeNode(childNode, doc));
  });

  if (tagName === "font" || tagName === "span") {
    const fontSize =
      element.getAttribute("data-font-size") ??
      LEGACY_FONT_SIZE_MAP.get(element.getAttribute("size") ?? "") ??
      null;

    if (fontSize && FONT_SIZE_VALUES.has(fontSize)) {
      const cleanElement = doc.createElement("span");
      cleanElement.setAttribute("data-font-size", fontSize);
      cleanElement.appendChild(fragment);
      return cleanElement;
    }

    return fragment;
  }

  const normalizedTag = INLINE_TAG_MAP.get(tagName) ?? (BLOCK_TAGS.has(tagName) ? tagName : null);
  if (!normalizedTag) {
    return fragment;
  }

  const cleanElement = doc.createElement(normalizedTag);
  cleanElement.appendChild(fragment);
  return cleanElement;
};

const buildContainer = (input: string) => {
  const parser = new DOMParser();
  const source = parser.parseFromString(`<div>${input}</div>`, "text/html");
  const wrapper = source.body.firstElementChild;
  const output = createHtmlDocument();
  const container = output.createElement("div");

  if (!wrapper) {
    return container;
  }

  Array.from(wrapper.childNodes).forEach((node) => {
    container.appendChild(sanitizeNode(node, output));
  });

  return container;
};

export const sanitizeRichText = (input: string | null | undefined) => {
  if (!input) {
    return "";
  }

  return buildContainer(input).innerHTML;
};

export const richTextHasContent = (input: string | null | undefined) => {
  if (!input) {
    return false;
  }

  const container = buildContainer(input);
  const text = container.textContent?.replace(/\u00a0/g, " ").trim() ?? "";
  return text.length > 0;
};

export const toStoredRichText = (input: string | null | undefined) => {
  const sanitized = sanitizeRichText(input);
  return richTextHasContent(sanitized) ? sanitized : null;
};

export const plainTextToRichText = (text: string) => {
  const output = createHtmlDocument();
  const container = output.createElement("div");
  appendTextWithBreaks(output, container, text);
  return container.innerHTML;
};
