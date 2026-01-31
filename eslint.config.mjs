import js from "@eslint/js";
import vue from "eslint-plugin-vue";
import vueParser from "vue-eslint-parser";
import tsParser from "@typescript-eslint/parser";
import tsPlugin from "@typescript-eslint/eslint-plugin";
import prettier from "eslint-config-prettier";

const nuxtGlobals = {
  defineNuxtConfig: "readonly",
  defineNuxtRouteMiddleware: "readonly",
  definePageMeta: "readonly",
  navigateTo: "readonly",
  useRoute: "readonly",
  useRuntimeConfig: "readonly",
  useState: "readonly",
  $fetch: "readonly",
  useMe: "readonly",
  useStoreContext: "readonly",
  ref: "readonly",
  reactive: "readonly",
  computed: "readonly",
  watch: "readonly",
};

const serverGlobals = {
  defineEventHandler: "readonly",
  process: "readonly",
  Buffer: "readonly",
};

export default [
  {
    ignores: [".nuxt/**", ".output/**", "node_modules/**"],
  },
  js.configs.recommended,
  ...vue.configs["flat/recommended"],
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      parser: tsParser,
      parserOptions: { ecmaVersion: "latest", sourceType: "module" },
      globals: nuxtGlobals,
    },
    plugins: { "@typescript-eslint": tsPlugin },
    rules: {
      ...tsPlugin.configs.recommended.rules,
    },
  },
  {
    files: ["**/*.vue"],
    languageOptions: {
      parser: vueParser,
      parserOptions: {
        parser: tsParser,
        ecmaVersion: "latest",
        sourceType: "module",
        extraFileExtensions: [".vue"],
      },
      globals: nuxtGlobals,
    },
    plugins: { "@typescript-eslint": tsPlugin },
    rules: {
      ...tsPlugin.configs.recommended.rules,
    },
  },
  {
    files: [
      "server/**/*.{ts,tsx}",
      "scripts/**/*.{mjs,cjs,js}",
      "nuxt.config.ts",
    ],
    languageOptions: { globals: { ...nuxtGlobals, ...serverGlobals } },
  },
  {
    files: ["pages/**/*.vue"],
    rules: {
      "vue/multi-word-component-names": "off",
    },
  },
  {
    files: ["layouts/**/*.vue"],
    rules: {
      "vue/multi-word-component-names": "off",
    },
  },
  prettier,
];
