import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { formatDistanceToNow } from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

type SalaryPeriod = 'year' | 'month' | 'week' | 'hour';

const SALARY_PERIOD_LABELS: Record<SalaryPeriod, string> = {
  year: 'year',
  month: 'month',
  week: 'week',
  hour: 'hour',
};

export function formatSalary(min?: number | null, max?: number | null, currency = 'USD', period: string = 'year'): string {
  if (!min && !max) return 'Not specified';

  const normalizedPeriod: SalaryPeriod = (Object.keys(SALARY_PERIOD_LABELS) as SalaryPeriod[]).includes(period as SalaryPeriod)
    ? (period as SalaryPeriod)
    : 'year';
  const unitLabel = SALARY_PERIOD_LABELS[normalizedPeriod];

  const suffix = ` ${currency.toUpperCase()} / ${unitLabel}`;
  const formatValue = (value: number) => `$${(value / 1000).toFixed(0)}k`;

  if (min && max) return `${formatValue(min)} - ${formatValue(max)}${suffix}`;
  if (min) return `From ${formatValue(min)}${suffix}`;
  if (max) return `Up to ${formatValue(max)}${suffix}`;
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
