// @ts-nocheck  works fine despite common JS vs ES modules issue
import type { ConfigFile } from "@rtk-query/codegen-openapi";

const config: ConfigFile = {
  schemaFile: "http://localhost:8080/v3/api-docs",
  apiFile: "./src/shared/store/emptyApi.ts",
  apiImport: "emptySplitApi",
  outputFile: "./src/shared/store/AmbiApi.ts",
  exportName: "Ambi",
  hooks: { queries: true, lazyQueries: true, mutations: true },
};

export default config;
