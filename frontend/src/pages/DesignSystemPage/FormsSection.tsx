// Form components InteractiveSession for the design system page.
// Shows every Common/Input primitive with controlled state so they're interactive.
import { useState } from "react";
import { Input } from "@components/Forms/Input/Input/Input";
import { NumberInput } from "@components/Forms/Input/NumberInput/NumberInput";
import { TextArea } from "@components/Forms/Input/TextArea/TextArea";
import { Checkbox } from "@components/Forms/Input/Checkbox/Checkbox";
import { RadioGroup } from "@components/Forms/Input/RadioGroup/RadioGroup";
import { ColorPicker } from "@components/Forms/Input/ColorPicker/ColorPicker";
import { RichTextInput } from "@components/Forms/Input/RichTextInput/RichTextInput";
import { Toggle } from "@components/Forms/Input/Toggle/Toggle";
import { Dropdown } from "@components/Forms/Input/Dropdown/Dropdown";
import { FileUpload } from "@components/Forms/Input/FileUpload/FileUpload";
import { InputWithButton } from "@components/Forms/Input/InputWithButton/InputWithButton";
import {
  AvatarSelector,
  AVATAR_OPTIONS,
} from "@components/Forms/Input/AvatarSelector/AvatarSelector";
import { TagPicker } from "@common/TagPicker/TagPicker";
import { Accordion } from "../../components/Containers/Accordion";
import styles from "./DesignSystem.module.css";

const GAME_MODE_OPTIONS: { value: string; label: string }[] = [
  { value: "solo", label: "Solo" },
  { value: "team", label: "Team" },
  { value: "tournament", label: "Tournament" },
];

const FACTION_OPTIONS = [
  { value: "fellowship", label: "Fellowship of the Ring" },
  { value: "rohan", label: "Riders of Rohan" },
  { value: "gondor", label: "Gondor" },
  { value: "elves", label: "Elves of Lothlórien" },
  { value: "dwarves", label: "Dwarves of Erebor" },
  { value: "ents", label: "Ents of Fangorn" },
  { value: "shire", label: "The Shire" },
];

