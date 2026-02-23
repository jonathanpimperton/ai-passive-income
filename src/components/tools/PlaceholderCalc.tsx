/**
 * Skeleton placeholder calculator shown while real calculators are being built.
 * Uses shimmer animation to indicate interactive content is coming.
 * Matches the two-column layout dimensions of real calculators to prevent CLS.
 */
interface PlaceholderCalcProps {
  name: string;
}

export default function PlaceholderCalc({ name }: PlaceholderCalcProps) {
  return (
    <div className="bg-white border border-neutral-200/80 rounded-2xl shadow-card overflow-hidden">
      {/* Two-column skeleton layout matching real calculator dimensions */}
      <div className="grid grid-cols-1 lg:grid-cols-[2fr_3fr]">
        {/* Left: Input skeleton */}
        <div className="p-6 lg:p-8 lg:border-r border-neutral-100">
          <div className="shimmer-line h-4 w-24 rounded mb-6"></div>

          {/* Input field skeletons */}
          <div className="space-y-5">
            {[1, 2, 3, 4].map((i) => (
              <div key={i}>
                <div className="shimmer-line h-3 w-32 rounded mb-2"></div>
                <div className="shimmer-line h-11 w-full rounded-lg"></div>
                <div className="shimmer-line h-2 w-full rounded-full mt-3"></div>
              </div>
            ))}
          </div>

          {/* Advanced toggle skeleton */}
          <div className="mt-6 pt-5 border-t border-neutral-100">
            <div className="shimmer-line h-3 w-28 rounded"></div>
          </div>
        </div>

        {/* Right: Results skeleton */}
        <div className="p-6 lg:p-8 bg-neutral-50/50">
          {/* Big number result */}
          <div className="text-center lg:text-left mb-6">
            <div className="shimmer-line h-3 w-40 rounded mb-3 mx-auto lg:mx-0"></div>
            <div className="shimmer-line h-10 w-52 rounded-lg mx-auto lg:mx-0"></div>
            <div className="shimmer-line h-3 w-64 rounded mt-3 mx-auto lg:mx-0"></div>
          </div>

          {/* Breakdown rows */}
          <div className="space-y-3 mb-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex justify-between items-center">
                <div className="shimmer-line h-3 w-28 rounded"></div>
                <div className="shimmer-line h-3 w-20 rounded"></div>
              </div>
            ))}
          </div>

          {/* Chart placeholder */}
          <div className="shimmer-line h-44 w-full rounded-xl mb-6"></div>

          {/* Action buttons */}
          <div className="flex gap-3">
            <div className="shimmer-line h-10 w-36 rounded-lg"></div>
            <div className="shimmer-line h-10 w-32 rounded-lg"></div>
          </div>
        </div>
      </div>

      {/* Coming soon notice */}
      <div className="border-t border-neutral-100 px-6 py-4 bg-primary-50/50 flex items-center justify-center gap-2">
        <svg
          className="w-4 h-4 text-primary-600"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"
          />
        </svg>
        <p className="text-sm font-medium text-primary-700">
          {name} — coming soon
        </p>
      </div>
    </div>
  );
}
