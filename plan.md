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

**Objective**: Select the single best Playwright locator for each HTML element using element-type-appropriate strategies. Do not generate fallback locators; Stage 4 handles alternative locators during code generation.

**Input Requirements**:
- Receives `Element` objects from Stage 1 (extracted interactive elements)
- Stage 2 determines element type internally by examining tag name, role attribute, and HTML attributes
- Stage 2 has no external input about element classification; it classifies as needed

**Locator Format Specification**:
Stage 2 outputs **structured locator information** that Stage 4 will convert to Playwright API calls. The structure must unambiguously express which Playwright API to call and with what arguments.

**Supported Playwright locator types** (what Stage 2 can generate):
- `getByTestId(testid)` → map from `data-testid` attribute
- `getByRole(role, { name })` → map from implicit or explicit role + accessible name
- `getByLabel(text)` → map from associated `<label>` or `aria-label` for form inputs
- `getByPlaceholder(text)` → map from `placeholder` attribute
- `getByText(text)` → map from element text content
- `locator(cssSelector)` → map from CSS selector (no XPath)

Example outputs:
- `{ api: 'getByTestId', args: ['submit'], ... }`
- `{ api: 'getByRole', args: ['button', 'Submit'], ... }`
- `{ api: 'getByLabel', args: ['Email'], ... }`
- `{ api: 'getByPlaceholder', args: ['Enter name...'], ... }`
- `{ api: 'getByText', args: ['Click me'], ... }`
- `{ api: 'locator', args: ['#submitBtn'], ... }`

**Key Components**:

**`generateLocator(element: Element): LocatorInfo`**:
- Determine element type (button, input, checkbox, select, link, role-based, or generic)
- Apply element-type-appropriate strategy (see below)
- Return the single best locator as structured data
- Include confidence level and reasoning for transparency
- Does NOT validate uniqueness (Playwright validates at runtime)
- Does NOT generate fallbacks (deferred to Stage 4)

**Locator Selection Algorithm**:

**Step 1: Classify Element Type**
Determine category by examining: tag name, role attribute, type attribute. Categories:
- `button-like`: `<button>`, `<input type="button">`, or explicit `role="button"`
- `input-like`: `<input type="text|email|password|number">` or `<textarea>`
- `checkbox-like`: `<input type="checkbox">`
- `radio-like`: `<input type="radio">`
- `select-like`: `<select>`
- `link-like`: `<a href="...">`
- `role-based`: element with explicit role attribute (any role value)
- `generic`: any other interactive element

**Step 2: Apply Element-Type Strategy**

**For button-like elements**:
1. If `data-testid` exists (non-empty): return testid locator (HIGH)
2. Else if element has non-empty, non-generic accessible text: return text locator (MEDIUM)
3. Else if `aria-label` exists (non-empty): return aria-label as text locator (MEDIUM)
4. Else: return CSS selector (LOW)

**For input-like elements** (text, email, password, number inputs, textarea):
1. If `data-testid` exists: return testid locator (HIGH)
2. Else if element has associated `<label>` (via `for` attribute): return label locator using label text (MEDIUM)
3. Else if `placeholder` exists (non-empty, non-generic): return placeholder locator (MEDIUM)
4. Else if `aria-label` exists: return aria-label as text locator (MEDIUM)
5. Else: return CSS selector (LOW)

**For checkbox-like / radio-like elements**:
1. If `data-testid` exists: return testid locator (HIGH)
2. Else if element has associated `<label>`: return label locator (MEDIUM)
3. Else if `aria-label` exists: return aria-label as text locator (MEDIUM)
4. Else: return CSS selector (LOW)

**For select-like elements**:
1. If `data-testid` exists: return testid locator (HIGH)
2. Else if element has associated `<label>`: return label locator (MEDIUM)
3. Else if `aria-label` exists: return aria-label as text locator (MEDIUM)
4. Else: return CSS selector (LOW)

**For link-like elements** (`<a href="...">`):
1. If `data-testid` exists: return testid locator (HIGH)
2. Else if link text is non-empty and appears stable: return text locator (MEDIUM)
3. Else if `aria-label` exists: return aria-label as text locator (MEDIUM)
4. Else: return CSS selector (LOW)

**For role-based elements** (any element with explicit `role` attribute):
1. If `data-testid` exists: return testid locator (HIGH)
2. Else if element has meaningful accessible name (non-generic): return role + name locator (HIGH)
3. Else if `aria-label` exists: return aria-label as text locator (MEDIUM)
4. Else: return CSS selector (LOW)

**For generic elements**:
1. If `data-testid` exists: return testid locator (HIGH)
2. Else if `aria-label` exists: return aria-label as text locator (MEDIUM)
3. Else: return CSS selector (LOW)

