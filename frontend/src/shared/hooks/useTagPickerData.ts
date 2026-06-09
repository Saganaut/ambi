import { useMemo } from "react";
import { useCreateTagMutation, useListTagsQuery, Ambi, type TagResponse } from "@store/AmbiApi";
import { useAppDispatch } from "@store/hooks";

interface UseTagPickerDataOptions {
  parentTagId?: string;
  curatedOnly?: boolean;
}

interface UseTagPickerDataResult {
  tags: TagResponse[];
  isLoading: boolean;
  createTag: (displayName: string) => Promise<string | undefined>;
}

const useTagPickerData = ({
  parentTagId,
  curatedOnly,
}: UseTagPickerDataOptions = {}): UseTagPickerDataResult => {
  const listArgs = useMemo(
    () => ({ curated: curatedOnly, parentTagId }),
    [curatedOnly, parentTagId],
  );

  const { data: tags = [], isLoading } = useListTagsQuery(listArgs);
  const [createTagMutation] = useCreateTagMutation();
  const dispatch = useAppDispatch();

  const createTag = async (displayName: string): Promise<string | undefined> => {
    const created = await createTagMutation({
      createTagRequest: { displayName },
    }).unwrap();

    if (!created.id) return undefined;

    // Seed the new tag into every cached listTags result so suggestions
    // refresh without a follow-up refetch.
    dispatch(
      Ambi.util.updateQueryData("listTags", listArgs, (draft) => {
        if (!draft.some((t) => t.id === created.id)) draft.push(created);
      }),
    );

    return created.id;
  };

  return { tags, isLoading, createTag };
};

export { useTagPickerData };
export type { UseTagPickerDataOptions, UseTagPickerDataResult };
