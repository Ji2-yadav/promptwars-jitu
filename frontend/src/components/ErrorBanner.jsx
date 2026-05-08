import { AlertCircle } from "lucide-react";

export function ErrorBanner({ message }) {
  if (!message) return null;
  return (
    <div className="error-banner">
      <AlertCircle size={18} />
      {message}
    </div>
  );
}
