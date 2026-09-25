import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { parseHTML, extractCandidateElements, readHTMLFile } from "./parser";
import fs from "fs/promises";
import path from "path";
import os from "os";

describe("parseHTML", () => {
  it("parses valid HTML string", () => {
    const html = "<html><body><button>Click me</button></body></html>";
    const doc = parseHTML(html);

    expect(doc).toBeDefined();
    expect(doc.querySelector("button")?.textContent).toBe("Click me");
  });

  it("handles malformed HTML gracefully", () => {
    const html = "<button>Unclosed button<p>Nested";
    const doc = parseHTML(html);

    expect(doc).toBeDefined();
    expect(doc.querySelector("button")).toBeDefined();
  });

  it("returns a valid Document object", () => {
    const html = "<html><body></body></html>";
    const doc = parseHTML(html);

    expect(doc.documentElement).toBeDefined();
    expect(doc.body).toBeDefined();
  });

  it("returns HTMLDocument type", () => {
    const html = "<html><body></body></html>";
    const doc = parseHTML(html);

    expect(doc.constructor.name).toBe("Document");
  });
});

describe("readHTMLFile", () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "parser-test-"));
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it("reads HTML file with UTF-8 encoding", async () => {
    const testFile = path.join(tmpDir, "test.html");
    const html = "<html><body><button>Test</button></body></html>";
    await fs.writeFile(testFile, html, "utf-8");

    const content = await readHTMLFile(testFile);
    expect(content).toBe(html);
  });

  it("handles UTF-8 content with special characters", async () => {
    const testFile = path.join(tmpDir, "test-utf8.html");
    const html = "<html><body><button>Тест 你好 🚀</button></body></html>";
    await fs.writeFile(testFile, html, "utf-8");

    const content = await readHTMLFile(testFile);
    expect(content).toBe(html);
  });

  it("throws error on missing file", async () => {
    const nonExistentPath = path.join(tmpDir, "nonexistent.html");

    await expect(readHTMLFile(nonExistentPath)).rejects.toThrow(
      /Failed to read HTML file/,
    );
  });

  it("throws error on empty file", async () => {
    const testFile = path.join(tmpDir, "empty.html");
    await fs.writeFile(testFile, "", "utf-8");

    await expect(readHTMLFile(testFile)).rejects.toThrow(/File is empty/);
  });

  it("throws error on whitespace-only file", async () => {
    const testFile = path.join(tmpDir, "whitespace.html");
    await fs.writeFile(testFile, "   \n\t  ", "utf-8");

    await expect(readHTMLFile(testFile)).rejects.toThrow(/File is empty/);
  });

  it("works with relative file paths", async () => {
    const testFile = path.join(tmpDir, "test.html");
    const html = "<button>Test</button>";
    await fs.writeFile(testFile, html, "utf-8");

    // Change to tmpDir and use relative path
    const originalCwd = process.cwd();
    try {
      process.chdir(tmpDir);
      const content = await readHTMLFile("./test.html");
      expect(content).toBe(html);
    } finally {
      process.chdir(originalCwd);
    }
  });
});

