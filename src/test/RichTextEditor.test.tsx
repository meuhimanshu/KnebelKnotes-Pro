import { fireEvent, render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import RichTextEditor from "@/components/RichTextEditor";

const setCollapsedSelection = (node: Node, offset = 0) => {
  const selection = window.getSelection();
  const range = document.createRange();

  range.setStart(node, offset);
  range.collapse(true);

  selection?.removeAllRanges();
  selection?.addRange(range);
};

describe("RichTextEditor", () => {
  beforeEach(() => {
    document.execCommand = vi.fn(() => true);
    document.queryCommandState = vi.fn(() => false);
  });

  it("keeps the focused editor DOM untouched when the same external value comes back through props", () => {
    const onChange = vi.fn();
    const { container, rerender } = render(<RichTextEditor value="" onChange={onChange} />);
    const editor = container.querySelector('[contenteditable="true"]') as HTMLDivElement;

    fireEvent.focus(editor);
    editor.innerHTML = '<font size="4">Focused</font>';

    rerender(<RichTextEditor value={'<font size="4">Focused</font>'} onChange={onChange} />);

    expect(editor.innerHTML).toBe('<font size="4">Focused</font>');
  });

  it("turns the current list line into a separate block when backspace is pressed at the start of that line", () => {
    const onChange = vi.fn();
    const { container } = render(
      <RichTextEditor value="<ul><li>One</li><li>Two</li><li>Three</li></ul>" onChange={onChange} />,
    );
    const editor = container.querySelector('[contenteditable="true"]') as HTMLDivElement;
    const secondListItem = editor.querySelectorAll("li")[1];
    const secondListItemText = secondListItem.firstChild as Text;

    fireEvent.focus(editor);
    setCollapsedSelection(secondListItemText, 0);
    fireEvent.keyDown(editor, { key: "Backspace" });

    expect(editor.innerHTML).toBe("<ul><li>One</li></ul><div>Two</div><ul><li>Three</li></ul>");
    expect(onChange).toHaveBeenCalledWith("<ul><li>One</li></ul><div>Two</div><ul><li>Three</li></ul>");
  });

  it("creates a nested sublist when tab is pressed on a list item", () => {
    const onChange = vi.fn();
    const { container } = render(
      <RichTextEditor value="<ul><li>One</li><li>Two</li><li>Three</li></ul>" onChange={onChange} />,
    );
    const editor = container.querySelector('[contenteditable="true"]') as HTMLDivElement;
    const secondListItem = editor.querySelectorAll("li")[1];
    const secondListItemText = secondListItem.firstChild as Text;

    fireEvent.focus(editor);
    setCollapsedSelection(secondListItemText, 0);
    fireEvent.keyDown(editor, { key: "Tab" });

    expect(editor.innerHTML).toBe("<ul><li>One<ul><li>Two</li></ul></li><li>Three</li></ul>");
    expect(onChange).toHaveBeenCalledWith("<ul><li>One<ul><li>Two</li></ul></li><li>Three</li></ul>");
  });

  it("moves a nested list item up one level per backspace press", () => {
    const onChange = vi.fn();
    const { container } = render(
      <RichTextEditor value="<ul><li>Parent<ul><li>Child</li></ul></li></ul>" onChange={onChange} />,
    );
    const editor = container.querySelector('[contenteditable="true"]') as HTMLDivElement;
    const childListItem = editor.querySelectorAll("li")[1];
    const childListItemText = childListItem.firstChild as Text;

    fireEvent.focus(editor);
    setCollapsedSelection(childListItemText, 0);
    fireEvent.keyDown(editor, { key: "Backspace" });

    expect(editor.innerHTML).toBe("<ul><li>Parent</li><li>Child</li></ul>");

    fireEvent.keyDown(editor, { key: "Backspace" });

    expect(editor.innerHTML).toBe("<ul><li>Parent</li></ul><div>Child</div>");
    expect(onChange).toHaveBeenLastCalledWith("<ul><li>Parent</li></ul><div>Child</div>");
  });
});
