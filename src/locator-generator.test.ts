import { describe, it, expect } from "vitest";
import { generateLocator, classifyElement } from "./locator-generator";
import { parseHTML } from "./parser";

describe("classifyElement", () => {
  it("classifies button element", () => {
    const html = "<button>Click</button>";
    const doc = parseHTML(html);
    const btn = doc.querySelector("button")!;
    expect(classifyElement(btn)).toBe("button");
  });

  it("classifies input type=button as button", () => {
    const html = '<input type="button" />';
    const doc = parseHTML(html);
    const input = doc.querySelector("input")!;
    expect(classifyElement(input)).toBe("button");
  });

  it("classifies role=button as role-based", () => {
    const html = '<div role="button">Click</div>';
    const doc = parseHTML(html);
    const div = doc.querySelector("div")!;
    expect(classifyElement(div)).toBe("role-based");
  });

  it("classifies text input", () => {
    const html = '<input type="text" />';
    const doc = parseHTML(html);
    const input = doc.querySelector("input")!;
    expect(classifyElement(input)).toBe("input");
  });

  it("classifies email input", () => {
    const html = '<input type="email" />';
    const doc = parseHTML(html);
    const input = doc.querySelector("input")!;
    expect(classifyElement(input)).toBe("input");
  });

  it("classifies checkbox", () => {
    const html = '<input type="checkbox" />';
    const doc = parseHTML(html);
    const input = doc.querySelector("input")!;
    expect(classifyElement(input)).toBe("checkbox");
  });

  it("classifies radio", () => {
    const html = '<input type="radio" />';
    const doc = parseHTML(html);
    const input = doc.querySelector("input")!;
    expect(classifyElement(input)).toBe("radio");
  });

  it("classifies select", () => {
    const html = "<select><option>Opt</option></select>";
    const doc = parseHTML(html);
    const select = doc.querySelector("select")!;
    expect(classifyElement(select)).toBe("select");
  });

  it("classifies textarea as input", () => {
    const html = "<textarea></textarea>";
    const doc = parseHTML(html);
    const textarea = doc.querySelector("textarea")!;
    expect(classifyElement(textarea)).toBe("input");
  });

  it("classifies link with href", () => {
    const html = '<a href="/page">Link</a>';
    const doc = parseHTML(html);
    const link = doc.querySelector("a")!;
    expect(classifyElement(link)).toBe("link");
  });

  it("classifies link without href as generic", () => {
    const html = "<a>No href</a>";
    const doc = parseHTML(html);
    const link = doc.querySelector("a")!;
    expect(classifyElement(link)).toBe("generic");
  });
});

describe("generateLocator - Test ID Priority", () => {
  it("selects data-testid for button", () => {
    const html = '<button data-testid="submit">Submit</button>';
    const doc = parseHTML(html);
    const btn = doc.querySelector("button")!;
    const result = generateLocator(btn);

    expect(result.api).toBe("getByTestId");
    expect(result.args[0]).toBe("submit");
    expect(result.confidence).toBe("high");
  });

  it("selects data-testid for input over label", () => {
    const html = `
      <label for="email">Email</label>
      <input type="email" id="email" data-testid="email-field" />
    `;
    const doc = parseHTML(html);
    const input = doc.querySelector("input")!;
    const result = generateLocator(input);

    expect(result.api).toBe("getByTestId");
    expect(result.args[0]).toBe("email-field");
  });

  it("selects data-testid for any element type", () => {
    const html = `
      <select data-testid="country-select">
        <option>USA</option>
      </select>
    `;
    const doc = parseHTML(html);
    const select = doc.querySelector("select")!;
    const result = generateLocator(select);

    expect(result.api).toBe("getByTestId");
    expect(result.args[0]).toBe("country-select");
  });
});

