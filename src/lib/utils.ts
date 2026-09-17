import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Generates an uppercase shorthand acronym from a department, division, or organization name.
 * e.g. "Public works Department" -> "PWD"
 *      "Provincial Division" -> "PD"
 *      "P.W.D." -> "PWD"
 *      "PD" -> "PD"
 */
export const getShorthand = (str: string): string => {
  if (!str || str.toLowerCase().includes("enter")) return "";

  const text = str.trim();
  const normalized = text.replace(/\./g, '');
  const rawParts = normalized.split(/\s+/).filter(Boolean);

  if (rawParts.length === 0) return "";

  const looksLikeAddress = /\d|,|\b(road|lane|street|roadway|near|opposite|colony|sector|ward|village|town|city|district|state|block|market|chowk|nagar|mohalla|campus|camp|r\/o)\b/i.test(normalized) || /[\/\\]/.test(normalized);

  if (looksLikeAddress) {
    return text;
  }

  if (rawParts.length === 1 && rawParts[0].length <= 5) {
    return rawParts[0].toUpperCase();
  }

  const ignore = new Set(['and', '&', 'of', 'the', 'in', 'for']);
  const filtered = rawParts.filter(w => !ignore.has(w.toLowerCase()));
  const parts = filtered.length > 0 ? filtered : rawParts;
  return parts
    .map(word => {
      const match = word.match(/[a-zA-Z0-9]/);
      return match ? match[0] : '';
    })
    .join('')
    .toUpperCase();
};
