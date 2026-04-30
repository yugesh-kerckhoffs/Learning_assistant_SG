import { marked } from 'marked';
import DOMPurify from 'dompurify';

marked.setOptions({
  breaks: true,
  gfm: true,
});

function normalizeMarkdownInput(content: string): string {
  const prepared = content
    .replace(/(\S)\s+(?=(?:\d+\.\s+|[-+]\s+))/g, '$1\n');

  const lines = prepared
    .replace(/\0/g, '')
    .replace(/\r\n?/g, '\n')
    .replace(/\u00a0/g, ' ')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/javascript\s*:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .split('\n')
    .map((line) => {
      let fixed = line.replace(/^\s*[•]\s+/, '- ').replace(/^\s*\*\s+/, '- ');
      if ((fixed.match(/\*\*/g) || []).length % 2 === 1) fixed += '**';
      const withoutBold = fixed.replace(/\*\*/g, '');
      if ((withoutBold.match(/\*/g) || []).length % 2 === 1) fixed += '*';
      return fixed.trimEnd();
    })
    .join('\n')
    .replace(/([^\n])\n(#{1,6}\s+)/g, '$1\n\n$2')
    .replace(/([^\n])\n((?:[-+]\s+|\d+\.\s+))/g, '$1\n\n$2')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  return lines;
}

// Configure DOMPurify hooks to add extra XSS protection
DOMPurify.addHook('afterSanitizeAttributes', (node) => {
  // Force all links to open in new tab with security attributes
  if (node.tagName === 'A') {
    node.setAttribute('target', '_blank');
    node.setAttribute('rel', 'noopener noreferrer');
  }
  // Remove any data: or javascript: URIs from href
  if (node.hasAttribute('href')) {
    const href = node.getAttribute('href') || '';
    if (/^(javascript|data|vbscript):/i.test(href.trim())) {
      node.removeAttribute('href');
    }
  }
});

export function processMarkdown(content: string): string {
  const preSanitized = normalizeMarkdownInput(content);

  const html = marked.parse(preSanitized) as string;
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'b', 'i', 'u', 'code', 'pre', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'blockquote', 'a', 'hr'],
    ALLOWED_ATTR: ['href', 'target', 'rel'],
    ALLOW_DATA_ATTR: false,
    USE_PROFILES: { html: true },
    FORBID_TAGS: ['style', 'script', 'iframe', 'form', 'input', 'textarea', 'select', 'button', 'object', 'embed', 'svg', 'math'],
    FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'onfocus', 'onblur', 'style'],
  });
}
