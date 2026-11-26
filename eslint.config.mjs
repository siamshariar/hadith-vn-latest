// `npm run lint`: Next.js's rules (core web vitals). ESLint 9, the newest its plugins support.
import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";

export default defineConfig([
  ...nextVitals,
  globalIgnores([".next/**", "node_modules/**", "public/**"]),
]);
