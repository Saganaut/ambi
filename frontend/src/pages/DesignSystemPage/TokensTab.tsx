// Color tokens tab: brand color scales, theme picker, color palette, surface
// hierarchy demo, and semantic token rows. Self-contained — pulls its helpers
// (ColorSwatch, TokenRow, HierarchyDemo, ExperimentPaletteSection) inline so
// the tab is a single import for DesignSystemPage.
import styles from "./DesignSystem.module.css";
import { Accordion } from "../../components/Containers/Accordion";
import { ThemePicker } from "./ThemePicker";
import { colorPalette, semanticTokenGroups } from "./data";

interface TokenLikeProps {
  token: string;
}

const ColorSwatch = ({ token }: TokenLikeProps) => {
  return (
    <div className={styles.colorSwatch}>
      <div
        className={styles.colorBox}
        style={{ background: `var(${token})` }}
      />
      <div className={styles.colorToken}>{token}</div>
    </div>
  );
};

const experimentPalettes: { label: string; varBase: string }[] = [
  { label: "Violet", varBase: "--violet" },
  { label: "Orange", varBase: "--orange" },
  { label: "Tolopea", varBase: "--tolopea" },
  { label: "cyan", varBase: "--cyan" },
  { label: "Concrete", varBase: "--concrete" },
  { label: "White", varBase: "--white" },
  { label: "Black Russian", varBase: "--black-russian" },
  { label: "Ultraviolet", varBase: "--ultraviolet" },
];

const experimentShades = [100, 200, 300, 400, 500, 600, 700, 800, 900];

const ExperimentPaletteSection = () => {
  return (
    <section>
      <div className={styles.sectionTitle}>Brand color scales</div>
      <div className={styles.experimentPalettes}>
        {experimentPalettes.map(({ label, varBase }) => (
          <div key={varBase} className={styles.experimentPaletteRow}>
            <div className={styles.experimentPaletteLabel}>
              <div className={styles.experimentPaletteName}>{label}</div>
              <div className={styles.experimentPaletteVar}>
                {`var(${varBase})`}
              </div>
            </div>
            <div className={styles.experimentScale}>
              {experimentShades.map((shade) => {
                const token = `${varBase}-${shade}`;
                return (
                  <div key={token} className={styles.experimentShade}>
                    <div
                      className={styles.experimentShadeBox}
                      style={{ background: `var(${token})` }}
                    />
                    <div className={styles.experimentShadeNumber}>{shade}</div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

type TokenKind = "bg" | "text" | "border" | "action";

const tokenKind = (token: string): TokenKind => {
  if (token.startsWith("--text-")) return "text";
  if (token.startsWith("--border-")) return "border";
  if (token.startsWith("--action-")) return "action";
  return "bg";
};

const TokenPreview = ({ token }: TokenLikeProps) => {
  const kind = tokenKind(token);
  if (kind === "text") {
    return (
      <div
        className={styles.tokenSampleText}
        style={{ color: `var(${token})` }}>
        Aa text
      </div>
    );
  }
  if (kind === "border") {
    return (
      <div
        className={styles.tokenSampleBorder}
        style={{ borderColor: `var(${token})` }}
      />
    );
  }
  return (
    <div
      className={styles.tokenSample}
      style={{ background: `var(${token})` }}
    />
  );
};

const TokenRow = ({ token }: TokenLikeProps) => {
  return (
    <div className={styles.tokenRow}>
      <div>
        <div className={styles.tokenLabel}>{token}</div>
        <div className={styles.tokenVar}>{`var(${token})`}</div>
      </div>
      <TokenPreview token={token} />
    </div>
  );
};

const HierarchyDemo = () => {
  return (
    <div className={styles.hierarchyDemo}>
      <div
        className={styles.hierarchyNest}
        style={{ background: "var(--bg-canvas)" }}>
        <span className={styles.hierarchyTag}>--bg-canvas</span>
        <div
          className={styles.hierarchyNest}
          style={{ background: "var(--bg-surface)" }}>
          <span className={styles.hierarchyTag}>--bg-surface</span>
          <div
            className={styles.hierarchyNest}
            style={{ background: "var(--bg-surface-raised)" }}>
            <span className={styles.hierarchyTag}>--bg-surface-raised</span>
            <div className={styles.hierarchyTextStack}>
              <span
                style={{
                  color: "var(--text-primary)",
                  fontSize: "var(--font-size-lg)",
                  fontWeight: 600,
                }}>
                Primary heading
              </span>
              <span style={{ color: "var(--text-secondary)" }}>
                Secondary supporting copy
              </span>
              <span
                style={{
                  color: "var(--text-muted)",
                  fontSize: "var(--font-size-sm)",
                }}>
                Muted label
              </span>
              <span style={{ color: "var(--text-accent)" }}>Accent link</span>
            </div>
          </div>
        </div>
      </div>

      <div
        className={styles.hierarchyBrandPanel}
        style={{
          background: "var(--bg-brand)",
          color: "var(--text-on-brand)",
        }}>
        <span
          className={styles.hierarchyTag}
          style={{ color: "var(--text-on-brand)" }}>
          --bg-brand
        </span>
        <span style={{ fontSize: "var(--font-size-lg)", fontWeight: 600 }}>
          Brand text uses --text-on-brand
        </span>
      </div>

      <div
        className={styles.hierarchyInvertedPanel}
        style={{ background: "var(--bg-canvas-inverted)" }}>
        <span
          className={styles.hierarchyTag}
          style={{ color: "var(--text-secondary-inverted)" }}>
          --bg-canvas-inverted
        </span>
        <div className={styles.hierarchyTextStack}>
          <span
            style={{
              color: "var(--text-primary-inverted)",
              fontSize: "var(--font-size-lg)",
              fontWeight: 600,
            }}>
            Primary inverted
          </span>
          <span style={{ color: "var(--text-secondary-inverted)" }}>
            Secondary inverted
          </span>
          <span style={{ color: "var(--text-accent-inverted)" }}>
            Accent inverted
          </span>
        </div>
      </div>
    </div>
  );
};

const TokensTab = () => {
  return (
    <>
      <ExperimentPaletteSection />
      <section>
        <div className={styles.examplesContainer}>
          <Accordion titleBar='Theme Picker'>
            <ThemePicker />
          </Accordion>
        </div>
      </section>
      <section>
        <div className={styles.examplesContainer}>
          <Accordion titleBar='Color palette'>
            <div className={styles.paletteContainer}>
              {colorPalette.map((group) => (
                <div key={group.label} className={styles.paletteGroup}>
                  <div className={styles.paletteGroupTitle}>{group.label}</div>
                  <div className={styles.colorGrid}>
                    {group.tokens.map((token) => (
                      <ColorSwatch key={token} token={token} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Accordion>
        </div>
      </section>
      <section>
        <div className={styles.examplesContainer}>
          <Accordion titleBar='Surface & text hierarchy'>
            <HierarchyDemo />
          </Accordion>
          <Accordion titleBar='Semantic tokens'>
            <div className={styles.tokensGroups}>
              {semanticTokenGroups.map((group) => (
                <div key={group.label} className={styles.tokensGroup}>
                  <div className={styles.tokensGroupLabel}>{group.label}</div>
                  <div className={styles.tokensContainer}>
                    {group.tokens.map((token) => (
                      <TokenRow key={token} token={token} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Accordion>
        </div>
      </section>
    </>
  );
};

export { TokensTab };
