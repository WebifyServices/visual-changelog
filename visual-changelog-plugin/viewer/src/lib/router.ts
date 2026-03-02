import { useState, useEffect } from "react";

export type Route =
  | { page: "timeline" }
  | { page: "entry"; id: string };

export function parseHash(hash: string): Route {
  const path = hash.replace(/^#\/?/, "");
  if (path.startsWith("entry/")) {
    return { page: "entry", id: decodeURIComponent(path.slice(6)) };
  }
  return { page: "timeline" };
}

export function useRoute(): Route {
  const [route, setRoute] = useState<Route>(() => parseHash(window.location.hash));
  useEffect(() => {
    const onHashChange = () => setRoute(parseHash(window.location.hash));
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);
  return route;
}

export function navigate(route: Route): void {
  window.location.hash =
    route.page === "timeline" ? "#/timeline" : `#/entry/${encodeURIComponent(route.id)}`;
}
