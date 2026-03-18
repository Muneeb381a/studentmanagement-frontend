import Button from './Button';

/**
 * @param {React.ReactNode} icon
 * @param {string}          title
 * @param {string}          description
 * @param {string}          actionLabel
 * @param {Function}        onAction
 */
export default function EmptyState({ icon: Icon, title, description, actionLabel, onAction }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-4 px-6 text-center">
      {Icon && (
        <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
          <Icon size={28} className="text-slate-400 dark:text-slate-600" strokeWidth={1.5} />
        </div>
      )}
      <div>
        <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">{title}</p>
        {description && (
          <p className="text-xs text-slate-400 dark:text-slate-600 mt-1">{description}</p>
        )}
      </div>
      {actionLabel && onAction && (
        <Button onClick={onAction} size="sm" icon={undefined}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
