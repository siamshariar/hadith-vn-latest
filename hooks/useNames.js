import { useEffect, useState } from "react";
import { loadNames } from "../lib/names";

// The book names of `lang` (lib/names.js), for what does not come from the API
// with them: the stored references of pins and the last-read list. null until loaded, and
// for a language without names.
export default function useNames(lang) {
  const [names, setNames] = useState(null);
  useEffect(() => {
    let active = true;
    loadNames(lang).then((value) => {
      if (active) setNames(value);
    });
    return () => {
      active = false;
    };
  }, [lang]);
  return names;
}
