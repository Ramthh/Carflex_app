type FinderSourceBadgeProps = {className?: string};

export default function FinderSourceBadge({className = ''}: FinderSourceBadgeProps) {
 return <span title="Discovered by Carflex Finder" className={`inline-flex shrink-0 items-center rounded bg-white px-2 py-1 ${className}`}>
  <img src="/Logo.png" alt="Carflex Finder" width={48} height={16} className="h-4 w-12 object-contain"/>
 </span>;
}