describe("generateLocator - Button Elements", () => {
  it("selects button text when no testid", () => {
    const html = "<button>Submit Button</button>";
    const doc = parseHTML(html);
    const btn = doc.querySelector("button")!;
    const result = generateLocator(btn);

    expect(result.api).toBe("getByText");
    expect(result.args[0]).toBe("Submit Button");
    expect(result.confidence).toBe("medium");
  });

  it("selects button aria-label when no text or testid", () => {
    const html = '<button aria-label="Close dialog"><svg>X</svg></button>';
    const doc = parseHTML(html);
    const btn = doc.querySelector("button")!;
    const result = generateLocator(btn);

    expect(result.api).toBe("getByText");
    expect(result.args[0]).toBe("Close dialog");
    expect(result.confidence).toBe("medium");
  });

  it("falls back to CSS selector when no semantic locator", () => {
    const html = '<button id="my-btn"></button>';
    const doc = parseHTML(html);
    const btn = doc.querySelector("button")!;
    const result = generateLocator(btn);

    expect(result.api).toBe("locator");
    expect(result.args[0]).toBe("#my-btn");
    expect(result.confidence).toBe("low");
  });

  it("rejects generic/symbol button text", () => {
    const html = "<button>>></button>";
    const doc = parseHTML(html);
    const btn = doc.querySelector("button")!;
    const result = generateLocator(btn);

    expect(result.api).toBe("locator");
    expect(result.confidence).toBe("low");
  });

  it("rejects single character button text", () => {
    const html = "<button>X</button>";
    const doc = parseHTML(html);
    const btn = doc.querySelector("button")!;
    const result = generateLocator(btn);

    expect(result.api).toBe("locator");
    expect(result.confidence).toBe("low");
  });
});

describe("generateLocator - Input Elements", () => {
  it("selects associated label for text input", () => {
    const html = `
      <label for="username">Username:</label>
      <input type="text" id="username" />
    `;
    const doc = parseHTML(html);
    const input = doc.querySelector("input")!;
    const result = generateLocator(input);

    expect(result.api).toBe("getByLabel");
    expect(result.args[0]).toBe("Username:");
    expect(result.confidence).toBe("medium");
  });

  it("selects placeholder when no label", () => {
    const html = '<input type="text" placeholder="Your full name" />';
    const doc = parseHTML(html);
    const input = doc.querySelector("input")!;
    const result = generateLocator(input);

    expect(result.api).toBe("getByPlaceholder");
    expect(result.args[0]).toBe("Your full name");
  });

  it("rejects generic placeholders", () => {
    const html = '<input type="text" placeholder="Enter text..." />';
    const doc = parseHTML(html);
    const input = doc.querySelector("input")!;
    const result = generateLocator(input);

    expect(result.api).toBe("locator");
  });

  it("selects aria-label for input when no label or placeholder", () => {
    const html = '<input type="text" aria-label="Search box" />';
    const doc = parseHTML(html);
    const input = doc.querySelector("input")!;
    const result = generateLocator(input);

    expect(result.api).toBe("getByText");
    expect(result.args[0]).toBe("Search box");
  });

  it("falls back to CSS selector for input without identifiers", () => {
    const html = '<input type="email" id="email-field" />';
    const doc = parseHTML(html);
    const input = doc.querySelector("input")!;
    const result = generateLocator(input);

    expect(result.api).toBe("locator");
    expect(result.args[0]).toContain("email-field");
  });

  it("handles email input type", () => {
    const html = `
      <label for="email">Email:</label>
      <input type="email" id="email" />
    `;
    const doc = parseHTML(html);
    const input = doc.querySelector("input")!;
    const result = generateLocator(input);

    expect(result.api).toBe("getByLabel");
    expect(result.args[0]).toBe("Email:");
  });

  it("handles password input type", () => {
    const html = `
      <label for="pwd">Password:</label>
      <input type="password" id="pwd" />
    `;
    const doc = parseHTML(html);
    const input = doc.querySelector("input")!;
    const result = generateLocator(input);

    expect(result.api).toBe("getByLabel");
  });

  it("handles number input type", () => {
    const html = `
      <label for="age">Age:</label>
      <input type="number" id="age" />
    `;
    const doc = parseHTML(html);
    const input = doc.querySelector("input")!;
    const result = generateLocator(input);

    expect(result.api).toBe("getByLabel");
  });
});

