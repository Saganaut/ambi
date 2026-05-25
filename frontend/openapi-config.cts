// @ts-nocheck  works fine despite common JS vs ES modules issue
import type { ConfigFile } from "@rtk-query/codegen-openapi";

const config: ConfigFile = {
  schemaFile: "http://localhost:8080/v3/api-docs",
  apiFile: "./src/store/emptyApi.ts",
  apiImport: "emptySplitApi",
  outputFile: "./src/store/BrainFlexApi.ts",
  exportName: "BrainFlex",
  hooks: { queries: true, lazyQueries: true, mutations: true },
};

export default config;
