import { createRootRouteWithContext, Outlet } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import { NavBar } from "@components/Nav/NavBar/NavBar";
import { NotFoundPage, ServerErrorPage } from "@pages/ErrorPage/ErrorPage";
import { AuthPromptBridge } from "@components/Modal/LoginModal/AuthPromptBridge";
import { ThemeBridge } from "@components/Theme/ThemeBridge";
import { ErrorBoundary } from "@ui/ErrorBoundary/ErrorBoundary";
import { Layout } from "@components/Layout/Layout";
import { MainHeader } from "@components/Layout/MainHeader";
import { ModalProvider } from "@context/ModalProvider";
import { LayoutProvider } from "@context/LayoutProvider";
import { ToastProvider } from "@context/ToastProvider";
import { CurrentUserState } from "@auth/hooks/useCurrentUser";

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
              <ThemeBridge />
              <AuthPromptBridge />
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