describe("generateLocator - Checkbox/Radio Elements", () => {
  it("selects associated label for checkbox", () => {
    const html = `
      <label for="agree">I agree</label>
      <input type="checkbox" id="agree" />
    `;
    const doc = parseHTML(html);
    const checkbox = doc.querySelector("input")!;
    const result = generateLocator(checkbox);

    expect(result.api).toBe("getByLabel");
    expect(result.args[0]).toBe("I agree");
  });

  it("selects aria-label for checkbox when no label", () => {
    const html = '<input type="checkbox" aria-label="Remember me" />';
    const doc = parseHTML(html);
    const checkbox = doc.querySelector("input")!;
    const result = generateLocator(checkbox);

    expect(result.api).toBe("getByText");
    expect(result.args[0]).toBe("Remember me");
  });

  it("selects associated label for radio", () => {
    const html = `
      <label for="male">Male</label>
      <input type="radio" id="male" name="gender" />
    `;
    const doc = parseHTML(html);
    const radio = doc.querySelector("input")!;
    const result = generateLocator(radio);

    expect(result.api).toBe("getByLabel");
    expect(result.args[0]).toBe("Male");
  });

  it("selects CSS selector for checkbox without identifiers", () => {
    const html = '<input type="checkbox" id="terms" />';
    const doc = parseHTML(html);
    const checkbox = doc.querySelector("input")!;
    const result = generateLocator(checkbox);

    expect(result.api).toBe("locator");
    expect(result.confidence).toBe("low");
  });
});

describe("generateLocator - Select Elements", () => {
  it("selects associated label for select", () => {
    const html = `
      <label for="country">Country:</label>
      <select id="country">
        <option>USA</option>
      </select>
    `;
    const doc = parseHTML(html);
    const select = doc.querySelector("select")!;
    const result = generateLocator(select);

    expect(result.api).toBe("getByLabel");
    expect(result.args[0]).toBe("Country:");
  });

  it("selects aria-label for select when no label", () => {
    const html = `
      <select aria-label="Choose language">
        <option>English</option>
      </select>
    `;
    const doc = parseHTML(html);
    const select = doc.querySelector("select")!;
    const result = generateLocator(select);

    expect(result.api).toBe("getByText");
    expect(result.args[0]).toBe("Choose language");
  });

  it("falls back to CSS selector for select without identifiers", () => {
    const html = `
      <select id="options">
        <option>Opt</option>
      </select>
    `;
    const doc = parseHTML(html);
    const select = doc.querySelector("select")!;
    const result = generateLocator(select);

    expect(result.api).toBe("locator");
    expect(result.args[0]).toContain("options");
  });
});

describe("generateLocator - Link Elements", () => {
  it("selects link text", () => {
    const html = '<a href="/home">Go Home</a>';
    const doc = parseHTML(html);
    const link = doc.querySelector("a")!;
    const result = generateLocator(link);

    expect(result.api).toBe("getByText");
    expect(result.args[0]).toBe("Go Home");
    expect(result.confidence).toBe("medium");
  });

  it("selects aria-label for link when no text", () => {
    const html = '<a href="/help" aria-label="Help page"><svg>?</svg></a>';
    const doc = parseHTML(html);
    const link = doc.querySelector("a")!;
    const result = generateLocator(link);

    expect(result.api).toBe("getByText");
    expect(result.args[0]).toBe("Help page");
  });

  it("falls back to CSS selector for link without text or aria-label", () => {
    const html = '<a href="/page" id="link-1"></a>';
    const doc = parseHTML(html);
    const link = doc.querySelector("a")!;
    const result = generateLocator(link);

    expect(result.api).toBe("locator");
    expect(result.args[0]).toBe("#link-1");
  });

  it("rejects generic link text", () => {
    const html = '<a href="/page">...</a>';
    const doc = parseHTML(html);
    const link = doc.querySelector("a")!;
    const result = generateLocator(link);

    expect(result.api).toBe("locator");
    expect(result.confidence).toBe("low");
  });
});

