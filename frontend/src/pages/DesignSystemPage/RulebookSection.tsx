// Color-system rulebook for the design system page. Each rule is a single
// Accordion that pairs a one-sentence rule statement with the tokens it
// governs, a side-by-side "Do" / "Don't" live demo, and a short list of
// common pitfalls. Demos use inline styles on purpose so the token names
// stay visible at the demo site — the page is a teaching artifact.
import type { CSSProperties, ReactNode } from "react";
import styles from "./DesignSystem.module.css";
import { Accordion } from "@components/Containers/Accordion";
import { Btn } from "@ui/Buttons/Btn";
import { Tag } from "@ui/Tag/Tag";

interface TokenChipProps {
  token: string;
}

// Swatch alongside the label visualizes what the token actually is — filled
// for bg / action, "Aa" in the text color for text tokens, outlined for
// border tokens. Special-cased pairings (--text-on-brand needs a brand bg,
// --text-*-inverted needs an inverted bg) so the preview reads correctly.
const TokenChip = ({ token }: TokenChipProps) => {
  let swatchStyle: CSSProperties;
  let swatchContent: ReactNode = null;

  if (token === "--text-on-brand") {
    swatchStyle = {
      background: "var(--bg-primary)",
      color: `var(${token})`,
    };
    swatchContent = "Aa";
  } else if (token.startsWith("--text-") && token.endsWith("-inverted")) {
    swatchStyle = {
      background: "var(--bg-canvas-inverted)",
      color: `var(${token})`,
    };
    swatchContent = "Aa";
  } else if (token.startsWith("--text-")) {
    swatchStyle = {
      background: "var(--bg-canvas)",
      color: `var(${token})`,
    };
    swatchContent = "Aa";
  } else if (token.startsWith("--border-")) {
    swatchStyle = {
      background: "var(--bg-canvas)",
      borderColor: `var(${token})`,
      borderWidth: "2px",
    };
  } else {
    // --bg-* and --action-*
    swatchStyle = { background: `var(${token})` };
  }

  return (
    <span className={styles.ruleTokenChip}>
      <span
        aria-hidden
        className={styles.ruleTokenChipSwatch}
        style={swatchStyle}>
        {swatchContent}
      </span>
      <span>{token}</span>
    </span>
  );
};

interface TokenChipsProps {
  tokens: string[];
}

const TokenChips = ({ tokens }: TokenChipsProps) => {
  return (
    <div className={styles.ruleTokens}>
      <span className={styles.ruleTokensLabel}>Tokens:</span>
      {tokens.map((t) => (
        <TokenChip key={t} token={t} />
      ))}
    </div>
  );
};

interface RuleExampleProps {
  variant: "do" | "dont";
  label: string;
  children: ReactNode;
}

const RuleExample = ({ variant, label, children }: RuleExampleProps) => {
  return (
    <div className={styles.ruleExample}>
      <div
        className={`${styles.ruleExampleLabel} ${
          variant === "do"
            ? styles.ruleExampleLabelDo
            : styles.ruleExampleLabelDont
        }`}>
        {variant === "do" ? "✓ Do" : "✗ Don't"} — {label}
      </div>
      <div className={styles.ruleExamplePanel}>{children}</div>
    </div>
  );
};

const Rule1SurfaceHierarchy = () => {
  return (
    <div className={styles.ruleBody}>
      <p className={styles.ruleStatement}>
        Four background layers, in strict order:{" "}
        <strong>canvas → surface → surface-raised</strong>, with{" "}
        <strong>secondary</strong> as a peer/alternate to surface.{" "}
        <code>subtle</code>, <code>primary</code>, and <code>brand</code> are{" "}
        <em>not</em> layers — they're fills for things <em>inside</em> a layer.
      </p>
      <TokenChips
        tokens={[
          "--bg-canvas",
          "--bg-surface",
          "--bg-surface-raised",
          "--bg-secondary",
        ]}
      />
      <div className={styles.ruleExamples}>
        <RuleExample variant='do' label='lifts cleanly through layers'>
          <div
            style={{
              background: "var(--bg-canvas)",
              padding: "var(--space-3)",
              borderRadius: "var(--radius-md)",
              width: "100%",
            }}>
            <div
              style={{
                background: "var(--bg-surface)",
                padding: "var(--space-3)",
                borderRadius: "var(--radius-md)",
              }}>
              <div
                style={{
                  background: "var(--bg-surface-raised)",
                  padding: "var(--space-3)",
                  borderRadius: "var(--radius-md)",
                  border: "2px solid var(--edge-surface-raised)",
                  color: "var(--text-primary)",
                  fontSize: "var(--font-size-sm)",
                }}>
                surface-raised (popover)
              </div>
            </div>
          </div>
        </RuleExample>
        <RuleExample variant='dont' label='nested same layer reads flat'>
          <div
            style={{
              background: "var(--bg-surface)",
              padding: "var(--space-3)",
              borderRadius: "var(--radius-md)",
              width: "100%",
            }}>
            <div
              style={{
                background: "var(--bg-surface)",
                padding: "var(--space-3)",
                borderRadius: "var(--radius-md)",
                color: "var(--text-primary)",
                fontSize: "var(--font-size-sm)",
              }}>
              surface on surface (no lift)
            </div>
          </div>
        </RuleExample>
      </div>
      <ul className={styles.ruleNotes}>
        <li>Nest two of the same layer — surface inside surface reads flat.</li>
        <li>Skip a layer — canvas → surface-raised feels detached.</li>
        <li>
          Use <code>subtle</code> as a card background — it looks washed out.
        </li>
      </ul>
    </div>
  );
};

