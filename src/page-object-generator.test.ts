import { describe, it, expect } from "vitest";
import { generatePageObject } from "./page-object-generator";
import type { ElementMetadata } from "./element-metadata";

function createMetadata(
  id: string,
  api: string,
  args: string[],
  interactionType: string
): ElementMetadata {
  return {
    element: {} as Element,
    locatorInfo: {
      api: api as any,
      args,
      confidence: "high",
    },
    id,
    interactionType: interactionType as any,
  };
}

describe("generatePageObject", () => {
  describe("Valid TypeScript Generation", () => {
    it("generates code with single click element", () => {
      const metadata = [createMetadata("submit", "getByTestId", ["submit-btn"], "click")];
      const code = generatePageObject("LoginPage", metadata);

      expect(code).toContain('import { type Page } from "@playwright/test"');
      expect(code).toContain("export class LoginPage");
      expect(code).toContain("constructor(private page: Page)");
      expect(code).toContain("get submit()");
      expect(code).toContain("async clickSubmit()");
    });

    it("generates code with single fill element", () => {
      const metadata = [createMetadata("emailInput", "getByLabel", ["Email Address"], "fill")];
      const code = generatePageObject("SignupPage", metadata);

      expect(code).toContain("get emailInput()");
      expect(code).toContain("async fillEmailInput(text: string)");
      expect(code).toContain("await this.emailInput.fill(text)");
    });

    it("generates code with single check element", () => {
      const metadata = [createMetadata("agreeCheckbox", "getByTestId", ["agree"], "check")];
      const code = generatePageObject("FormPage", metadata);

      expect(code).toContain("get agreeCheckbox()");
      expect(code).toContain("async checkAgreeCheckbox(shouldCheck: boolean = true)");
      expect(code).toContain("await this.agreeCheckbox.check()");
      expect(code).toContain("await this.agreeCheckbox.uncheck()");
    });

    it("generates code with single selectOption element", () => {
      const metadata = [createMetadata("countrySelect", "getByPlaceholder", ["Select..."], "selectOption")];
      const code = generatePageObject("SettingsPage", metadata);

      expect(code).toContain("get countrySelect()");
      expect(code).toContain("async selectOptionCountrySelect(label: string)");
      expect(code).toContain("await this.countrySelect.selectOption(label)");
    });

    it("generates code with multiple elements of different types", () => {
      const metadata = [
        createMetadata("submit", "getByTestId", ["submit"], "click"),
        createMetadata("email", "getByLabel", ["Email"], "fill"),
        createMetadata("agree", "getByTestId", ["agree"], "check"),
      ];
      const code = generatePageObject("HomePage", metadata);

      expect(code).toContain("get submit()");
      expect(code).toContain("get email()");
      expect(code).toContain("get agree()");
      expect(code).toContain("async clickSubmit()");
      expect(code).toContain("async fillEmail(text: string)");
      expect(code).toContain("async checkAgree(shouldCheck: boolean = true)");
    });

    it("generates syntactically valid TypeScript", () => {
      const metadata = [
        createMetadata("btn1", "getByTestId", ["btn1"], "click"),
        createMetadata("input1", "getByLabel", ["Name"], "fill"),
      ];
      const code = generatePageObject("TestPage", metadata);

      // Check basic structure
      expect(code).toMatch(/^import/);
      expect(code).toContain("export class TestPage");
      expect(code).toContain("constructor(private page: Page)");
      expect(code).toContain("get btn1()");
      expect(code).toContain("get input1()");
      expect(code).toContain("async clickBtn1()");
      expect(code).toContain("async fillInput1(text: string)");
    });
  });

  describe("API Call Correctness", () => {
    it("generates correct getByTestId call", () => {
      const metadata = [createMetadata("submit", "getByTestId", ["submit-id"], "click")];
      const code = generatePageObject("Page", metadata);

      expect(code).toContain("this.page.getByTestId('submit-id')");
    });

    it("generates correct getByRole call with name", () => {
      const metadata = [createMetadata("btn", "getByRole", ["button", "Submit"], "click")];
      const code = generatePageObject("Page", metadata);

      expect(code).toContain("this.page.getByRole('button', { name: 'Submit' })");
    });

    it("generates correct getByRole call without name", () => {
      const metadata = [createMetadata("btn", "getByRole", ["button"], "click")];
      const code = generatePageObject("Page", metadata);

      expect(code).toContain("this.page.getByRole('button')");
    });

    it("generates correct getByLabel call", () => {
      const metadata = [createMetadata("email", "getByLabel", ["Email Address"], "fill")];
      const code = generatePageObject("Page", metadata);

      expect(code).toContain("this.page.getByLabel('Email Address')");
    });

    it("generates correct getByPlaceholder call", () => {
      const metadata = [createMetadata("search", "getByPlaceholder", ["Search..."], "fill")];
      const code = generatePageObject("Page", metadata);

      expect(code).toContain("this.page.getByPlaceholder('Search...')");
    });

    it("generates correct getByText call", () => {
      const metadata = [createMetadata("submit", "getByText", ["Submit Button"], "click")];
      const code = generatePageObject("Page", metadata);

      expect(code).toContain("this.page.getByText('Submit Button')");
    });

    it("generates correct locator (CSS) call", () => {
      const metadata = [createMetadata("submit", "locator", ["#submit-btn"], "click")];
      const code = generatePageObject("Page", metadata);

      expect(code).toContain("this.page.locator('#submit-btn')");
    });
  });

  describe("String Escaping", () => {
    it("escapes single quotes in locator args", () => {
      const metadata = [createMetadata("submit", "getByText", ["Click 'Now'"], "click")];
      const code = generatePageObject("Page", metadata);

      expect(code).toContain("this.page.getByText('Click \\'Now\\'')");
    });

    it("escapes backslashes in locator args", () => {
      const metadata = [createMetadata("path", "getByTestId", ["C:\\path\\to"], "click")];
      const code = generatePageObject("Page", metadata);

      expect(code).toContain("this.page.getByTestId('C:\\\\path\\\\to')");
    });

    it("escapes newlines in locator args", () => {
      const metadata = [createMetadata("text", "getByText", ["Line1\nLine2"], "click")];
      const code = generatePageObject("Page", metadata);

      expect(code).toContain("this.page.getByText('Line1\\nLine2')");
    });

    it("escapes tabs in locator args", () => {
      const metadata = [createMetadata("text", "getByText", ["Col1\tCol2"], "click")];
      const code = generatePageObject("Page", metadata);

      expect(code).toContain("this.page.getByText('Col1\\tCol2')");
    });

    it("handles double quotes in locator args", () => {
      const metadata = [createMetadata("text", "getByText", ['Say "hello"'], "click")];
      const code = generatePageObject("Page", metadata);

      expect(code).toContain('this.page.getByText(\'Say \\"hello\\"\')');
    });
  });

  describe("Method Signature Correctness", () => {
    it("click methods have no parameters", () => {
      const metadata = [createMetadata("btn", "getByTestId", ["btn"], "click")];
      const code = generatePageObject("Page", metadata);

      expect(code).toContain("async clickBtn(): Promise<void>");
    });

    it("fill methods have text parameter", () => {
      const metadata = [createMetadata("input", "getByTestId", ["input"], "fill")];
      const code = generatePageObject("Page", metadata);

      expect(code).toContain("async fillInput(text: string): Promise<void>");
    });

    it("check methods have optional shouldCheck parameter", () => {
      const metadata = [createMetadata("check", "getByTestId", ["check"], "check")];
      const code = generatePageObject("Page", metadata);

      expect(code).toContain("async checkCheck(shouldCheck: boolean = true): Promise<void>");
    });

    it("selectOption methods have label parameter", () => {
      const metadata = [createMetadata("select", "getByTestId", ["select"], "selectOption")];
      const code = generatePageObject("Page", metadata);

      expect(code).toContain("async selectOptionSelect(label: string): Promise<void>");
    });
  });

  describe("Input Validation", () => {
    it("rejects invalid class name (not PascalCase)", () => {
      expect(() => generatePageObject("homePage", [])).toThrow(/Invalid class name/);
    });

    it("rejects invalid class name (starts with lowercase)", () => {
      expect(() => generatePageObject("_private", [])).toThrow(/Invalid class name/);
    });

    it("rejects element with invalid id", () => {
      const metadata = [createMetadata("123invalid", "getByTestId", ["test"], "click")];
      expect(() => generatePageObject("Page", metadata)).toThrow(/not a valid TypeScript identifier/);
    });

    it("rejects element with unknown interactionType", () => {
      const metadata = [createMetadata("btn", "getByTestId", ["test"], "unknown" as any)];
      expect(() => generatePageObject("Page", metadata)).toThrow(/unknown interactionType/);
    });

    it("rejects element with unknown locator API", () => {
      const metadata = [createMetadata("btn", "getByUnknown" as any, ["test"], "click")];
      expect(() => generatePageObject("Page", metadata)).toThrow(/unknown locator API/);
    });

    it("rejects element with empty locator args", () => {
      const metadata = [createMetadata("btn", "getByTestId", [], "click")];
      expect(() => generatePageObject("Page", metadata)).toThrow(/locatorInfo.args is empty/);
    });
  });

  describe("Edge Cases", () => {
    it("generates minimal class for empty elements", () => {
      const code = generatePageObject("EmptyPage", []);

      expect(code).toContain('import { type Page } from "@playwright/test"');
      expect(code).toContain("export class EmptyPage");
      expect(code).toContain("constructor(private page: Page)");
      expect(code).toMatch(/class EmptyPage[\s\S]*constructor[\s\S]*\}/);
    });

    it("handles method name collision with getter", () => {
      // Element 1: id="clickSubmit", interaction="fill" → getter name "clickSubmit"
      // Element 2: id="submit", interaction="click" → method name "clickSubmit" (collision!)
      const metadata = [
        createMetadata("clickSubmit", "getByTestId", ["test1"], "fill"),
        createMetadata("submit", "getByTestId", ["test2"], "click"),
      ];
      const code = generatePageObject("Page", metadata);

      // Should have getter "clickSubmit"
      expect(code).toContain("get clickSubmit()");
      // Method "clickSubmit" should be renamed to "clickSubmit2"
      expect(code).toContain("async clickSubmit2()");
      expect(code).not.toContain("async clickSubmit()");
    });

    it("handles multiple method name collisions", () => {
      // Element 1: id="clickBtn", interaction="fill" → getter "clickBtn", method "fillClickBtn"
      // Element 2: id="btn", interaction="click" → method "clickBtn" (collision with getter!) → "clickBtn3"
      // Element 3: id="clickBtn2", interaction="fill" → getter "clickBtn2", method "fillClickBtn2" (no collision)
      const metadata = [
        createMetadata("clickBtn", "getByTestId", ["test1"], "fill"),
        createMetadata("btn", "getByTestId", ["test2"], "click"),
        createMetadata("clickBtn2", "getByTestId", ["test3"], "fill"),
      ];
      const code = generatePageObject("Page", metadata);

      expect(code).toContain("get clickBtn()");
      expect(code).toContain("get clickBtn2()");
      expect(code).toContain("async clickBtn3()"); // collision with getter clickBtn, so becomes clickBtn3
      expect(code).toContain("async fillClickBtn(text: string)");
      expect(code).toContain("async fillClickBtn2(text: string)");
    });

    it("preserves element order in getters", () => {
      const metadata = [
        createMetadata("zebra", "getByTestId", ["z"], "click"),
        createMetadata("apple", "getByTestId", ["a"], "click"),
        createMetadata("monkey", "getByTestId", ["m"], "click"),
      ];
      const code = generatePageObject("Page", metadata);

      const getterZebraIndex = code.indexOf("get zebra()");
      const getterAppleIndex = code.indexOf("get apple()");
      const getterMonkeyIndex = code.indexOf("get monkey()");

      expect(getterZebraIndex).toBeLessThan(getterAppleIndex);
      expect(getterAppleIndex).toBeLessThan(getterMonkeyIndex);
    });

    it("preserves element order in methods", () => {
      const metadata = [
        createMetadata("z", "getByTestId", ["z"], "click"),
        createMetadata("a", "getByTestId", ["a"], "click"),
        createMetadata("m", "getByTestId", ["m"], "click"),
      ];
      const code = generatePageObject("Page", metadata);

      const methodZIndex = code.indexOf("async clickZ()");
      const methodAIndex = code.indexOf("async clickA()");
      const methodMIndex = code.indexOf("async clickM()");

      expect(methodZIndex).toBeLessThan(methodAIndex);
      expect(methodAIndex).toBeLessThan(methodMIndex);
    });

    it("handles special character identifiers with underscores", () => {
      const metadata = [createMetadata("_private", "getByTestId", ["test"], "click")];
      const code = generatePageObject("Page", metadata);

      expect(code).toContain("get _private()");
      expect(code).toContain("async click_private()");
    });

    it("handles special character identifiers with dollar sign", () => {
      const metadata = [createMetadata("$special", "getByTestId", ["test"], "click")];
      const code = generatePageObject("Page", metadata);

      expect(code).toContain("get $special()");
      expect(code).toContain("async click$special()");
    });
  });

  describe("Determinism", () => {
    it("generates consistent output for same input", () => {
      const metadata = [
        createMetadata("submit", "getByTestId", ["submit"], "click"),
        createMetadata("email", "getByLabel", ["Email"], "fill"),
      ];

      const code1 = generatePageObject("LoginPage", metadata);
      const code2 = generatePageObject("LoginPage", metadata);

      expect(code1).toBe(code2);
    });

    it("generates different output for different class names", () => {
      const metadata = [createMetadata("submit", "getByTestId", ["submit"], "click")];

      const code1 = generatePageObject("LoginPage", metadata);
      const code2 = generatePageObject("HomePage", metadata);

      expect(code1).not.toBe(code2);
      expect(code1).toContain("export class LoginPage");
      expect(code2).toContain("export class HomePage");
    });
  });
});
