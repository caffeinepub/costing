import { Toaster } from "@/components/ui/sonner";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  RouterProvider,
  createRootRoute,
  createRoute,
  createRouter,
  redirect,
} from "@tanstack/react-router";
import Layout from "./components/Layout";
import ActualProductionPage from "./pages/ActualProductionPage";
import CostingCalculatorPage from "./pages/CostingCalculatorPage";
import MastersPage from "./pages/MastersPage";
import ProductionRecordsPage from "./pages/ProductionRecordsPage";
import ValueCostingPage from "./pages/ValueCostingPage";

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000 } },
});

const rootRoute = createRootRoute({
  component: () => (
    <Layout>
      <Toaster richColors position="top-right" />
      <Outlet />
    </Layout>
  ),
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  beforeLoad: () => {
    throw redirect({ to: "/calculator" });
  },
});

const calculatorRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/calculator",
  component: CostingCalculatorPage,
});

const recordsRedirectRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/records",
  beforeLoad: () => {
    throw redirect({ to: "/calculator" });
  },
});

const mastersRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/masters",
  component: MastersPage,
});

const productionRecordsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/production-records",
  component: ProductionRecordsPage,
});

const valueCostingRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/value-costing",
  component: ValueCostingPage,
});

const actualProductionRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/actual-production",
  component: ActualProductionPage,
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  calculatorRoute,
  recordsRedirectRoute,
  mastersRoute,
  productionRecordsRoute,
  valueCostingRoute,
  actualProductionRoute,
]);

const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  );
}
