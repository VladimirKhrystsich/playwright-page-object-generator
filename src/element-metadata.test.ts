import { describe, it, expect } from "vitest";
import {
  extractElementMetadata,
  deduplicateIdentifiers,
} from "./element-metadata";
import { parseHTML } from "./parser";
import type { LocatorInfo } from "./locator-generator";

describe("extractElementMetadata - Identifier Generation", () => {
  it("generates id from getByTestId", () => {
    const html = '<button data-testid="submit">Submit</button>';
    const doc = parseHTML(html);
    const btn = doc.querySelector("button")!;
    const locatorInfo: LocatorInfo = {
      api: "getByTestId",
      args: ["submit"],
      confidence: "high",
    };

    const metadata = extractElementMetadata(btn, locatorInfo);
    expect(metadata.id).toBe("submit");
  });

  it("converts hyphenated testid to camelCase", () => {
    const html = '<button data-testid="submit-button">Submit</button>';
    const doc = parseHTML(html);
    const btn = doc.querySelector("button")!;
    const locatorInfo: LocatorInfo = {
      api: "getByTestId",
      args: ["submit-button"],
      confidence: "high",
    };

    const metadata = extractElementMetadata(btn, locatorInfo);
    expect(metadata.id).toBe("submitButton");
  });

  it("generates id from getByRole with name", () => {
    const html = '<div role="button">Click Me</div>';
    const doc = parseHTML(html);
    const div = doc.querySelector("div")!;
    const locatorInfo: LocatorInfo = {
      api: "getByRole",
      args: ["button", "Click Me"],
      confidence: "high",
    };

    const metadata = extractElementMetadata(div, locatorInfo);
    expect(metadata.id).toBe("clickMe");
  });

  it("generates id from getByRole without name (uses role)", () => {
    const html = '<div role="button"></div>';
    const doc = parseHTML(html);
    const div = doc.querySelector("div")!;
    const locatorInfo: LocatorInfo = {
      api: "getByRole",
      args: ["button"],
      confidence: "medium",
    };

    const metadata = extractElementMetadata(div, locatorInfo);
    expect(metadata.id).toBe("button");
  });

  it("generates id from getByRole with only role when second arg is empty", () => {
    const html = '<div role="tab"></div>';
    const doc = parseHTML(html);
    const div = doc.querySelector("div")!;
    const locatorInfo: LocatorInfo = {
      api: "getByRole",
      args: ["tab", ""],
      confidence: "medium",
    };

    const metadata = extractElementMetadata(div, locatorInfo);
    expect(metadata.id).toBe("tab");
  });

  it("generates id from getByLabel", () => {
    const html = '<input type="text" />';
    const doc = parseHTML(html);
    const input = doc.querySelector("input")!;
    const locatorInfo: LocatorInfo = {
      api: "getByLabel",
      args: ["Email Address"],
      confidence: "medium",
    };

    const metadata = extractElementMetadata(input, locatorInfo);
    expect(metadata.id).toBe("emailAddress");
  });

  it("generates id from getByPlaceholder", () => {
    const html = '<input type="text" />';
    const doc = parseHTML(html);
    const input = doc.querySelector("input")!;
    const locatorInfo: LocatorInfo = {
      api: "getByPlaceholder",
      args: ["Enter your name"],
      confidence: "medium",
    };

    const metadata = extractElementMetadata(input, locatorInfo);
    expect(metadata.id).toContain("enter");
  });

  it("generates id from getByText", () => {
    const html = "<button>Learn More</button>";
    const doc = parseHTML(html);
    const btn = doc.querySelector("button")!;
    const locatorInfo: LocatorInfo = {
      api: "getByText",
      args: ["Learn More"],
      confidence: "medium",
    };

    const metadata = extractElementMetadata(btn, locatorInfo);
    expect(metadata.id).toBe("learnMore");
  });

  it("falls back to tag name for CSS locator (locator api)", () => {
    const html = '<button id="btn-123"></button>';
    const doc = parseHTML(html);
    const btn = doc.querySelector("button")!;
    const locatorInfo: LocatorInfo = {
      api: "locator",
      args: ["#btn-123"],
      confidence: "low",
    };

    const metadata = extractElementMetadata(btn, locatorInfo);
    expect(metadata.id).toBe("button");
  });

  it("falls back to tag name for empty locator", () => {
    const html = '<select><option>Opt</option></select>';
    const doc = parseHTML(html);
    const select = doc.querySelector("select")!;
    const locatorInfo: LocatorInfo = {
      api: "getByTestId",
      args: [""],
      confidence: "low",
    };

    const metadata = extractElementMetadata(select, locatorInfo);
    expect(metadata.id).toBe("select");
  });
});

