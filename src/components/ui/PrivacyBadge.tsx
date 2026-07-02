/**
 * Privacy badge required on every file converter page.
 * Quiet teal tint, left border, shield icon.
 */
import { ShieldCheck } from 'lucide-react';

export default function PrivacyBadge() {
  return (
    <div className="flex items-start gap-3 rounded-xl bg-primary-50 border-l-4 border-primary-600 px-4 py-3">
      <ShieldCheck size={20} className="text-primary-600 shrink-0 mt-0.5" aria-hidden="true" />
      <div>
        <p className="text-sm font-semibold text-neutral-900">
          100% Private — Your files never leave your device.
        </p>
        <p className="text-xs text-neutral-600 mt-0.5">
          All processing happens in your browser. Nothing is uploaded to any server.
        </p>
      </div>
    </div>
  );
}
