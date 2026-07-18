import React from "react";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  fullWidth?: boolean;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, fullWidth = false, className = "", ...props }, ref) => {
    const containerStyle = fullWidth ? "w-full" : "w-auto";
    const inputBaseStyle = "px-4 py-3 rounded-xl border bg-transparent text-stadium-on-surface focus:outline-none focus:border-primary transition-all duration-200";
    const borderStyle = error ? "border-stadium-error focus:border-stadium-error" : "border-stadium-outline";
    const widthStyle = fullWidth ? "w-full" : "";

    return (
      <div className={`flex flex-col gap-1.5 ${containerStyle}`}>
        {label && (
          <label className="text-sm font-medium text-stadium-on-surface-var">
            {label}
          </label>
        )}
        <input
          ref={ref}
          className={`${inputBaseStyle} ${borderStyle} ${widthStyle} ${className}`}
          {...props}
        />
        {error && (
          <span className="text-xs text-stadium-error mt-0.5">{error}</span>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";
export default Input;