describe("extractElementMetadata - camelCase Conversion", () => {
  it("converts spaces to camelCase", () => {
    const html = "<button></button>";
    const doc = parseHTML(html);
    const btn = doc.querySelector("button")!;
    const locatorInfo: LocatorInfo = {
      api: "getByText",
      args: ["Submit Form Button"],
      confidence: "medium",
    };

    const metadata = extractElementMetadata(btn, locatorInfo);
    expect(metadata.id).toBe("submitFormButton");
  });

  it("converts underscores to camelCase", () => {
    const html = "<button></button>";
    const doc = parseHTML(html);
    const btn = doc.querySelector("button")!;
    const locatorInfo: LocatorInfo = {
      api: "getByTestId",
      args: ["submit_form_button"],
      confidence: "high",
    };

    const metadata = extractElementMetadata(btn, locatorInfo);
    expect(metadata.id).toBe("submitFormButton");
  });

  it("removes special characters", () => {
    const html = "<button></button>";
    const doc = parseHTML(html);
    const btn = doc.querySelector("button")!;
    const locatorInfo: LocatorInfo = {
      api: "getByTestId",
      args: ["submit@form#button!"],
      confidence: "high",
    };

    const metadata = extractElementMetadata(btn, locatorInfo);
    expect(metadata.id).toBe("submitFormButton");
  });

  it("handles multiple consecutive special characters", () => {
    const html = "<button></button>";
    const doc = parseHTML(html);
    const btn = doc.querySelector("button")!;
    const locatorInfo: LocatorInfo = {
      api: "getByTestId",
      args: ["submit---button"],
      confidence: "high",
    };

    const metadata = extractElementMetadata(btn, locatorInfo);
    expect(metadata.id).toBe("submitButton");
  });

  it("handles mixed whitespace and special characters", () => {
    const html = "<button></button>";
    const doc = parseHTML(html);
    const btn = doc.querySelector("button")!;
    const locatorInfo: LocatorInfo = {
      api: "getByText",
      args: ["2FA Code Input"],
      confidence: "medium",
    };

    const metadata = extractElementMetadata(btn, locatorInfo);
    expect(metadata.id).toBe("button");
  });

  it("normalizes whitespace", () => {
    const html = "<button></button>";
    const doc = parseHTML(html);
    const btn = doc.querySelector("button")!;
    const locatorInfo: LocatorInfo = {
      api: "getByText",
      args: ["Click    Me    Now"],
      confidence: "medium",
    };

    const metadata = extractElementMetadata(btn, locatorInfo);
    expect(metadata.id).toBe("clickMeNow");
  });
});

