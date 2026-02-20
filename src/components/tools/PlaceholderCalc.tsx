/**
 * Placeholder calculator component used during the foundation phase.
 * Each real calculator will replace this with its own implementation.
 */
interface PlaceholderCalcProps {
  name: string;
}

export default function PlaceholderCalc({ name }: PlaceholderCalcProps) {
  return (
    <div className="bg-white border border-neutral-200 rounded-xl p-8 shadow-card">
      <div className="text-center py-12">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-50 rounded-full mb-4">
          <svg
            className="w-8 h-8 text-primary-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"
            />
          </svg>
        </div>
        <h2 className="text-lg font-semibold text-neutral-900 mb-2">{name}</h2>
        <p className="text-sm text-neutral-500">
          This calculator is coming soon. Check back shortly.
        </p>
      </div>
    </div>
  );
}
