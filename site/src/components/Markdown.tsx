import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const SCHEME_RE = /^[a-z][a-z0-9+.-]*:/i;
const ALLOWED_SCHEME_RE = /^(https?|mailto):/i;

/** Allow http(s), mailto and scheme-less (relative/anchor) URLs; drop everything else. */
export function safeUrl(url: string): string {
  return !SCHEME_RE.test(url) || ALLOWED_SCHEME_RE.test(url) ? url : "";
}

/** Untrusted Markdown: raw HTML is never rendered (no rehype-raw). */
export function Markdown({ source }: { source: string }) {
  return (
    <div className="markdown">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        skipHtml
        urlTransform={safeUrl}
        components={{
          a: ({ node: _node, ...props }) => <a {...props} target="_blank" rel="noopener noreferrer" />,
        }}
      >
        {source}
      </ReactMarkdown>
    </div>
  );
}