describe("extractElementMetadata - Interaction Type Mapping", () => {
  it("maps button element to click", () => {
    const html = "<button>Click</button>";
    const doc = parseHTML(html);
    const btn = doc.querySelector("button")!;
    const locatorInfo: LocatorInfo = {
      api: "getByTestId",
      args: ["btn"],
      confidence: "high",
    };

    const metadata = extractElementMetadata(btn, locatorInfo);
    expect(metadata.interactionType).toBe("click");
  });

  it("maps input[type=button] to click", () => {
    const html = '<input type="button" />';
    const doc = parseHTML(html);
    const input = doc.querySelector("input")!;
    const locatorInfo: LocatorInfo = {
      api: "getByTestId",
      args: ["btn"],
      confidence: "high",
    };

    const metadata = extractElementMetadata(input, locatorInfo);
    expect(metadata.interactionType).toBe("click");
  });

  it("maps role=button to click", () => {
    const html = '<div role="button">Click</div>';
    const doc = parseHTML(html);
    const div = doc.querySelector("div")!;
    const locatorInfo: LocatorInfo = {
      api: "getByTestId",
      args: ["btn"],
      confidence: "high",
    };

    const metadata = extractElementMetadata(div, locatorInfo);
    expect(metadata.interactionType).toBe("click");
  });

  it("maps role=link to click", () => {
    const html = '<div role="link">Link</div>';
    const doc = parseHTML(html);
    const div = doc.querySelector("div")!;
    const locatorInfo: LocatorInfo = {
      api: "getByTestId",
      args: ["link"],
      confidence: "high",
    };

    const metadata = extractElementMetadata(div, locatorInfo);
    expect(metadata.interactionType).toBe("click");
  });

  it("maps role=tab to click", () => {
    const html = '<div role="tab">Tab</div>';
    const doc = parseHTML(html);
    const div = doc.querySelector("div")!;
    const locatorInfo: LocatorInfo = {
      api: "getByTestId",
      args: ["tab"],
      confidence: "high",
    };

    const metadata = extractElementMetadata(div, locatorInfo);
    expect(metadata.interactionType).toBe("click");
  });

  it("maps input[type=text] to fill", () => {
    const html = '<input type="text" />';
    const doc = parseHTML(html);
    const input = doc.querySelector("input")!;
    const locatorInfo: LocatorInfo = {
      api: "getByTestId",
      args: ["username"],
      confidence: "high",
    };

    const metadata = extractElementMetadata(input, locatorInfo);
    expect(metadata.interactionType).toBe("fill");
  });

  it("maps input[type=email] to fill", () => {
    const html = '<input type="email" />';
    const doc = parseHTML(html);
    const input = doc.querySelector("input")!;
    const locatorInfo: LocatorInfo = {
      api: "getByTestId",
      args: ["email"],
      confidence: "high",
    };

    const metadata = extractElementMetadata(input, locatorInfo);
    expect(metadata.interactionType).toBe("fill");
  });

  it("maps input[type=password] to fill", () => {
    const html = '<input type="password" />';
    const doc = parseHTML(html);
    const input = doc.querySelector("input")!;
    const locatorInfo: LocatorInfo = {
      api: "getByTestId",
      args: ["pwd"],
      confidence: "high",
    };

    const metadata = extractElementMetadata(input, locatorInfo);
    expect(metadata.interactionType).toBe("fill");
  });

  it("maps input[type=number] to fill", () => {
    const html = '<input type="number" />';
    const doc = parseHTML(html);
    const input = doc.querySelector("input")!;
    const locatorInfo: LocatorInfo = {
      api: "getByTestId",
      args: ["age"],
      confidence: "high",
    };

    const metadata = extractElementMetadata(input, locatorInfo);
    expect(metadata.interactionType).toBe("fill");
  });

  it("maps textarea to fill", () => {
    const html = "<textarea></textarea>";
    const doc = parseHTML(html);
    const textarea = doc.querySelector("textarea")!;
    const locatorInfo: LocatorInfo = {
      api: "getByTestId",
      args: ["message"],
      confidence: "high",
    };

    const metadata = extractElementMetadata(textarea, locatorInfo);
    expect(metadata.interactionType).toBe("fill");
  });

  it("maps input[type=checkbox] to check", () => {
    const html = '<input type="checkbox" />';
    const doc = parseHTML(html);
    const input = doc.querySelector("input")!;
    const locatorInfo: LocatorInfo = {
      api: "getByTestId",
      args: ["agree"],
      confidence: "high",
    };

    const metadata = extractElementMetadata(input, locatorInfo);
    expect(metadata.interactionType).toBe("check");
  });

  it("maps input[type=radio] to check", () => {
    const html = '<input type="radio" />';
    const doc = parseHTML(html);
    const input = doc.querySelector("input")!;
    const locatorInfo: LocatorInfo = {
      api: "getByTestId",
      args: ["option"],
      confidence: "high",
    };

    const metadata = extractElementMetadata(input, locatorInfo);
    expect(metadata.interactionType).toBe("check");
  });

  it("maps role=checkbox to check", () => {
    const html = '<div role="checkbox">Agree</div>';
    const doc = parseHTML(html);
    const div = doc.querySelector("div")!;
    const locatorInfo: LocatorInfo = {
      api: "getByTestId",
      args: ["agree"],
      confidence: "high",
    };

    const metadata = extractElementMetadata(div, locatorInfo);
    expect(metadata.interactionType).toBe("check");
  });

  it("maps role=switch to check", () => {
    const html = '<div role="switch">Toggle</div>';
    const doc = parseHTML(html);
    const div = doc.querySelector("div")!;
    const locatorInfo: LocatorInfo = {
      api: "getByTestId",
      args: ["toggle"],
      confidence: "high",
    };

    const metadata = extractElementMetadata(div, locatorInfo);
    expect(metadata.interactionType).toBe("check");
  });

  it("maps select to selectOption", () => {
    const html = "<select><option>Opt</option></select>";
    const doc = parseHTML(html);
    const select = doc.querySelector("select")!;
    const locatorInfo: LocatorInfo = {
      api: "getByTestId",
      args: ["country"],
      confidence: "high",
    };

    const metadata = extractElementMetadata(select, locatorInfo);
    expect(metadata.interactionType).toBe("selectOption");
  });

  it("maps role=listbox to selectOption", () => {
    const html = '<div role="listbox">Options</div>';
    const doc = parseHTML(html);
    const div = doc.querySelector("div")!;
    const locatorInfo: LocatorInfo = {
      api: "getByTestId",
      args: ["list"],
      confidence: "high",
    };

    const metadata = extractElementMetadata(div, locatorInfo);
    expect(metadata.interactionType).toBe("selectOption");
  });

  it("maps link with href to click", () => {
    const html = '<a href="/page">Link</a>';
    const doc = parseHTML(html);
    const link = doc.querySelector("a")!;
    const locatorInfo: LocatorInfo = {
      api: "getByTestId",
      args: ["link"],
      confidence: "high",
    };

    const metadata = extractElementMetadata(link, locatorInfo);
    expect(metadata.interactionType).toBe("click");
  });

  it("defaults to click for unknown elements", () => {
    const html = '<div>Unknown</div>';
    const doc = parseHTML(html);
    const div = doc.querySelector("div")!;
    const locatorInfo: LocatorInfo = {
      api: "getByTestId",
      args: ["unknown"],
      confidence: "high",
    };

    const metadata = extractElementMetadata(div, locatorInfo);
    expect(metadata.interactionType).toBe("click");
  });
});

