import { storage } from "../storage";

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

export async function generateUniqueCompanySlug(name: string): Promise<string> {
  const baseSlug = slugify(name) || `company-${Date.now()}`;
  let slug = baseSlug;
  let counter = 1;

  while (await storage.getCompanyBySlug(slug)) {
    slug = `${baseSlug}-${counter}`;
    counter += 1;
  }

  return slug;
}
