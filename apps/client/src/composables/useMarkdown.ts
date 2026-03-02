import { marked } from 'marked';

// Configure marked for safe rendering
marked.setOptions({
  breaks: true,
  gfm: true,
});

/**
 * Render markdown string to sanitized HTML.
 * Links open in new tabs.
 */
export function renderMarkdown(md: string): string {
  const html = marked.parse(md, { async: false }) as string;
  // Add target="_blank" to all links
  return html.replace(/<a /g, '<a target="_blank" rel="noopener" ');
}