describe("generateLocator - Role-Based Elements", () => {
  it("selects role with accessible name", () => {
    const html = '<div role="button" aria-label="Submit Form">Submit</div>';
    const doc = parseHTML(html);
    const div = doc.querySelector("div")!;
    const result = generateLocator(div);

    expect(result.api).toBe("getByRole");
    expect(result.args[0]).toBe("button");
    expect(result.args[1]).toBeDefined();
  });

  it("selects role with element text", () => {
    const html = '<div role="button">Click Me</div>';
    const doc = parseHTML(html);
    const div = doc.querySelector("div")!;
    const result = generateLocator(div);

    expect(result.api).toBe("getByRole");
    expect(result.args[0]).toBe("button");
    expect(result.args[1]).toBe("Click Me");
  });

  it("rejects generic role name", () => {
    const html = '<div role="button">button</div>';
    const doc = parseHTML(html);
    const div = doc.querySelector("div")!;
    const result = generateLocator(div);

    expect(result.api).not.toBe("getByRole");
  });

  it("selects role with aria-label when no element text", () => {
    const html = '<div role="tab" aria-label="Tab 1"><svg>1</svg></div>';
    const doc = parseHTML(html);
    const div = doc.querySelector("div")!;
    const result = generateLocator(div);

    expect(result.api).toBe("getByRole");
    expect(result.args[0]).toBe("tab");
    expect(result.args[1]).toBe("Tab 1");
  });

  it("handles role=link", () => {
    const html = '<div role="link">Learn More</div>';
    const doc = parseHTML(html);
    const div = doc.querySelector("div")!;
    const result = generateLocator(div);

    expect(result.api).toBe("getByRole");
    expect(result.args[0]).toBe("link");
  });

  it("handles role=tab", () => {
    const html = '<div role="tab">Settings</div>';
    const doc = parseHTML(html);
    const div = doc.querySelector("div")!;
    const result = generateLocator(div);

    expect(result.api).toBe("getByRole");
    expect(result.args[0]).toBe("tab");
  });
});

describe("generateLocator - CSS Selector Generation", () => {
  it("uses stable ID as CSS selector when no text", () => {
    const html = '<button id="my-button"></button>';
    const doc = parseHTML(html);
    const btn = doc.querySelector("button")!;
    const result = generateLocator(btn);

    expect(result.api).toBe("locator");
    expect(result.args[0]).toBe("#my-button");
  });

  it("avoids dynamic IDs (react-*)", () => {
    const html = '<button id="react-123-button"></button>';
    const doc = parseHTML(html);
    const btn = doc.querySelector("button")!;
    const result = generateLocator(btn);

    expect(result.args[0]).not.toContain("react-123");
  });

  it("avoids dynamic IDs (emotion-*)", () => {
    const html = '<button id="emotion-abc123"></button>';
    const doc = parseHTML(html);
    const btn = doc.querySelector("button")!;
    const result = generateLocator(btn);

    expect(result.args[0]).not.toContain("emotion-abc123");
  });

  it("avoids dynamic IDs (sc-*)", () => {
    const html = '<button id="sc-xyz123"></button>';
    const doc = parseHTML(html);
    const btn = doc.querySelector("button")!;
    const result = generateLocator(btn);

    expect(result.args[0]).not.toContain("sc-xyz123");
  });

  it("uses intentional classes", () => {
    const html = '<button class="btn btn-primary"></button>';
    const doc = parseHTML(html);
    const btn = doc.querySelector("button")!;
    const result = generateLocator(btn);

    expect(result.api).toBe("locator");
    expect(result.args[0]).toContain("btn");
    expect(result.args[0]).toContain("primary");
  });

  it("avoids dynamic classes and falls back to tag selector", () => {
    const html = '<button class="sc-a1b2c3d e5f6g7h"></button>';
    const doc = parseHTML(html);
    const btn = doc.querySelector("button")!;
    const result = generateLocator(btn);

    expect(result.api).toBe("locator");
    expect(result.args[0]).toBe("button");
  });

  it("uses attribute combination", () => {
    // Override to get CSS fallback instead of testid
    const html = '<input type="email" name="user-email" />';
    const doc = parseHTML(html);
    const input = doc.querySelector("input")!;
    const result = generateLocator(input);

    expect(result.api).toBe("locator");
    expect(result.args[0]).toContain("input");
  });

  it("falls back to tag selector when no identifiers", () => {
    const html = "<button></button>";
    const doc = parseHTML(html);
    const btn = doc.querySelector("button")!;
    const result = generateLocator(btn);

    expect(result.api).toBe("locator");
    expect(result.args[0]).toBe("button");
  });
});