**Text Evaluation Rules**:
When considering text content (for buttons, links, or aria-label):
- **Accept**: meaningful, multi-character text (e.g., "Submit", "Click here", "Learn more")
- **Reject**: single characters, generic symbols (">>", "◄", "...", "•"), whitespace-only, or appears to be UI chrome
- Trim and normalize whitespace; if empty after trimming, reject

**CSS Selector Strategy** (when no semantic locator available):
Generate a CSS selector using this priority:
1. If element has stable ID (not matching dynamic patterns like `react-*`, `emotion-*`, `__*`, `sc-*`): use `#id`
2. Else if element has intentional classes (not matching generated patterns): use tag + classes (e.g., `button.primary`)
3. Else if element has unique attribute combination: use tag + attributes (e.g., `input[type="email"][name="address"]`)
4. Else: use tag selector only (least specific, but acceptable in small scopes)
5. Do not use position-based selectors (`:nth-child`, `:nth-of-type`) as they are fragile

If no acceptable CSS selector can be generated, return CSS locator with simple tag selector and LOW confidence.

**Special Handling**:

**Associated Label Detection** (for form inputs):
- Look for `<label for="elementId">` where elementId matches the element's `id` attribute
- Extract the label text content (trimmed)
- Use label text for `getByLabel()` locator

**Accessible Name for Role Elements**:
- For elements with explicit role (e.g., `role="button"`), compute accessible name from:
  1. Element's `aria-label` attribute, or
  2. Element's direct text content (trimmed), or
  3. Text of associated `<label>` if applicable
- If computed name is non-empty and not generic, use `getByRole(role, { name })`

**Dynamic vs Static Content**:
- Links with query parameters in href (e.g., `/page?id=123`) are treated as risky for href-based locators; skip href strategy
- Very generic text like "Click", "Submit", "Button" without additional context are acceptable for buttons but risky for links; use with MEDIUM confidence

**Key Types**:
```typescript
interface LocatorInfo {
  api: 'getByTestId' | 'getByRole' | 'getByLabel' | 'getByPlaceholder' | 'getByText' | 'locator';
  args: string[];  // Arguments to pass to the Playwright API
  // For getByRole: args = [role, name?] (name is optional)
  // For others: args = [value]
  
  confidence: 'high' | 'medium' | 'low';
  reasoning?: string;  // e.g., "Selected via data-testid attribute"
}
```

**Deliverables**:
- Determine element type and apply appropriate locator strategy
- Return the single best locator per element
- Include confidence and reasoning for debugging
- Generate CSS selectors as fallback when semantic locators unavailable
- Handle edge cases: labels, empty/generic text, role elements

**Tests**:
- **Test ID Selection**: `data-testid` is selected when present (all element types)
- **Button Elements**: text-only buttons, buttons with aria-label, buttons without identifiers
- **Input Elements**: with labels, with placeholders, without labels, with aria-label
- **Checkbox/Radio**: with labels, with aria-label, without identifiers
- **Select Elements**: with labels, with aria-label, without identifiers
- **Link Elements**: with stable text, with aria-label, without text
- **Role Elements**: with meaningful accessible name, with aria-label, with text content
- **CSS Selector Generation**: ID selection, class selection, attribute combinations, fallback tag selector
- **Text Evaluation**: accept meaningful text, reject generic/empty/symbols
- **Label Association**: correct label text extraction from `<label for="id">`
- **Edge Cases**: nested elements, empty attributes, whitespace normalization, dynamic href patterns
- **Confidence Levels**: verify correct confidence assigned to each strategy

---

### Stage 3: Element Metadata Extractor Module
**File**: `src/element-metadata.ts`

**Objective**: Extract metadata for code generation from elements and their locators. Translate Stage 2 locator information into code generation instructions.

**Input Contract**:
- Receives `Element` objects (from Stage 1)
- Receives `LocatorInfo` objects (from Stage 2) in corresponding order
- Stage 2 has already classified element types and generated locators; Stage 3 does not re-classify

**Key Components**:

**`extractElementMetadata(element: Element, locatorInfo: LocatorInfo): ElementMetadata`**:
- Generate a stable camelCase property identifier from the locator information
- Determine the interaction type based on the element's tag/type and role
- Return complete metadata for Stage 4 code generation
- All computations are deterministic and depend only on element and locator

**Locator-to-Playwright-API Mapping**:
Stage 4 will convert LocatorInfo into code. Stage 3's role is to provide metadata for method selection:
- `getByTestId` → property getter, no suffix action method
- `getByRole` → property getter, no suffix action method
- `getByLabel`, `getByPlaceholder`, `getByText` → property getter, no suffix action method
- `locator` (CSS) → property getter, no suffix action method

