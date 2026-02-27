import DOMPurify from "isomorphic-dompurify";

/**
 * Removes all HTML tags from the input text.
 * useful for fields that should only contain plain text.
 */
export const sanitizeText = (text: string): string => {
    if (!text) return "";
    return text.replace(/<[^>]*>/g, "");
};

/**
 * Sanitizes HTML content, allowing only a safe subset of tags.
 * Useful for rich text fields like notes or descriptions.
 */
export const sanitizeHtml = (html: string): string => {
    if (!html) return "";
    return DOMPurify.sanitize(html, {
        ALLOWED_TAGS: ["b", "i", "em", "strong", "p", "br", "ul", "ol", "li"],
        ALLOWED_ATTR: [],
    });
};