const Rule2TextOnSurface = () => {
  return (
    <div className={styles.ruleBody}>
      <p className={styles.ruleStatement}>
        Each background allows only certain text tokens. On{" "}
        <code>canvas/surface/secondary/subtle</code>:{" "}
        <strong>text-primary</strong> for headings,{" "}
        <strong>text-secondary</strong> for body, <strong>text-muted</strong>{" "}
        for de-emphasized, <strong>text-accent</strong> for inline links. On{" "}
        <code>primary/brand</code>: only <strong>text-on-brand</strong>. On{" "}
        <code>*-inverted</code> surfaces: only <strong>*-inverted</strong> text.
      </p>
      <TokenChips
        tokens={[
          "--text-primary",
          "--text-secondary",
          "--text-muted",
          "--text-accent",
          "--text-on-brand",
        ]}
      />
      <div className={styles.ruleExamples}>
        <RuleExample variant='do' label='hierarchy from headline to caption'>
          <div
            style={{
              background: "var(--bg-surface)",
              padding: "var(--space-4)",
              borderRadius: "var(--radius-md)",
              width: "100%",
            }}>
            <div
              style={{
                color: "var(--text-primary)",
                fontWeight: 600,
                marginBottom: "var(--space-1)",
              }}>
              Section heading
            </div>
            <div
              style={{
                color: "var(--text-secondary)",
                fontSize: "var(--font-size-sm)",
                marginBottom: "var(--space-2)",
              }}>
              Body copy in text-secondary keeps headings visually dominant.
            </div>
            <div
              style={{
                color: "var(--text-muted)",
                fontSize: "var(--font-size-xs)",
              }}>
              Last updated 2 hours ago
            </div>
          </div>
        </RuleExample>
        <RuleExample variant='dont' label='accent used for body'>
          <div
            style={{
              background: "var(--bg-surface)",
              padding: "var(--space-4)",
              borderRadius: "var(--radius-md)",
              width: "100%",
            }}>
            <div
              style={{
                color: "var(--text-primary)",
                fontWeight: 600,
                marginBottom: "var(--space-1)",
              }}>
              Section heading
            </div>
            <div
              style={{
                color: "var(--text-accent)",
                fontSize: "var(--font-size-sm)",
              }}>
              Accent-colored body copy fights the heading and looks like a link.
            </div>
          </div>
        </RuleExample>
      </div>
      <ul className={styles.ruleNotes}>
        <li>Mix inverted and non-inverted text on the same surface.</li>
        <li>
          Use <code>text-accent</code> for body copy (it reads as a link).
        </li>
        <li>Put status-colored text on a non-status bg.</li>
      </ul>
    </div>
  );
};

