# Playwright Page Object Generator - Implementation Plan

## Overview
Build a modular TypeScript CLI that converts HTML snippets or local HTML files into valid, formatted Playwright Page Object classes. The implementation follows a separation of concerns approach with distinct modules for parsing, locator generation, code generation, and CLI handling.

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                      CLI Interface                       │
│         (commander, input/output handling)               │
└────────────┬────────────────────────────────────────────┘
             │
┌────────────┴──────────────────────────────────────────┐
│                  HTML Parser Module                     │
│    (jsdom, DOM parsing, element extraction)             │
└────────────┬─────────────────────────────────────────┘
             │
┌────────────┴──────────────────────────────────────────┐
│               Locator Generator Module                  │
│  (semantic locators, accessibility, CSS fallback)       │
└────────────┬─────────────────────────────────────────┘
             │
┌────────────┴──────────────────────────────────────────┐
│            Page Object Generator Module                 │
│  (TypeScript class generation, method creation)         │
└────────────┬─────────────────────────────────────────┘
             │
┌────────────┴──────────────────────────────────────────┐
│                Code Formatter Module                    │
│          (prettier integration, output)                 │
└─────────────────────────────────────────────────────────┘
```

## Development Stages

### Stage 1: HTML Parser Module
**File**: `src/parser.ts`

**Objective**: Parse HTML input (files or snippets) and extract interactive elements for analysis.

**Key Components**:

**Input Parsing Functions** (explicitly separate to avoid ambiguity):
- `parseHTMLString(html: string): Document`
  - Accept HTML string (snippet)
  - Use jsdom to create a JSDOM instance
  - Return the DOM Document
  - Throw error on invalid/malformed HTML (jsdom is lenient; we accept this behavior)

- `parseHTMLFile(filePath: string): Document`
  - Accept file path (relative or absolute)
  - Read file from filesystem (assume UTF-8 encoding)
  - Parse using `parseHTMLString()`
  - Throw descriptive errors on:
    - File not found
    - File permission denied
    - File encoding issues

**jsdom Configuration**:
- Disable JavaScript execution (set `runScripts: 'dangerously-outside-only'` to 'outside-only' or disable)
- Disable resource loading (avoid network requests during parsing)
- Set appropriate URL context for the document (use file path or a dummy URL)
- Use default userAgent (adequate for parsing)

**Element Extraction Function**:
- `extractElements(doc: Document): Element[]`
  - Extract all "interactive" elements in DOM source order
  - **Interactive elements** defined as: buttons, inputs (text/email/password/number/checkbox/radio/file/range/color/date/time), textareas, selects, links (`<a href>`), and any element with `role="button"`, `role="link"`, or `role="button"` attributes
  - **Exclude**: disabled elements, form elements without interactive purpose (e.g., `<input type="hidden">`)
  - **Note**: Do NOT filter by visibility in jsdom (CSS support is limited; computed styles unreliable). Visibility checks deferred to later stages with better context.
  - Return elements in DOM source order (document tree traversal order)

**Error Handling Strategy**:
- File system errors (not found, permission denied): Throw with descriptive message including file path
- Encoding errors: Log warning and proceed with best-effort parsing
- Malformed HTML: Accept jsdom's lenient parsing (most real-world HTML is malformed)
- Empty or whitespace-only files: Throw with helpful error message

**Deliverables**:
- Parse HTML snippets and files with explicit, separate functions
- Handle file path resolution with error context
- Extract relevant interactive DOM nodes in source order
- Comprehensive error handling with descriptive messages
- Clear jsdom configuration strategy

**Tests**:
- Parse valid HTML string
- Parse valid HTML file
- Handle missing file with appropriate error message
- Handle file permission denied error
- Handle invalid/malformed HTML gracefully
- Extract buttons, inputs, textareas, selects, links
- Extract role-based elements (role="button", role="link")
- Exclude disabled and hidden input types
- Verify DOM source order is preserved
- Parse empty file (appropriate error)

---

### Stage 2: Locator Generator Module
**File**: `src/locator-generator.ts`

**Objective**: Generate stable, semantic Playwright locators for each element with fallback strategies.

**Key Components**:
- `generateLocator(element: Element): LocatorStrategy`
  - Implement priority-based locator selection
  - Return primary locator and fallbacks

**Locator Priority Order**:
1. **Test ID**: `data-testid` attribute
2. **Semantic Role + Text**: For buttons and links with text
3. **Accessible Name**: Using dom-accessibility-api
4. **ARIA Label**: `aria-label` attribute
5. **Placeholder**: For inputs
6. **CSS Selector**: Fallback (stable class/id-based)

**Key Types**:
```typescript
interface LocatorStrategy {
  primary: string;      // Playwright locator syntax (e.g., "getByTestId('submit')")
  fallback?: string[];  // Alternative locators
  element: {
    tag: string;
    text?: string;
    attributes: Record<string, string>;
  };
}
```

**Deliverables**:
- Generate semantic locators
- Provide fallback locators
- Handle edge cases (no accessible name, dynamic content)
- Stable identifier selection

**Tests**:
- Generate test ID locators
- Generate role-based locators
- Generate text-based locators
- Generate placeholder locators
- Generate CSS fallback
- Handle elements without accessible names

---

### Stage 3: Element Classifier Module
**File**: `src/element-classifier.ts`

**Objective**: Classify elements and extract metadata for code generation.

**Key Components**:
- `classifyElement(element: Element, locator: LocatorStrategy): ElementMetadata`
  - Determine element type and interaction pattern
  - Extract relevant attributes and text

**Key Types**:
```typescript
interface ElementMetadata {
  id: string;                  // camelCase identifier (e.g., "submitButton")
  displayName: string;         // Human-readable name
  type: 'button' | 'input' | 'checkbox' | 'select' | 'link' | 'textarea';
  locator: string;            // Primary Playwright locator
  fallbackLocators?: string[];
  interactionType: 'click' | 'fill' | 'check' | 'select' | 'navigate';
  description?: string;        // Optional description for comments
}
```

**Deliverables**:
- Classify interactive elements
- Generate descriptive identifiers
- Determine appropriate interaction methods
- Extract relevant metadata

**Tests**:
- Classify buttons, inputs, checkboxes, selects, links
- Generate valid camelCase identifiers
- Map interaction types correctly

---

### Stage 4: Page Object Generator Module
**File**: `src/page-object-generator.ts`

**Objective**: Generate well-structured TypeScript Page Object classes from classified elements.

**Key Components**:
- `generatePageObject(className: string, elements: ElementMetadata[]): string`
  - Generate class definition with constructor
  - Create getters for element locators
  - Create action methods for interactions
  - Include JSDoc comments

**Generated Class Structure**:
```typescript
export class PageObjectName {
  constructor(private page: Page) {}

