// Bell icon in the NavBar — owns the badge, the dropdown, and the STOMP
// subscription that pushes new rows in realtime. Renders nothing for
// non-registered users so the bell can't accumulate state we won't read.
import { useMemo } from "react";

import BellIcon from "@/assets/icons/interface/bell.svg?react";
import { IconBtn } from "@/components/Common/Buttons/IconBtn";
import { DropdownMenu } from "@/components/Menus/DropdownMenu";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useNotificationStream } from "@/hooks/useNotificationStream";
import { useGetUnreadNotificationCountQuery } from "@/store/BrainFlexApi";

import { NotificationDropdown } from "./NotificationDropdown";
import styles from "./NotificationBell.module.css";

/** Show "9+" rather than four-digit counts so the badge stays compact. */
const BADGE_CAP = 9;

const NotificationBell = () => {
  const userState = useCurrentUser();
  const isRegistered = userState.state === "registered";

  // STOMP subscription pushes new rows + bumps the count without polling.
  useNotificationStream(isRegistered);

  // 60s polling is the fallback for when the WS is closed. RTK Query handles
  // visibility-aware pausing for us.
  const { data } = useGetUnreadNotificationCountQuery(undefined, {
    skip: !isRegistered,
    pollingInterval: 60_000,
    refetchOnFocus: true,
    refetchOnReconnect: true,
  });

  const unread = data?.count ?? 0;
  const badge = useMemo(() => {
    if (unread <= 0) return null;
    return unread > BADGE_CAP ? `${BADGE_CAP}+` : String(unread);
  }, [unread]);

  if (!isRegistered) return null;

  return (
    <DropdownMenu
      position='top-right'
      trigger={(toggle) => (
        <div className={styles.wrapper}>
          <IconBtn
            variant='secondary'
            fill='ghost'
            size='md'
            aria-label={
              unread > 0 ? `Notifications (${unread} unread)` : "Notifications"
            }
            icon={<BellIcon className={styles.icon} />}
            onClick={toggle}
          />
          {badge && (
            <span className={styles.badge} aria-hidden='true'>
              {badge}
            </span>
          )}
        </div>
      )}>
      <NotificationDropdown />
    </DropdownMenu>
  );
};

export { NotificationBell };
