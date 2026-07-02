import { CurrentUserState } from "@auth/hooks/useCurrentUser";
import { Layout } from "@components/Layout/Layout";
import { AuthPromptBridge } from "@components/Modal/LoginModal/AuthPromptBridge";
import { NavBar } from "@components/Nav/NavBar/NavBar";
import { ThemeBridge } from "@components/Theme/ThemeBridge";
import { LayoutProvider } from "@context/LayoutProvider";
import { ModalProvider } from "@context/ModalProvider";
import { ToastProvider } from "@context/ToastProvider";
import { NotFoundPage, ServerErrorPage } from "@pages/ErrorPage/ErrorPage";
import { createRootRouteWithContext, Outlet } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import { ErrorBoundary } from "@ui/ErrorBoundary/ErrorBoundary";

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
              <Layout.Header children={<NavBar />} />

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
