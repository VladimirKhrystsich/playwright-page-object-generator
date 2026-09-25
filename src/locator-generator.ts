interface LocatorInfo {
  api: "getByTestId" | "getByRole" | "getByLabel" | "getByPlaceholder" | "getByText" | "locator";
  args: string[];
  confidence: "high" | "medium" | "low";
  reasoning?: string;
}

type ElementType = "button" | "input" | "checkbox" | "radio" | "select" | "link" | "role-based" | "generic";

function classifyElement(element: Element): ElementType {
  const tagName = element.tagName.toLowerCase();
  const type = element.getAttribute("type")?.toLowerCase();
  const role = element.getAttribute("role");

  // Check for explicit role first (most specific)
  if (role) {
    return "role-based";
  }

  if (tagName === "button" || type === "button") {
    return "button";
  }

  if (tagName === "input") {
    if (type === "checkbox") return "checkbox";
    if (type === "radio") return "radio";
    if (["text", "email", "password", "number"].includes(type || "text")) {
      return "input";
    }
  }

  if (tagName === "textarea") {
    return "input";
  }

  if (tagName === "select") {
    return "select";
  }

  if (tagName === "a" && element.hasAttribute("href")) {
    return "link";
  }

  return "generic";
}

function trimAndNormalize(text: string): string {
  return text.trim().replace(/\s+/g, " ");
}

function isAcceptableText(text: string): boolean {
  const normalized = trimAndNormalize(text);

  if (!normalized) {
    return false;
  }

  // Reject single characters
  if (normalized.length === 1) {
    return false;
  }

  // Reject generic symbols and UI chrome
  const genericSymbols = [">>", "<<", "◄", "►", "...", "•", "·", "…"];
  if (genericSymbols.includes(normalized)) {
    return false;
  }

  return true;
}

function getElementText(element: Element): string | null {
  const text = element.textContent;
  if (!text || !isAcceptableText(text)) {
    return null;
  }
  return trimAndNormalize(text);
}

function getAttribute(element: Element, attrName: string): string | null {
  const value = element.getAttribute(attrName);
  return value && trimAndNormalize(value) ? trimAndNormalize(value) : null;
}

function findAssociatedLabel(element: Element): string | null {
  const elementId = element.getAttribute("id");
  if (!elementId) {
    return null;
  }

  const label = element.ownerDocument?.querySelector(`label[for="${elementId}"]`);
  if (!label) {
    return null;
  }

  const labelText = getElementText(label);
  return labelText;
}

function isDynamicId(id: string): boolean {
  const dynamicPatterns = [/^react-/, /^emotion-/, /^__/, /^sc-/, /^[a-z]+\d{1,3}[a-z]*$/];
  return dynamicPatterns.some((pattern) => pattern.test(id));
}

function isDynamicClass(cls: string): boolean {
  const dynamicPatterns = [
    /^sc-/,
    /^emotion-/,
    /^react-/,
    /^__/,
    /^[a-z0-9]+\d+[a-z0-9]*$/,
  ];
  return dynamicPatterns.some((pattern) => pattern.test(cls));
}

function generateCSSSelector(element: Element): string {
  // Try stable ID
  const id = element.getAttribute("id");
  if (id && !isDynamicId(id)) {
    return `#${id}`;
  }

  // Try intentional classes
  const classList = Array.from(element.classList);
  const intentionalClasses = classList.filter((cls) => !isDynamicClass(cls));

  if (intentionalClasses.length > 0) {
    const classSelector = intentionalClasses.join(".");
    return `${element.tagName.toLowerCase()}.${classSelector}`;
  }

  // Try attribute combination
  const attributes: string[] = [];
  const type = element.getAttribute("type");
  const name = element.getAttribute("name");
  const dataTestId = element.getAttribute("data-testid");

  if (dataTestId) attributes.push(`[data-testid="${dataTestId}"]`);
  if (name) attributes.push(`[name="${name}"]`);
  if (type) attributes.push(`[type="${type}"]`);

  if (attributes.length > 0) {
    return `${element.tagName.toLowerCase()}${attributes.join("")}`;
  }

  // Fallback to tag selector only
  return element.tagName.toLowerCase();
}

