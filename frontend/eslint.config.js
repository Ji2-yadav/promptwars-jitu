const browserGlobals = {
  document: "readonly",
  fetch: "readonly",
  FormData: "readonly",
  Image: "readonly",
  "import.meta": "readonly",
  localStorage: "readonly",
  navigator: "readonly",
  ReadableStream: "readonly",
  Response: "readonly",
  TextEncoder: "readonly",
  TextDecoder: "readonly",
  URL: "readonly",
  window: "readonly",
};

const testGlobals = {
  afterEach: "readonly",
  beforeEach: "readonly",
  describe: "readonly",
  expect: "readonly",
  it: "readonly",
  vi: "readonly",
};

export default [
  {
    ignores: ["coverage/**", "dist/**", "node_modules/**"],
  },
  {
    files: ["src/**/*.{js,jsx}"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
      globals: {
        ...browserGlobals,
        ...testGlobals,
      },
    },
    rules: {
      "no-constant-condition": "error",
      "no-debugger": "error",
      "no-dupe-keys": "error",
      "no-duplicate-imports": "error",
      "no-empty": ["error", { allowEmptyCatch: true }],
      "no-redeclare": "error",
      "no-self-assign": "error",
      "no-undef": "error",
      "no-unreachable": "error",
      "no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
        },
      ],
      "prefer-const": "error",
    },
  },
];
