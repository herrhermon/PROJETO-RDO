import { api } from '../../lib/apiClient';

const AVATAR_COLORS = ['bg-blue-500', 'bg-emerald-500', 'bg-purple-500', 'bg-amber-500', 'bg-rose-500', 'bg-indigo-500', 'bg-cyan-500', 'bg-orange-500'];

const SIZE_CLASSES = {
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-16 h-16 text-lg',
};

export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '';
  if (parts.length === 1) return parts[0][0]?.toUpperCase() ?? '';
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function colorForName(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

export function Avatar({ name, avatarPath, size = 'md' }: { name: string; avatarPath: string | null | undefined; size?: 'sm' | 'md' | 'lg' }) {
  const sizeClass = SIZE_CLASSES[size];
  if (avatarPath) {
    return <img src={api.uploadUrl(avatarPath)} alt={name} className={`${sizeClass} rounded-full object-cover`} />;
  }
  return (
    <div className={`${sizeClass} rounded-full ${colorForName(name)} flex items-center justify-center text-white font-bold shrink-0`}>
      {getInitials(name)}
    </div>
  );
}
