import { useState } from 'react';
import { API_URL } from '../lib/narrativeApi';
import { trackFileDownload, trackShare } from '../lib/analytics';
import shareTelegram from '../assets/graphics/figma-v2/share-telegram.svg';
import shareX from '../assets/graphics/figma-v2/share-x.svg';
import shareLinkedin from '../assets/graphics/figma-v2/share-linkedin.svg';
import shareCopyLink from '../assets/graphics/figma-v2/share-copy-link.svg';
import shareDownload from '../assets/graphics/figma-v2/share-download.svg';

export default function ResultsShareActions({ shareId, shareUrl, contentType = 'narrative_result' }) {
  const [copied, setCopied] = useState(false);

  if (!shareId || !shareUrl) return null;

  const downloadUrl = `${API_URL}/v1/results/${shareId}/graphic.png?v=4`;

  const socialLinks = [
    {
      key: 'telegram',
      href: `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}`,
      icon: shareTelegram,
      label: 'Share on Telegram',
    },
    {
      key: 'x',
      href: `https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}`,
      icon: shareX,
      label: 'Share on X',
    },
    {
      key: 'linkedin',
      href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`,
      icon: shareLinkedin,
      label: 'Share on LinkedIn',
    },
  ];

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      trackShare({ method: 'copy_link', contentType, itemId: shareId });
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const input = document.createElement('textarea');
      input.value = shareUrl;
      input.setAttribute('readonly', '');
      input.style.position = 'absolute';
      input.style.left = '-9999px';
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="ne-results__share">
      {socialLinks.map((s) => (
        <a
          key={s.key}
          className="ne-results__share-btn"
          href={s.href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={s.label}
          onClick={() => trackShare({ method: s.key, contentType, itemId: shareId })}
        >
          <img src={s.icon} alt="" width={80} height={80} />
        </a>
      ))}
      <button
        type="button"
        className="ne-results__share-btn"
        aria-label={copied ? 'Link copied' : 'Copy link'}
        onClick={onCopy}
      >
        <img src={shareCopyLink} alt="" width={80} height={80} />
        {copied && <span className="ne-results__share-feedback">Copied!</span>}
      </button>
      <a
        className="ne-results__share-btn"
        href={downloadUrl}
        download
        aria-label="Download result cards"
        onClick={() =>
          trackFileDownload({
            fileName: 'narrative-share-graphic.png',
            fileExtension: 'png',
            linkUrl: downloadUrl,
          })
        }
      >
        <img src={shareDownload} alt="" width={80} height={80} />
      </a>
    </div>
  );
}
