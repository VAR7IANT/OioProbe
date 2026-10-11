import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type MouseEvent,
  type ReactNode,
} from "react";

type SearchValue = string | number | boolean | null | undefined;

function queryFrom(search?: object) {
  const query = new URLSearchParams();
  if (!search) return query;
  for (const [key, value] of Object.entries(search as Record<string, SearchValue>)) {
    if (value == null || value === "") continue;
    query.set(key, String(value));
  }
  return query;
}

interface RouterApi {
  path: string;
  search: URLSearchParams;
  go: (href: string, replace?: boolean) => void;
}

const RouterContext = createContext<RouterApi | null>(null);

function readLocation() {
  return {
    path: window.location.pathname || "/",
    search: window.location.search,
  };
}

export function Router({ children }: { children: ReactNode }) {
  const [loc, setLoc] = useState(readLocation);

  useEffect(() => {
    const onPop = () => setLoc(readLocation());
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const api = useMemo<RouterApi>(() => {
    const search = new URLSearchParams(loc.search);
    return {
      path: loc.path,
      search,
      go: (href, replace) => {
        const current = `${window.location.pathname}${window.location.search}`;
        if (current !== href) {
          if (replace) window.history.replaceState(null, "", href);
          else window.history.pushState(null, "", href);
        }
        setLoc(readLocation());
      },
    };
  }, [loc.path, loc.search]);

  return <RouterContext.Provider value={api}>{children}</RouterContext.Provider>;
}

function useRouter() {
  const api = useContext(RouterContext);
  if (!api) throw new Error("Router is missing");
  return api;
}

export function useLocation() {
  const { path, search } = useRouter();
  return { path, search };
}

export function hrefFor(to: string, params?: { id?: string }, search?: object) {
  let path = to;
  if (params?.id) path = path.replace("$id", encodeURIComponent(params.id));
  const text = queryFrom(search).toString();
  return text ? `${path}?${text}` : path;
}

export function Link({
  to,
  params,
  search,
  className,
  children,
  "aria-label": ariaLabel,
}: {
  to: string;
  params?: { id?: string };
  search?: object;
  className?: string;
  children?: ReactNode;
  "aria-label"?: string;
}) {
  const { go } = useRouter();
  const href = hrefFor(to, params, search);
  const onClick = (event: MouseEvent<HTMLAnchorElement>) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
    event.preventDefault();
    go(href);
  };
  return (
    <a href={href} className={className} aria-label={ariaLabel} onClick={onClick}>
      {children}
    </a>
  );
}

export function useNavigate() {
  const { go, path, search } = useRouter();
  return useCallback(
    (args: {
      search: object | ((prev: Record<string, string>) => object);
      replace?: boolean;
    }) => {
      const prev = Object.fromEntries(search.entries());
      const next = typeof args.search === "function" ? args.search(prev) : args.search;
      go(hrefFor(path, undefined, next), args.replace ?? false);
    },
    [go, path, search],
  );
}
