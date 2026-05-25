// Reference catalog of every text + background pairing allowed by Rule 2 of
// the design rulebook. Each card is one named combination — the card's bg
// shows the bg token's color and the text inside it is rendered in the
// matched text token, so the card visually IS the combination it documents.
// Cards inline-style the bg/text/edge tokens on purpose (per Rule 14
// exception: this page is pedagogical and the JSX needs to show the tokens
// being demonstrated).
import styles from "./DesignSystem.module.css";

interface Combination {
  name: string;
  bgToken: string;
  textToken: string;
  edgeToken?: string;
}

const NEUTRAL_BGS: { token: string; label: string }[] = [
  { token: "canvas", label: "canvas" },
  { token: "surface", label: "surface" },
  { token: "surface-raised", label: "surface-raised" },
  { token: "secondary", label: "sibling" },
  { token: "subtle", label: "subtle" },
];

const NEUTRAL_TEXT_ROLES: { token: string; label: string }[] = [
  { token: "primary", label: "Heading" },
  { token: "secondary", label: "Body" },
  { token: "accent", label: "Link" },
];

const neutralCombinations: Combination[] = NEUTRAL_BGS.flatMap((bg) =>
  NEUTRAL_TEXT_ROLES.map((role) => ({
    name: `${role.label} on ${bg.label}`,
    bgToken: `--bg-${bg.token}`,
    textToken: `--text-${role.token}`,
    edgeToken: `--edge-${bg.token}`,
  })),
);

const brandCombinations: Combination[] = [
  {
    name: "Primary action",
    bgToken: "--bg-primary",
    textToken: "--text-on-brand",
    edgeToken: "--edge-primary",
  },
  {
    name: "Brand fill",
    bgToken: "--bg-brand",
    textToken: "--text-on-brand",
    edgeToken: "--edge-brand",
  },
];

const INVERTED_BGS: { token: string; label: string }[] = [
  { token: "canvas-inverted", label: "inverted canvas" },
  { token: "surface-inverted", label: "inverted surface" },
  { token: "primary-inverted", label: "inverted primary" },
];

const INVERTED_TEXT_ROLES: { token: string; label: string }[] = [
  { token: "primary-inverted", label: "Heading" },
  { token: "secondary-inverted", label: "Body" },
  { token: "accent-inverted", label: "Link" },
];

const invertedCombinations: Combination[] = INVERTED_BGS.flatMap((bg) =>
  INVERTED_TEXT_ROLES.map((role) => ({
    name: `${role.label} on ${bg.label}`,
    bgToken: `--bg-${bg.token}`,
    textToken: `--text-${role.token}`,
  })),
);

const statusCombinations: Combination[] = [
  {
    name: "Error notice",
    bgToken: "--bg-error",
    textToken: "--text-error",
    edgeToken: "--border-error",
  },
  {
    name: "Success notice",
    bgToken: "--bg-success",
    textToken: "--text-success",
    edgeToken: "--border-success",
  },
  {
    name: "Warning notice",
    bgToken: "--bg-warning",
    textToken: "--text-warning",
    edgeToken: "--border-warning",
  },
  {
    name: "Info notice",
    bgToken: "--bg-info",
    textToken: "--text-info",
    edgeToken: "--border-info",
  },
];

interface CombinationCardProps {
  combination: Combination;
}

const CombinationCard = ({ combination }: CombinationCardProps) => {
  const { name, bgToken, textToken, edgeToken } = combination;
  return (
    <div
      className={styles.combinationCard}
      style={{
        background: `var(${bgToken})`,
        border: edgeToken
          ? `2px solid var(${edgeToken})`
          : "2px solid transparent",
        color: `var(${textToken})`,
      }}>
      <div className={styles.combinationName}>{name}</div>
      <div className={styles.combinationTokens}>
        {bgToken}
        <br />
        {textToken}
      </div>
    </div>
  );
};

interface CombinationGroupProps {
  title: string;
  combinations: Combination[];
}

const CombinationGroup = ({ title, combinations }: CombinationGroupProps) => {
  return (
    <div className={styles.combinationGroup}>
      <h4 className={styles.combinationGroupTitle}>{title}</h4>
      <div className={styles.combinationGrid}>
        {combinations.map((combo) => (
          <CombinationCard key={combo.name} combination={combo} />
        ))}
      </div>
    </div>
  );
};

const TextBackgroundCombinations = () => {
  return (
    <section>
      <div className={styles.sectionTitle}>Text + background combinations</div>
      <p className={styles.sectionDescription}>
        Every legal pairing of text role with background, named so you can
        reference it in code reviews and spec docs. The combinations are
        derived from Rule 2 of the rulebook — anything not listed here is
        outside the system.
      </p>
      <CombinationGroup
        title='Neutral surfaces'
        combinations={neutralCombinations}
      />
      <CombinationGroup
        title='Brand surfaces'
        combinations={brandCombinations}
      />
      <CombinationGroup
        title='Inverted surfaces'
        combinations={invertedCombinations}
      />
      <CombinationGroup
        title='Status surfaces'
        combinations={statusCombinations}
      />
    </section>
  );
};

export { TextBackgroundCombinations };
