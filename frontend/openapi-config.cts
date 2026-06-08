// @ts-nocheck  works fine despite common JS vs ES modules issue
import type { ConfigFile } from "@rtk-query/codegen-openapi";

const config: ConfigFile = {
  schemaFile: "http://localhost:8080/v3/api-docs",
  apiFile: "./src/shared/store/emptyApi.ts",
  apiImport: "emptySplitApi",
  outputFiles: {
    "./src/feature/auth/store/authApi.ts": {
      filterEndpoints: [/auth/i],
    },
    "./src/feature/auth/store/userApi.ts": {
      filterEndpoints: [/users/i],
    },
    "./src/features/theme/storeTheme.ts": {
      filterEndpoints: [/themes/i],
    },
    "./src/features/decks/storeDeck.ts": {
      filterEndpoints: [/decks/i],
    },
    "./src/features/gallery/storeGallery.ts": {
      filterEndpoints: [/galleries/i],
    },
    "./src/features/org/storeOrg.ts": {
      filterEndpoints: [/orgs/i],
    },
    "./src/features/liveSession/store/liveSession.ts": {
      filterEndpoints: [/liveSession/i],
    },
  },
  // outputFile: "./src/shared/store/AmbiApi.ts",
  exportName: "Ambi",
  hooks: { queries: true, lazyQueries: true, mutations: true },
};

export default config;
