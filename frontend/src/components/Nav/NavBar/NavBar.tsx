import { Link } from "@tanstack/react-router";
import { useCurrentUser } from "../../../hooks/useCurrentUser";
import styles from "./NavBar.module.css";
import { UserMenu } from "./UserMenu";
import { ThemeToggle } from "./ThemeToggle";
import { CephadexLogo } from "@/components/Graphic/CephadexLogo";
import { NotificationBell } from "../NotificationBell/NotificationBell";
import { useFullScreen } from "@/context/useFullScreen";

const NavBar = () => {
  const userState = useCurrentUser();
  const { isFullScreen } = useFullScreen();
  if (userState.state === "loading") {
    return <div style={{ padding: "1rem" }}>Loading auth...</div>;
  }
  return (
    <nav
      aria-label='Primary'
      className={`${styles.navContainer} ${isFullScreen ? styles.isCollapsed : ""}`}
      data-navbar>
      <div className={styles.homeMenuWrapper}>
        <Link to='/' viewTransition aria-label='BrainFlex home'>
          <CephadexLogo />
        </Link>
      </div>
      <div className={styles.userMenuWrapper}>
        <Link to='/design-system' viewTransition>
          Design system
        </Link>
        <Link to='/pricing' viewTransition>
          Pricing
        </Link>
        {userState.state === "registered" && (
          <Link to='/decks' viewTransition>
            My Decks
          </Link>
        )}
        <NotificationBell />
        <ThemeToggle />
        <UserMenu />
      </div>
    </nav>
  );
};

export { NavBar };