  // Locator getters
  get submitButton() { 
    return this.page.locator(...); 
  }

  // Action methods
  async clickSubmit() { 
    await this.submitButton.click(); 
  }

  async fillEmail(text: string) { 
    await this.emailInput.fill(text); 
  }
}
```

**Deliverables**:
- Generate Page Object class skeleton
- Create getter properties for locators
- Create action methods
- Include proper JSDoc documentation
- Handle multiple interaction types

**Tests**:
- Generate valid TypeScript syntax
- Create appropriate getters and methods
- Include JSDoc comments
- Handle multiple elements

---

### Stage 5: Code Formatter Module
**File**: `src/formatter.ts`

**Objective**: Format generated code using Prettier for consistency and readability.

**Key Components**:
- `formatCode(code: string): Promise<string>`
  - Apply Prettier formatting
  - Use consistent style (2 spaces, semicolons, etc.)
  - Handle formatting errors

**Deliverables**:
- Format TypeScript code with Prettier
- Consistent code style
- Error handling for malformed code

**Tests**:
- Format valid TypeScript
- Handle edge cases (long lines, complex methods)
- Verify output is valid TypeScript

---

### Stage 6: CLI Interface
**File**: `src/cli.ts`

**Objective**: Provide a command-line interface for end-users.

**Commands**:
```bash
# Generate from HTML snippet
pgm generate --html "<button id='submit'>Click me</button>" --output page.ts

