/**
 * Split-button anchored to a deck. The primary face quick-starts a interactiveSession
 * with the deck's defaults; the chevron opens a small menu (currently just
 * "Customize…") for the rarer path that lets the host override settings
 * before the interactiveSession is created.
 *
 * Used on deck cards (My Decks page) and anywhere else a deck row needs a
 * one-click "play" affordance. The deck editor uses a single-button variant
 * directly via useStartInteractiveSession — it doesn't need the chevron.
 */
import { ChevronDownIcon, PlayIcon } from "@heroicons/react/24/outline";

import { Btn } from "../Btn";
import type { BtnSize } from "../BtnTypes";
import {
  DropdownMenu,
  DropdownMenuItem,
} from "@/components/Menus/DropdownMenu";
import styles from "./DeckActionButton.module.css";

interface DeckActionButtonProps {
  deckId: string;
  size?: BtnSize;
  label?: string;
}

const DeckActionButton = ({
  deckId,
  size = "sm",
  label = "Play",
}: DeckActionButtonProps) => {
  const error = false;
  return (
    <div
      className={styles.splitButton}
      onClick={(e) => {
        e.stopPropagation();
      }}>
      <Btn
        size={size}
        variant='brand'
        disabled={false}
        className={styles.primary}
        icon={<PlayIcon className={styles.icon} />}
        onClick={() => {
          console.log("not impelmented");
        }}>
        "Starting…"
      </Btn>
      <DropdownMenu
        position='top-right'
        trigger={(toggle) => (
          <Btn
            size={size}
            variant='brand'
            disabled={false}
            aria-label='More play options'
            className={styles.chevron}
            onClick={() => {
              toggle();
            }}>
            <ChevronDownIcon className={styles.icon} />
          </Btn>
        )}>
        <DropdownMenuItem
          onClick={() => {
            console.log("not impelemnted");
          }}>
          Customize…
        </DropdownMenuItem>
      </DropdownMenu>
      {error && (
        <span className={styles.error} role='alert'>
          {error}
        </span>
      )}
    </div>
  );
};

export { DeckActionButton };
