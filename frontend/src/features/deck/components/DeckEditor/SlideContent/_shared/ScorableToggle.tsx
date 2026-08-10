import { IconBtn } from "@/shared/components/UIElements/Buttons/IconBtn";
import { CheckIcon, QuestionMarkCircleIcon } from "@heroicons/react/24/outline";

const ScorableToggle = ({
  isScorable,
  toggle,
}: {
  isScorable: boolean;
  toggle: (e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => void;
}) => {
  return (
    <>
      {isScorable ? (
        <IconBtn
          fill="ghost"
          size="xs"
          icon={<CheckIcon />}
          aria-label={"Toggle scorability"}
          onClick={toggle}
        />
      ) : (
        <IconBtn
          fill="ghost"
          size="xs"
          icon={<QuestionMarkCircleIcon />}
          aria-label={"Toggle scorability"}
          onClick={toggle}
        />
      )}
    </>
  );
};

export { ScorableToggle };
