import { emptySplitApi as api } from "../../../shared/store/emptyApi";
const injectedRtkApi = api.injectEndpoints({
  endpoints: (build) => ({
    listMyOrgs: build.query<ListMyOrgsApiResponse, ListMyOrgsApiArg>({
      query: () => ({ url: `/api/orgs/mine` }),
    }),
  }),
  overrideExisting: false,
});
export { injectedRtkApi as orgApi };
export type ListMyOrgsApiResponse =
  /** status 200 OK */ MyOrgMembershipResponse[];
export type ListMyOrgsApiArg = void;
export type MyOrgMembershipResponse = {
  orgId: string;
  role: "OWNER" | "ADMIN" | "USER";
};
export const { useListMyOrgsQuery, useLazyListMyOrgsQuery } = injectedRtkApi;