const Rule3BorderDiscipline = () => {
  return (
    <div className={styles.ruleBody}>
      <p className={styles.ruleStatement}>
        <strong>Border colors mean state</strong> — focus ring, selected /
        active. For visually outlining a fill to lift it from its surroundings,
        use an <code>--edge-*</code> token (the hairline paired to each bg).
        Anything that will <em>ever</em> show a state border must declare{" "}
        <code>border: 2px solid transparent</code> at rest, then swap the color
        when the state activates — otherwise the layout jumps.
      </p>
      <TokenChips
        tokens={[
          "--border-focus",
          "--border-brand",
          "--edge-canvas",
          "--edge-surface",
          "--edge-surface-raised",
          "--edge-subtle",
          "--edge-secondary",
          "--edge-primary",
        ]}
      />

      <div className={styles.ruleExampleHeading}>
        State borders: reserve the slot
      </div>
      <div className={styles.ruleExamples}>
        <RuleExample
          variant='do'
          label='2px transparent at rest, color swaps in'>
          <div
            style={{ display: "grid", gap: "var(--space-2)", width: "100%" }}>
            <div
              style={{
                border: "2px solid transparent",
                padding: "var(--space-2) var(--space-3)",
                borderRadius: "var(--radius-md)",
                background: "var(--bg-surface)",
                color: "var(--text-primary)",
                fontSize: "var(--font-size-sm)",
              }}>
              Rest — border: 2px solid transparent
            </div>
            <div
              style={{
                border: "2px solid var(--border-focus)",
                padding: "var(--space-2) var(--space-3)",
                borderRadius: "var(--radius-md)",
                background: "var(--bg-surface)",
                color: "var(--text-primary)",
                fontSize: "var(--font-size-sm)",
              }}>
              Focused — same size, just border-color swapped
            </div>
          </div>
        </RuleExample>
        <RuleExample variant='dont' label='border appears, content shifts 4px'>
          <div
            style={{ display: "grid", gap: "var(--space-2)", width: "100%" }}>
            <div
              style={{
                padding: "var(--space-2) var(--space-3)",
                borderRadius: "var(--radius-md)",
                background: "var(--bg-surface)",
                color: "var(--text-primary)",
                fontSize: "var(--font-size-sm)",
              }}>
              Rest — no border declared
            </div>
            <div
              style={{
                border: "2px solid var(--border-focus)",
                padding: "var(--space-2) var(--space-3)",
                borderRadius: "var(--radius-md)",
                background: "var(--bg-surface)",
                color: "var(--text-primary)",
                fontSize: "var(--font-size-sm)",
              }}>
              Focused — 4px wider, text reflowed
            </div>
          </div>
        </RuleExample>
      </div>

      <div className={styles.ruleExampleHeading}>
        Contrast outlines: use edge tokens
      </div>
      <div className={styles.ruleExamples}>
        <RuleExample variant='do' label='--edge-* matched to each fill'>
          <div
            style={{ display: "grid", gap: "var(--space-2)", width: "100%" }}>
            <div
              style={{
                border: "2px solid var(--edge-surface)",
                padding: "var(--space-2) var(--space-3)",
                borderRadius: "var(--radius-md)",
                background: "var(--bg-surface)",
                color: "var(--text-primary)",
                fontSize: "var(--font-size-sm)",
              }}>
              Surface card — border: 2px solid var(--edge-surface)
            </div>
            <div
              style={{
                border: "2px solid var(--edge-subtle)",
                padding: "var(--space-2) var(--space-3)",
                borderRadius: "var(--radius-md)",
                background: "var(--bg-subtle)",
                color: "var(--text-primary)",
                fontSize: "var(--font-size-sm)",
              }}>
              Input body — border: 2px solid var(--edge-subtle)
            </div>
            <div
              style={{
                border: "2px solid var(--edge-primary)",
                padding: "var(--space-2) var(--space-3)",
                borderRadius: "var(--radius-md)",
                background: "var(--bg-primary)",
                color: "var(--text-on-brand)",
                fontSize: "var(--font-size-sm)",
              }}>
              Primary CTA — border: 2px solid var(--edge-primary)
            </div>
          </div>
        </RuleExample>
        <RuleExample variant='dont' label='--border-subtle as decoration'>
          <div
            style={{ display: "grid", gap: "var(--space-2)", width: "100%" }}>
            <div
              style={{
                border: "2px solid var(--border-subtle)",
                padding: "var(--space-2) var(--space-3)",
                borderRadius: "var(--radius-md)",
                background: "var(--bg-surface)",
                color: "var(--text-primary)",
                fontSize: "var(--font-size-sm)",
              }}>
              Tinted purple line — borrows state-meaning for decoration
            </div>
            <div
              style={{
                border: "2px solid var(--border-subtle)",
                padding: "var(--space-2) var(--space-3)",
                borderRadius: "var(--radius-md)",
                background: "var(--bg-subtle)",
                color: "var(--text-primary)",
                fontSize: "var(--font-size-sm)",
              }}>
              Same on subtle — line color disagrees with the fill
            </div>
          </div>
        </RuleExample>
      </div>

      <ul className={styles.ruleNotes}>
        <li>
          Activate a state border on a component that didn't reserve the 2px
          slot — the layout shifts.
        </li>
        <li>
          Use <code>--border-subtle</code> or <code>--border-default</code> for
          non-state contrast — that's what <code>--edge-*</code> is for.
        </li>
        <li>
          Outline everything in <code>--border-brand</code> — overuse dilutes
          the "selected" signal.
        </li>
        <li>
          Stack a state border <em>and</em> an edge on the same element — use{" "}
          <code>outline</code> or <code>box-shadow</code> for the state instead.
        </li>
      </ul>
    </div>
  );
};

const Rule4InteractiveStates = () => {
  return (
    <div className={styles.ruleBody}>
      <p className={styles.ruleStatement}>
        Every interactive element follows the same five states:{" "}
        <strong>
          Rest → Hover (action-hover) → Active (action-active) → Focus (adds
          border-focus) → Disabled (bg-disabled / text-disabled /
          border-disabled)
        </strong>
        . Buttons, list rows, tabs, chips — same five lines.
      </p>
      <TokenChips
        tokens={[
          "--action-hover",
          "--action-active",
          "--border-focus",
          "--bg-disabled",
          "--text-disabled",
        ]}
      />
      <div className={styles.ruleExamples}>
        <RuleExample variant='do' label='disabled uses dedicated tokens'>
          <div
            style={{
              display: "flex",
              gap: "var(--space-2)",
              flexWrap: "wrap",
            }}>
            <Btn>Rest</Btn>
            <Btn disabled>Disabled</Btn>
          </div>
        </RuleExample>
        <RuleExample variant='dont' label='opacity fakes disabled'>
          <div
            style={{
              display: "flex",
              gap: "var(--space-2)",
              flexWrap: "wrap",
            }}>
            <Btn>Rest</Btn>
            <div style={{ opacity: 0.4 }}>
              <Btn>Disabled (wrong)</Btn>
            </div>
          </div>
        </RuleExample>
      </div>
      <ul className={styles.ruleNotes}>
        <li>Use opacity to express disabled — it muddies contrast.</li>
        <li>
          Reuse <code>border-focus</code> as a hover state.
        </li>
        <li>
          Make hover and active visually identical — you lose press feedback.
        </li>
      </ul>
    </div>
  );
};

