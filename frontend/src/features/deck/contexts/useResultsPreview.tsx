import { useContext } from "react";

import { ResultsPreviewContext } from "./ResultsPreviewContext";

const useResultsPreview = () => {
  const context = useContext(ResultsPreviewContext);
  if (!context) {
    throw new Error(
      "useResultsPreview must be used within a ResultsPreviewProvider",
    );
  }
  return context;
};

export { useResultsPreview };
