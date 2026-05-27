import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";

import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: any; reset: () => void }) {
  console.error("Route Error:", error);
  const router = useRouter();
  
  // Extract error details
  const errorMessage = error?.message || (typeof error === 'string' ? error : 'Erro desconhecido');
  const errorStack = error?.stack || 'Sem stack trace disponível';

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4 dark:bg-slate-950">
      <div className="w-full max-w-lg rounded-2xl bg-white p-8 shadow-2xl dark:bg-slate-900">
        <div className="mb-6 flex justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400">
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          </div>
        </div>
        
        <h1 className="text-center text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
          Ops! Algo deu errado
        </h1>
        <p className="mt-2 text-center text-slate-500 dark:text-slate-400">
          Não conseguimos carregar esta página. Tente atualizar ou entre em contato com o suporte se o erro persistir.
        </p>

        <div className="mt-8 space-y-4">
          <div className="rounded-lg bg-slate-50 p-4 font-mono text-xs dark:bg-slate-950">
            <p className="font-bold text-rose-600 dark:text-rose-400">Erro: {errorMessage}</p>
            <details className="mt-2 cursor-pointer text-slate-400">
              <summary className="hover:text-slate-600">Ver detalhes técnicos</summary>
              <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap break-all text-[10px]">
                {errorStack}
              </pre>
            </details>
          </div>

          <div className="flex flex-wrap justify-center gap-3 pt-2">
            <button
              onClick={() => {
                router.invalidate();
                reset();
              }}
              className="inline-flex items-center justify-center rounded-lg bg-fuchsia-600 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-fuchsia-200 transition-all hover:bg-fuchsia-700 hover:shadow-fuchsia-300 dark:shadow-none"
            >
              Tentar novamente
            </button>
            <a
              href="/"
              className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-6 py-2.5 text-sm font-semibold text-slate-700 transition-all hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Voltar ao início
            </a>
          </div>
        </div>
      </div>
      
      <p className="mt-8 text-xs text-slate-400">
        Maleta de Métricas &copy; {new Date().getFullYear()}
      </p>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Maleta de Métricas" },
      { name: "description", content: "Dashboard exclusivo de métricas e performance de tráfego pago." },
      { name: "author", content: "Maleta de Métricas" },
      { property: "og:title", content: "Maleta de Métricas" },
      { property: "og:description", content: "Dashboard exclusivo de métricas e performance de tráfego pago." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:title", content: "Maleta de Métricas" },
      { name: "twitter:description", content: "Dashboard exclusivo de métricas e performance de tráfego pago." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/6548d74d-da56-4fb3-abd8-05a0d10f5411/id-preview-053acf5f--d1f07b94-0038-4c34-b8c9-f1fc8b360a92.lovable.app-1778335937306.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/6548d74d-da56-4fb3-abd8-05a0d10f5411/id-preview-053acf5f--d1f07b94-0038-4c34-b8c9-f1fc8b360a92.lovable.app-1778335937306.png" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", type: "image/jpeg", href: "/logo.jpg" },
      { rel: "apple-touch-icon", href: "/logo.jpg" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <Outlet />
    </QueryClientProvider>
  );
}
