import { describe, it, expect } from "vitest";
import { formatCode } from "./formatter";

describe("formatCode", () => {
  describe("Valid TypeScript Formatting", () => {
    it("formats simple getter", async () => {
      const code = `export class TestPage{get button(){return this.page.getByTestId('button');}}`;
      const formatted = await formatCode(code);

      // Should have proper indentation and structure
      expect(formatted).toContain("export class TestPage");
      expect(formatted).toContain("get button()");
      expect(formatted).toContain("return this.page.getByTestId('button')");
      // Prettier adds newlines and proper indentation
      expect(formatted).toContain("\n");
    });

    it("formats class with methods", async () => {
      const code = `export class HomePage {
        constructor(private page: Page) {}
        get submit() { return this.page.getByTestId('submit'); }
        async clickSubmit(): Promise<void> { await this.submit.click(); }
      }`;

      const formatted = await formatCode(code);

      expect(formatted).toContain("export class HomePage");
      expect(formatted).toContain("constructor(private page: Page)");
      expect(formatted).toContain("get submit()");
      expect(formatted).toContain("async clickSubmit()");
    });

    it("formats import statements", async () => {
      const code = `import{type Page}from"@playwright/test";export class TestPage{}`;
      const formatted = await formatCode(code);

      expect(formatted).toContain("import");
      expect(formatted).toContain("@playwright/test");
      expect(formatted).toContain("Page");
    });

    it("preserves method parameters", async () => {
      const code = `export class TestPage{async fillEmail(text:string):Promise<void>{await this.email.fill(text);}}`;
      const formatted = await formatCode(code);

      expect(formatted).toContain("fillEmail(text: string)");
      expect(formatted).toContain("Promise<void>");
    });

    it("preserves optional parameters", async () => {
      const code = `export class TestPage{async check(shouldCheck:boolean=true):Promise<void>{if(shouldCheck){await this.check.check();}else{await this.check.uncheck();}}}`;
      const formatted = await formatCode(code);

      expect(formatted).toContain("shouldCheck: boolean = true");
    });

    it("formats complex method bodies", async () => {
      const code = `export class TestPage{async checkBox(shouldCheck:boolean=true):Promise<void>{if(shouldCheck){await this.checkBox.check();}else{await this.checkBox.uncheck();}}}`;
      const formatted = await formatCode(code);

      expect(formatted).toContain("if (shouldCheck)");
      expect(formatted).toContain("await this.checkBox.check()");
      expect(formatted).toContain("else");
      expect(formatted).toContain("await this.checkBox.uncheck()");
    });
  });

  describe("Idempotency", () => {
    it("formatting already-formatted code produces identical output", async () => {
      const code = `export class TestPage {
  constructor(private page: Page) {}

  get submit() {
    return this.page.getByTestId('submit');
  }

  async clickSubmit(): Promise<void> {
    await this.submit.click();
  }
}
`;

      const firstFormat = await formatCode(code);
      const secondFormat = await formatCode(firstFormat);

      expect(firstFormat).toBe(secondFormat);
    });

    it("formatting unformatted then formatted code is idempotent", async () => {
      const unformatted = `export class TestPage{constructor(private page:Page){}get submit(){return this.page.getByTestId('submit');}async clickSubmit():Promise<void>{await this.submit.click();}}`;

      const first = await formatCode(unformatted);
      const second = await formatCode(first);

      expect(first).toBe(second);
    });
  });

  describe("Trailing Newlines", () => {
    it("includes trailing newline in output", async () => {
      const code = `export class TestPage {}`;
      const formatted = await formatCode(code);

      expect(formatted).toMatch(/\n$/);
    });

    it("preserves trailing newline consistency", async () => {
      const code = `export class TestPage {\n  constructor(private page: Page) {}\n}\n`;
      const formatted = await formatCode(code);

      expect(formatted).toMatch(/\n$/);
    });
  });

  describe("Semantic Preservation", () => {
    it("preserves code functionality (simple getter)", async () => {
      const code = `export class TestPage {
  get button() {
    return this.page.getByTestId('btn');
  }
}`;

      const formatted = await formatCode(code);

      // Should still have same locator call
      expect(formatted).toContain("this.page.getByTestId('btn')");
      // Should still be a class
      expect(formatted).toContain("class TestPage");
      // Should still be a getter
      expect(formatted).toContain("get button");
    });

    it("preserves code functionality (async method)", async () => {
      const code = `export class TestPage {
  async fillEmail(text: string): Promise<void> {
    await this.email.fill(text);
  }
}`;

      const formatted = await formatCode(code);

      expect(formatted).toContain("async fillEmail(text: string)");
      expect(formatted).toContain("await this.email.fill(text)");
      expect(formatted).toContain("Promise<void>");
    });

    it("preserves conditional logic", async () => {
      const code = `export class TestPage {
  async check(shouldCheck: boolean = true): Promise<void> {
    if (shouldCheck) {
      await this.checkbox.check();
    } else {
      await this.checkbox.uncheck();
    }
  }
}`;

      const formatted = await formatCode(code);

      expect(formatted).toContain("if (shouldCheck)");
      expect(formatted).toContain("await this.checkbox.check()");
      expect(formatted).toContain("else");
      expect(formatted).toContain("await this.checkbox.uncheck()");
    });
  });

  describe("Error Handling", () => {
    it("throws error on invalid TypeScript", async () => {
      const invalidCode = `export class TestPage { invalid syntax here @#$ }`;

      await expect(formatCode(invalidCode)).rejects.toThrow(/Prettier formatting failed/);
    });

    it("throws error with descriptive message", async () => {
      const invalidCode = `const x = {`;

      try {
        await formatCode(invalidCode);
        expect.fail("Should have thrown an error");
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toContain("Prettier formatting failed");
      }
    });

    it("error message includes original error context", async () => {
      const invalidCode = `export class { }`;

      try {
        await formatCode(invalidCode);
        expect.fail("Should have thrown an error");
      } catch (error) {
        expect((error as Error).message).toContain("Prettier formatting failed");
        // Message should have some context about what failed
        expect((error as Error).message.length).toBeGreaterThan("Prettier formatting failed".length);
      }
    });
  });

  describe("Stage 4 Integration", () => {
    it("formats generated Page Object class from Stage 4", async () => {
      // Simulating Stage 4 output (unformatted)
      const stage4Output = `import{type Page}from"@playwright/test";export class LoginPage{constructor(private page:Page){}get email(){return this.page.getByLabel('Email');}get submit(){return this.page.getByTestId('submit');}async fillEmail(text:string):Promise<void>{await this.email.fill(text);}async clickSubmit():Promise<void>{await this.submit.click();}}`;

      const formatted = await formatCode(stage4Output);

      expect(formatted).toContain("import { type Page } from '@playwright/test'");
      expect(formatted).toContain("export class LoginPage");
      expect(formatted).toContain("get email()");
      expect(formatted).toContain("get submit()");
      expect(formatted).toContain("async fillEmail(text: string)");
      expect(formatted).toContain("async clickSubmit()");
    });

    it("maintains Stage 4 semantics after formatting", async () => {
      const stage4Output = `import{type Page}from"@playwright/test";export class TestPage{constructor(private page:Page){}get btn(){return this.page.getByTestId('button');}async clickBtn():Promise<void>{await this.btn.click();}}`;

      const formatted = await formatCode(stage4Output);

      // All Stage 4 elements should still be present and functional
      expect(formatted).toContain("class TestPage");
      expect(formatted).toContain("private page: Page");
      expect(formatted).toContain("get btn()");
      expect(formatted).toContain("this.page.getByTestId('button')");
      expect(formatted).toContain("async clickBtn()");
      expect(formatted).toContain("this.btn.click()");
    });
  });

  describe("Edge Cases", () => {
    it("formats empty class", async () => {
      const code = `export class EmptyPage{constructor(private page:Page){}}`;
      const formatted = await formatCode(code);

      expect(formatted).toContain("export class EmptyPage");
      expect(formatted).toContain("constructor(private page: Page)");
    });

    it("formats class with many methods", async () => {
      const code = `export class Page{get a(){return this.page.getByTestId('a');}get b(){return this.page.getByTestId('b');}get c(){return this.page.getByTestId('c');}async clickA():Promise<void>{await this.a.click();}async clickB():Promise<void>{await this.b.click();}async clickC():Promise<void>{await this.c.click();}}`;

      const formatted = await formatCode(code);

      expect(formatted).toContain("get a()");
      expect(formatted).toContain("get b()");
      expect(formatted).toContain("get c()");
      expect(formatted).toContain("async clickA()");
      expect(formatted).toContain("async clickB()");
      expect(formatted).toContain("async clickC()");
    });

    it("handles single quotes correctly", async () => {
      const code = `export class TestPage{get btn(){return this.page.getByTestId('submit-button');}}`;
      const formatted = await formatCode(code);

      // Prettier uses single quotes
      expect(formatted).toContain("getByTestId('submit-button')");
    });

    it("handles escaped characters in strings", async () => {
      const code = `export class TestPage{get label(){return this.page.getByLabel("Test \\'Label");}}`;
      const formatted = await formatCode(code);

      expect(formatted).toContain("getByLabel");
    });
  });

  describe("Promise Contract", () => {
    it("returns Promise<string>", async () => {
      const code = `export class TestPage {}`;
      const result = formatCode(code);

      expect(result).toBeInstanceOf(Promise);
      const resolved = await result;
      expect(typeof resolved).toBe("string");
    });

    it("resolves with formatted code string", async () => {
      const code = `export class TestPage{}`;
      const result = await formatCode(code);

      expect(typeof result).toBe("string");
      expect(result.length).toBeGreaterThan(0);
    });
  });
});
