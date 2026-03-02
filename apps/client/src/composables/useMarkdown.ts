import { marked } from 'marked';
import DOMPurify from 'dompurify';

// Configure marked for GFM rendering
marked.setOptions({
  breaks: true,
  gfm: true,
});

/**
 * Render markdown string to sanitized HTML.
 * Uses DOMPurify to strip any injected scripts/event handlers.
 * Links open in new tabs.
 */
export function renderMarkdown(md: string): string {
  const rawHtml = marked.parse(md, { async: false }) as string;
  const clean = DOMPurify.sanitize(rawHtml, {
    ADD_ATTR: ['target', 'rel'],
  });
  // Add target="_blank" to all links
  return clean.replace(/<a /g, '<a target="_blank" rel="noopener" ');
}
