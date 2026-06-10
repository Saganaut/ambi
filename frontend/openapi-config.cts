// @ts-nocheck  works fine despite common JS vs ES modules issue
import type { ConfigFile } from "@rtk-query/codegen-openapi";
import { execSync } from "child_process";

const SWAGGER_URL = "http://localhost:8080/v3/api-docs";

const rawJson = execSync(`curl -s ${SWAGGER_URL}`).toString();
const swaggerJson = JSON.parse(rawJson);

/**
 * Output paths are generated mainly based upon the tag (only one permitted per controller)
 * The tagToFeatureMap maps that.
 * Any exceptions should be put in the map below
 *
 *  **/

const tagToFeatureMap: Record<string, string> = {
  "gallery-controller": "gallery",
  "image-controller": "gallery",
  "deck-controller": "deck",
  "comment-thread-controller": "deck",
  "review-controller": "deck",
  "user-controller": "auth",
  "auth-controller": "auth",
  "theme-controller": "theme",
  "org-controller": "org",
};

const specialCasesMap: Record<string, Record<string, string>> = {
  updatePreferences: { featureName: "account", apiName: "account" },
};

const generateOutputFiles = () => {
  const outputFiles: Record<string, any> = {};
  for (const path of Object.values(swaggerJson.paths)) {
    for (const operation of Object.values(path as any)) {
      const op = operation as any;
      if (op.tags && op.tags.length > 0 && op.operationId) {
        let featureName = "";
        let apiName = "";
        if (specialCasesMap[op.operationId]) {
          featureName = specialCasesMap[op.operationId].featureName;
          apiName = specialCasesMap[op.operationId].apiName;
        } else {
          const rawTag = op.tags[0] as string;
          apiName = rawTag.split("-")[0];
          featureName = `${tagToFeatureMap[rawTag]}`;
        }
        const filePath = `./src/features/${featureName}/store/${apiName}Api.gen.ts`;
        if (!outputFiles[filePath]) {
          outputFiles[filePath] = {
            filterEndpoints: [],
            exportName: `${apiName}Api`,
          };
        }
        outputFiles[filePath].filterEndpoints.push(op.operationId);
      }
    }
  }

  return outputFiles;
};

const config: ConfigFile = {
  schemaFile: "http://localhost:8080/v3/api-docs",
  apiFile: "./src/shared/store/emptyApi.ts",
  apiImport: "emptySplitApi",
  outputFiles: generateOutputFiles(),
  exportName: "Ambi",
  hooks: { queries: true, lazyQueries: true, mutations: true },
};

export default config;
