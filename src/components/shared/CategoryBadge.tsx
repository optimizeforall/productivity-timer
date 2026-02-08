'use client';

interface CategoryBadgeProps {
  abbreviation: string;
  color: string;
  size?: 'sm' | 'md';
}

export default function CategoryBadge({ abbreviation, color, size = 'md' }: CategoryBadgeProps) {
  const sizeClasses = size === 'sm' ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-0.5 text-xs';

  return (
    <span
      className={`inline-flex items-center justify-center rounded font-bold uppercase tracking-wider ${sizeClasses}`}
      style={{ backgroundColor: color + '25', color }}
    >
      {abbreviation}
    </span>
  );
}
