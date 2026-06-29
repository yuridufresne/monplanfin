import globals from "globals";
import pluginReact from "eslint-plugin-react";
import pluginReactHooks from "eslint-plugin-react-hooks";
import pluginUnusedImports from "eslint-plugin-unused-imports";
import tseslint from "typescript-eslint";

// Scope ELARGI : toute l'app est en .tsx + les moteurs sont dans src/lib.
// L'ancienne config ne ciblait que .js/.jsx dans components|pages -> elle ne
// lintait quasiment RIEN (l'app est 100% TypeScript). On parse desormais le TS
// et on couvre tout src/ (moteurs financiers inclus).
//
// On reste sur des regles SANS info de type (pas de "project service") : rapide,
// et ca evite le deluge de strict-mode. Le typecheck (npm run typecheck) couvre
// l'analyse de types separement.
export default [
  { ignores: ["dist/**", "node_modules/**", "**/*.config.*"] },
  {
    files: ["src/**/*.{js,mjs,cjs,jsx,ts,tsx}"],
    languageOptions: {
      parser: tseslint.parser,
      globals: { ...globals.browser, ...globals.node },
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: "module",
        ecmaFeatures: { jsx: true },
      },
    },
    settings: { react: { version: "detect" } },
    plugins: {
      react: pluginReact,
      "react-hooks": pluginReactHooks,
      "unused-imports": pluginUnusedImports,
    },
    rules: {
      // no-undef desactive : c'est TypeScript qui resout les symboles/types,
      // sinon faux positifs sur les noms de types et les globals TS.
      "no-undef": "off",
      "no-unused-vars": "off",
      "react/jsx-uses-vars": "error",
      "react/jsx-uses-react": "error",
      "unused-imports/no-unused-imports": "error",
      "unused-imports/no-unused-vars": [
        "warn",
        { vars: "all", varsIgnorePattern: "^_", args: "after-used", argsIgnorePattern: "^_" },
      ],
      "react/prop-types": "off",
      "react/react-in-jsx-scope": "off",
      "react/no-unknown-property": ["error", { ignore: ["cmdk-input-wrapper", "toast-close"] }],
      "react-hooks/rules-of-hooks": "error",
    },
  },
];
