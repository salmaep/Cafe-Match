import { Helmet } from 'react-helmet-async';

interface Props {
  title?: string;
  description?: string;
  canonical?: string;
  image?: string;
  type?: 'website' | 'article' | 'profile';
  jsonLd?: Record<string, unknown> | Record<string, unknown>[];
}

const SITE_NAME = 'CafeMatch';
const DEFAULT_TITLE = 'CafeMatch — Find your next favourite cafe';
const DEFAULT_DESCRIPTION =
  'Discover cafes that match how you want to spend your time — work-from-cafe, dates, family time, group study, or me-time.';

/**
 * Lightweight SEO wrapper around react-helmet-async. Renders OpenGraph, Twitter,
 * canonical, and optional JSON-LD structured data. Unset props fall back to the
 * site defaults so every page has a baseline.
 */
export default function Seo({
  title,
  description,
  canonical,
  image,
  type = 'website',
  jsonLd,
}: Props) {
  const fullTitle = title ? `${title} · ${SITE_NAME}` : DEFAULT_TITLE;
  const desc = description ?? DEFAULT_DESCRIPTION;
  const url = canonical ?? (typeof window !== 'undefined' ? window.location.href : undefined);

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={desc} />
      {url && <link rel="canonical" href={url} />}

      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={desc} />
      <meta property="og:type" content={type} />
      {url && <meta property="og:url" content={url} />}
      {image && <meta property="og:image" content={image} />}

      <meta name="twitter:card" content={image ? 'summary_large_image' : 'summary'} />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={desc} />
      {image && <meta name="twitter:image" content={image} />}

      {jsonLd && (
        <script type="application/ld+json">
          {JSON.stringify(jsonLd)}
        </script>
      )}
    </Helmet>
  );
}
