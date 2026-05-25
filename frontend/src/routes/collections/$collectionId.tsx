// Route stub for the collection-detail surface. The page itself lives in
// src/pages/CollectionDetailPage/ and reads the path param internally via
// getRouteApi.
import { createFileRoute } from "@tanstack/react-router";
import { CollectionDetailPage } from "../../pages/CollectionDetailPage/CollectionDetailPage";

export const Route = createFileRoute("/collections/$collectionId")({
  component: CollectionDetailPage,
});
