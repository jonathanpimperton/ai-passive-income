/**
 * Wrapper for recharts ResponsiveContainer that defers rendering until
 * client-side mount — prevents SSR width/height measurement warnings.
 */
import { useState, useEffect, type ReactNode } from 'react';
import { ResponsiveContainer } from 'recharts';

interface ClientChartProps {
  children: ReactNode;
}

export default function ClientChart({ children }: ClientChartProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) return null;

  return (
    <ResponsiveContainer width="100%" height="100%">
      {children}
    </ResponsiveContainer>
  );
}
