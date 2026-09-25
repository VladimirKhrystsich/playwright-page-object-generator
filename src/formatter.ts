import prettier from "prettier";

export async function formatCode(code: string): Promise<string> {
  try {
    const formatted = await prettier.format(code, {
      parser: "typescript",
      semi: true,
      singleQuote: true,
      trailingComma: "es5",
      printWidth: 100,
      tabWidth: 2,
      useTabs: false,
    });

    return formatted;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Prettier formatting failed: ${errorMessage}`);
  }
}
