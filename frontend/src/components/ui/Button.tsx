import type { ButtonHTMLAttributes } from 'react';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost';

const variantClasses: Record<Variant, string> = {
  primary: 'bg-eqc-900 text-white hover:bg-blue-900 disabled:bg-gray-300',
  secondary: 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50',
  danger: 'bg-red-600 text-white hover:bg-red-700 disabled:bg-red-200',
  ghost: 'text-gray-600 hover:bg-gray-100',
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}

export function Button({ variant = 'primary', className = '', ...props }: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-colors disabled:cursor-not-allowed ${variantClasses[variant]} ${className}`}
      {...props}
    />
  );
}
