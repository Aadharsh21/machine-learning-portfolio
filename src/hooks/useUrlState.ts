import { useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";

const keyOf = (search: object) => {
  const s = search as Record<string, unknown>;
  return JSON.stringify(
    Object.keys(s)
      .filter((k) => s[k] !== undefined)
      .sort()
      .map((k) => [k, s[k]]),
  );
};

/**
 * Page state that lives in the query string, so any view can be shared. React state is
 * the source of truth and changes show instantly; the URL follows with a replace, and a
 * URL the page didn't write itself (a link, typing in the address bar) is adopted.
 * Write numbers as numbers so the URL stays clean (?k=3 rather than ?k=%223%22).
 */
export function useUrlState<V, S extends object>(
  search: S,
  parse: (s: S) => V,
  serialize: (v: V) => S,
): [V, Dispatch<SetStateAction<V>>] {
  const navigate = useNavigate();
  const [value, setValue] = useState<V>(() => parse(search));
  const written = useRef(new Set<string>());
  const searchKey = keyOf(search);

  useEffect(() => {
    if (written.current.has(searchKey)) return;
    const next = parse(search);
    setValue((v) => (keyOf(serialize(v)) === keyOf(serialize(next)) ? v : next));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchKey]);

  useEffect(() => {
    const next = serialize(value);
    const key = keyOf(next);
    if (key === searchKey) return;
    if (written.current.size > 500) written.current.clear();
    written.current.add(key);
    void navigate({ to: ".", search: next as never, replace: true, resetScroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return [value, setValue];
}
