import { useEffect } from "react";

/** Set the document title for a route (SPA), restoring the previous on unmount. */
export function usePageTitle(title: string) {
  useEffect(() => {
    const prev = document.title;
    document.title = title;
    return () => { document.title = prev; };
  }, [title]);
}
