import { describe, it, expect } from "vitest";
import {
  validateGenerateOptions,
  generateClassNameFromFile,
  ParsedOptions,
} from "./cli";

describe("generateClassNameFromFile", () => {
  describe("Simple filenames", () => {
    it("converts simple filename to PascalCase with Page suffix", () => {
      expect(generateClassNameFromFile("login.html")).toBe("LoginPage");
      expect(generateClassNameFromFile("signup.html")).toBe("SignupPage");
      expect(generateClassNameFromFile("checkout.html")).toBe("CheckoutPage");
    });

    it("handles lowercase filenames", () => {
      expect(generateClassNameFromFile("dashboard.html")).toBe("DashboardPage");
      expect(generateClassNameFromFile("profile.html")).toBe("ProfilePage");
    });

    it("handles uppercase filenames", () => {
      expect(generateClassNameFromFile("LOGIN.html")).toBe("LoginPage");
      expect(generateClassNameFromFile("DASHBOARD.html")).toBe("DashboardPage");
    });
  });

  describe("Compound filenames with separators", () => {
    it("handles hyphenated filenames", () => {
      expect(generateClassNameFromFile("user-profile.html")).toBe("UserProfilePage");
      expect(generateClassNameFromFile("checkout-complete.html")).toBe("CheckoutCompletePage");
    });

    it("handles underscored filenames", () => {
      expect(generateClassNameFromFile("user_profile.html")).toBe("UserProfilePage");
      expect(generateClassNameFromFile("checkout_complete.html")).toBe("CheckoutCompletePage");
    });

    it("handles mixed separators", () => {
      expect(generateClassNameFromFile("user-profile_form.html")).toBe("UserProfileFormPage");
    });

    it("handles dots as separators", () => {
      expect(generateClassNameFromFile("user.profile.html")).toBe("UserProfilePage");
    });

    it("handles slashes as separators (from paths)", () => {
      expect(generateClassNameFromFile("pages/user-profile.html")).toBe("UserProfilePage");
      expect(generateClassNameFromFile("src/components/login-form.html")).toBe("LoginFormPage");
    });
  });

  describe("Edge cases", () => {
    it("handles filenames without extension", () => {
      expect(generateClassNameFromFile("login")).toBe("LoginPage");
      expect(generateClassNameFromFile("user-profile")).toBe("UserProfilePage");
    });

    it("handles filenames with multiple dots", () => {
      expect(generateClassNameFromFile("user.profile.form.html")).toBe("UserProfileFormPage");
    });

    it("handles single character filename", () => {
      expect(generateClassNameFromFile("a.html")).toBe("APage");
      expect(generateClassNameFromFile("x")).toBe("XPage");
    });

    it("returns GeneratedPage for empty or no-name paths", () => {
      expect(generateClassNameFromFile("")).toBe("GeneratedPage");
      expect(generateClassNameFromFile(".html")).toBe("GeneratedPage");
      expect(generateClassNameFromFile("./")).toBe("GeneratedPage");
    });

    it("ignores leading numbers in filename", () => {
      expect(generateClassNameFromFile("2fa-form.html")).toBe("2faFormPage");
    });

    it("preserves numbers in filenames", () => {
      expect(generateClassNameFromFile("form2fa.html")).toBe("Form2faPage");
      expect(generateClassNameFromFile("page123.html")).toBe("Page123Page");
    });

    it("handles all uppercase with separators", () => {
      expect(generateClassNameFromFile("USER-PROFILE.html")).toBe("UserProfilePage");
      expect(generateClassNameFromFile("LOGIN_FORM.html")).toBe("LoginFormPage");
    });
  });
});

