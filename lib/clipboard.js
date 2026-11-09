// Copies through the page's selection (document.execCommand), as the copy-to-clipboard library
// does: a hidden span selected with a range. No focus moves, so it also works while a menu holds
// the focus (MUI's focus trap pulls it back from a text field, and the copy then fails in Safari).
// The reader's own selection is put back.
export function copyBySelection(text) {
  if (typeof window === "undefined" || !window.getSelection || !document.createRange) return false;
  const selection = window.getSelection();
  const saved = [];
  for (let i = 0; i < selection.rangeCount; i += 1) saved.push(selection.getRangeAt(i));
  const mark = document.createElement("span");
  mark.textContent = text;
  mark.setAttribute("aria-hidden", "true");
  mark.style.cssText = "all:unset;position:fixed;top:0;left:0;clip:rect(0,0,0,0);white-space:pre;-webkit-user-select:text;user-select:text";
  document.body.appendChild(mark);
  let copied = false;
  try {
    const range = document.createRange();
    range.selectNodeContents(mark);
    selection.removeAllRanges();
    selection.addRange(range);
    copied = document.execCommand("copy");
  } catch (_) {
    copied = false;
  }
  selection.removeAllRanges();
  saved.forEach((range) => selection.addRange(range));
  mark.remove();
  return copied;
}

// The clipboard API where there is one; some browsers have none or refuse it (in-app browsers,
// an http address): the old way, through the selection, still works in most of them.
// Resolves true when the text was copied.
export function copyText(text) {
  if (typeof navigator === "undefined" || !navigator.clipboard || !navigator.clipboard.writeText) {
    return Promise.resolve(copyBySelection(text));
  }
  return navigator.clipboard.writeText(text).then(
    () => true,
    () => copyBySelection(text)
  );
}