describe("extractElementMetadata - Validation", () => {
  it("rejects reserved keyword and uses tag name", () => {
    const html = '<input type="text" />';
    const doc = parseHTML(html);
    const input = doc.querySelector("input")!;
    const locatorInfo: LocatorInfo = {
      api: "getByTestId",
      args: ["return"],
      confidence: "high",
    };

    const metadata = extractElementMetadata(input, locatorInfo);
    expect(metadata.id).toBe("input");
  });

  it("rejects 'class' keyword", () => {
    const html = "<button></button>";
    const doc = parseHTML(html);
    const btn = doc.querySelector("button")!;
    const locatorInfo: LocatorInfo = {
      api: "getByTestId",
      args: ["class"],
      confidence: "high",
    };

    const metadata = extractElementMetadata(btn, locatorInfo);
    expect(metadata.id).toBe("button");
  });

  it("rejects 'function' keyword", () => {
    const html = "<button></button>";
    const doc = parseHTML(html);
    const btn = doc.querySelector("button")!;
    const locatorInfo: LocatorInfo = {
      api: "getByTestId",
      args: ["function"],
      confidence: "high",
    };

    const metadata = extractElementMetadata(btn, locatorInfo);
    expect(metadata.id).toBe("button");
  });

  it("rejects 'this' keyword", () => {
    const html = "<button></button>";
    const doc = parseHTML(html);
    const btn = doc.querySelector("button")!;
    const locatorInfo: LocatorInfo = {
      api: "getByTestId",
      args: ["this"],
      confidence: "high",
    };

    const metadata = extractElementMetadata(btn, locatorInfo);
    expect(metadata.id).toBe("button");
  });

  it("accepts valid non-reserved identifiers", () => {
    const html = "<button></button>";
    const doc = parseHTML(html);
    const btn = doc.querySelector("button")!;
    const locatorInfo: LocatorInfo = {
      api: "getByTestId",
      args: ["myValidButton"],
      confidence: "high",
    };

    const metadata = extractElementMetadata(btn, locatorInfo);
    expect(metadata.id).toBe("myvalidbutton");
  });
});