function getAccessibleName(element: Element): string | null {
  // Check aria-label first
  const ariaLabel = getAttribute(element, "aria-label");
  if (ariaLabel) {
    return ariaLabel;
  }

  // For role-based elements, try element text
  const elementText = getElementText(element);
  if (elementText) {
    return elementText;
  }

  // For form elements, try associated label
  const labelText = findAssociatedLabel(element);
  if (labelText) {
    return labelText;
  }

  return null;
}

function generateLocator(element: Element): LocatorInfo {
  const elementType = classifyElement(element);

  // All element types: check data-testid first
  const testId = getAttribute(element, "data-testid");
  if (testId) {
    return {
      api: "getByTestId",
      args: [testId],
      confidence: "high",
      reasoning: "Found data-testid attribute",
    };
  }

  switch (elementType) {
    case "button":
      return generateButtonLocator(element);

    case "input":
      return generateInputLocator(element);

    case "checkbox":
      return generateCheckboxLocator(element);

    case "radio":
      return generateRadioLocator(element);

    case "select":
      return generateSelectLocator(element);

    case "link":
      return generateLinkLocator(element);

    case "role-based":
      return generateRoleBasedLocator(element);

    case "generic":
      return generateGenericLocator(element);

    default:
      return generateGenericLocator(element);
  }
}

function generateButtonLocator(element: Element): LocatorInfo {
  // Try element text
  const text = getElementText(element);
  if (text) {
    return {
      api: "getByText",
      args: [text],
      confidence: "medium",
      reasoning: "Selected via element text content",
    };
  }

  // Try aria-label
  const ariaLabel = getAttribute(element, "aria-label");
  if (ariaLabel) {
    return {
      api: "getByText",
      args: [ariaLabel],
      confidence: "medium",
      reasoning: "Selected via aria-label attribute",
    };
  }

  // Fallback to CSS selector
  const cssSelector = generateCSSSelector(element);
  return {
    api: "locator",
    args: [cssSelector],
    confidence: "low",
    reasoning: "No semantic locator available, using CSS selector",
  };
}

function generateInputLocator(element: Element): LocatorInfo {
  // Try associated label
  const labelText = findAssociatedLabel(element);
  if (labelText) {
    return {
      api: "getByLabel",
      args: [labelText],
      confidence: "medium",
      reasoning: "Selected via associated label element",
    };
  }

  // Try placeholder
  const placeholder = getAttribute(element, "placeholder");
  if (placeholder && !isGenericPlaceholder(placeholder)) {
    return {
      api: "getByPlaceholder",
      args: [placeholder],
      confidence: "medium",
      reasoning: "Selected via placeholder attribute",
    };
  }

  // Try aria-label
  const ariaLabel = getAttribute(element, "aria-label");
  if (ariaLabel) {
    return {
      api: "getByText",
      args: [ariaLabel],
      confidence: "medium",
      reasoning: "Selected via aria-label attribute",
    };
  }

  // Fallback to CSS selector
  const cssSelector = generateCSSSelector(element);
  return {
    api: "locator",
    args: [cssSelector],
    confidence: "low",
    reasoning: "No semantic locator available, using CSS selector",
  };
}

function isGenericPlaceholder(placeholder: string): boolean {
  const normalized = placeholder.toLowerCase();
  const genericPlaceholders = ["enter text...", "enter...", "type here", "...", "enter name..."];
  return genericPlaceholders.includes(normalized);
}

function generateCheckboxLocator(element: Element): LocatorInfo {
  // Try associated label
  const labelText = findAssociatedLabel(element);
  if (labelText) {
    return {
      api: "getByLabel",
      args: [labelText],
      confidence: "medium",
      reasoning: "Selected via associated label element",
    };
  }

  // Try aria-label
  const ariaLabel = getAttribute(element, "aria-label");
  if (ariaLabel) {
    return {
      api: "getByText",
      args: [ariaLabel],
      confidence: "medium",
      reasoning: "Selected via aria-label attribute",
    };
  }

  // Fallback to CSS selector
  const cssSelector = generateCSSSelector(element);
  return {
    api: "locator",
    args: [cssSelector],
    confidence: "low",
    reasoning: "No semantic locator available, using CSS selector",
  };
}

