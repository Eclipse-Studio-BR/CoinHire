import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { formatDistanceToNow } from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatSalary(min?: number | null, max?: number | null, currency = 'USD'): string {
  if (!min && !max) return 'Not specified';
  if (min && max) return `$${(min / 1000).toFixed(0)}k - $${(max / 1000).toFixed(0)}k ${currency}`;
  if (min) return `From $${(min / 1000).toFixed(0)}k ${currency}`;
  if (max) return `Up to $${(max / 1000).toFixed(0)}k ${currency}`;
  return 'Not specified';
}

export function formatTimeAgo(date: Date | string | null): string {
  if (!date) return 'Unknown';
  return formatDistanceToNow(new Date(date), { addSuffix: true });
}

export function getInitials(firstName?: string | null, lastName?: string | null, email?: string | null): string {
  if (firstName && lastName) {
    return `${firstName[0]}${lastName[0]}`.toUpperCase();
  }
  if (firstName) return firstName[0].toUpperCase();
  if (email) return email[0].toUpperCase();
  return 'U';
}

export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
}