describe("extractElementMetadata - Stores References", () => {
  it("stores element and locatorInfo references", () => {
    const html = "<button>Click</button>";
    const doc = parseHTML(html);
    const btn = doc.querySelector("button")!;
    const locatorInfo: LocatorInfo = {
      api: "getByTestId",
      args: ["btn"],
      confidence: "high",
      reasoning: "Test ID found",
    };

    const metadata = extractElementMetadata(btn, locatorInfo);

    expect(metadata.element).toBe(btn);
    expect(metadata.locatorInfo).toBe(locatorInfo);
  });
});

describe("deduplicateIdentifiers", () => {
  it("leaves single elements unchanged", () => {
    const html = "<button>Click</button>";
    const doc = parseHTML(html);
    const btn = doc.querySelector("button")!;
    const locatorInfo: LocatorInfo = {
      api: "getByTestId",
      args: ["submit"],
      confidence: "high",
    };

    const metadata = extractElementMetadata(btn, locatorInfo);
    const deduplicated = deduplicateIdentifiers([metadata]);

    expect(deduplicated).toHaveLength(1);
    expect(deduplicated[0]!.id).toBe("submit");
  });

  it("handles two identical ids", () => {
    const html = `
      <button>Submit 1</button>
      <button>Submit 2</button>
    `;
    const doc = parseHTML(html);
    const buttons = doc.querySelectorAll("button");

    const metadata1 = extractElementMetadata(buttons[0]!, {
      api: "getByTestId",
      args: ["submit"],
      confidence: "high",
    });

    const metadata2 = extractElementMetadata(buttons[1]!, {
      api: "getByTestId",
      args: ["submit"],
      confidence: "high",
    });

    const deduplicated = deduplicateIdentifiers([metadata1, metadata2]);

    expect(deduplicated).toHaveLength(2);
    expect(deduplicated[0]!.id).toBe("submit");
    expect(deduplicated[1]!.id).toBe("submit2");
  });

  it("handles three identical ids", () => {
    const html = `
      <button>Button 1</button>
      <button>Button 2</button>
      <button>Button 3</button>
    `;
    const doc = parseHTML(html);
    const buttons = doc.querySelectorAll("button");

    const metadataList = Array.from(buttons).map((btn) =>
      extractElementMetadata(btn, {
        api: "getByTestId",
        args: ["submit"],
        confidence: "high",
      })
    );

    const deduplicated = deduplicateIdentifiers(metadataList);

    expect(deduplicated).toHaveLength(3);
    expect(deduplicated[0]!.id).toBe("submit");
    expect(deduplicated[1]!.id).toBe("submit2");
    expect(deduplicated[2]!.id).toBe("submit3");
  });

  it("handles multiple groups of duplicates", () => {
    const html = `
      <button>Submit 1</button>
      <button>Submit 2</button>
      <input type="text" />
      <input type="text" />
    `;
    const doc = parseHTML(html);
    const buttons = doc.querySelectorAll("button");
    const inputs = doc.querySelectorAll("input");

    const metadata1 = extractElementMetadata(buttons[0]!, {
      api: "getByTestId",
      args: ["submit"],
      confidence: "high",
    });

    const metadata2 = extractElementMetadata(buttons[1]!, {
      api: "getByTestId",
      args: ["submit"],
      confidence: "high",
    });

    const metadata3 = extractElementMetadata(inputs[0]!, {
      api: "getByTestId",
      args: ["email"],
      confidence: "high",
    });

    const metadata4 = extractElementMetadata(inputs[1]!, {
      api: "getByTestId",
      args: ["email"],
      confidence: "high",
    });

    const deduplicated = deduplicateIdentifiers([
      metadata1,
      metadata2,
      metadata3,
      metadata4,
    ]);

    expect(deduplicated).toHaveLength(4);
    expect(deduplicated[0]!.id).toBe("submit");
    expect(deduplicated[1]!.id).toBe("submit2");
    expect(deduplicated[2]!.id).toBe("email");
    expect(deduplicated[3]!.id).toBe("email2");
  });

  it("preserves unique ids", () => {
    const html = `
      <button>Submit</button>
      <input type="text" />
      <select><option>Opt</option></select>
    `;
    const doc = parseHTML(html);
    const btn = doc.querySelector("button")!;
    const input = doc.querySelector("input")!;
    const select = doc.querySelector("select")!;

    const metadata1 = extractElementMetadata(btn, {
      api: "getByTestId",
      args: ["submit"],
      confidence: "high",
    });

    const metadata2 = extractElementMetadata(input, {
      api: "getByTestId",
      args: ["email"],
      confidence: "high",
    });

    const metadata3 = extractElementMetadata(select, {
      api: "getByTestId",
      args: ["country"],
      confidence: "high",
    });

    const deduplicated = deduplicateIdentifiers([metadata1, metadata2, metadata3]);

    expect(deduplicated).toHaveLength(3);
    expect(deduplicated[0]!.id).toBe("submit");
    expect(deduplicated[1]!.id).toBe("email");
    expect(deduplicated[2]!.id).toBe("country");
  });
});

