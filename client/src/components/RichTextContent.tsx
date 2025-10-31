import { useMemo } from "react";
import type { HTMLAttributes } from "react";

type RichTextContentProps = {
  html?: string | null;
} & HTMLAttributes<HTMLDivElement>;

// Allow a small set of semantic tags we expect from the Quill editor.
const ALLOWED_TAGS = new Set([
  "p",
  "br",
  "strong",
  "b",
  "em",
  "i",
  "u",
  "ul",
  "ol",
  "li",
  "blockquote",
  "code",
  "pre",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "a",
  "span",
]);

const URL_ATTRS = new Set(["href"]);

function sanitizeHtml(input: string): string {
  if (typeof window === "undefined" || !input) return input;

  const parser = new DOMParser();
  const doc = parser.parseFromString(input, "text/html");

  const sanitizeElement = (element: Element) => {
    // Remove unwanted tags but keep their child nodes
    Array.from(element.children).forEach((child) => {
      const tag = child.tagName.toLowerCase();

      if (!ALLOWED_TAGS.has(tag)) {
        const fragment = document.createDocumentFragment();
        while (child.firstChild) {
          fragment.appendChild(child.firstChild);
        }
        child.replaceWith(fragment);
      } else {
        sanitizeAttributes(child, tag);
        sanitizeElement(child);
      }
    });
  };

  const sanitizeAttributes = (element: Element, tag: string) => {
    Array.from(element.attributes).forEach((attr) => {
      const attrName = attr.name.toLowerCase();
      if (attrName === "style" || attrName.startsWith("on")) {
        element.removeAttribute(attr.name);
        return;
      }

      if (URL_ATTRS.has(attrName)) {
        const value = attr.value.trim();
        const lower = value.toLowerCase();
        if (lower.startsWith("javascript:") || lower.startsWith("data:")) {
          element.removeAttribute(attr.name);
          return;
        }
        // Ensure links open safely in a new tab
        if (tag === "a") {
          element.setAttribute("target", "_blank");
          element.setAttribute("rel", "noopener noreferrer");
        }
      } else if (attrName !== "class") {
        // Remove any attribute we don't explicitly allow
        element.removeAttribute(attr.name);
      }
    });
  };

  sanitizeElement(doc.body);

  return doc.body.innerHTML;
}

export function RichTextContent({ html, className, ...props }: RichTextContentProps) {
  const sanitized = useMemo(() => {
    if (!html) return "";
    return sanitizeHtml(html);
  }, [html]);

  return (
    <div
      className={className}
      {...props}
      dangerouslySetInnerHTML={{ __html: sanitized }}
    />
  );
}