describe("validateGenerateOptions", () => {
  describe("Valid option combinations", () => {
    it("accepts --html with generated class name", () => {
      const result = validateGenerateOptions({
        html: "<button>Click</button>",
      });

      expect(result.input).toEqual({ html: "<button>Click</button>" });
      expect(result.className).toBe("GeneratedPage");
      expect(result.output).toBeUndefined();
    });

    it("accepts --html with custom class name", () => {
      const result = validateGenerateOptions({
        html: "<button>Click</button>",
        class: "LoginPage",
      });

      expect(result.input).toEqual({ html: "<button>Click</button>" });
      expect(result.className).toBe("LoginPage");
    });

    it("accepts --html with output file", () => {
      const result = validateGenerateOptions({
        html: "<button>Click</button>",
        output: "page.ts",
      });

      expect(result.input).toEqual({ html: "<button>Click</button>" });
      expect(result.output).toBe("page.ts");
    });

    it("accepts --file with auto-generated class name", () => {
      const result = validateGenerateOptions({
        file: "login.html",
      });

      expect(result.input).toEqual({ file: "login.html" });
      expect(result.className).toBe("LoginPage");
      expect(result.output).toBeUndefined();
    });

    it("accepts --file with custom class name", () => {
      const result = validateGenerateOptions({
        file: "login.html",
        class: "SignInPage",
      });

      expect(result.input).toEqual({ file: "login.html" });
      expect(result.className).toBe("SignInPage");
    });

    it("accepts --file with output file", () => {
      const result = validateGenerateOptions({
        file: "login.html",
        output: "pages/LoginPage.ts",
      });

      expect(result.input).toEqual({ file: "login.html" });
      expect(result.output).toBe("pages/LoginPage.ts");
    });

    it("accepts all options together", () => {
      const result = validateGenerateOptions({
        file: "user-profile.html",
        class: "UserProfilePage",
        output: "pages/UserProfilePage.ts",
      });

      expect(result.input).toEqual({ file: "user-profile.html" });
      expect(result.className).toBe("UserProfilePage");
      expect(result.output).toBe("pages/UserProfilePage.ts");
    });
  });

  describe("Invalid option combinations", () => {
    it("rejects when neither --html nor --file provided", () => {
      expect(() => validateGenerateOptions({})).toThrow(
        "Either --html or --file is required"
      );
    });

    it("rejects when both --html and --file provided", () => {
      expect(() =>
        validateGenerateOptions({
          html: "<button>Click</button>",
          file: "login.html",
        })
      ).toThrow("Specify either --html or --file, not both");
    });

    it("rejects empty --html string", () => {
      expect(() =>
        validateGenerateOptions({
          html: "",
        })
      ).toThrow("Either --html or --file is required");
    });

    it("rejects empty --file string", () => {
      expect(() =>
        validateGenerateOptions({
          file: "",
        })
      ).toThrow("Either --html or --file is required");
    });
  });

  describe("Class name validation", () => {
    it("accepts valid PascalCase class names", () => {
      expect(
        validateGenerateOptions({ html: "test", class: "LoginPage" }).className
      ).toBe("LoginPage");
      expect(
        validateGenerateOptions({ html: "test", class: "HomePage" }).className
      ).toBe("HomePage");
      expect(
        validateGenerateOptions({ html: "test", class: "A" }).className
      ).toBe("A");
    });

    it("accepts class names with numbers", () => {
      expect(
        validateGenerateOptions({ html: "test", class: "Page123" }).className
      ).toBe("Page123");
      expect(
        validateGenerateOptions({ html: "test", class: "Form2fa" }).className
      ).toBe("Form2fa");
    });

    it("rejects lowercase class names", () => {
      expect(() =>
        validateGenerateOptions({ html: "test", class: "loginPage" })
      ).toThrow(/Invalid class name/);
    });

    it("rejects class names starting with lowercase", () => {
      expect(() =>
        validateGenerateOptions({ html: "test", class: "homePage" })
      ).toThrow(/Invalid class name/);
    });

    it("rejects class names with hyphens", () => {
      expect(() =>
        validateGenerateOptions({ html: "test", class: "Login-Page" })
      ).toThrow(/Invalid class name/);
    });

    it("rejects class names with underscores", () => {
      expect(() =>
        validateGenerateOptions({ html: "test", class: "Login_Page" })
      ).toThrow(/Invalid class name/);
    });

    it("rejects class names with spaces", () => {
      expect(() =>
        validateGenerateOptions({ html: "test", class: "Login Page" })
      ).toThrow(/Invalid class name/);
    });

    it("rejects class names starting with numbers", () => {
      expect(() =>
        validateGenerateOptions({ html: "test", class: "1LoginPage" })
      ).toThrow(/Invalid class name/);
    });

    it("ignores empty class name and uses default or auto-generation", () => {
      const result = validateGenerateOptions({ html: "test", class: "" });
      expect(result.className).toBe("GeneratedPage");

      const resultWithFile = validateGenerateOptions({
        file: "login.html",
        class: "",
      });
      expect(resultWithFile.className).toBe("LoginPage");
    });
  });

  describe("Output path validation", () => {
    it("accepts relative paths", () => {
      expect(validateGenerateOptions({ html: "test", output: "page.ts" }).output).toBe("page.ts");
      expect(validateGenerateOptions({ html: "test", output: "src/page.ts" }).output).toBe("src/page.ts");
      expect(validateGenerateOptions({ html: "test", output: "./page.ts" }).output).toBe("./page.ts");
    });

    it("rejects paths that try to escape working directory", () => {
      expect(() =>
        validateGenerateOptions({ html: "test", output: "../../etc/passwd" })
      ).toThrow(/escapes working directory/);

      expect(() =>
        validateGenerateOptions({ html: "test", output: "../../../etc/passwd" })
      ).toThrow(/escapes working directory/);
    });

    it("accepts nested relative paths within working directory", () => {
      const result = validateGenerateOptions({ html: "test", output: "pages/components/Page.ts" });
      expect(result.output).toBe("pages/components/Page.ts");
    });

    it("ignores empty output string", () => {
      const result = validateGenerateOptions({ html: "test", output: "" });
      expect(result.output).toBeUndefined();
    });
  });

  describe("Auto-generated class names from files", () => {
    it("generates class name from simple filename", () => {
      const result = validateGenerateOptions({ file: "login.html" });
      expect(result.className).toBe("LoginPage");
    });

    it("generates class name from hyphenated filename", () => {
      const result = validateGenerateOptions({ file: "user-profile.html" });
      expect(result.className).toBe("UserProfilePage");
    });

    it("generates class name from path-based filename", () => {
      const result = validateGenerateOptions({ file: "pages/checkout-complete.html" });
      expect(result.className).toBe("CheckoutCompletePage");
    });

    it("uses custom class name over auto-generated", () => {
      const result = validateGenerateOptions({
        file: "login.html",
        class: "SignInPage",
      });
      expect(result.className).toBe("SignInPage");
    });
  });

  describe("Return value structure", () => {
    it("returns correct structure for --html input", () => {
      const result = validateGenerateOptions({ html: "<button>Test</button>" });
      expect(result).toHaveProperty("input");
      expect(result).toHaveProperty("className");
      expect(result).toHaveProperty("output");
      expect(result.input).toHaveProperty("html");
    });

    it("returns correct structure for --file input", () => {
      const result = validateGenerateOptions({ file: "test.html" });
      expect(result).toHaveProperty("input");
      expect(result).toHaveProperty("className");
      expect(result).toHaveProperty("output");
      expect(result.input).toHaveProperty("file");
    });

    it("input property is exclusive (html XOR file)", () => {
      const htmlResult = validateGenerateOptions({ html: "<button/>" });
      expect(htmlResult.input).toHaveProperty("html");
      expect(htmlResult.input).not.toHaveProperty("file");

      const fileResult = validateGenerateOptions({ file: "test.html" });
      expect(fileResult.input).toHaveProperty("file");
      expect(fileResult.input).not.toHaveProperty("html");
    });
  });

  describe("Edge cases", () => {
    it("handles undefined options", () => {
      expect(() =>
        validateGenerateOptions({
          html: undefined,
          file: undefined,
        } as any)
      ).toThrow("Either --html or --file is required");
    });

    it("handles whitespace-only html string", () => {
      const result = validateGenerateOptions({ html: "   <button>   </button>   " });
      expect(result.input).toEqual({ html: "   <button>   </button>   " });
    });

    it("handles special characters in class name validation", () => {
      expect(() =>
        validateGenerateOptions({ html: "test", class: "Page$Page" })
      ).toThrow(/Invalid class name/);

      expect(() =>
        validateGenerateOptions({ html: "test", class: "Page@Home" })
      ).toThrow(/Invalid class name/);
    });

    it("handles very long filenames", () => {
      const longName = "a".repeat(200) + ".html";
      const result = validateGenerateOptions({ file: longName });
      expect(result.className).toBe("AaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaPage");
    });

    it("handles special characters in file path", () => {
      const result = validateGenerateOptions({ file: "pages/user-profile_form.html" });
      expect(result.input).toEqual({ file: "pages/user-profile_form.html" });
    });
  });

  describe("Determinism", () => {
    it("produces identical output for same input", () => {
      const input: ParsedOptions = {
        file: "login.html",
        class: "LoginPage",
        output: "pages/LoginPage.ts",
      };

      const result1 = validateGenerateOptions(input);
      const result2 = validateGenerateOptions(input);

      expect(result1).toEqual(result2);
    });

    it("auto-generation is deterministic", () => {
      const result1 = validateGenerateOptions({ file: "user-profile.html" });
      const result2 = validateGenerateOptions({ file: "user-profile.html" });

      expect(result1.className).toBe(result2.className);
    });
  });
});
