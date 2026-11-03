import type { ComponentProps } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { AddChartModal } from './AddChartModal';
import { RequireMeChart } from './RequireMeChart';

// Keep the component type stable across App/session updates. Defining this inside App
// remounts the entire chart tree on every parent render, discarding whiteboard state.
export function ProtectedLayout({ hasSession, ...modalProps }: { hasSession: boolean } & ComponentProps<typeof AddChartModal>) {
  if (!hasSession) return <Navigate to="/login" replace />;
  return (
    <div className="w-full h-screen bg-[#f8f9fa]">
      <RequireMeChart><Outlet /></RequireMeChart>
      <AddChartModal {...modalProps} />
    </div>
  );
}
