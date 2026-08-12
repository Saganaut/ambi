import { CheckIcon, QuestionMarkCircleIcon } from "@heroicons/react/24/outline";
import { Btn } from "@saganaut/ambi-ui";

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
        <Btn
          fill="ghost"
          size="xs"
          icon={<CheckIcon />}
          aria-label={"Toggle scorability"}
          onClick={toggle}
        />
      ) : (
        <Btn
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