describe("extractCandidateElements", () => {
  it("extracts button elements", () => {
    const html = "<html><body><button>Click</button></body></html>";
    const doc = parseHTML(html);
    const elements = extractCandidateElements(doc);

    expect(elements).toHaveLength(1);
    expect(elements[0]!.tagName.toLowerCase()).toBe("button");
  });

  it("extracts multiple button elements", () => {
    const html = `
      <html><body>
        <button>Button 1</button>
        <button>Button 2</button>
        <button>Button 3</button>
      </body></html>
    `;
    const doc = parseHTML(html);
    const elements = extractCandidateElements(doc);

    expect(elements).toHaveLength(3);
    expect(
      elements.every((e: Element) => e.tagName.toLowerCase() === "button"),
    ).toBe(true);
  });

  it("extracts input elements of various types", () => {
    const html = `
      <html><body>
        <input type="text" />
        <input type="email" />
        <input type="password" />
        <input type="checkbox" />
        <input type="radio" />
        <input type="file" />
        <input type="range" />
        <input type="color" />
      </body></html>
    `;
    const doc = parseHTML(html);
    const elements = extractCandidateElements(doc);

    expect(elements).toHaveLength(8);
    expect(
      elements.every((e: Element) => e.tagName.toLowerCase() === "input"),
    ).toBe(true);
  });

  it("excludes hidden input elements", () => {
    const html = `
      <html><body>
        <input type="hidden" />
        <input type="text" />
        <input type="hidden" />
      </body></html>
    `;
    const doc = parseHTML(html);
    const elements = extractCandidateElements(doc);

    expect(elements).toHaveLength(1);
    expect(elements[0]!.getAttribute("type")).toBe("text");
  });

  it("extracts select elements", () => {
    const html = `
      <html><body>
        <select>
          <option>Option 1</option>
        </select>
      </body></html>
    `;
    const doc = parseHTML(html);
    const elements = extractCandidateElements(doc);

    expect(elements).toHaveLength(1);
    expect(elements[0]!.tagName.toLowerCase()).toBe("select");
  });

  it("extracts textarea elements", () => {
    const html = "<html><body><textarea></textarea></body></html>";
    const doc = parseHTML(html);
    const elements = extractCandidateElements(doc);

    expect(elements).toHaveLength(1);
    expect(elements[0]!.tagName.toLowerCase()).toBe("textarea");
  });

  it("extracts links with href attribute", () => {
    const html = `
      <html><body>
        <a href="/page">Link with href</a>
        <a>Link without href</a>
        <a href="">Empty href</a>
      </body></html>
    `;
    const doc = parseHTML(html);
    const elements = extractCandidateElements(doc);

    expect(elements).toHaveLength(2);
    expect(
      elements.every((e: Element) => e.tagName.toLowerCase() === "a"),
    ).toBe(true);
    expect(elements[0]!.getAttribute("href")).toBe("/page");
    expect(elements[1]!.getAttribute("href")).toBe("");
  });

  it("excludes links without href", () => {
    const html = "<html><body><a>No href</a></body></html>";
    const doc = parseHTML(html);
    const elements = extractCandidateElements(doc);

    expect(elements).toHaveLength(0);
  });

  it("extracts elements with role attribute", () => {
    const html = `
      <html><body>
        <div role="button">Button</div>
        <span role="link">Link</span>
        <div role="tab">Tab</div>
      </body></html>
    `;
    const doc = parseHTML(html);
    const elements = extractCandidateElements(doc);

    expect(elements).toHaveLength(3);
    expect(elements[0]!.getAttribute("role")).toBe("button");
    expect(elements[1]!.getAttribute("role")).toBe("link");
    expect(elements[2]!.getAttribute("role")).toBe("tab");
  });

  it("excludes disabled button elements", () => {
    const html = `
      <html><body>
        <button disabled>Disabled</button>
        <button>Enabled</button>
      </body></html>
    `;
    const doc = parseHTML(html);
    const elements = extractCandidateElements(doc);

    expect(elements).toHaveLength(1);
    expect(elements[0]!.textContent).toBe("Enabled");
  });

  it("excludes disabled input elements", () => {
    const html = `
      <html><body>
        <input type="text" disabled />
        <input type="text" />
      </body></html>
    `;
    const doc = parseHTML(html);
    const elements = extractCandidateElements(doc);

    expect(elements).toHaveLength(1);
    expect(elements[0]!.hasAttribute("disabled")).toBe(false);
  });

  it("excludes disabled select elements", () => {
    const html = `
      <html><body>
        <select disabled><option>Opt</option></select>
        <select><option>Opt</option></select>
      </body></html>
    `;
    const doc = parseHTML(html);
    const elements = extractCandidateElements(doc);

    expect(elements).toHaveLength(1);
    expect(elements[0]!.hasAttribute("disabled")).toBe(false);
  });

  it("returns elements in DOM source order", () => {
    const html = `
      <html><body>
        <button id="first">First</button>
        <input id="second" type="text" />
        <a id="third" href="/link">Link</a>
        <select id="fourth"><option>Opt</option></select>
      </body></html>
    `;
    const doc = parseHTML(html);
    const elements = extractCandidateElements(doc);

    expect(elements).toHaveLength(4);
    expect(elements[0]!.id).toBe("first");
    expect(elements[1]!.id).toBe("second");
    expect(elements[2]!.id).toBe("third");
    expect(elements[3]!.id).toBe("fourth");
  });

  it("handles empty document", () => {
    const html = "<html><body></body></html>";
    const doc = parseHTML(html);
    const elements = extractCandidateElements(doc);

    expect(elements).toHaveLength(0);
  });

  it("extracts elements from nested structures", () => {
    const html = `
      <html><body>
        <div>
          <form>
            <div>
              <input type="text" />
              <button>Submit</button>
            </div>
          </form>
        </div>
      </body></html>
    `;
    const doc = parseHTML(html);
    const elements = extractCandidateElements(doc);

    expect(elements).toHaveLength(2);
  });

  it("handles complex form with mixed elements", () => {
    const html = `
      <html><body>
        <form>
          <fieldset>
            <legend>User Form</legend>
            <label>
              Name:
              <input type="text" id="name" />
            </label>
            <label>
              Email:
              <input type="email" id="email" />
            </label>
            <label>
              Subscribe:
              <input type="checkbox" id="subscribe" />
            </label>
            <label>
              Type:
              <select id="type">
                <option>Personal</option>
              </select>
            </label>
            <textarea id="bio"></textarea>
            <button type="submit" id="submit">Submit</button>
            <a href="/cancel" id="cancel">Cancel</a>
          </fieldset>
        </form>
      </body></html>
    `;
    const doc = parseHTML(html);
    const elements = extractCandidateElements(doc);

    expect(elements).toHaveLength(7);
    const ids = elements.map((e: Element) => e!.id);
    expect(ids).toEqual([
      "name",
      "email",
      "subscribe",
      "type",
      "bio",
      "submit",
      "cancel",
    ]);
  });

  it("does not extract elements from head", () => {
    const html = `
      <html>
        <head>
          <title>Test</title>
          <script>// script tags in head</script>
        </head>
        <body>
          <button>Body Button</button>
        </body>
      </html>
    `;
    const doc = parseHTML(html);
    const elements = extractCandidateElements(doc);

    expect(elements).toHaveLength(1);
    expect(elements[0]!.textContent).toBe("Body Button");
  });

  it("extracts elements with custom role values", () => {
    const html = `
      <html><body>
        <div role="combobox">Combobox</div>
        <div role="menuitem">Menu Item</div>
        <div role="switch">Switch</div>
      </body></html>
    `;
    const doc = parseHTML(html);
    const elements = extractCandidateElements(doc);

    expect(elements).toHaveLength(3);
  });
});
