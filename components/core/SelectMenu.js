import { useId, useState } from "react";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import ChevronDownIcon from "../icons/ChevronDown";
import CheckIcon from "../icons/Check";
import styles from "./SelectMenu.module.scss";

// A dropdown in the site's look: a filled pill field (the search field's) that shows the
// choice, and under it the list, the choice ticked. The WAI-ARIA select-only combobox:
// a button with aria-haspopup="listbox", then a listbox of options. MUI's Menu (MenuList) gives
// the arrow keys, Home and End, typing to jump, Esc, and focus back on the field.
// `options`: [{ value, label }]; `label`: the field's name, said with the choice (visually
// hidden unless `showLabel`); `icon`: before the choice; `name` and `form`: a hidden input so
// a form sent without the page's scripts keeps the choice.
export default function SelectMenu({ label, value, options, onChange, icon = null, showLabel = false, name, form, busy = false, className = "" }) {
  const id = useId();
  const labelId = `${id}label`;
  const buttonId = `${id}button`;
  const listId = `${id}list`;
  const [anchor, setAnchor] = useState(null);
  const open = Boolean(anchor);
  const current = options.find((option) => option.value === value) || options[0];

  const choose = (option) => {
    setAnchor(null);
    if (option.value !== value) onChange(option.value);
  };

  return (
    <div className={`${styles.field} ${className}`}>
      <span id={labelId} className={showLabel ? styles.label : styles.hiddenLabel}>
        {label}
      </span>
      <button
        id={buttonId}
        type="button"
        className={styles.trigger}
        aria-haspopup="listbox"
        aria-expanded={open ? "true" : "false"}
        aria-controls={open ? listId : undefined}
        aria-labelledby={`${labelId} ${buttonId}`}
        aria-busy={busy || undefined}
        onClick={(event) => setAnchor(event.currentTarget)}
      >
        {icon && <span className={styles.icon}>{icon}</span>}
        <span className={styles.value}>{current ? current.label : ""}</span>
        <ChevronDownIcon />
      </button>
      {name && <input type="hidden" name={name} form={form} value={value || ""} />}
      <Menu
        anchorEl={anchor}
        open={open}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
        transformOrigin={{ vertical: "top", horizontal: "left" }}
        marginThreshold={8}
        classes={{ paper: styles.paper }}
        slotProps={{
          paper: { style: { width: anchor ? Math.max(anchor.offsetWidth, 240) : undefined } },
          list: { id: listId, role: "listbox", "aria-labelledby": labelId, className: styles.list },
        }}
      >
        {options.map((option) => {
          const selected = option.value === value;
          return (
            <MenuItem
              key={option.value}
              role="option"
              aria-selected={selected ? "true" : "false"}
              selected={selected}
              className={styles.option}
              onClick={() => choose(option)}
            >
              <span className={styles.optionLabel}>{option.label}</span>
              {selected && (
                <span className={styles.check}>
                  <CheckIcon />
                </span>
              )}
            </MenuItem>
          );
        })}
      </Menu>
    </div>
  );
}