function generateRadioLocator(element: Element): LocatorInfo {
  // Try associated label
  const labelText = findAssociatedLabel(element);
  if (labelText) {
    return {
      api: "getByLabel",
      args: [labelText],
      confidence: "medium",
      reasoning: "Selected via associated label element",
    };
  }

  // Try aria-label
  const ariaLabel = getAttribute(element, "aria-label");
  if (ariaLabel) {
    return {
      api: "getByText",
      args: [ariaLabel],
      confidence: "medium",
      reasoning: "Selected via aria-label attribute",
    };
  }

  // Fallback to CSS selector
  const cssSelector = generateCSSSelector(element);
  return {
    api: "locator",
    args: [cssSelector],
    confidence: "low",
    reasoning: "No semantic locator available, using CSS selector",
  };
}

function generateSelectLocator(element: Element): LocatorInfo {
  // Try associated label
  const labelText = findAssociatedLabel(element);
  if (labelText) {
    return {
      api: "getByLabel",
      args: [labelText],
      confidence: "medium",
      reasoning: "Selected via associated label element",
    };
  }

  // Try aria-label
  const ariaLabel = getAttribute(element, "aria-label");
  if (ariaLabel) {
    return {
      api: "getByText",
      args: [ariaLabel],
      confidence: "medium",
      reasoning: "Selected via aria-label attribute",
    };
  }

  // Fallback to CSS selector
  const cssSelector = generateCSSSelector(element);
  return {
    api: "locator",
    args: [cssSelector],
    confidence: "low",
    reasoning: "No semantic locator available, using CSS selector",
  };
}

function generateLinkLocator(element: Element): LocatorInfo {
  // Try element text
  const text = getElementText(element);
  if (text) {
    return {
      api: "getByText",
      args: [text],
      confidence: "medium",
      reasoning: "Selected via link text content",
    };
  }

  // Try aria-label
  const ariaLabel = getAttribute(element, "aria-label");
  if (ariaLabel) {
    return {
      api: "getByText",
      args: [ariaLabel],
      confidence: "medium",
      reasoning: "Selected via aria-label attribute",
    };
  }

  // Fallback to CSS selector
  const cssSelector = generateCSSSelector(element);
  return {
    api: "locator",
    args: [cssSelector],
    confidence: "low",
    reasoning: "No semantic locator available, using CSS selector",
  };
}

function generateRoleBasedLocator(element: Element): LocatorInfo {
  const role = element.getAttribute("role");
  if (!role) {
    return generateGenericLocator(element);
  }

  // Try accessible name (aria-label, element text, or associated label)
  const accessibleName = getAccessibleName(element);

  if (accessibleName && !isGenericName(accessibleName, role)) {
    return {
      api: "getByRole",
      args: [role, accessibleName],
      confidence: "high",
      reasoning: `Selected via role="${role}" with accessible name`,
    };
  }

  // Try aria-label separately
  const ariaLabel = getAttribute(element, "aria-label");
  if (ariaLabel) {
    return {
      api: "getByText",
      args: [ariaLabel],
      confidence: "medium",
      reasoning: "Selected via aria-label attribute",
    };
  }

  // Fallback to CSS selector
  const cssSelector = generateCSSSelector(element);
  return {
    api: "locator",
    args: [cssSelector],
    confidence: "low",
    reasoning: "No semantic locator available, using CSS selector",
  };
}

function isGenericName(name: string, role: string): boolean {
  const genericNames = [role, role.toLowerCase(), "button", "link", "tab"];
  return genericNames.includes(name.toLowerCase());
}

function generateGenericLocator(element: Element): LocatorInfo {
  // Try aria-label
  const ariaLabel = getAttribute(element, "aria-label");
  if (ariaLabel) {
    return {
      api: "getByText",
      args: [ariaLabel],
      confidence: "medium",
      reasoning: "Selected via aria-label attribute",
    };
  }

  // Fallback to CSS selector
  const cssSelector = generateCSSSelector(element);
  return {
    api: "locator",
    args: [cssSelector],
    confidence: "low",
    reasoning: "No semantic locator available, using CSS selector",
  };
}

export { generateLocator, classifyElement };
export type { LocatorInfo, ElementType };
