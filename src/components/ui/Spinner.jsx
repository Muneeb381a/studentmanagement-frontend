/**
 * @param {'sm'|'md'|'lg'} size
 * @param {string} className
 */
export default function Spinner({ size = 'md', className = '' }) {
  const sz = { sm: 'w-4 h-4', md: 'w-8 h-8', lg: 'w-12 h-12' }[size];

  return (
    <div className={`relative ${sz} ${className}`}>
      <div className="absolute inset-0 rounded-full border-2 border-indigo-100 dark:border-indigo-900/40" />
      <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-indigo-500 animate-spin" />
    </div>
  );
}

export function PageLoader() {
  return (
    <div className="flex flex-col items-center justify-center py-32 gap-4">
      <Spinner size="lg" />
      <p className="text-sm text-slate-400 dark:text-slate-600 font-medium animate-pulse">
        Loading…
      </p>
    </div>
  );
}
