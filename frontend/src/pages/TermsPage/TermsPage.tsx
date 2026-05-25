import { SECTIONS } from "./data";
import styles from "./TermsPage.module.css";

const TermsPage = () => {
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <p className={styles.eyebrow}>legal</p>
        <h1 className={styles.title}>Terms and Conditions</h1>
        <p className={styles.meta}>Last updated: May 4, 2026</p>
        <p className={styles.intro}>
          Please read these terms carefully before using BrainFlex. They govern
          your access to and use of the service.
        </p>
      </header>

      <div className={styles.content}>
        <nav className={styles.toc} aria-label='Table of contents'>
          <p className={styles.tocLabel}>On this page</p>
          <ol className={styles.tocList}>
            {SECTIONS.map((s) => (
              <li key={s.id}>
                <a href={`#${s.id}`} className={styles.tocLink}>
                  {s.title}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <article className={styles.body}>
          {SECTIONS.map((s) => (
            <section key={s.id} id={s.id} className={styles.section}>
              <h2 className={styles.sectionTitle}>{s.title}</h2>
              <p className={styles.sectionBody}>{s.body}</p>
            </section>
          ))}
        </article>
      </div>
    </main>
  );
};
export { TermsPage };
