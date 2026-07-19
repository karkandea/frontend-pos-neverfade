type SkeletonProps = {
  className?: string;
};

export function Skeleton({
  className = "",
}: SkeletonProps) {
  return (
    <div
      aria-hidden="true"
      className={`skeleton ${className}`.trim()}
    />
  );
}

export function SkeletonTable({
  rows = 8,
}: {
  rows?: number;
}) {
  return (
    <div
      className="skeleton-table"
      aria-hidden="true"
    >
      {Array.from({ length: rows }).map(
        (_, index) => (
          <Skeleton
            key={index}
            className="skeleton-table-row"
          />
        )
      )}
    </div>
  );
}

export function SkeletonCards({
  count = 4,
}: {
  count?: number;
}) {
  return (
    <div
      className="stats-grid"
      aria-hidden="true"
    >
      {Array.from({ length: count }).map(
        (_, index) => (
          <Skeleton
            key={index}
            className="skeleton-stat-card"
          />
        )
      )}
    </div>
  );
}
