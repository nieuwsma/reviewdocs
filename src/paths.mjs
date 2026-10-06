import path from "node:path";

export const slash = value => value.split(path.sep).join("/");
export const escapeHtml = value => String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
export function inside(root, filename) {
  const relative = path.relative(root, filename);
  return relative === "" || (!relative.startsWith(`..${path.sep}`) && relative !== ".." && !path.isAbsolute(relative));
}
export function safePath(root, value) {
  if (typeof value !== "string" || !value || path.isAbsolute(value)) throw new Error(`expected a relative path: ${value}`);
  const result = path.resolve(root, value);
  if (!inside(root, result)) throw new Error(`path escapes directory: ${value}`);
  return result;
}
export const outputName = page => page.output ?? page.file.replace(/\.md$/i, ".html");