const Rule5ActionEmphasis = () => {
  return (
    <div className={styles.ruleBody}>
      <p className={styles.ruleStatement}>
        Two orthogonal props govern button look: <strong>variant</strong> picks
        the color slot (primary, secondary, brand, info, error, success,
        warning, disabled) and <strong>fill</strong> picks how that color
        renders — <code>default</code> (bg, no border), <code>bordered</code>{" "}
        (bg + border), or <code>ghost</code> (no bg, no border). Any color × any
        fill is legal:{" "}
        <code>variant=&quot;error&quot; fill=&quot;ghost&quot;</code> is a red
        text-only destructive control.
      </p>
      <TokenChips
        tokens={[
          "--bg-secondary",
          "--text-primary",
          "--bg-brand",
          "--text-on-brand",
          "--bg-error",
          "--text-error",
        ]}
      />
      <div className={styles.ruleExamples}>
        <RuleExample variant='do' label='one prominent action, others demoted'>
          <div
            style={{
              display: "flex",
              gap: "var(--space-2)",
              flexWrap: "wrap",
            }}>
            <Btn variant='brand'>Save deck</Btn>
            <Btn fill='bordered'>Cancel</Btn>
            <Btn fill='ghost'>Learn more</Btn>
            <Btn variant='error' fill='ghost'>
              Delete
            </Btn>
          </div>
        </RuleExample>
        <RuleExample variant='dont' label='two brand CTAs compete'>
          <div
            style={{
              display: "flex",
              gap: "var(--space-2)",
              flexWrap: "wrap",
            }}>
            <Btn variant='brand'>Save</Btn>
            <Btn variant='brand'>Publish</Btn>
            <Btn variant='brand'>Share</Btn>
          </div>
        </RuleExample>
      </div>
      <ul className={styles.ruleNotes}>
        <li>
          Show two brand buttons in the same view — demote one to a quieter
          fill.
        </li>
        <li>
          Color a primary button red to mean &quot;danger&quot; — use{" "}
          <code>variant=&quot;error&quot;</code>.
        </li>
        <li>
          Apply <code>border-brand</code> to a button (that&apos;s for selection
          state).
        </li>
      </ul>
    </div>
  );
};

const Rule6StatusColors = () => {
  return (
    <div className={styles.ruleBody}>
      <p className={styles.ruleStatement}>
        Status colors mean exactly one thing: feedback about an operation. Never
        decorative. <strong>Banner / toast</strong>: <code>bg-{`{s}`}</code> +{" "}
        <code>text-{`{s}`}</code> + <code>border-{`{s}`}</code> — all three.{" "}
        <strong>Inline validation</strong>: <code>text-{`{s}`}</code> alone.{" "}
        <strong>Chip</strong>: <code>bg-{`{s}`}</code> +{" "}
        <code>text-{`{s}`}</code>.
      </p>
      <TokenChips
        tokens={[
          "--bg-error",
          "--text-error",
          "--border-error",
          "--bg-success",
          "--text-success",
          "--bg-warning",
          "--text-warning",
          "--bg-info",
          "--text-info",
        ]}
      />
      <div className={styles.ruleExamples}>
        <RuleExample variant='do' label='all three tokens, status meaning'>
          <div
            style={{ display: "grid", gap: "var(--space-2)", width: "100%" }}>
            <div
              style={{
                background: "var(--bg-error)",
                color: "var(--text-error)",
                border: "1px solid var(--border-error)",
                padding: "var(--space-2) var(--space-3)",
                borderRadius: "var(--radius-md)",
                fontSize: "var(--font-size-sm)",
              }}>
              Couldn't save your deck. Check your connection.
            </div>
            <div
              style={{
                background: "var(--bg-success)",
                color: "var(--text-success)",
                border: "1px solid var(--border-success)",
                padding: "var(--space-2) var(--space-3)",
                borderRadius: "var(--radius-md)",
                fontSize: "var(--font-size-sm)",
              }}>
              Deck saved.
            </div>
            <div
              style={{
                color: "var(--text-error)",
                fontSize: "var(--font-size-xs)",
              }}>
              Inline validation: name is required.
            </div>
          </div>
        </RuleExample>
        <RuleExample variant='dont' label='status hue used for decoration'>
          <div
            style={{
              display: "flex",
              gap: "var(--space-2)",
              alignItems: "center",
              flexWrap: "wrap",
            }}>
            <Tag>Active</Tag>
            <span
              style={{
                color: "var(--text-secondary)",
                fontSize: "var(--font-size-xs)",
              }}>
              vs a "success-green" tag meaning "active" — wrong signal
            </span>
          </div>
        </RuleExample>
      </div>
      <ul className={styles.ruleNotes}>
        <li>
          Use green to mean "active" or "selected" — that's brand or
          border-brand.
        </li>
        <li>
          Style a delete button red without the destructive variant tokens (see
          Rule 5).
        </li>
        <li>
          Stack conflicting status meanings ("warning border + error text").
        </li>
      </ul>
    </div>
  );
};

