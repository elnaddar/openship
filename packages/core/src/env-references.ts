import { unquoteEnvValue } from "./env-file";

/**
 * Expand `${NAME}` / `$NAME` references between saved environment values, so a
 * row such as `VITE_APP_NAME="${APP_NAME}"` follows the project's real value.
 *
 * Saved rows are LITERALS, not Compose expressions, so this stays conservative:
 * a reference expands only when it names another variable in the same map.
 * Everything else — an unknown name, a bare `$`, a `$$` escape — is left exactly
 * as written rather than blanked, which is what Compose interpolation would do.
 * A self-reference stays literal instead of growing on each pass, and chains
 * (`A=${B}`, `B=${C}`) converge over a bounded number of passes.
 *
 * Values are unquoted first: in `.env` syntax a surrounding pair of quotes is a
 * delimiter, so a row saved as `"hello@example.com"` must reach the container as
 * `hello@example.com`.
 */
export function expandEnvReferences(values: Record<string, string>): Record<string, string> {
  const keys = Object.keys(values);
  if (keys.length === 0) return values;
  const known = new Set(keys);

  const expand = (input: string, scope: Record<string, string>, self: string): string => {
    if (!input.includes("$")) return input;
    let out = "";
    let cursor = 0;
    while (cursor < input.length) {
      const dollar = input.indexOf("$", cursor);
      if (dollar < 0) break;
      out += input.slice(cursor, dollar);
      if (input[dollar + 1] === "$") {
        out += "$$";
        cursor = dollar + 2;
        continue;
      }
      let name: string | undefined;
      let end = dollar + 1;
      if (input[dollar + 1] === "{") {
        const braced = input.slice(dollar + 2).match(/^([A-Za-z_][A-Za-z0-9_]*)\}/);
        if (braced) {
          name = braced[1]!;
          end = dollar + 2 + braced[0].length;
        }
      } else {
        const bare = input.slice(dollar + 1).match(/^([A-Za-z_][A-Za-z0-9_]*)/);
        if (bare) {
          name = bare[1]!;
          end = dollar + 1 + bare[1]!.length;
        }
      }
      if (name && name !== self && known.has(name)) {
        out += scope[name] ?? "";
        cursor = end;
        continue;
      }
      out += "$";
      cursor = dollar + 1;
    }
    return out + input.slice(cursor);
  };

  let current = Object.fromEntries(keys.map((key) => [key, unquoteEnvValue(values[key]!)]));
  for (let pass = 0; pass < keys.length; pass++) {
    let changed = false;
    const next: Record<string, string> = {};
    for (const key of keys) {
      next[key] = expand(current[key]!, current, key);
      if (next[key] !== current[key]) changed = true;
    }
    current = next;
    if (!changed) break;
  }
  return current;
}
