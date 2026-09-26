import { Command } from "commander";
import * as path from "path";

export interface ParsedOptions {
  html?: string;
  file?: string;
  output?: string;
  class?: string;
}

export interface ValidatedOptions {
  input: { html: string } | { file: string };
  output: string | undefined;
  className: string;
}

export function generateClassNameFromFile(filePath: string): string {
  const filename = path.basename(filePath);
  const nameWithoutExt = filename.replace(/\.[^.]+$/, "");
  if (!nameWithoutExt) {
    return "GeneratedPage";
  }
  const parts = nameWithoutExt
    .split(/[-_./]/)
    .filter((part) => part.length > 0);
  if (parts.length === 0) {
    return "GeneratedPage";
  }
  const pascalCase = parts
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join("");
  return pascalCase + "Page";
}

export function validateGenerateOptions(options: ParsedOptions): ValidatedOptions {
  const hasHtml = options.html !== undefined && options.html !== "";
  const hasFile = options.file !== undefined && options.file !== "";

  if (!hasHtml && !hasFile) {
    throw new Error("Either --html or --file is required");
  }

  if (hasHtml && hasFile) {
    throw new Error("Specify either --html or --file, not both");
  }

  if (options.class !== undefined && options.class !== "") {
    if (!/^[A-Z][a-zA-Z0-9]*$/.test(options.class)) {
      throw new Error(
        `Invalid class name '${options.class}'. Must be PascalCase (e.g., 'HomePage')`
      );
    }
  }

  let output: string | undefined = options.output;
  if (output === "") {
    output = undefined;
  } else if (output !== undefined) {
    const normalizedOutput = path.normalize(output);
    const resolved = path.resolve(normalizedOutput);
    const cwd = process.cwd();
    if (!resolved.startsWith(cwd)) {
      throw new Error(`Output path '${output}' escapes working directory`);
    }
  }

  let className: string;
  if (options.class) {
    className = options.class;
  } else if (hasFile && options.file) {
    className = generateClassNameFromFile(options.file);
  } else {
    className = "GeneratedPage";
  }

  const input: { html: string } | { file: string } = hasHtml
    ? { html: options.html! }
    : { file: options.file! };

  return {
    input,
    output,
    className,
  };
}

export function createProgram(): Command {
  const program = new Command();
  program.name("pgm").description("Playwright Page Object Generator");

  program
    .command("generate")
    .description("Generate a Playwright Page Object class from HTML")
    .option("-h, --html <string>", "HTML snippet to parse")
    .option("-f, --file <path>", "Path to HTML file")
    .option("-o, --output <path>", "Output file path (default: stdout)")
    .option("-c, --class <name>", "Page Object class name (auto-generated from filename if not provided)")
    .action((options: ParsedOptions) => {
      try {
        const validated = validateGenerateOptions(options);
        console.log(
          JSON.stringify(
            {
              input: validated.input,
              output: validated.output,
              className: validated.className,
            },
            null,
            2
          )
        );
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`Error: ${message}`);
        process.exit(1);
      }
    });

  return program;
}
