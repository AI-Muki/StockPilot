import { type LucideIcon } from 'lucide-react';
import { EmptyState } from '@/components/states/states';

interface ComingSoonProps {
  title: string;
  message?: string;
  icon?: LucideIcon;
}

export function ComingSoonPage({ title, message, icon }: ComingSoonProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">{title}</h2>
      </div>
      <EmptyState
        icon={icon}
        title={`${title} — Coming in Phase 2`}
        message={
          message ||
          'This module is part of the next phase of StockPilot. The foundation is ready — this feature will be built on top of the existing architecture.'
        }
      />
    </div>
  );
}
