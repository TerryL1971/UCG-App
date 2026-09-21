// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
  expoConfig,
  {
    // Deno runtime code (Edge Functions) — separate toolchain, jsr:/npm:
    // import specifiers and Deno globals this RN-flavored config doesn't
    // understand, same reasoning as excluding it from tsconfig.json.
    ignores: ["dist/*", "supabase/functions/**"],
  }
]);
