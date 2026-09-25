import { JSDOM } from "jsdom";
import fs from "fs/promises";
import path from "path";

function parseHTML(html: string): Document {
  const jsdom = new JSDOM(html, {
    pretendToBeVisual: true,
  });

  return jsdom.window.document;
}

async function readHTMLFile(filePath: string): Promise<string> {
  try {
    const absolutePath = path.resolve(filePath);
    const content = await fs.readFile(absolutePath, "utf-8");

    if (!content.trim()) {
      throw new Error(`File is empty: ${filePath}`);
    }

    return content;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(
        `Failed to read HTML file "${filePath}": ${error.message}`,
      );
    }
    throw error;
  }
}

function extractCandidateElements(document: Document): Element[] {
  const candidates: Element[] = [];

  function traverse(node: Node): void {
    for (let i = 0; i < node.childNodes.length; i++) {
      const child = node.childNodes[i];
      if (!child) continue;

      if (child.nodeType === 1) {
        const element = child as Element;
        if (isCandidateElement(element)) {
          candidates.push(element);
        }
      }

      traverse(child);
    }
  }

  traverse(document.documentElement);

  return candidates;
}

/**
 * Check if an element is a candidate for page object generation
 */
function isCandidateElement(element: Element): boolean {
  const tagName = element.tagName.toLowerCase();

  // Standard interactive elements
  if (["button", "input", "select", "textarea"].includes(tagName)) {
    // Exclude hidden inputs
    if (tagName === "input") {
      const type = element.getAttribute("type")?.toLowerCase() || "text";
      if (type === "hidden") {
        return false;
      }
    }

    // Exclude disabled elements
    if (element.hasAttribute("disabled")) {
      return false;
    }

    return true;
  }

  // Links with href
  if (tagName === "a" && element.hasAttribute("href")) {
    return true;
  }

  // Elements with explicit role attribute
  if (element.hasAttribute("role")) {
    return true;
  }

  return false;
}

export { parseHTML, readHTMLFile, extractCandidateElements };
