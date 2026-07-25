const SITE_URL = 'https://memetic.adpr.work';
const DEFAULT_IMAGE = `${SITE_URL}/og-image.png`;
const DEFAULT_DESCRIPTION =
  'We build communication systems with memetic potential for AI, Web3 and deep tech founders—helping products become easier to understand, remember and share.';

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function getApiUrl() {
  return (
    process.env.VITE_API_URL?.replace(/\/$/, '') ||
    process.env.API_URL?.replace(/\/$/, '') ||
  '');
}

function buildShareHtml({ shareId, title, description, image, cards }) {
  const safeTitle = escapeHtml(title);
  const safeDescription = escapeHtml(description);
  const safeImage = escapeHtml(image);
  const canonical = `${SITE_URL}/results/${shareId}`;
  const cardMarkup = (cards || [])
    .map(
      (card) =>
        `<article><h2>${escapeHtml(card.label)}</h2><p>${escapeHtml(card.content)}</p></article>`,
    )
    .join('\n');

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${safeTitle}</title>
  <meta name="description" content="${safeDescription}" />
  <link rel="canonical" href="${canonical}" />
  <meta property="og:type" content="article" />
  <meta property="og:site_name" content="Memetic Brand Labs" />
  <meta property="og:url" content="${canonical}" />
  <meta property="og:title" content="${safeTitle}" />
  <meta property="og:description" content="${safeDescription}" />
  <meta property="og:image" content="${safeImage}" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${safeTitle}" />
  <meta name="twitter:description" content="${safeDescription}" />
  <meta name="twitter:image" content="${safeImage}" />
  <meta http-equiv="refresh" content="0;url=${canonical}" />
</head>
<body>
  <main>
    <h1>${safeTitle}</h1>
    <p>${safeDescription}</p>
    ${cardMarkup}
    <p><a href="${canonical}">View full results on Memetic Brand Labs</a></p>
  </main>
</body>
</html>`;
}

export default async function handler(req, res) {
  const shareId = req.query.shareId;
  if (!shareId) {
    res.statusCode = 400;
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.end('Missing shareId');
    return;
  }

  const apiUrl = getApiUrl();
  if (!apiUrl) {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.end('API URL is not configured');
    return;
  }

  try {
    const response = await fetch(`${apiUrl}/v1/results/${shareId}`);
    if (!response.ok) {
      res.statusCode = response.status === 404 ? 404 : 502;
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.end(buildShareHtml({
        shareId,
        title: 'Narrative Results | Memetic Brand Labs',
        description: DEFAULT_DESCRIPTION,
        image: DEFAULT_IMAGE,
        cards: [],
      }));
      return;
    }

    const data = await response.json();
    const image = data.og_image_path || data.graphic_path_square
      ? `${apiUrl}/v1/results/${shareId}/graphic.png`
      : DEFAULT_IMAGE;
    const title = data.og_title
      ? `${data.og_title} | Memetic Brand Labs`
      : 'Narrative Results | Memetic Brand Labs';
    const description =
      data.og_description ||
      data.cards?.[0]?.content?.slice(0, 155) ||
      DEFAULT_DESCRIPTION;

    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
    res.end(buildShareHtml({ shareId, title, description, image, cards: data.cards }));
  } catch {
    res.statusCode = 502;
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.end('Failed to load share metadata');
  }
}
