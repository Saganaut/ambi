// Avatar button + account menu for registered users; collapses to a single
// Log in button (opening the shared LoginModal) for everyone else. Guests are
// treated as unauthenticated here for now and will be re-handled later.
import { IconBtn } from "@/components/Common/Buttons/IconBtn";
import { Btn } from "@/components/Common/Buttons/Btn";
import { Link } from "@tanstack/react-router";
import {
  DropdownMenu,
  DropdownMenuItem,
  DropdownMenuLink,
  DropdownMenuLabel,
} from "@/components/Menus/DropdownMenu";

import styles from "./NavBar.module.css";
import { useUserMenu } from "./useUserMenu";
import { useCurrentUser } from "@/hooks/useCurrentUser";

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

  const user = userState.user;

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
      <DropdownMenuLabel>{user.userName}</DropdownMenuLabel>
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
