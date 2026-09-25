import type { ElementMetadata } from "./element-metadata";

function escapeString(str: string): string {
  return str
    .replace(/\\/g, "\\\\")
    .replace(/'/g, "\\'")
    .replace(/"/g, '\\"')
    .replace(/\n/g, "\\n")
    .replace(/\r/g, "\\r")
    .replace(/\t/g, "\\t");
}

function generatePlaywrightCall(locatorInfo: ElementMetadata["locatorInfo"]): string {
  const { api, args } = locatorInfo;

  // Validation ensures args is non-empty, but TypeScript doesn't know that
  const firstArg = args[0]!;
  const secondArg = args[1];

  switch (api) {
    case "getByTestId":
      return `this.page.getByTestId('${escapeString(firstArg)}')`;

    case "getByRole":
      if (secondArg) {
        return `this.page.getByRole('${escapeString(firstArg)}', { name: '${escapeString(secondArg)}' })`;
      }
      return `this.page.getByRole('${escapeString(firstArg)}')`;

    case "getByLabel":
      return `this.page.getByLabel('${escapeString(firstArg)}')`;

    case "getByPlaceholder":
      return `this.page.getByPlaceholder('${escapeString(firstArg)}')`;

    case "getByText":
      return `this.page.getByText('${escapeString(firstArg)}')`;

    case "locator":
      return `this.page.locator('${escapeString(firstArg)}')`;

    default:
      throw new Error(`Unknown locator API: ${api}`);
  }
}

function toPascalCase(str: string): string {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function generateMethodNameBase(interactionType: string, id: string): string {
  const pascalId = toPascalCase(id);
  return interactionType + pascalId;
}

function generateActionMethod(
  methodName: string,
  id: string,
  interactionType: string
): string {
  switch (interactionType) {
    case "click":
      return `async ${methodName}(): Promise<void> {\n    await this.${id}.click();\n  }`;

    case "fill":
      return `async ${methodName}(text: string): Promise<void> {\n    await this.${id}.fill(text);\n  }`;

    case "check":
      return `async ${methodName}(shouldCheck: boolean = true): Promise<void> {\n    if (shouldCheck) {\n      await this.${id}.check();\n    } else {\n      await this.${id}.uncheck();\n    }\n  }`;

    case "selectOption":
      return `async ${methodName}(label: string): Promise<void> {\n    await this.${id}.selectOption(label);\n  }`;

    default:
      throw new Error(`Unknown interaction type: ${interactionType}`);
  }
}

function validateClassName(className: string): void {
  if (!/^[A-Z][a-zA-Z0-9]*$/.test(className)) {
    throw new Error(
      `Invalid class name: ${className}. Must be PascalCase (e.g., "HomePage")`
    );
  }
}

function validateElementMetadata(metadata: ElementMetadata): void {
  // Check id is valid identifier
  if (!/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(metadata.id)) {
    throw new Error(
      `Invalid metadata for element: id "${metadata.id}" is not a valid TypeScript identifier`
    );
  }

  // Check interactionType is valid
  const validInteractions = ["click", "fill", "check", "selectOption"];
  if (!validInteractions.includes(metadata.interactionType)) {
    throw new Error(
      `Invalid metadata for element ${metadata.id}: unknown interactionType "${metadata.interactionType}"`
    );
  }

  // Check locatorInfo.api is valid
  const validApis = ["getByTestId", "getByRole", "getByLabel", "getByPlaceholder", "getByText", "locator"];
  if (!validApis.includes(metadata.locatorInfo.api)) {
    throw new Error(
      `Invalid metadata for element ${metadata.id}: unknown locator API "${metadata.locatorInfo.api}"`
    );
  }

  // Check locatorInfo.args is non-empty
  if (!metadata.locatorInfo.args || metadata.locatorInfo.args.length === 0) {
    throw new Error(
      `Invalid metadata for element ${metadata.id}: locatorInfo.args is empty`
    );
  }

  // Check all args are strings
  if (!metadata.locatorInfo.args.every((arg) => typeof arg === "string")) {
    throw new Error(
      `Invalid metadata for element ${metadata.id}: locatorInfo.args contains non-string values`
    );
  }
}

export function generatePageObject(className: string, elements: ElementMetadata[]): string {
  // Validate className
  validateClassName(className);

  // Validate all elements
  elements.forEach((el) => validateElementMetadata(el));

  // Generate code parts
  const lines: string[] = [];

  // Import statement
  lines.push('import { type Page } from "@playwright/test";');
  lines.push("");

  // Class definition and constructor
  lines.push(`export class ${className} {`);
  lines.push("  constructor(private page: Page) {}");
  lines.push("");

  // Generate getters (in source order)
  lines.push("  // Locator getters");
  elements.forEach((el) => {
    const apiCall = generatePlaywrightCall(el.locatorInfo);
    lines.push(`  get ${el.id}() {`);
    lines.push(`    return ${apiCall};`);
    lines.push("  }");
    lines.push("");
  });

  // Generate method names with collision detection
  const getterNames = new Set(elements.map((el) => el.id));
  const methodNames = new Map<ElementMetadata, string>(); // Store final method names

  elements.forEach((el) => {
    let methodName = generateMethodNameBase(el.interactionType, el.id);
    let counter = 2;

    // Check for collision with getters or previously generated methods
    while (getterNames.has(methodName) || Array.from(methodNames.values()).includes(methodName)) {
      methodName = generateMethodNameBase(el.interactionType, el.id) + counter;
      counter++;
    }

    methodNames.set(el, methodName);
  });

  // Generate action methods (in source order)
  lines.push("  // Action methods");
  elements.forEach((el) => {
    const methodName = methodNames.get(el)!;
    const methodBody = generateActionMethod(methodName, el.id, el.interactionType);
    lines.push(`  ${methodBody}`);
    lines.push("");
  });

  // Close class
  lines.push("}");

  return lines.join("\n");
}
