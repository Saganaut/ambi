// Avatar button + account menu for registered users; collapses to a single
// Log in button (opening the shared LoginModal) for everyone else. Guests are
// treated as unauthenticated here for now and will be re-handled later.

import { useCurrentUser } from "@auth/hooks/useCurrentUser";
import { Btn, DropdownMenu } from "@saganaut/ambi-ui";
import { Link } from "@tanstack/react-router";
import { useUserMenu } from "./useUserMenu";

const UserMenu = () => {
  const { handleLogin, handleLogout, avatarContent } = useUserMenu();

  const userState = useCurrentUser();

  if (userState.state !== "registered") {
    return (
      <Btn variant="primary" onClick={handleLogin}>
        Log in
      </Btn>
    );
  }

  const user = userState.me;

  return (
    <DropdownMenu
      trigger={(toggle) => (
        <Btn
          // className={styles.avatarBtn}
          shape="avatar"
          variant="primary"
          size="md"
          aria-label="User menu"
          icon={avatarContent()}
          onClick={toggle}
        />
      )}
      position="top-right"
    >
      <DropdownMenu.Label>{user.displayName}</DropdownMenu.Label>
      <DropdownMenu.Link>
        <Link to="/account">Account</Link>
      </DropdownMenu.Link>
      <DropdownMenu.Item onClick={() => void handleLogout()}>Logout</DropdownMenu.Item>
    </DropdownMenu>
  );
};

export { UserMenu };
