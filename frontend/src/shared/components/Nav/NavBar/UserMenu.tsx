// Avatar button + account menu for registered users; collapses to a single
// Log in button (opening the shared LoginModal) for everyone else. Guests are
// treated as unauthenticated here for now and will be re-handled later.

import styles from "./NavBar.module.css";
import { useUserMenu } from "./useUserMenu";
import { Btn } from "@ui/Buttons/Btn";
import {
  DropdownMenu,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuLink,
} from "../../Menus/DropdownMenu";
import { Link } from "@tanstack/react-router";
import { IconBtn } from "@ui/Buttons/IconBtn";
import { useCurrentUser } from "@auth/hooks/useCurrentUser";

const UserMenu = () => {
  const { handleLogin, handleLogout, avatarContent } = useUserMenu();

  const userState = useCurrentUser();

  if (userState.state !== "registered") {
    return (
      <Btn variant='primary' onClick={handleLogin}>
        Log in
      </Btn>
    );
  }

  const user = userState.me;

  return (
    <DropdownMenu
      trigger={(toggle) => (
        <IconBtn
          className={styles.avatarBtn}
          shape='avatar'
          variant='primary'
          size='md'
          aria-label='User menu'
          icon={avatarContent()}
          onClick={toggle}
        />
      )}
      position='top-right'>
      <DropdownMenuLabel>{user.displayName}</DropdownMenuLabel>
      <DropdownMenuLink>
        <Link to='/account'>Account</Link>
      </DropdownMenuLink>
      <DropdownMenuItem onClick={() => void handleLogout()}>
        Logout
      </DropdownMenuItem>
    </DropdownMenu>
  );
};

export { UserMenu };
