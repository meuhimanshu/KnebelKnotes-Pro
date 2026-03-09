import { describe, expect, it } from "vitest";
import { plainTextToRichText, richTextHasContent, sanitizeRichText, toStoredRichText } from "@/lib/richText";

describe("rich text helpers", () => {
  it("keeps supported formatting tags and line breaks", () => {
    expect(sanitizeRichText("Line 1\n<b>Line 2</b>")).toBe("Line 1<br><strong>Line 2</strong>");
  });

  it("drops unsupported tags and attributes", () => {
    expect(
      sanitizeRichText('<script>alert("x")</script><div><span style="color:red"><i onclick="x()">Hi</i></span></div>'),
    ).toBe('alert("x")<div><em>Hi</em></div>');
  });

  it("keeps supported font sizes and list markup", () => {
    expect(
      sanitizeRichText('<font size="4">Big</font><ul><li>One</li><li><b>Two</b></li></ul><ol><li>Three</li></ol>'),
    ).toBe(
      '<span data-font-size="18">Big</span><ul><li>One</li><li><strong>Two</strong></li></ul><ol><li>Three</li></ol>',
    );
  });

  it("converts empty rich text to null for storage", () => {
    expect(toStoredRichText("<div><br></div>")).toBeNull();
    expect(richTextHasContent("&nbsp;")).toBe(false);
  });

  it("turns pasted plain text into line-break HTML", () => {
    expect(plainTextToRichText("First line\nSecond line")).toBe("First line<br>Second line");
  });
});
