import { useEffect } from "react";
import { DetailPage } from "./components/detail";
import { HomePage } from "./components/fleet";
import { parseFleetSearch, parseRange } from "./lib/probe/filters";
import { useLocation } from "./nav";

export function App() {
  const { path, search } = useLocation();
  const params = Object.fromEntries(search.entries());
  const nodeMatch = path.match(/^\/nodes\/([^/]+)\/?$/);

  useEffect(() => {
    if (!path.startsWith("/nodes/")) document.title = "OioProbe · 总览";
  }, [path]);

  if (nodeMatch?.[1]) {
    return <DetailPage id={decodeURIComponent(nodeMatch[1])} range={parseRange(params).range} />;
  }
  return <HomePage search={parseFleetSearch(params)} />;
}
