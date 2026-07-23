"use strict";

module.exports = [
  {
    files: ["MMM-KitchenTimer.js"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "script",
      globals: {
        Audio: "readonly",
        Module: "readonly",
        clearInterval: "readonly",
        document: "readonly",
        setInterval: "readonly",
      },
    },
    rules: {
      "no-undef": "error",
      "no-unused-vars": ["error", { args: "none" }],
    },
  },
  {
    files: ["lib/**/*.js", "test/**/*.js", "eslint.config.js"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "commonjs",
      globals: {
        __dirname: "readonly",
        module: "readonly",
        require: "readonly",
      },
    },
    rules: {
      "no-undef": "error",
      "no-unused-vars": ["error", { args: "none" }],
    },
  },
];