describe("generateLocator - Text Handling", () => {
  it("trims and normalizes whitespace in text", () => {
    const html = "<button>  Click   Me  </button>";
    const doc = parseHTML(html);
    const btn = doc.querySelector("button")!;
    const result = generateLocator(btn);

    expect(result.api).toBe("getByText");
    expect(result.args[0]).toBe("Click Me");
  });

  it("normalizes multiline text", () => {
    const html = `<button>Click
    Me</button>`;
    const doc = parseHTML(html);
    const btn = doc.querySelector("button")!;
    const result = generateLocator(btn);

    expect(result.api).toBe("getByText");
    expect(result.args[0]).toBe("Click Me");
  });

  it("rejects empty text", () => {
    const html = "<button>   </button>";
    const doc = parseHTML(html);
    const btn = doc.querySelector("button")!;
    const result = generateLocator(btn);

    expect(result.api).toBe("locator");
  });

  it("rejects ellipsis symbol", () => {
    const html = "<button>…</button>";
    const doc = parseHTML(html);
    const btn = doc.querySelector("button")!;
    const result = generateLocator(btn);

    expect(result.api).toBe("locator");
  });

  it("rejects bullet point symbol", () => {
    const html = "<button>•</button>";
    const doc = parseHTML(html);
    const btn = doc.querySelector("button")!;
    const result = generateLocator(btn);

    expect(result.api).toBe("locator");
  });
});

describe("generateLocator - Label Association", () => {
  it("extracts label text for input with matching id", () => {
    const html = `
      <label for="username">Username Field</label>
      <input type="text" id="username" />
    `;
    const doc = parseHTML(html);
    const input = doc.querySelector("input")!;
    const result = generateLocator(input);

    expect(result.api).toBe("getByLabel");
    expect(result.args[0]).toBe("Username Field");
  });

  it("ignores label without matching for attribute", () => {
    const html = `
      <label>Email</label>
      <input type="email" id="email" />
    `;
    const doc = parseHTML(html);
    const input = doc.querySelector("input")!;
    const result = generateLocator(input);

    expect(result.api).not.toBe("getByLabel");
  });

  it("handles label with nested elements", () => {
    const html = `
      <label for="check"><span>I</span> agree</label>
      <input type="checkbox" id="check" />
    `;
    const doc = parseHTML(html);
    const checkbox = doc.querySelector("input")!;
    const result = generateLocator(checkbox);

    expect(result.api).toBe("getByLabel");
    expect(result.args[0]).toContain("agree");
  });

  it("skips label for input without id attribute", () => {
    const html = `
      <label for="field">Label</label>
      <input type="text" />
    `;
    const doc = parseHTML(html);
    const input = doc.querySelector("input")!;
    const result = generateLocator(input);

    expect(result.api).not.toBe("getByLabel");
  });
});

describe("generateLocator - Confidence Levels", () => {
  it("assigns high confidence to data-testid", () => {
    const html = '<button data-testid="btn">Click</button>';
    const doc = parseHTML(html);
    const btn = doc.querySelector("button")!;
    const result = generateLocator(btn);

    expect(result.confidence).toBe("high");
  });

  it("assigns high confidence to role with accessible name", () => {
    const html = '<div role="button">Click</div>';
    const doc = parseHTML(html);
    const div = doc.querySelector("div")!;
    const result = generateLocator(div);

    expect(result.confidence).toBe("high");
  });

  it("assigns medium confidence to text locators", () => {
    const html = "<button>Submit</button>";
    const doc = parseHTML(html);
    const btn = doc.querySelector("button")!;
    const result = generateLocator(btn);

    expect(result.confidence).toBe("medium");
  });

  it("assigns low confidence to CSS selector", () => {
    const html = '<button id="btn"></button>';
    const doc = parseHTML(html);
    const btn = doc.querySelector("button")!;
    const result = generateLocator(btn);

    expect(result.confidence).toBe("low");
  });
});

