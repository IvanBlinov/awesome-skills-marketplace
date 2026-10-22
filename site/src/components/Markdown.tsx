import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { REPO, SOURCE_BASE_URL } from "../config";

const SCHEME_RE = /^[a-z][a-z0-9+.-]*:/i;
const ALLOWED_SCHEME_RE = /^(https?|mailto):/i;
const RAW_BASE_URL = `https://raw.githubusercontent.com/${REPO}/main/`;

/** Allow http(s), mailto and scheme-less (relative/anchor) URLs; drop everything else. */
export function safeUrl(url: string): string {
  return !SCHEME_RE.test(url) || ALLOWED_SCHEME_RE.test(url) ? url : "";
}

/** Repo-relative path of `url` resolved against the directory `basePath`. */
function resolveInRepo(basePath: string, url: string): string {
  return new URL(url, `https://repo.invalid/${basePath.replace(/\/?$/, "/")}`).pathname.slice(1);
}

/**
 * Rewrites relative URLs to GitHub (links to the blob view, images to raw files), since the
 * site's own routes do not serve repo files. Anchors and absolute URLs pass through.
 */
export function repoUrl(url: string, key: string, basePath?: string): string {
  const safe = safeUrl(url);
  if (!safe || !basePath || SCHEME_RE.test(safe) || safe.startsWith("#") || safe.startsWith("//")) return safe;
  return `${key === "src" ? RAW_BASE_URL : SOURCE_BASE_URL}${resolveInRepo(basePath, safe)}`;
}

interface Props {
  source: string;
  /** Repo-relative directory of the Markdown file, used to resolve relative URLs. */
  basePath?: string;
}

/** Untrusted Markdown: raw HTML is never rendered (no rehype-raw). */
export function Markdown({ source, basePath }: Props) {
  return (
    <div className="markdown">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        skipHtml
        urlTransform={(url, key) => repoUrl(url, key, basePath)}
        components={{
          a: ({ node: _node, href, ...props }) =>
            href ? (
              <a {...props} href={href} target={href.startsWith("#") ? undefined : "_blank"} rel="noopener noreferrer" />
            ) : (
              <span>{props.children}</span>
            ),
        }}
      >
        {source}
      </ReactMarkdown>
    </div>
  );
}
