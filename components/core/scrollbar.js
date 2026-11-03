import { useEffect, useRef } from "react";
import styles from "./scrollbar.module.scss";

export default function Scrollbar({ children, className, scrollPos, id }) {
  const scrollbar = useRef(null);

  useEffect(() => {
    if (scrollPos) {
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      scrollbar.current.scrollTo({
        top: scrollPos,
        left: 0,
        behavior: reduce ? "auto" : "smooth",
      });
    }
  }, [id, scrollPos]);

  return (
    <div className={`${styles.scrollbar} ${className}`} ref={scrollbar}>
      {children}
    </div>
  );
}
