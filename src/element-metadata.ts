import type { LocatorInfo } from "./locator-generator";

export type InteractionType = "click" | "fill" | "check" | "selectOption";

export interface ElementMetadata {
  element: Element;
  locatorInfo: LocatorInfo;
  id: string;
  interactionType: InteractionType;
}

const RESERVED_WORDS = new Set([
  "return",
  "this",
  "class",
  "constructor",
  "prototype",
  "page",
  "element",
  "async",
  "await",
  "function",
  "let",
  "const",
  "var",
  "if",
  "else",
  "for",
  "while",
  "do",
  "switch",
  "case",
  "default",
  "break",
  "continue",
  "try",
  "catch",
  "finally",
  "throw",
  "new",
  "delete",
  "typeof",
  "instanceof",
  "in",
  "of",
  "import",
  "export",
  "from",
  "as",
  "null",
  "undefined",
  "true",
  "false",
]);

function extractBaseNameFromLocator(locatorInfo: LocatorInfo): string {
  const { api, args } = locatorInfo;

  switch (api) {
    case "getByTestId":
      return args[0] || "";
    case "getByRole":
      return args[1] || args[0] || "";
    case "getByLabel":
      return args[0] || "";
    case "getByPlaceholder":
      return args[0] || "";
    case "getByText":
      return args[0] || "";
    case "locator":
      return "";
    default:
      return "";
  }
}

function toCamelCase(text: string): string {
  if (!text) return "";

  // Remove non-alphanumeric characters, keep only a-z, A-Z, 0-9
  const cleaned = text.replace(/[^a-zA-Z0-9]/g, " ").trim();

  if (!cleaned) return "";

  // Split by spaces and convert to camelCase
  const words = cleaned.split(/\s+/);
  if (words.length === 0) return "";

  const camelCased = words
    .map((word, index) => {
      if (!word) return "";
      if (index === 0) {
        return word.charAt(0).toLowerCase() + word.slice(1).toLowerCase();
      }
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join("");

  // If starts with digit or empty, return empty (will use fallback)
  if (!camelCased || /^\d/.test(camelCased)) {
    return "";
  }

  return camelCased;
}

function getElementTagName(element: Element): string {
  return element.tagName.toLowerCase();
}

function isValidIdentifier(name: string): boolean {
  const validPattern = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/;
  return validPattern.test(name) && !RESERVED_WORDS.has(name);
}

function getInteractionType(element: Element): InteractionType {
  const tagName = element.tagName.toLowerCase();
  const type = element.getAttribute("type")?.toLowerCase();
  const role = element.getAttribute("role")?.toLowerCase();

  // Button-like elements: button, input[type=button], role=button, role=link, role=tab, role=menuitem
  if (
    tagName === "button" ||
    type === "button" ||
    role === "button" ||
    role === "link" ||
    role === "tab" ||
    role === "menuitem"
  ) {
    return "click";
  }

  // Text input-like elements: input[text/email/password/number], textarea
  if (
    (tagName === "input" &&
      ["text", "email", "password", "number"].includes(type || "text")) ||
    tagName === "textarea"
  ) {
    return "fill";
  }

  // Checkbox-like elements: input[type=checkbox], role=checkbox, role=switch
  if (
    (tagName === "input" && type === "checkbox") ||
    role === "checkbox" ||
    role === "switch"
  ) {
    return "check";
  }

  // Radio-like elements: input[type=radio], role=radio
  if ((tagName === "input" && type === "radio") || role === "radio") {
    return "check";
  }

  // Select-like elements: select, role=listbox, role=option
  if (tagName === "select" || role === "listbox" || role === "option") {
    return "selectOption";
  }

  // Link elements: a[href]
  if (tagName === "a" && element.hasAttribute("href")) {
    return "click";
  }

  // Fallback
  return "click";
}

export function extractElementMetadata(
  element: Element,
  locatorInfo: LocatorInfo
): ElementMetadata {
  let baseName = extractBaseNameFromLocator(locatorInfo);
  let id = toCamelCase(baseName);

  // If no valid identifier from locator, use tag name
  if (!id || !isValidIdentifier(id)) {
    id = getElementTagName(element);
  }

  // Final validation
  if (!isValidIdentifier(id)) {
    id = getElementTagName(element);
  }

  const interactionType = getInteractionType(element);

  return {
    element,
    locatorInfo,
    id,
    interactionType,
  };
}

export function deduplicateIdentifiers(
  metadata: ElementMetadata[]
): ElementMetadata[] {
  const idCounts = new Map<string, number>();
  const result: ElementMetadata[] = [];

  metadata.forEach((item) => {
    const baseId = item.id;
    const count = idCounts.get(baseId) || 0;

    let finalId: string;
    if (count === 0) {
      finalId = baseId;
    } else {
      finalId = `${baseId}${count + 1}`;
    }

    idCounts.set(baseId, count + 1);
    result.push({
      ...item,
      id: finalId,
    });
  });

  return result;
}
