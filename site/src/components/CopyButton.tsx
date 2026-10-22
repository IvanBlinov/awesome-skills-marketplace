import { useState } from "react";

interface Props {
  text: string;
  label: string;
  className?: string;
}

export function CopyButton({ text, label, className = "btn" }: Props) {
  const [status, setStatus] = useState<"" | "Copied" | "Copy failed">("");

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setStatus("Copied");
    } catch {
      setStatus("Copy failed");
    }
    window.setTimeout(() => setStatus(""), 2000);
  };

  return (
    <span className="copy">
      <button type="button" className={className} onClick={copy}>
        {label}
      </button>
      <span className="copy-status" aria-live="polite">
        {status}
      </span>
    </span>
  );
}