All interactions are generated via action methods:
- `click()` for button-like and role-based interactive elements
- `fill()` for text inputs and textareas
- `check()` for checkboxes and radios
- `selectOption()` for selects
- Navigation (link following) is optional; links can also be treated as clickable

**Property Identifier Generation Algorithm**:

1. Extract base name from locator (in priority order):
   - If `api === 'getByTestId'`: use first arg directly
   - If `api === 'getByRole'`: use second arg (name) if present, else use first arg (role)
   - If `api === 'getByLabel'`: use first arg (label text)
   - If `api === 'getByPlaceholder'`: use first arg (placeholder text)
   - If `api === 'getByText'`: use first arg (text)
   - If `api === 'locator'`: use element tag name

2. Convert to camelCase:
   - Remove leading/trailing whitespace
   - Remove non-alphanumeric characters (keep only a-z, A-Z, 0-9)
   - Convert to camelCase: first word lowercase, subsequent words capitalize first letter
   - If starts with digit, prepend element tag name (e.g., `2` → `button2`)
   - If empty after conversion, use element tag name (e.g., `button`, `input`, `select`)

3. Ensure uniqueness:
   - Collected across all elements
   - On collision, append numeric suffix (starting at 2): `submit`, `submit2`, `submit3`
   - This deduplication happens at the Stage 3 boundary (batch operation)

4. Validation:
   - Must be valid TypeScript identifier: `/^[a-zA-Z_$][a-zA-Z0-9_$]*$/`
   - Must not be a reserved word: `button`, `return`, `this`, `class`, `constructor`, `prototype`, etc.
   - If validation fails, use fallback: element tag name + auto-incremented counter

**Interaction Type Mapping**:
Based on element tag name / type attribute / role attribute (from the DOM element, not reconstructed):

- `<button>`, `<input type="button">`, `role="button"` → 'click'
- `<input type="text|email|password|number">`, `<textarea>` → 'fill'
- `<input type="checkbox">` → 'check'
- `<input type="radio">` → 'check'
- `<select>` → 'selectOption'
- `<a href="...">` → 'click' (navigates; treated as clickable)
- Any element with `role="button"`, `role="link"` → 'click'
- Any element with `role="tab"`, `role="menuitem"` → 'click'
- Any element with `role="checkbox"`, `role="switch"` → 'check'
- Any element with `role="option"`, `role="listbox"` → 'selectOption' (specialized; typically not extracted as top-level)
- Fallback for unknown → 'click' (safest default)

**Key Types**:
```typescript
interface ElementMetadata {
  element: Element;              // Reference to original element
  locatorInfo: LocatorInfo;      // Stage 2 output (API + args + confidence)
  id: string;                    // camelCase identifier for property and action methods
  interactionType: 'click' | 'fill' | 'check' | 'selectOption';
}
```

**Deliverables**:
- Generate valid, deterministic camelCase property identifiers from locator information
- Map element tag/type/role to correct Playwright interaction method
- Handle identifier collisions and validation
- Provide complete metadata for Stage 4 code generation
- No speculative metadata; only what Stage 4 actually needs

**Tests**:
- **Identifier Generation**:
  - getByTestId("submit") → id: "submit"
  - getByTestId("submit-button") → id: "submitButton"
  - getByTestId("2fa-code") → id: "input2faCode" or "button2faCode" (depends on element tag)
  - getByRole("button", "Click Me") → id: "clickMe"
  - getByText("Learn More") → id: "learnMore"
  - Placeholder("Enter name...") → id: "inputEnterName" or fallback tag name
  - Empty/generic locator → id: element tag name (button, input, select, etc.)

- **Collision Handling**:
  - Two "submit" buttons → ids: "submit", "submit2"
  - Collision in generated suffix → "submit", "submit2", "submit3" (not "submit2", "submit2_2")

- **Interaction Type Mapping**:
  - `<button>` → 'click'
  - `<input type="text">` → 'fill'
  - `<input type="checkbox">` → 'check'
  - `<input type="radio">` → 'check'
  - `<select>` → 'selectOption'
  - `<a href="#">` → 'click'
  - `<div role="button">` → 'click'
  - `<div role="tab">` → 'click'
  - `<span role="checkbox">` → 'check'

- **Validation**:
  - Reserved keywords are avoided or suffixed (e.g., "return" → "return2")
  - Invalid characters are removed
  - Empty identifiers fall back to tag name

- **Edge Cases**:
  - Element with no meaningful locator (fallback CSS) → use tag name
  - Element with unicode text → sanitized to alphanumeric
  - Very long identifiers → handled as-is (no truncation)
  - Numbers in identifiers → handled correctly ("2fa" → "input2fa")

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
