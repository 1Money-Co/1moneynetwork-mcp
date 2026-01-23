/*
 * Copyright 2026 1Money Co.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { jsonSchemaToZod } from "json-schema-to-zod";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const schemaPath = path.join(rootDir, "schemas", "tools.json");
const outputPath = path.join(rootDir, "src", "schemas", "zod.ts");

const raw = JSON.parse(fs.readFileSync(schemaPath, "utf8"));

const toSchemaName = (toolName) =>
  toolName
    .split(".")
    .map((part) => part.replace(/[^a-zA-Z0-9]/g, " "))
    .map((part) =>
      part
        .split(" ")
        .filter(Boolean)
        .map((chunk) => chunk[0].toUpperCase() + chunk.slice(1))
        .join("")
    )
    .join("") +
  "Schema";

const header = `/*\n * Copyright 2026 1Money Co.\n *\n * Licensed under the Apache License, Version 2.0 (the \"License\");\n * you may not use this file except in compliance with the License.\n * You may obtain a copy of the License at\n *\n *     http://www.apache.org/licenses/LICENSE-2.0\n *\n * Unless required by applicable law or agreed to in writing, software\n * distributed under the License is distributed on an \"AS IS\" BASIS,\n * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.\n * See the License for the specific language governing permissions and\n * limitations under the License.\n */\n\n`;

let output = header + "import { z } from \"zod\";\n\n";
output += "export const toolSchemas = {} as Record<string, z.ZodTypeAny>;\n\n";

for (const [toolName, schema] of Object.entries(raw)) {
  const schemaName = toSchemaName(toolName);
  const zodCode = jsonSchemaToZod(schema, { name: schemaName });
  const normalized = zodCode
    .replace(/z\.record\(z\.any\(\)\)/g, "z.record(z.string(), z.any())")
    .replace(/z\.record\(z\.unknown\(\)\)/g, "z.record(z.string(), z.unknown())");
  output += `${normalized}\n`;
  output += `toolSchemas[${JSON.stringify(toolName)}] = ${schemaName};\n\n`;
}

output += "export type ToolName = keyof typeof toolSchemas;\n";

fs.writeFileSync(outputPath, output, "utf8");
console.log(`Wrote ${outputPath}`);