# Generate from HTML file
pgm generate --file input.html --output page.ts

# Generate with custom class name
pgm generate --file input.html --class HomePage --output page.ts
```

**Key Components**:
- Set up commander program
- Define `generate` command with options
- Validate inputs
- Handle errors with helpful messages

**Options**:
- `--html <string>` or `-h`: HTML snippet
- `--file <path>` or `-f`: HTML file path
- `--output <path>` or `-o`: Output file path (default: stdout)
- `--class <name>` or `-c`: Page Object class name (auto-generated if not provided)

**Deliverables**:
- Command parser with commander
- Input validation
- Error handling and messages
- Output to file or stdout

**Tests**:
- Parse command arguments
- Validate required options
- Generate with all option combinations

---

### Stage 7: Main Entry Point & Integration
**File**: `src/index.ts`

**Objective**: Wire all modules together and expose the CLI.

**Key Components**:
- Import and export all modules
- Set up CLI with commander
- Orchestrate the generation pipeline

**Pipeline**:
1. Parse HTML → Document
2. Extract elements → Element[]
3. Generate locators → LocatorStrategy[]
4. Classify elements → ElementMetadata[]
5. Generate class → TypeScript string
6. Format code → Formatted string
7. Write output → File or stdout

**Deliverables**:
- Complete working CLI
- End-to-end integration
- Error handling throughout pipeline

---

### Stage 8: Testing & Validation
**Files**: `src/**/*.test.ts` or `tests/`

**Objective**: Comprehensive test coverage for all modules.

**Test Categories**:
- **Unit Tests**: Each module independently
  - Parser tests (valid/invalid HTML, files)
  - Locator generator tests (all priority levels)
  - Classifier tests (element types, identifiers)
  - Generator tests (class structure, methods)
  - Formatter tests (code quality)

- **Integration Tests**: End-to-end workflows
  - Simple form page
  - Complex page with multiple elements
  - Page with accessibility attributes
  - Page with dynamic content

- **Snapshot Tests**: Generated code output
  - Verify consistent code generation
  - Track changes to output format

**Deliverables**:
- Test coverage for all modules
- Integration test suite
- Snapshot tests for example outputs
- CI-ready test configuration

---

## Implementation Sequence

1. **Stage 1** → HTML Parser (foundation)
2. **Stage 2** → Locator Generator (core logic)
3. **Stage 3** → Element Classifier (metadata)
4. **Stage 4** → Page Object Generator (code output)
5. **Stage 5** → Code Formatter (polish)
6. **Stage 6** → CLI Interface (user interaction)
7. **Stage 7** → Main Entry Point (integration)
8. **Stage 8** → Testing & Validation (quality)

## Key Design Principles

- **Modularity**: Each stage is independent and testable
- **Separation of Concerns**: HTML parsing, locator logic, code generation are separate
- **Simplicity**: No unnecessary abstractions; straight-forward implementations
- **Stability**: Prefer semantic locators over fragile selectors
- **Error Handling**: Graceful failures with helpful messages
- **Type Safety**: Strict TypeScript throughout

## Success Criteria

- ✓ CLI accepts HTML file or snippet
- ✓ Generates valid TypeScript Page Object class
- ✓ Uses semantic Playwright locators
- ✓ Formats output with Prettier
- ✓ Comprehensive test coverage
- ✓ Clear error messages
- ✓ Documented module interfaces

## Notes

- Keep modules focused and single-responsibility
- Use clear, descriptive interfaces between modules
- Test each stage independently before integration
- Generate clean, readable TypeScript code
- Prioritize semantic locators over CSS selectors
