// Common components tab: shared primitives that appear across the app —
// cards, modals, toasts, buttons, icons, dropdowns, plus the "new primitives"
// (divider/tag/avatar/empty-state/progress/skeleton/tooltip/tabs/confirm/tile)
// and the pricing components. Owns all the local demo state since every piece
// is interactive.
import { useState } from "react";
import {
  BellIcon,
  StarIcon,
  TrashIcon,
  PencilSquareIcon,
  UserIcon,
  Cog6ToothIcon,
  MagnifyingGlassIcon,
  HeartIcon,
  EllipsisVerticalIcon,
  PencilIcon,
  ArrowRightStartOnRectangleIcon,
  InboxIcon,
  PhotoIcon,
  PuzzlePieceIcon,
  RocketLaunchIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import styles from "./DesignSystem.module.css";
import { Accordion } from "@components/Containers/Accordion";
import { Btn } from "@ui/Buttons/Btn";
import { IconBtn } from "@ui/Buttons/IconBtn";
import { CollapseBtn } from "@ui/Buttons/CollapseBtn";
import { Divider } from "@ui/Divider/Divider";
import { Tag } from "@ui/Tag/Tag";
import { Avatar } from "@ui/Avatar/Avatar";
import { EmptyState } from "@ui/EmptyState/EmptyState";
import { ProgressBar } from "@ui/ProgressBar/ProgressBar";
import { CountdownTimer } from "@liveSession/components/CountdownTimer/CountdownTimer";
import { Skeleton } from "@ui/Skeleton/Skeleton";
import { Tooltip } from "@ui/Tooltip/Tooltip";
import { Tabs } from "@ui/Tabs/Tabs";
import { Alert } from "@ui/Alert/Alert";
import { Pagination } from "@ui/Pagination/Pagination";
import { useConfirm } from "@components/ConfirmDialog/useConfirm";
import { SelectableTile } from "@ui/SelectableTile/SelectableTile";
import { Card } from "@ui/Cards/Card";
import { ActionCard } from "@ui/Cards/ActionCard";
import { Badge } from "@ui/Badge/Badge";
import { Toast } from "@ui/Toast/Toast";
import { useModal } from "@hooks/useModal";
import { Loader } from "@ui/Loader/Loader";
import {
  DropdownMenu,
  DropdownMenuItem,
  DropdownMenuDivider,
  DropdownMenuLabel,
} from "@components/Menus/DropdownMenu";
import { CephadexLogo } from "@components/Graphic/CephadexLogo";
import { PricingCard } from "@pages/PricingPage/components/PricingCard/PricingCard";
import { PricingGrid } from "@pages/PricingPage/components/PricingGrid/PricingGrid";
import { BillingToggle } from "@pages/PricingPage/components/BillingToggle/BillingToggle";
import type { BillingCycle } from "@pages/PricingPage/components/BillingToggle/BillingToggle";
import { FeatureList } from "@pages/PricingPage/components/FeatureList/FeatureList";
import { PRICING_TIERS } from "../PricingPage/data";
import { slideTypeGraphics } from "@deck/components/Slides/SlideTypeGraphics/slideTypeGraphics";
import { SlideContentWrapper } from "@deck/components/DeckEditor/SlideContent/SlideContentWrapper";
import {
  NotFoundPage,
  ServerErrorPage,
  ServiceUnavailablePage,
} from "../ErrorPage/ErrorPage";

const CommonTab = () => {
  const { openModal } = useModal();
  const confirm = useConfirm();
  const [demoCollapsed, setDemoCollapsed] = useState(false);
  const [billingCycle, setBillingCycle] = useState<BillingCycle>("monthly");
  const [tabsDemoActive, setTabsDemoActive] = useState("overview");
  const [progressValue, setProgressValue] = useState(40);
  const [countdownRunId, setCountdownRunId] = useState(0);
  const [countdownDuration, setCountdownDuration] = useState(10);
  const [confirmResult, setConfirmResult] = useState<string | null>(null);
  const [tileChoice, setTileChoice] = useState<string | null>("alpha");
  const [demoPage, setDemoPage] = useState(2);
  const [demoCompactPage, setDemoCompactPage] = useState(0);
  const [dismissedAlert, setDismissedAlert] = useState(false);

  const openDesignModal = () => {
    openModal({
      title: "Design Modal",
      content: <div>This is the content, it can be any React Node</div>,
    });
  };

  return (
    <>
      <section>
        <div className={styles.sectionTitle}>Common components</div>
        <div className={styles.examplesContainer}>
          <Accordion titleBar='Cards'>
            <div className={styles.cardComponentContainer}>
              <Card
                header={<h5>Header</h5>}
                body={
                  <p>
                    Chuck Norris’ tears cure cancer. Too bad he has never cried.
                    Chuck Norris can have both feet on the ground and kick butt
                    at the same time.
                  </p>
                }
                footer={<span>Footer</span>}
                onClick={() => {
                  console.log("this is a footer");
                }}
              />
              <Card
                header={<h5>Header</h5>}
                body={
                  <div>
                    <img src='https://picsum.photos/200/200' alt='' />
                    <p>
                      Chuck Norris’ tears cure cancer. Too bad he has never
                      cried. Chuck Norris can have both feet on the ground and
                      kick butt at the same time.
                    </p>
                  </div>
                }
                footer={<span>Footer</span>}
                onClick={() => {
                  console.log("this is a footer");
                }}
              />
              <Card
                header={<h5>Header</h5>}
                body={
                  <div>
                    <img src='https://picsum.photos/200/200' alt='' />
                  </div>
                }
                footer={<span>Footer</span>}
                onClick={() => {
                  console.log("this is a footer");
                }}
              />
            </div>
          </Accordion>
          <Accordion titleBar='Action Cards'>
            <div className={styles.cardComponentContainer}>
              <ActionCard
                onClick={() => {
                  console.log("clicked template");
                }}
                icon='*'
                title='Template'
                description='One click to start. Pre-built question decks ready to play.'
              />
              <ActionCard
                onClick={() => {
                  console.log("clicked custom");
                }}
                icon='#'
                title='Custom'
                description='Use a deck you built yourself. Full control over settings.'
                selected
              />
              <ActionCard
                onClick={() => {
                  console.log("clicked auto");
                }}
                icon='~'
                title='Auto-Generate'
                description='Type a topic or upload a document. We make the questions.'
                badge='Soon'
                disabled
              />
            </div>
          </Accordion>
          <Accordion titleBar='Modal'>
            <div className={styles.buttonGroup}>
              <Btn onClick={openDesignModal} size={"sm"} shape={"pill"}>
                Open Modal
              </Btn>
            </div>
          </Accordion>
          <Accordion titleBar='Toasts'>
            <div className={styles.toastGroup}>
              <Toast
                id={"0"}
                onDismiss={() => {
                  console.log("dismissed");
                }}
                duration={10}
                variant={"error"}
                message={"error"}
              />
              <Toast
                id={"0"}
                onDismiss={() => {
                  console.log("dismissed");
                }}
                duration={10}
                variant={"success"}
                message={"success"}
              />
              <Toast
                id={"0"}
                onDismiss={() => {
                  console.log("dismissed");
                }}
                duration={10}
                variant={"warning"}
                message={"warning"}
              />
              <Toast
                id={"0"}
                onDismiss={() => {
                  console.log("dismissed");
                }}
                duration={10}
                variant={"info"}
                message={"info"}
              />
            </div>
          </Accordion>
          <Accordion titleBar='Badges'>
            <div className={styles.badgeGroup}>
              <Badge label={"Error"} variant={"error"} />
              <Badge label={"Success"} variant={"success"} />
              <Badge label={"Warning"} variant={"warning"} />
              <Badge label={"Info"} variant={"info"} />
            </div>
            <div className={styles.badgeGroup}>
              <Badge label={"Info Lg"} size={"lg"} variant={"info"} />
            </div>
          </Accordion>
          <Accordion titleBar='Buttons'>
            <div className={styles.buttonGroup}>
              <Btn>Primary</Btn>
              <Btn variant='secondary'>Secondary</Btn>
              <Btn variant='brand'>Brand</Btn>
              <Btn variant='info'>Info</Btn>
              <Btn variant='error'>Error</Btn>
              <Btn variant='success'>Success</Btn>
              <Btn variant='warning'>Warning</Btn>
              <Btn variant='disabled'>Disabled (variant)</Btn>
              <Btn disabled>Disabled (state)</Btn>
            </div>
            <div className={styles.buttonGroup}>
              <Btn fill='default'>Default fill</Btn>
              <Btn fill='bordered'>Bordered fill</Btn>
              <Btn fill='ghost'>Ghost fill</Btn>
              <Btn variant='error' fill='bordered'>
                error + bordered
              </Btn>
              <Btn variant='error' fill='ghost'>
                error + ghost
              </Btn>
              <Btn variant='brand' fill='ghost'>
                brand + ghost
              </Btn>
            </div>
            <div className={styles.buttonGroup}>
              <Btn size='sm'>Primary sm</Btn>
              <Btn size='md'>Primary md</Btn>
              <Btn size='lg'>Primary lg</Btn>
            </div>
            <div className={styles.buttonGroup}>
              <Btn shape='pill' size='sm'>
                Pill sm
              </Btn>
              <Btn shape='pill'>Pill md</Btn>
              <Btn shape='pill' size='lg'>
                Pill lg
              </Btn>
            </div>
          </Accordion>
          <Accordion titleBar='Loader'>
            <div className={styles.buttonGroup}>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: "var(--space-2)",
                  minWidth: "160px",
                }}>
                <Loader />
                <span
                  style={{
                    fontSize: "var(--font-size-sm)",
                    color: "var(--text-secondary)",
                  }}>
                  Default
                </span>
              </div>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: "var(--space-2)",
                  minWidth: "160px",
                }}>
                <Loader message='Summoning ents…' />
                <span
                  style={{
                    fontSize: "var(--font-size-sm)",
                    color: "var(--text-secondary)",
                  }}>
                  Custom message
                </span>
              </div>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: "var(--space-2)",
                  minWidth: "160px",
                }}>
                <Loader withMessage={false} />
                <span
                  style={{
                    fontSize: "var(--font-size-sm)",
                    color: "var(--text-secondary)",
                  }}>
                  Spinner only
                </span>
              </div>
            </div>
          </Accordion>
          <Accordion titleBar='Error pages'>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "var(--space-6)",
              }}>
              <div
                style={{
                  height: "600px",
                  overflow: "auto",
                  border: "2px solid var(--edge-canvas)",
                  borderRadius: "var(--radius-md)",
                }}>
                <NotFoundPage />
              </div>
              <div
                style={{
                  height: "600px",
                  overflow: "auto",
                  border: "2px solid var(--edge-canvas)",
                  borderRadius: "var(--radius-md)",
                }}>
                <ServerErrorPage />
              </div>
              <div
                style={{
                  height: "600px",
                  overflow: "auto",
                  border: "2px solid var(--edge-canvas)",
                  borderRadius: "var(--radius-md)",
                }}>
                <ServiceUnavailablePage />
              </div>
            </div>
          </Accordion>
          <Accordion titleBar='Slide editor shell'>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "var(--space-4)",
                maxWidth: "640px",
              }}>
              <div
                style={{
                  height: "320px",
                  border: "2px solid var(--edge-canvas)",
                  borderRadius: "var(--radius-md)",
                  overflow: "hidden",
                  background: "var(--bg-canvas)",
                }}>
                <SlideContentWrapper
                  title='Slide editor shell'
                  description='Shared layout for every kind-specific editor: header, scrollable body, footer slot.'
                  footer={
                    <p>
                      EditorWarning lives in the footer slot for inline,
                      non-blocking author guidance.
                    </p>
                  }>
                  <p style={{ margin: 0, color: "var(--text-secondary)" }}>
                    Body content goes here. The body scrolls independently of
                    the header and footer.
                  </p>
                  <p style={{ margin: 0, color: "var(--text-secondary)" }}>
                    Use this shell from every editor in
                    <code> DeckEditor/SlideContentTypes/</code>.
                  </p>
                </SlideContentWrapper>
              </div>
            </div>
          </Accordion>
          <Accordion titleBar='Slide type graphics'>
            <div className={styles.buttonGroup}>
              {Object.entries(slideTypeGraphics).map(([kind, Graphic]) => (
                <div
                  key={kind}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: "var(--space-2)",
                    minWidth: "96px",
                  }}>
                  <Graphic />
                  <span
                    style={{
                      fontSize: "var(--font-size-sm)",
                      color: "var(--text-secondary)",
                    }}>
                    {kind}
                  </span>
                </div>
              ))}
            </div>
          </Accordion>
          <Accordion titleBar='Icon Buttons'>
            <div className={styles.iconBtnSection}>
              <div className={styles.iconBtnRow}>
                <span className={styles.iconBtnRowLabel}>Fill</span>
                <div className={styles.iconBtnGroup}>
                  <IconBtn fill='default' icon={<BellIcon />} />
                  <IconBtn fill='bordered' icon={<BellIcon />} />
                  <IconBtn fill='ghost' icon={<BellIcon />} />
                  <IconBtn fill='ghost' icon={<XMarkIcon />} />
                </div>
              </div>
              <div className={styles.iconBtnRow}>
                <span className={styles.iconBtnRowLabel}>Shape</span>
                <div className={styles.iconBtnGroup}>
                  <IconBtn icon={<Cog6ToothIcon />} shape='default' />
                  <IconBtn icon={<Cog6ToothIcon />} shape='round' />
                  <IconBtn shape='avatar' icon={<UserIcon />} />
                </div>
              </div>
              <div className={styles.iconBtnRow}>
                <span className={styles.iconBtnRowLabel}>Size</span>
                <div className={styles.iconBtnGroup}>
                  <IconBtn icon={<StarIcon />} size='xs' />
                  <IconBtn icon={<StarIcon />} size='sm' />
                  <IconBtn icon={<StarIcon />} size='md' />
                  <IconBtn icon={<StarIcon />} size='lg' />
                </div>
              </div>
              <div className={styles.iconBtnRow}>
                <span className={styles.iconBtnRowLabel}>Semantic</span>
                <div className={styles.iconBtnGroup}>
                  <IconBtn variant='error' icon={<TrashIcon />} />
                  <IconBtn variant='success' icon={<HeartIcon />} />
                  <IconBtn variant='warning' icon={<MagnifyingGlassIcon />} />
                  <IconBtn variant='info' icon={<PencilSquareIcon />} />
                  <IconBtn variant='brand' icon={<StarIcon />} />
                </div>
              </div>
              <div className={styles.iconBtnRow}>
                <span className={styles.iconBtnRowLabel}>Disabled</span>
                <div className={styles.iconBtnGroup}>
                  <IconBtn fill='ghost' icon={<BellIcon />} disabled />
                  <IconBtn icon={<TrashIcon />} disabled />
                  <IconBtn fill='ghost' icon={<XMarkIcon />} disabled />
                </div>
              </div>
            </div>
          </Accordion>
          <Accordion titleBar='Collapse Button'>
            <div className={styles.iconBtnSection}>
              <div className={styles.iconBtnRow}>
                <span className={styles.iconBtnRowLabel}>State</span>
                <div className={styles.iconBtnGroup}>
                  <CollapseBtn
                    isCollapsed={demoCollapsed}
                    collapse={setDemoCollapsed}
                  />
                  <span
                    style={{
                      fontSize: "var(--font-size-sm)",
                      color: "var(--text-secondary)",
                    }}>
                    {demoCollapsed ? "Collapsed" : "Expanded"} — click to toggle
                  </span>
                </div>
              </div>
            </div>
          </Accordion>
          <Accordion titleBar='Dropdown Menu'>
            <div className={styles.buttonGroup}>
              <DropdownMenu
                position='bottom-left'
                trigger={(toggle) => (
                  <IconBtn
                    fill='ghost'
                    icon={<EllipsisVerticalIcon />}
                    onClick={toggle}
                    aria-label='Open menu'
                  />
                )}>
                <DropdownMenuLabel>Account</DropdownMenuLabel>
                <DropdownMenuItem
                  onClick={() => {
                    console.log("view profile");
                  }}>
                  <UserIcon width={16} height={16} /> View profile
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    console.log("edit");
                  }}>
                  <PencilIcon width={16} height={16} /> Edit settings
                </DropdownMenuItem>
                <DropdownMenuDivider />
                <DropdownMenuItem
                  onClick={() => {
                    console.log("delete");
                  }}>
                  <TrashIcon width={16} height={16} /> Delete account
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    console.log("logout");
                  }}>
                  <ArrowRightStartOnRectangleIcon width={16} height={16} /> Log
                  out
                </DropdownMenuItem>
              </DropdownMenu>
              <DropdownMenu
                position='bottom-right'
                trigger={(toggle) => (
                  <Btn onClick={toggle} size='sm'>
                    Open menu ▾
                  </Btn>
                )}>
                <DropdownMenuItem centered>One</DropdownMenuItem>
                <DropdownMenuItem centered>Two</DropdownMenuItem>
                <DropdownMenuItem centered>Three</DropdownMenuItem>
              </DropdownMenu>
            </div>
          </Accordion>
          <Accordion titleBar='Cephadex Logo'>
            <div className={styles.buttonGroup}>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: "var(--space-2)",
                }}>
                <CephadexLogo size='sm' />
                <span
                  style={{
                    fontSize: "var(--font-size-sm)",
                    color: "var(--text-secondary)",
                  }}>
                  sm
                </span>
              </div>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: "var(--space-2)",
                }}>
                <CephadexLogo size='md' />
                <span
                  style={{
                    fontSize: "var(--font-size-sm)",
                    color: "var(--text-secondary)",
                  }}>
                  md
                </span>
              </div>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: "var(--space-2)",
                }}>
                <CephadexLogo size='lg' />
                <span
                  style={{
                    fontSize: "var(--font-size-sm)",
                    color: "var(--text-secondary)",
                  }}>
                  lg
                </span>
              </div>
            </div>
          </Accordion>
        </div>
      </section>

      <section>
        <div className={styles.sectionTitle}>New primitives</div>
        <div className={styles.examplesContainer}>
          <Accordion titleBar='Divider'>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "var(--space-3)",
                maxWidth: "480px",
              }}>
              <span style={{ color: "var(--text-secondary)" }}>Above</span>
              <Divider />
              <span style={{ color: "var(--text-secondary)" }}>Below</span>
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "var(--space-3)",
                marginTop: "var(--space-4)",
                height: "40px",
              }}>
              <span style={{ color: "var(--text-secondary)" }}>Left</span>
              <Divider orientation='vertical' />
              <span style={{ color: "var(--text-secondary)" }}>Right</span>
            </div>
          </Accordion>
          <Accordion titleBar='Tag'>
            <div className={styles.buttonGroup}>
              <Tag>Geography</Tag>
              <Tag>Trivia</Tag>
              <Tag size='sm'>sm</Tag>
              <Tag size='md'>md</Tag>
              <Tag
                onRemove={() => {
                  console.log("removed");
                }}>
                Removable
              </Tag>
            </div>
          </Accordion>
          <Accordion titleBar='Avatar'>
            <div className={styles.buttonGroup}>
              <Avatar size='xs' name='Frodo Baggins' />
              <Avatar size='sm' name='Samwise Gamgee' />
              <Avatar size='md' name='Aragorn' />
              <Avatar size='lg' name='Legolas' />
              <Avatar size='xl' name='Gimli' />
              <Avatar size='lg' src='https://i.pravatar.cc/96?img=12' />
              <Avatar size='lg' />
            </div>
          </Accordion>
          <Accordion titleBar='Empty state'>
            <div
              style={{
                display: "flex",
                gap: "var(--space-4)",
                flexWrap: "wrap",
              }}>
              <div
                style={{
                  flex: "1 1 280px",
                  border: "2px solid var(--edge-canvas)",
                  borderRadius: "var(--radius-md)",
                }}>
                <EmptyState
                  icon={<InboxIcon />}
                  title='No decks yet'
                  message='Create your first content deck to get started.'
                  action={<Btn size='sm'>+ New deck</Btn>}
                />
              </div>
              <div
                style={{
                  flex: "1 1 280px",
                  border: "2px solid var(--edge-canvas)",
                  borderRadius: "var(--radius-md)",
                }}>
                <EmptyState
                  size='sm'
                  icon={<RocketLaunchIcon />}
                  title='Nothing here'
                />
              </div>
            </div>
          </Accordion>
          <Accordion titleBar='Progress bar'>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "var(--space-4)",
                maxWidth: "480px",
              }}>
              <ProgressBar value={progressValue} showLabel label='Loading' />
              <ProgressBar value={progressValue} variant='brand' size='sm' />
              <ProgressBar value={progressValue} variant='success' size='lg' />
              <ProgressBar value={70} variant='warning' />
              <ProgressBar value={90} variant='error' />
              <ProgressBar value={0} indeterminate />
              <div style={{ display: "flex", gap: "var(--space-2)" }}>
                <Btn
                  size='sm'
                  onClick={() => {
                    setProgressValue((v) => Math.max(0, v - 10));
                  }}>
                  −10
                </Btn>
                <Btn
                  size='sm'
                  onClick={() => {
                    setProgressValue((v) => Math.min(100, v + 10));
                  }}>
                  +10
                </Btn>
              </div>
            </div>
          </Accordion>
          <Accordion titleBar='Countdown timer'>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "var(--space-4)",
                alignItems: "flex-start",
              }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "var(--space-6)",
                }}>
                <CountdownTimer
                  key={`a-${countdownRunId.toString()}`}
                  duration={countdownDuration}
                  size='lg'
                />
                <CountdownTimer
                  key={`b-${countdownRunId.toString()}`}
                  duration={countdownDuration}
                  size='md'
                  urgentThreshold={3}
                />
                <CountdownTimer
                  key={`c-${countdownRunId.toString()}`}
                  duration={countdownDuration}
                  size='sm'
                  urgentThreshold={2}
                />
              </div>
              <div
                style={{
                  display: "flex",
                  gap: "var(--space-2)",
                  alignItems: "center",
                }}>
                <Btn
                  size='sm'
                  onClick={() => {
                    setCountdownRunId((id) => id + 1);
                  }}>
                  Restart
                </Btn>
                <Btn
                  size='sm'
                  onClick={() => {
                    setCountdownDuration((d) => Math.max(3, d - 5));
                    setCountdownRunId((id) => id + 1);
                  }}>
                  −5s
                </Btn>
                <Btn
                  size='sm'
                  onClick={() => {
                    setCountdownDuration((d) => d + 5);
                    setCountdownRunId((id) => id + 1);
                  }}>
                  +5s
                </Btn>
                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    color: "var(--text-secondary)",
                  }}>
                  {countdownDuration}s
                </span>
              </div>
            </div>
          </Accordion>
          <Accordion titleBar='Skeleton'>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "var(--space-3)",
                maxWidth: "320px",
              }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "var(--space-3)",
                }}>
                <Skeleton variant='circle' />
                <Skeleton variant='text' count={2} />
              </div>
              <Skeleton variant='rect' height={120} />
              <Skeleton variant='text' count={3} />
            </div>
          </Accordion>
          <Accordion titleBar='Tooltip'>
            <div className={styles.buttonGroup}>
              <Tooltip label='Tooltip above'>
                <Btn size='sm'>Hover me (top)</Btn>
              </Tooltip>
              <Tooltip label='Tooltip below' position='bottom'>
                <Btn size='sm'>Hover me (bottom)</Btn>
              </Tooltip>
              <Tooltip label='Tooltip right' position='right'>
                <Btn size='sm'>Hover me (right)</Btn>
              </Tooltip>
              <Tooltip label='Delete forever'>
                <IconBtn
                  fill='ghost'
                  icon={<TrashIcon />}
                  aria-label='Delete'
                />
              </Tooltip>
            </div>
          </Accordion>
          <Accordion titleBar='Tabs'>
            <Tabs
              ariaLabel='Design-system demo'
              value={tabsDemoActive}
              onChange={setTabsDemoActive}
              items={[
                {
                  id: "overview",
                  label: "Overview",
                  panel: (
                    <p style={{ color: "var(--text-secondary)" }}>
                      The overview tab. Use ← / → on the tab strip to move focus
                      + selection.
                    </p>
                  ),
                },
                {
                  id: "details",
                  label: "Details",
                  panel: (
                    <p style={{ color: "var(--text-secondary)" }}>
                      Detail body. Each panel is mounted but only the active one
                      is visible, so internal state survives a switch.
                    </p>
                  ),
                },
                {
                  id: "history",
                  label: "History",
                  panel: (
                    <p style={{ color: "var(--text-secondary)" }}>
                      A history panel.
                    </p>
                  ),
                },
                {
                  id: "disabled",
                  label: "Disabled",
                  panel: null,
                  disabled: true,
                },
              ]}
            />
            <div style={{ marginTop: "var(--space-6)" }}>
              <span
                style={{
                  fontSize: "var(--font-size-sm)",
                  color: "var(--text-secondary)",
                }}>
                Pill variant:
              </span>
              <div style={{ marginTop: "var(--space-2)" }}>
                <Tabs
                  variant='pill'
                  ariaLabel='Pill variant'
                  value={tabsDemoActive}
                  onChange={setTabsDemoActive}
                  items={[
                    {
                      id: "overview",
                      label: "Overview",
                      panel: <span />,
                    },
                    { id: "details", label: "Details", panel: <span /> },
                    { id: "history", label: "History", panel: <span /> },
                  ]}
                />
              </div>
            </div>
          </Accordion>
          <Accordion titleBar='Confirm dialog'>
            <div className={styles.buttonGroup}>
              <Btn
                onClick={() => {
                  void confirm({
                    title: "Save changes?",
                    message: "Your edits will be saved to the deck.",
                    confirmLabel: "Save",
                  }).then((ok) => {
                    setConfirmResult(ok ? "Confirmed (save)" : "Cancelled");
                  });
                }}>
                Open default
              </Btn>
              <Btn
                variant='error'
                onClick={() => {
                  void confirm({
                    title: "Delete this deck?",
                    message:
                      "This will permanently remove the deck and its questions.",
                    confirmLabel: "Delete",
                    cancelLabel: "Keep it",
                    variant: "danger",
                  }).then((ok) => {
                    setConfirmResult(ok ? "Confirmed (delete)" : "Cancelled");
                  });
                }}>
                Open danger
              </Btn>
              {confirmResult && (
                <span
                  style={{
                    fontSize: "var(--font-size-sm)",
                    color: "var(--text-secondary)",
                  }}>
                  Last result: {confirmResult}
                </span>
              )}
            </div>
          </Accordion>
          <Accordion titleBar='Alert'>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "var(--space-3)",
                maxWidth: "560px",
              }}>
              <Alert severity='info' title='Heads up'>
                Inline feedback that sits next to a field — info severity.
              </Alert>
              <Alert severity='success' title='Saved'>
                Your changes were saved to the deck.
              </Alert>
              <Alert severity='warning' title='Heads up'>
                Two players left the room. The game can keep going with the
                remaining six.
              </Alert>
              <Alert severity='error' title='Image too large'>
                The background image exceeds 5 MB. Pick something smaller.
              </Alert>
              <Alert severity='info' compact>
                Compact variant — single-line, tighter padding.
              </Alert>
              {!dismissedAlert && (
                <Alert
                  severity='warning'
                  title='Dismissable'
                  onDismiss={() => {
                    setDismissedAlert(true);
                  }}>
                  This one has a dismiss button. Close it to confirm the
                  callback fires.
                </Alert>
              )}
              {dismissedAlert && (
                <Btn
                  size='sm'
                  variant='secondary'
                  onClick={() => {
                    setDismissedAlert(false);
                  }}>
                  Reset dismissable Alert
                </Btn>
              )}
            </div>
          </Accordion>
          <Accordion titleBar='Pagination'>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "var(--space-4)",
                maxWidth: "560px",
              }}>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "var(--space-2)",
                }}>
                <span
                  style={{
                    fontSize: "var(--font-size-sm)",
                    color: "var(--text-secondary)",
                  }}>
                  Default — page numbers with boundary + ellipsis collapse
                </span>
                <Pagination
                  page={demoPage}
                  pageCount={12}
                  onPageChange={setDemoPage}
                />
              </div>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "var(--space-2)",
                }}>
                <span
                  style={{
                    fontSize: "var(--font-size-sm)",
                    color: "var(--text-secondary)",
                  }}>
                  Compact — prev/next plus Page N of M (no page numbers)
                </span>
                <Pagination
                  page={demoCompactPage}
                  pageCount={5}
                  onPageChange={setDemoCompactPage}
                  compact
                />
              </div>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "var(--space-2)",
                }}>
                <span
                  style={{
                    fontSize: "var(--font-size-sm)",
                    color: "var(--text-secondary)",
                  }}>
                  Unknown total — caller passes hasMore instead of pageCount
                </span>
                <Pagination
                  page={demoCompactPage}
                  hasMore
                  onPageChange={setDemoCompactPage}
                />
              </div>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "var(--space-2)",
                }}>
                <span
                  style={{
                    fontSize: "var(--font-size-sm)",
                    color: "var(--text-secondary)",
                  }}>
                  Disabled — controls inert while a request is in flight
                </span>
                <Pagination
                  page={demoPage}
                  pageCount={12}
                  onPageChange={setDemoPage}
                  disabled
                />
              </div>
            </div>
          </Accordion>
          <Accordion titleBar='Selectable tile'>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
                gap: "var(--space-3)",
                maxWidth: "720px",
              }}>
              <SelectableTile
                media={<PuzzlePieceIcon />}
                title='Alpha'
                meta='12 elements'
                description='A tile with media, title, meta, and description.'
                selected={tileChoice === "alpha"}
                onClick={() => {
                  setTileChoice("alpha");
                }}
              />
              <SelectableTile
                media={<PhotoIcon />}
                title='Beta'
                meta='8 elements · Geography'
                description='Another tile in the same grid.'
                selected={tileChoice === "beta"}
                onClick={() => {
                  setTileChoice("beta");
                }}
              />
              <SelectableTile
                media={<RocketLaunchIcon />}
                title='Gamma'
                badge='New'
                meta='3 elements'
                selected={tileChoice === "gamma"}
                onClick={() => {
                  setTileChoice("gamma");
                }}
              />
              <SelectableTile
                media={<InboxIcon />}
                title='Disabled'
                meta='—'
                disabled
                onClick={() => {
                  /* no-op */
                }}
              />
            </div>
          </Accordion>
        </div>
      </section>

      <section>
        <div className={styles.sectionTitle}>Pricing components</div>
        <div className={styles.examplesContainer}>
          <Accordion titleBar='Billing toggle'>
            <div className={styles.buttonGroup}>
              <BillingToggle
                value={billingCycle}
                onChange={setBillingCycle}
                options={[
                  { value: "monthly", label: "Monthly" },
                  {
                    value: "annual",
                    label: "Annual",
                    savingsLabel: "Save 20%",
                  },
                ]}
              />
            </div>
          </Accordion>
          <Accordion titleBar='Feature list'>
            <div
              style={{
                maxWidth: "320px",
                padding: "var(--space-4)",
                border: "2px solid var(--edge-canvas)",
                borderRadius: "var(--radius-md)",
              }}>
              <FeatureList
                items={[
                  { label: "Unlimited public games" },
                  { label: "Stats and streaks" },
                  { label: "Custom decks" },
                  { label: "Private matches", included: false },
                  { label: "Org-wide branding", included: false },
                ]}
              />
            </div>
          </Accordion>
          <Accordion titleBar='Pricing grid'>
            <PricingGrid columns={3}>
              {PRICING_TIERS.map((tier) => {
                const cycle = tier.prices[billingCycle];
                return (
                  <PricingCard
                    key={tier.key}
                    name={tier.name}
                    tagline={tier.tagline}
                    price={cycle.amount}
                    priceUnit={cycle.unit}
                    features={tier.features}
                    ctaLabel={tier.ctaLabel}
                    ctaTo={tier.ctaTo}
                    featured={tier.featured}
                    badge={tier.badge}
                    footnote={tier.footnote}
                  />
                );
              })}
            </PricingGrid>
          </Accordion>
        </div>
      </section>
    </>
  );
};

export { CommonTab };
