import { createRootRouteWithContext, Outlet } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import { NavBar } from "../components/Nav/NavBar/NavBar";
import { NotFoundPage, ServerErrorPage } from "../pages/ErrorPage/ErrorPage";
import { AuthPromptBridge } from "../components/Common/LoginModal/AuthPromptBridge";
import { ErrorBoundary } from "../components/Common/ErrorBoundary/ErrorBoundary";
import { Layout } from "@/components/Layout/Layout";
import { MainHeader } from "@/components/Layout/MainHeader";
import type { CurrentUserState } from "@/hooks/useCurrentUser";
import { ModalProvider } from "@/context/ModalProvider";
import { LayoutProvider } from "@/context/LayoutProvider";
import { ToastProvider } from "@/context/ToastProvider";

export interface RouterContext {
  auth: CurrentUserState;
}

export const Route = createRootRouteWithContext<RouterContext>()({
  component: () => (
    <ErrorBoundary>
      <LayoutProvider>
        <ToastProvider>
          <ModalProvider>
            <Layout>
              <AuthPromptBridge />
              {/* <ActiveThemeBridge /> */}
              <MainHeader children={<NavBar />} />

              <Outlet />
            </Layout>
            <TanStackRouterDevtools />
          </ModalProvider>
        </ToastProvider>
      </LayoutProvider>
    </ErrorBoundary>
  ),
  notFoundComponent: NotFoundPage,
  // Loader / route-resolution errors render the same fallback as the render-time
  // ErrorBoundary above, so both failure modes look identical to the user.
  errorComponent: ServerErrorPage,
});
