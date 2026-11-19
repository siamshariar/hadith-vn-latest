import Head from "next/head";

// Structured data for search engines (schema.org, JSON-LD) in the page's <head>. `id` keeps one
// of each kind per page. "<" is escaped so no text can close the script element.
export default function JsonLd({ id, data }) {
  if (!data) return null;
  const json = JSON.stringify({ "@context": "https://schema.org", ...data }).replace(/</g, "\\u003c");
  return (
    <Head>
      <script key={`ld-${id}`} type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />
    </Head>
  );
}
