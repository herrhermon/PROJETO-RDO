import type { HTMLAttributes } from 'react';

export function Card({ className = '', ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={`bg-white rounded-xl shadow-sm border border-gray-100 ${className}`} {...props} />;
}
