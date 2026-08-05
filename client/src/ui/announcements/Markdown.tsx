import { useMemo } from 'react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { announcementIdFromHref } from './announcementsClient';
import './Markdown.scss';

marked.use({ gfm: true, breaks: true });

DOMPurify.addHook('afterSanitizeAttributes', (node: any) => {
  if (node.tagName === 'A') {
    node.setAttribute('target', '_blank');
    node.setAttribute('rel', 'noopener nofollow');
  }
});

export function renderMarkdown(text: string): string {
  const raw = marked.parse(String(text || '')) as string;
  return DOMPurify.sanitize(raw, {
    ADD_TAGS: ['details', 'summary'],
    ADD_ATTR: ['open'],
    FORBID_TAGS: ['style', 'form', 'input', 'button'],
  });
}

export default function Markdown({ text, className = '', onAnnouncementLink }: {
  text: string;
  className?: string;
  onAnnouncementLink?: (id: number) => void;
}) {
  const html = useMemo(() => renderMarkdown(text), [text]);

  const onClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!onAnnouncementLink) return;
    const target = e.target as HTMLElement;
    const anchor = target && target.closest ? target.closest('a') : null;
    if (!anchor) return;
    const id = announcementIdFromHref(anchor.getAttribute('href') || '');
    if (id !== null) {
      e.preventDefault();
      onAnnouncementLink(id);
    }
  };

  return <div className={`md-body ${className}`} onClick={onClick} dangerouslySetInnerHTML={{ __html: html }} />;
}