describe("generateLocator - Reasoning", () => {
  it("includes reasoning for data-testid selection", () => {
    const html = '<button data-testid="btn">Click</button>';
    const doc = parseHTML(html);
    const btn = doc.querySelector("button")!;
    const result = generateLocator(btn);

    expect(result.reasoning).toBeDefined();
    expect(result.reasoning).toContain("data-testid");
  });

  it("includes reasoning for text selection", () => {
    const html = "<button>Click</button>";
    const doc = parseHTML(html);
    const btn = doc.querySelector("button")!;
    const result = generateLocator(btn);

    expect(result.reasoning).toBeDefined();
    expect(result.reasoning).toContain("text");
  });

  it("includes reasoning for CSS selector fallback", () => {
    const html = '<button id="btn"></button>';
    const doc = parseHTML(html);
    const btn = doc.querySelector("button")!;
    const result = generateLocator(btn);

    expect(result.reasoning).toBeDefined();
    expect(result.reasoning).toContain("CSS");
  });
});

describe("generateLocator - Edge Cases", () => {
  it("handles input without type attribute (defaults to text)", () => {
    const html = `
      <label for="field">Name</label>
      <input id="field" />
    `;
    const doc = parseHTML(html);
    const input = doc.querySelector("input")!;
    const result = generateLocator(input);

    expect(result.api).toBe("getByLabel");
  });

  it("handles empty placeholder", () => {
    const html = '<input type="text" placeholder="" />';
    const doc = parseHTML(html);
    const input = doc.querySelector("input")!;
    const result = generateLocator(input);

    expect(result.api).not.toBe("getByPlaceholder");
  });

  it("handles aria-label with whitespace", () => {
    const html = '<button aria-label="   "></button>';
    const doc = parseHTML(html);
    const btn = doc.querySelector("button")!;
    const result = generateLocator(btn);

    expect(result.api).not.toBe("getByText");
  });

  it("handles very long button text", () => {
    const html = "<button>This is a very long button text that spans multiple words and is quite descriptive</button>";
    const doc = parseHTML(html);
    const btn = doc.querySelector("button")!;
    const result = generateLocator(btn);

    expect(result.api).toBe("getByText");
    expect(result.args[0]).toContain("long button");
  });

  it("handles special characters in text", () => {
    const html = '<button data-testid="special">Click & Go (or not)</button>';
    const doc = parseHTML(html);
    const btn = doc.querySelector("button")!;
    const result = generateLocator(btn);

    expect(result.api).toBe("getByTestId");
  });

  it("handles unicode characters in text", () => {
    const html = "<button>Привет 你好 🚀</button>";
    const doc = parseHTML(html);
    const btn = doc.querySelector("button")!;
    const result = generateLocator(btn);

    expect(result.api).toBe("getByText");
    expect(result.args[0]).toContain("Привет");
  });

  it("handles button with only nested elements", () => {
    const html = "<button><span>Inside</span></button>";
    const doc = parseHTML(html);
    const btn = doc.querySelector("button")!;
    const result = generateLocator(btn);

    expect(result.api).toBe("getByText");
    expect(result.args[0]).toBe("Inside");
  });

  it("prioritizes testid over inherited role text", () => {
    const html = '<div role="button" data-testid="custom">Button Text</div>';
    const doc = parseHTML(html);
    const div = doc.querySelector("div")!;
    const result = generateLocator(div);

    expect(result.api).toBe("getByTestId");
    expect(result.args[0]).toBe("custom");
  });
});
