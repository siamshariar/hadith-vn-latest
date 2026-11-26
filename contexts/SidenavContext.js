import { useState, useEffect, createContext } from "react";
import { readJson, writeJson } from "../lib/storage";

export const SidenavContext = createContext();

// Which tab of the phone's Saved panel is open (components/mobile/Storage), kept across pages.
// Through lib/storage, which never throws: with the browser's site data blocked, reading
// localStorage throws, and every layout holds this provider.
const SidenavContextProvider = ({ children }) => {
  const [bookmarkOpen, setBookmarkOpen] = useState(false);

  useEffect(() => {
    const saved = readJson("bookmarkOpen", false);
    setBookmarkOpen(saved);
    writeJson("bookmarkOpen", saved);
  }, []);

  const changeBookmarkOpen = (bookmarkOpen) => {
    setBookmarkOpen(bookmarkOpen);
    writeJson("bookmarkOpen", bookmarkOpen);
  };

  return (
    <SidenavContext.Provider
      value={{
        bookmarkOpen,
        changeBookmarkOpen,
      }}
    >
      {children}
    </SidenavContext.Provider>
  );
};

export default SidenavContextProvider;
