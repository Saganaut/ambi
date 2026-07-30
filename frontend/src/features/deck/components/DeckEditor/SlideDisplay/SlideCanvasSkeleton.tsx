import styles from "./SlideDisplay.module.css";

const SlideCanvasSkeleton = () => {
  return (
    <div className={styles.slideDisplay}>
      <div className={styles.slideHeader}>
        <div className={styles.skeletonLogo}></div>
        <div className={styles.skeletonSlideType}></div>
      </div>
      <div className={styles.slideBody}>
        <div className={styles.slideChild}>
          <div className={styles.skeletonContent}>Your slides will appear here.</div>
        </div>
      </div>
      <div className={styles.slideFooter}>
        <div className={styles.skeletonFooter}></div>
      </div>
    </div>
  );
};

export { SlideCanvasSkeleton };