const Rule7BrandAndInversion = () => {
  return (
    <div className={styles.ruleBody}>
      <p className={styles.ruleStatement}>
        Brand color appears in exactly three places: the single primary CTA,
        selection/active states, and inline accents.{" "}
        <strong>Inverted surfaces</strong> (<code>*-inverted</code> tokens) are
        for <em>anchored chrome</em> — top nav, sidebar, hero — not for content.
        Modals do <em>not</em> invert.
      </p>
      <TokenChips
        tokens={[
          "--bg-canvas-inverted",
          "--bg-surface-inverted",
          "--text-primary-inverted",
          "--text-accent-inverted",
        ]}
      />
      <div className={styles.ruleExamples}>
        <RuleExample variant='do' label='inverted nav anchors the page'>
          <div
            style={{ display: "grid", gap: "var(--space-2)", width: "100%" }}>
            <div
              style={{
                background: "var(--bg-canvas-inverted)",
                color: "var(--text-primary-inverted)",
                padding: "var(--space-2) var(--space-3)",
                borderRadius: "var(--radius-md)",
                fontSize: "var(--font-size-sm)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}>
              <span>Ambi</span>
              <span style={{ color: "var(--text-accent-inverted)" }}>
                Sign in
              </span>
            </div>
            <div
              style={{
                background: "var(--bg-surface)",
                color: "var(--text-primary)",
                padding: "var(--space-2) var(--space-3)",
                borderRadius: "var(--radius-md)",
                fontSize: "var(--font-size-sm)",
              }}>
              Page content sits below in non-inverted surfaces.
            </div>
          </div>
        </RuleExample>
        <RuleExample variant='dont' label='inverted modal disconnects'>
          <div
            style={{
              background: "var(--bg-surface)",
              padding: "var(--space-3)",
              borderRadius: "var(--radius-md)",
              width: "100%",
              position: "relative",
            }}>
            <div
              style={{
                color: "var(--text-secondary)",
                fontSize: "var(--font-size-xs)",
                marginBottom: "var(--space-2)",
              }}>
              Page content
            </div>
            <div
              style={{
                background: "var(--bg-canvas-inverted)",
                color: "var(--text-primary-inverted)",
                padding: "var(--space-3)",
                borderRadius: "var(--radius-md)",
                fontSize: "var(--font-size-sm)",
              }}>
              Inverted modal — feels detached from the page below it.
            </div>
          </div>
        </RuleExample>
      </div>
      <ul className={styles.ruleNotes}>
        <li>
          Sprinkle brand color across decorations — if everything is brand,
          nothing is.
        </li>
        <li>
          Use <code>*-inverted</code> text on a non-inverted bg or vice versa.
        </li>
        <li>
          Invert modals, popovers, or dropdowns (they should feel raised, not
          detached).
        </li>
      </ul>
    </div>
  );
};

const Rule8NoBoxShadow = () => {
  return (
    <div className={styles.ruleBody}>
      <p className={styles.ruleStatement}>
        <strong>Don't use box-shadow.</strong> Elevation is communicated through
        the surface ladder (<code>--bg-surface</code> →{" "}
        <code>--bg-surface-raised</code>) and the matching <code>--edge-*</code>{" "}
        hairline. Color-based elevation is theme-safe — shadows on dark
        backgrounds disappear, and they multiply inconsistencies across themes.
      </p>
      <TokenChips
        tokens={[
          "--bg-surface",
          "--bg-surface-raised",
          "--edge-surface",
          "--edge-surface-raised",
        ]}
      />
      <div className={styles.ruleExamples}>
        <RuleExample variant='do' label='surface-raised + edge lifts the panel'>
          <div
            style={{
              background: "var(--bg-surface)",
              padding: "var(--space-3)",
              borderRadius: "var(--radius-md)",
              border: "2px solid var(--edge-surface)",
              width: "100%",
            }}>
            <div
              style={{
                color: "var(--text-secondary)",
                fontSize: "var(--font-size-xs)",
                marginBottom: "var(--space-2)",
              }}>
              Card body on bg-surface
            </div>
            <div
              style={{
                background: "var(--bg-surface-raised)",
                border: "2px solid var(--edge-surface-raised)",
                padding: "var(--space-3)",
                borderRadius: "var(--radius-md)",
                color: "var(--text-primary)",
                fontSize: "var(--font-size-sm)",
              }}>
              Popover lifted by bg + edge only
            </div>
          </div>
        </RuleExample>
        <RuleExample variant='dont' label='shadow does the lifting'>
          <div
            style={{
              background: "var(--bg-surface)",
              padding: "var(--space-3)",
              borderRadius: "var(--radius-md)",
              width: "100%",
            }}>
            <div
              style={{
                color: "var(--text-secondary)",
                fontSize: "var(--font-size-xs)",
                marginBottom: "var(--space-2)",
              }}>
              Card body on bg-surface
            </div>
            <div
              style={{
                background: "var(--bg-surface)",
                boxShadow: "var(--shadow-lg)",
                padding: "var(--space-3)",
                borderRadius: "var(--radius-md)",
                color: "var(--text-primary)",
                fontSize: "var(--font-size-sm)",
              }}>
              Popover relying on shadow — vanishes in dark mode
            </div>
          </div>
        </RuleExample>
      </div>
      <ul className={styles.ruleNotes}>
        <li>
          Use <code>box-shadow</code> for elevation — switch to
          bg-surface-raised + edge instead.
        </li>
        <li>
          Combine shadow <em>and</em> surface-raised — pick one (and it's
          surface-raised).
        </li>
        <li>
          Add a glow / outer shadow as decoration — it'll behave differently in
          dark mode.
        </li>
      </ul>
    </div>
  );
};

const Rule9BorderThickness = () => {
  return (
    <div className={styles.ruleBody}>
      <p className={styles.ruleStatement}>
        <strong>Borders are at least 2px.</strong> 1px hairlines vanish on
        high-DPI displays, look anemic against tinted bgs, and create
        inconsistent visual weight. If a border is worth drawing, it's worth
        2px.
      </p>
      <div className={styles.ruleExamples}>
        <RuleExample variant='do' label='2px reads on any background'>
          <div
            style={{ display: "grid", gap: "var(--space-2)", width: "100%" }}>
            <div
              style={{
                border: "2px solid var(--edge-surface)",
                padding: "var(--space-2) var(--space-3)",
                borderRadius: "var(--radius-md)",
                background: "var(--bg-surface)",
                color: "var(--text-primary)",
                fontSize: "var(--font-size-sm)",
              }}>
              Card — 2px solid var(--edge-surface)
            </div>
            <div
              style={{
                border: "2px solid transparent",
                outline: "2px solid var(--border-focus)",
                outlineOffset: "-2px",
                padding: "var(--space-2) var(--space-3)",
                borderRadius: "var(--radius-md)",
                background: "var(--bg-surface)",
                color: "var(--text-primary)",
                fontSize: "var(--font-size-sm)",
              }}>
              Focus ring — 2px var(--border-focus)
            </div>
          </div>
        </RuleExample>
        <RuleExample variant='dont' label='1px disappears on hi-DPI'>
          <div
            style={{ display: "grid", gap: "var(--space-2)", width: "100%" }}>
            <div
              style={{
                border: "1px solid var(--edge-surface)",
                padding: "var(--space-2) var(--space-3)",
                borderRadius: "var(--radius-md)",
                background: "var(--bg-surface)",
                color: "var(--text-primary)",
                fontSize: "var(--font-size-sm)",
              }}>
              Card — 1px (barely visible)
            </div>
            <div
              style={{
                border: "1px solid var(--border-focus)",
                padding: "var(--space-2) var(--space-3)",
                borderRadius: "var(--radius-md)",
                background: "var(--bg-surface)",
                color: "var(--text-primary)",
                fontSize: "var(--font-size-sm)",
              }}>
              Focus ring — 1px (looks anemic)
            </div>
          </div>
        </RuleExample>
      </div>
      <ul className={styles.ruleNotes}>
        <li>
          Use 1px for any visible border — it fails on 2× and 3× displays.
        </li>
        <li>
          Mix border widths within a component — pick one and stick with it.
        </li>
        <li>
          Use a 1px divider where a layout gap or a recessed bg would do the
          job.
        </li>
      </ul>
    </div>
  );
};

const Rule10CssModuleNesting = () => {
  const goodCss = `.card {
  background: var(--bg-surface);
  border: 2px solid var(--edge-surface);

  .header {
    padding: var(--p-sm);
    color: var(--text-primary);
  }

  .body {
    padding: var(--p-md);
    color: var(--text-secondary);
  }
}`;

  const badCss = `.card {
  background: var(--bg-surface);
  border: 2px solid var(--edge-surface);
}

.cardHeader {
  padding: var(--p-sm);
  color: var(--text-primary);
}

.cardBody {
  padding: var(--p-md);
  color: var(--text-secondary);
}`;

  return (
    <div className={styles.ruleBody}>
      <p className={styles.ruleStatement}>
        <strong>Nest CSS module selectors to mirror the JSX tree.</strong> When{" "}
        <code>.header</code> always lives inside <code>.card</code>, nest the
        styles to make that relationship visible. Sibling-class soup at the top
        of a file hides the structure and makes refactors harder.
      </p>
      <div className={styles.ruleExamples}>
        <RuleExample variant='do' label='nested mirrors JSX'>
          <pre className={styles.ruleCodeBlock}>{goodCss}</pre>
        </RuleExample>
        <RuleExample variant='dont' label='flat siblings hide structure'>
          <pre className={styles.ruleCodeBlock}>{badCss}</pre>
        </RuleExample>
      </div>
      <ul className={styles.ruleNotes}>
        <li>
          Flatten a hierarchy that the JSX nests — reading the CSS won't reveal
          the structure.
        </li>
        <li>Over-nest by 4+ levels — past 3 levels, specificity wars start.</li>
        <li>
          Mix nesting depth arbitrarily — pick the JSX-mirroring depth and stick
          to it.
        </li>
      </ul>
    </div>
  );
};

const Rule11SpacingTokens = () => {
  const goodCss = `.card {
  padding: var(--p-md);
  gap: var(--gap-sm);
  margin-bottom: var(--space-4);
}`;

  const badCss = `.card {
  padding: 16px 24px;
  gap: 8px;
  margin-bottom: 20px;
}`;

  return (
    <div className={styles.ruleBody}>
      <p className={styles.ruleStatement}>
        <strong>
          Every padding, margin, and gap value comes from a token.
        </strong>{" "}
        Reach for <code>--space-*</code> (raw scale), <code>--gap-*</code> (for
        layout gaps), or one of the <code>--p-*</code> groups (
        <code>--p-sm</code>, <code>--p-pill-md</code>,{" "}
        <code>--p-square-lg</code>, etc.). Magic pixel/rem values erode the
        visual rhythm faster than anything.
      </p>
      <TokenChips
        tokens={[
          "--space-2",
          "--space-4",
          "--gap-md",
          "--p-sm",
          "--p-md",
          "--p-pill-md",
          "--p-square-lg",
        ]}
      />
      <div className={styles.ruleExamples}>
        <RuleExample variant='do' label='tokens flow from the scale'>
          <pre className={styles.ruleCodeBlock}>{goodCss}</pre>
        </RuleExample>
        <RuleExample variant='dont' label='magic numbers break the rhythm'>
          <pre className={styles.ruleCodeBlock}>{badCss}</pre>
        </RuleExample>
      </div>
      <ul className={styles.ruleNotes}>
        <li>
          Hardcode <code>16px</code> when <code>--space-4</code> is the same
          value — drift starts here.
        </li>
        <li>
          Mix tokens and literals in the same property (
          <code>padding: var(--space-2) 10px</code>).
        </li>
        <li>
          Invent a new arbitrary value when an existing token is "close enough"
          — close enough is exact.
        </li>
      </ul>
    </div>
  );
};

const Rule12SemanticTokens = () => {
  const goodCss = `.button {
  background: var(--bg-primary);
  color: var(--text-on-brand);
  border: 2px solid var(--edge-primary);
}`;

  const badCss = `.button {
  background: var(--violet-500);
  color: var(--concrete-200);
  border: 2px solid var(--violet-700);
}`;

  return (
    <div className={styles.ruleBody}>
      <p className={styles.ruleStatement}>
        <strong>
          Components consume semantic tokens, never palette tokens.
        </strong>{" "}
        A component CSS file references <code>--bg-surface</code>,{" "}
        <code>--text-primary</code>, <code>--edge-primary</code> — not{" "}
        <code>--concrete-300</code> or <code>--violet-500</code>. The named and
        brand palettes are mapping ingredients for <code>tokens.css</code>;
        reaching past the semantic layer bypasses themability.
      </p>
      <TokenChips
        tokens={[
          "--bg-surface",
          "--text-primary",
          "--edge-primary",
          "--border-focus",
        ]}
      />
      <div className={styles.ruleExamples}>
        <RuleExample variant='do' label='semantic tokens, theme-safe'>
          <pre className={styles.ruleCodeBlock}>{goodCss}</pre>
        </RuleExample>
        <RuleExample variant='dont' label='palette token, breaks theming'>
          <pre className={styles.ruleCodeBlock}>{badCss}</pre>
        </RuleExample>
      </div>
      <ul className={styles.ruleNotes}>
        <li>
          Use a palette token (<code>--violet-500</code>) in a component — it
          won't follow theme switches.
        </li>
        <li>
          Define a one-off semantic token in a component file — add it to{" "}
          <code>tokens.css</code> so others can reuse.
        </li>
        <li>
          Mix oklch literals with token references — every color in a component
          flows from <code>tokens.css</code>.
        </li>
      </ul>
    </div>
  );
};

const Rule13FocusVisible = () => {
  const goodCss = `.button:focus-visible {
  border-color: var(--border-focus);
  outline: none;
}`;

  const badCss = `.button:focus {
  border-color: var(--border-focus);
  outline: none;
}`;

  return (
    <div className={styles.ruleBody}>
      <p className={styles.ruleStatement}>
        <strong>
          Focus rings show on <code>:focus-visible</code>, not{" "}
          <code>:focus</code>.
        </strong>{" "}
        A keyboard user needs to see the ring; a mouse user doesn't (clicking a
        button shouldn't paint a ring around it). <code>:focus-visible</code> is
        the modern selector that differentiates the two — universally supported.
      </p>
      <TokenChips tokens={["--border-focus"]} />
      <div className={styles.ruleExamples}>
        <RuleExample variant='do' label='keyboard nav only'>
          <pre className={styles.ruleCodeBlock}>{goodCss}</pre>
        </RuleExample>
        <RuleExample variant='dont' label='paints on every click'>
          <pre className={styles.ruleCodeBlock}>{badCss}</pre>
        </RuleExample>
      </div>
      <ul className={styles.ruleNotes}>
        <li>
          Use plain <code>:focus</code> — every mouse click paints a focus ring.
        </li>
        <li>
          Suppress focus styling entirely (<code>outline: none</code> with
          nothing replacing it) — keyboard users can't navigate.
        </li>
        <li>
          Style <code>:focus-within</code> when you mean{" "}
          <code>:focus-visible</code> — they're different selectors with
          different effects.
        </li>
      </ul>
    </div>
  );
};

const Rule14InlineStyleDiscipline = () => {
  const goodJsx = `<div className={styles.swatch} />
<div
  className={styles.hueDot}
  style={{ background: \`oklch(50% 0.2 \${hue}deg)\` }}
/>`;

  const badJsx = `<div
  style={{
    background: "var(--bg-surface)",
    padding: "var(--space-3)",
    borderRadius: "var(--radius-md)",
  }}
/>`;

  return (
    <div className={styles.ruleBody}>
      <p className={styles.ruleStatement}>
        <strong>
          Inline <code>style={`{}`}</code> is for values computed from props or
          state.
        </strong>{" "}
        Static styles — colors, spacing, radii — go in CSS modules. The
        exception is a value that genuinely can't be expressed as a class (a
        runtime-computed hue, a transform from a drag position). The rulebook
        demos on this page break this rule on purpose so the token names stay
        visible in the JSX — production components do not.
      </p>
      <div className={styles.ruleExamples}>
        <RuleExample variant='do' label='static in module, dynamic inline'>
          <pre className={styles.ruleCodeBlock}>{goodJsx}</pre>
        </RuleExample>
        <RuleExample variant='dont' label='static styles inline'>
          <pre className={styles.ruleCodeBlock}>{badJsx}</pre>
        </RuleExample>
      </div>
      <ul className={styles.ruleNotes}>
        <li>
          Inline static tokens — they evade stylelint and the CSS module's
          nesting structure.
        </li>
        <li>
          Use a CSS variable in a style prop when a className modifier would do.
        </li>
        <li>
          Inline static layout decisions (padding, gap, grid-template) — that's
          CSS module territory.
        </li>
      </ul>
    </div>
  );
};

const Rule15MotionTokens = () => {
  const goodCss = `.button {
  transition:
    background var(--duration-fast) var(--ease-out),
    border-color var(--duration-fast) var(--ease-out);
}`;

  const badCss = `.button {
  transition:
    background 0.2s ease-out,
    border-color 200ms ease;
}`;

  return (
    <div className={styles.ruleBody}>
      <p className={styles.ruleStatement}>
        <strong>
          All motion uses <code>--duration-*</code> and <code>--ease-*</code>{" "}
          tokens.
        </strong>{" "}
        Three durations (<code>fast</code>/<code>base</code>/<code>slow</code>)
        and one easing curve (<code>--ease-out</code>) keep the UI feeling
        coherent. Avoid one-off literals like <code>200ms ease</code>.
      </p>
      <TokenChips
        tokens={[
          "--duration-fast",
          "--duration-base",
          "--duration-slow",
          "--ease-out",
        ]}
      />
      <div className={styles.ruleExamples}>
        <RuleExample variant='do' label='same cadence across components'>
          <pre className={styles.ruleCodeBlock}>{goodCss}</pre>
        </RuleExample>
        <RuleExample variant='dont' label='literal durations drift'>
          <pre className={styles.ruleCodeBlock}>{badCss}</pre>
        </RuleExample>
      </div>
      <ul className={styles.ruleNotes}>
        <li>
          Hardcode <code>0.2s</code> or <code>200ms</code> — every component you
          touch drifts a little more.
        </li>
        <li>
          Invent new easing curves — <code>--ease-out</code> covers the entire
          UI vocabulary.
        </li>
        <li>
          Animate colors or layout without a transition — feels janky and
          unfinished.
        </li>
      </ul>
    </div>
  );
};

const RulebookSection = () => {
  return (
    <section>
      <div className={styles.sectionTitle}>Design rulebook</div>
      <p className={styles.sectionDescription}>
        Fifteen rules for building components: colors, borders, elevation, CSS
        authoring, spacing, and motion. Open any rule to see what it means, the
        tokens it governs, and a side-by-side do/don't demo.
      </p>
      <div className={styles.examplesContainer}>
        <Accordion titleBar='1. Surface hierarchy (the depth ladder)'>
          <Rule1SurfaceHierarchy />
        </Accordion>
        <Accordion titleBar='2. Text on surface (pairing matrix)'>
          <Rule2TextOnSurface />
        </Accordion>
        <Accordion titleBar='3. Borders are for state, edges are for contrast'>
          <Rule3BorderDiscipline />
        </Accordion>
        <Accordion titleBar='4. Interactive state recipe'>
          <Rule4InteractiveStates />
        </Accordion>
        <Accordion titleBar='5. Action emphasis ladder'>
          <Rule5ActionEmphasis />
        </Accordion>
        <Accordion titleBar='6. Status colors'>
          <Rule6StatusColors />
        </Accordion>
        <Accordion titleBar='7. Brand and inversion'>
          <Rule7BrandAndInversion />
        </Accordion>
        <Accordion titleBar='8. No box shadows — elevate with surface + edge'>
          <Rule8NoBoxShadow />
        </Accordion>
        <Accordion titleBar='9. Borders are at least 2px'>
          <Rule9BorderThickness />
        </Accordion>
        <Accordion titleBar='10. Nest CSS modules to mirror JSX'>
          <Rule10CssModuleNesting />
        </Accordion>
        <Accordion titleBar='11. Spacing comes from tokens, not magic numbers'>
          <Rule11SpacingTokens />
        </Accordion>
        <Accordion titleBar='12. Components use semantic tokens, never palette tokens'>
          <Rule12SemanticTokens />
        </Accordion>
        <Accordion titleBar='13. :focus-visible, not :focus'>
          <Rule13FocusVisible />
        </Accordion>
        <Accordion titleBar='14. Inline style only for dynamic values'>
          <Rule14InlineStyleDiscipline />
        </Accordion>
        <Accordion titleBar='15. Motion via --duration-* and --ease-* tokens'>
          <Rule15MotionTokens />
        </Accordion>
      </div>
    </section>
  );
};

export { RulebookSection };