const FormsSection = () => {
  const [hue, setHue] = useState(260);
  const [gameMode, setGameMode] = useState("solo");
  const [richText, setRichText] = useState(
    "<p>Click anywhere to <strong>edit</strong> — try the toolbar.</p>",
  );
  const [toggleSounds, setToggleSounds] = useState(true);
  const [toggleNotifs, setToggleNotifs] = useState(false);
  const [singleFaction, setSingleFaction] = useState<string[]>(["fellowship"]);
  const [multiFactions, setMultiFactions] = useState<string[]>([
    "fellowship",
    "rohan",
  ]);
  const [searchFaction, setSearchFaction] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [points, setPoints] = useState(50);
  const [tolerance, setTolerance] = useState(0.1);
  const [stretchedText, setStretchedText] = useState("");
  const [pickerTagIds, setPickerTagIds] = useState<string[]>([]);
  const [pickerCuratedTagIds, setPickerCuratedTagIds] = useState<string[]>([]);
  const [avatar, setAvatar] = useState("avatar-1");
  const [avatarMany, setAvatarMany] = useState("av-alpha-aqua");

  // Synthesized roster of 9 picks (3 mascots × 3 squads) to exercise the
  // overflow scroller — the underlying assets stay the 3 player-avatar SVGs.
  const manyAvatarOptions = ["Alpha", "Bravo", "Charlie"].flatMap((squad) =>
    AVATAR_OPTIONS.map((option) => ({
      ...option,
      value: `av-${squad.toLowerCase()}-${option.label.toLowerCase()}`,
      label: `${squad} ${option.label}`,
    })),
  );

  return (
    <section>
      <div className={styles.examplesContainer}>
        <Accordion titleBar='Form Inputs'>
          <h4>Text Input</h4>
          <div className={styles.formExampleRow}>
            <Input
              label='Username'
              id='ds-input'
              value={"input"}
              placeholder='e.g. GandalfTheGrey'
            />
            <Input
              label='Disabled'
              id='ds-input-disabled'
              value='frodo_baggins'
              disabled
            />
          </div>

          <h4>Full-width Text Input</h4>
          <div className={styles.formExampleRow}>
            <div style={{ width: "100%" }}>
              <Input
                label='Caption (stretches to parent)'
                id='ds-input-fullwidth'
                placeholder='Used inside tight editor cells like MCQ option cards'
                fullWidth
                value={stretchedText}
                onChange={(e) => {
                  setStretchedText(e.target.value);
                }}
              />
            </div>
          </div>

          <h4>Number Input</h4>
          <div className={styles.formExampleRow}>
            <NumberInput
              label='Points'
              id='ds-number-points'
              min={0}
              value={points}
              onChange={setPoints}
            />
            <NumberInput
              label='Tolerance (0–1)'
              id='ds-number-tolerance'
              min={0}
              max={1}
              step={0.01}
              value={tolerance}
              onChange={setTolerance}
            />
            <NumberInput
              label='Disabled'
              id='ds-number-disabled'
              value={42}
              onChange={() => {
                /* disabled */
              }}
              disabled
            />
          </div>

          <h4>Text Area</h4>
          <div className={styles.formExampleRow}>
            <TextArea
              label='Biography'
              id='ds-textarea'
              placeholder='Tell the Fellowship about yourself...'
              rows={3}
            />
          </div>

          <h4>Input with Button</h4>
          <div className={styles.formExampleRow}>
            <InputWithButton
              label='Search decks'
              id='ds-input-with-btn'
              placeholder='e.g. Geography'
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
              }}
              buttonLabel='Search'
              onButtonClick={() => {
                console.log("search:", search);
              }}
            />
          </div>

          <h4>Checkbox</h4>
          <div className={styles.formExampleRow}>
            <Checkbox label='Subscribe to newsletter' id='ds-checkbox-1' />
            <Checkbox label='Accept terms & conditions' id='ds-checkbox-2' />
            <Checkbox
              label='Disabled'
              id='ds-checkbox-3'
              checked={true}
              disabled
            />
          </div>

          <h4>Toggle</h4>
          <div className={styles.formExampleRow}>
            <Toggle
              label='Sound effects'
              id='ds-toggle-1'
              checked={toggleSounds}
              onChange={(e) => {
                setToggleSounds(e.target.checked);
              }}
            />
            <Toggle
              label='Push notifications'
              id='ds-toggle-2'
              checked={toggleNotifs}
              onChange={(e) => {
                setToggleNotifs(e.target.checked);
              }}
            />
            <Toggle label='Disabled' id='ds-toggle-3' checked={true} disabled />
          </div>

          <h4>Radio Group</h4>
          <div className={styles.formExampleRow}>
            <RadioGroup
              name='game-mode'
              legend='Game Mode'
              options={GAME_MODE_OPTIONS}
              value={gameMode}
              onChange={setGameMode}
            />
            <RadioGroup
              name='game-mode-disabled'
              legend='Disabled'
              options={GAME_MODE_OPTIONS}
              value='team'
              onChange={() => {
                /* disabled */
              }}
              disabled
            />
          </div>

          <h4>Dropdown</h4>
          <div className={styles.formExampleRow}>
            <Dropdown
              label='Faction (single)'
              id='ds-dropdown-single'
              options={FACTION_OPTIONS}
              value={singleFaction}
              onChange={setSingleFaction}
            />
            <Dropdown
              label='Allied factions (multi)'
              id='ds-dropdown-multi'
              multiple
              options={FACTION_OPTIONS}
              value={multiFactions}
              onChange={setMultiFactions}
            />
            <Dropdown
              label='Searchable'
              id='ds-dropdown-search'
              searchable
              options={FACTION_OPTIONS}
              value={searchFaction}
              onChange={setSearchFaction}
              placeholder='Find a faction…'
            />
          </div>

          <h4>Avatar Selector</h4>
          <div className={styles.formExampleRow}>
            <AvatarSelector
              name='ds-avatar'
              legend='Pick your avatar'
              value={avatar}
              onChange={setAvatar}
            />
            <AvatarSelector
              name='ds-avatar-disabled'
              legend='Disabled'
              value='avatar-2'
              onChange={() => {
                /* disabled */
              }}
              disabled
            />
          </div>
          <div className={styles.formExampleRow}>
            <AvatarSelector
              name='ds-avatar-many'
              legend='Overflow — scroll for more'
              value={avatarMany}
              onChange={setAvatarMany}
              options={manyAvatarOptions}
              maxVisible={6}
            />
          </div>

          <h4>Tag Picker</h4>
          <div className={styles.formExampleRow}>
            <TagPicker
              label='Deck tags (any)'
              value={pickerTagIds}
              onChange={setPickerTagIds}
              placeholder='Search and add tags…'
            />
            <TagPicker
              label='Curated only'
              value={pickerCuratedTagIds}
              onChange={setPickerCuratedTagIds}
              curatedOnly
              placeholder='Pick a curated subject…'
            />
          </div>

          <h4>File Upload</h4>
          <div className={styles.formExampleRow}>
            <FileUpload
              label='Upload an image'
              accept='image/*'
              onChange={(files) => {
                console.log("files:", files);
              }}
            />
          </div>

          <h4>Color Picker</h4>
          <div className={styles.formHueRow}>
            <ColorPicker label='Color' value={hue} onChange={setHue} />
          </div>

          <h4>Rich Text Input</h4>
          <div className={styles.formExampleRow}>
            <RichTextInput
              label='Question'
              id='ds-rich-text'
              placeholder='Type your question…'
              value={richText}
              onChange={setRichText}
            />
          </div>
        </Accordion>
      </div>
    </section>
  );
};

export { FormsSection };
