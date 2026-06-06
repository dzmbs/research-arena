import React from 'react';

// Minimal, dependency-free markdown renderer tuned for challenge specs:
// headings, paragraphs, fenced code blocks, inline code, bold, lists.

function renderInline(text: string, keyPrefix: string): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  // split on inline code first, then bold within plain segments
  const parts = text.split(/(`[^`]+`)/g);
  parts.forEach((part, i) => {
    if (part.startsWith('`') && part.endsWith('`') && part.length > 1) {
      out.push(
        <code key={`${keyPrefix}-c${i}`} className="inline">
          {part.slice(1, -1)}
        </code>
      );
    } else {
      const bold = part.split(/(\*\*[^*]+\*\*)/g);
      bold.forEach((b, j) => {
        if (b.startsWith('**') && b.endsWith('**')) {
          out.push(
            <strong key={`${keyPrefix}-b${i}-${j}`} className="font-semibold">
              {b.slice(2, -2)}
            </strong>
          );
        } else if (b) {
          out.push(<React.Fragment key={`${keyPrefix}-t${i}-${j}`}>{b}</React.Fragment>);
        }
      });
    }
  });
  return out;
}

export default function Markdown({ source }: { source: string }) {
  const lines = source.replace(/\r\n/g, '\n').split('\n');
  const blocks: React.ReactNode[] = [];
  let i = 0;
  let key = 0;

  while (i < lines.length) {
    const line = lines[i];

    // fenced code block
    if (line.trim().startsWith('```')) {
      const lang = line.trim().slice(3).trim();
      const code: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        code.push(lines[i]);
        i++;
      }
      i++; // skip closing fence
      blocks.push(
        <pre key={key++} className="codeblock">
          {lang && (
            <div className="c-com" style={{ marginBottom: 8, textTransform: 'uppercase', letterSpacing: '.05em', fontSize: 10 }}>
              {lang}
            </div>
          )}
          <code>{code.join('\n')}</code>
        </pre>
      );
      continue;
    }

    // headings
    const h = line.match(/^(#{1,4})\s+(.*)$/);
    if (h) {
      const level = h[1].length;
      const content = renderInline(h[2], `h${key}`);
      blocks.push(React.createElement(`h${level}`, { key: key++ }, content));
      i++;
      continue;
    }

    // unordered list
    if (/^\s*[-*]\s+/.test(line)) {
      const items: React.ReactNode[] = [];
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) {
        const item = lines[i].replace(/^\s*[-*]\s+/, '');
        items.push(
          <li key={items.length} className="mb-1">
            {renderInline(item, `li${key}-${items.length}`)}
          </li>
        );
        i++;
      }
      blocks.push(<ul key={key++}>{items}</ul>);
      continue;
    }

    // blank line
    if (line.trim() === '') {
      i++;
      continue;
    }

    // paragraph (collect until blank)
    const para: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() !== '' &&
      !lines[i].trim().startsWith('```') &&
      !/^(#{1,4})\s+/.test(lines[i]) &&
      !/^\s*[-*]\s+/.test(lines[i])
    ) {
      para.push(lines[i]);
      i++;
    }
    blocks.push(<p key={key++}>{renderInline(para.join(' '), `p${key}`)}</p>);
  }

  return <div className="markdown">{blocks}</div>;
}
