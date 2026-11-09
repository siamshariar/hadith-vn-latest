import { NextResponse } from "next/server";

// Lists used to keep their view and page in the query (?page=2&translated=1); they are now in the
// path (lib/hadith listPath), so every page of a list is a static page. Old links (shared,
// bookmarked, indexed) are sent once to the new address, and /books?book={id} (an older form) to
// the collection. Runs only for these three addresses (config.matcher; a chapter number needs
// its pattern, or the matcher does not take it).
const LISTS = [
  { pattern: /^\/books\/[^/]+\/chapters\/-?\d+$/, flags: ["translated"] },
  { pattern: /^\/categories\/[^/]+\/hadiths$/, flags: ["all", "direct"] },
];
const ORDER = ["translated", "all", "direct"];
// the page number moves into the path too; anything else (a shared ?tr= on the international
// site) stays in the query
const DROPPED = ["page"];

export function middleware(request) {
  const url = request.nextUrl;
  const { pathname, searchParams } = url;

  if (pathname === "/books") {
    const book = searchParams.get("book");
    if (!book || !/^[\w-]+$/.test(book)) return NextResponse.next();
    const next = url.clone();
    next.pathname = `/books/${book}`;
    next.search = "";
    return NextResponse.redirect(next, 308);
  }

  const list = LISTS.find((item) => item.pattern.test(pathname));
  if (!list) return NextResponse.next();
  const keys = [...DROPPED, ...list.flags];
  if (!keys.some((key) => searchParams.has(key))) return NextResponse.next();

  const page = Number.parseInt(searchParams.get("page") || "1", 10);
  const flags = ORDER.filter((flag) => list.flags.includes(flag) && searchParams.get(flag) === "1");
  const next = url.clone();
  next.pathname = [pathname, ...flags, ...(Number.isFinite(page) && page > 1 ? ["page", String(page)] : [])].join("/");
  keys.forEach((key) => next.searchParams.delete(key));
  return NextResponse.redirect(next, 308);
}

export const config = {
  matcher: ["/books", "/books/:book/chapters/:chapter(-?\\d+)", "/categories/:id/hadiths"],
};