describe("extractElementMetadata - Edge Cases", () => {
  it("handles empty getByTestId args", () => {
    const html = "<button></button>";
    const doc = parseHTML(html);
    const btn = doc.querySelector("button")!;
    const locatorInfo: LocatorInfo = {
      api: "getByTestId",
      args: [""],
      confidence: "low",
    };

    const metadata = extractElementMetadata(btn, locatorInfo);
    expect(metadata.id).toBe("button");
  });

  it("handles text starting with numbers", () => {
    const html = "<button></button>";
    const doc = parseHTML(html);
    const btn = doc.querySelector("button")!;
    const locatorInfo: LocatorInfo = {
      api: "getByTestId",
      args: ["2fa"],
      confidence: "high",
    };

    const metadata = extractElementMetadata(btn, locatorInfo);
    expect(metadata.id).toBe("button");
  });

  it("handles unicode text", () => {
    const html = "<button></button>";
    const doc = parseHTML(html);
    const btn = doc.querySelector("button")!;
    const locatorInfo: LocatorInfo = {
      api: "getByText",
      args: ["Привет 世界"],
      confidence: "medium",
    };

    const metadata = extractElementMetadata(btn, locatorInfo);
    expect(metadata.id).toBe("button");
  });

  it("handles very long text", () => {
    const html = "<button></button>";
    const doc = parseHTML(html);
    const btn = doc.querySelector("button")!;
    const locatorInfo: LocatorInfo = {
      api: "getByText",
      args: [
        "This is a very long button text that describes what the button does in great detail",
      ],
      confidence: "medium",
    };

    const metadata = extractElementMetadata(btn, locatorInfo);
    expect(metadata.id).toContain("this");
    expect(metadata.id).toBeTruthy();
  });

  it("handles multiple word separators", () => {
    const html = "<button></button>";
    const doc = parseHTML(html);
    const btn = doc.querySelector("button")!;
    const locatorInfo: LocatorInfo = {
      api: "getByTestId",
      args: ["my-super_cool@button#name"],
      confidence: "high",
    };

    const metadata = extractElementMetadata(btn, locatorInfo);
    expect(metadata.id).toBe("mySuperCoolButtonName");
  });

  it("handles whitespace-only input", () => {
    const html = "<button></button>";
    const doc = parseHTML(html);
    const btn = doc.querySelector("button")!;
    const locatorInfo: LocatorInfo = {
      api: "getByTestId",
      args: ["   "],
      confidence: "high",
    };

    const metadata = extractElementMetadata(btn, locatorInfo);
    expect(metadata.id).toBe("button");
  });

  it("handles special characters only", () => {
    const html = "<button></button>";
    const doc = parseHTML(html);
    const btn = doc.querySelector("button")!;
    const locatorInfo: LocatorInfo = {
      api: "getByTestId",
      args: ["@#$%^&*()"],
      confidence: "high",
    };

    const metadata = extractElementMetadata(btn, locatorInfo);
    expect(metadata.id).toBe("button");
  });
});
