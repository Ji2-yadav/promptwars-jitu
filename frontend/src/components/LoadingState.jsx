import { Loader2 } from "lucide-react";

export function LoadingState({ label }) {
  return (
    <div className="loading-state">
      <Loader2 className="loader-icon" size={18} />
      <span>{label}</span>
    </div>
  );
}
