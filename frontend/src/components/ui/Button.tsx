import React from "react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "filled" | "outlined" | "tonal" | "text" | "danger";
  size?: "sm" | "md" | "lg";
  fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = "filled",
  size = "md",
  fullWidth = false,
  className = "",
  ...props
}) => {
  const baseStyle = "inline-flex items-center justify-center font-medium transition-all duration-200 focus:outline-none rounded-[100px] active:scale-98 disabled:opacity-50 disabled:pointer-events-none cursor-pointer";
  
  const variants = {
    filled: "bg-primary text-on-primary hover:shadow-md hover:brightness-110",
    outlined: "border border-stadium-outline text-primary hover:bg-primary/5",
    tonal: "bg-primary-container text-on-primary-container hover:shadow-sm hover:brightness-95",
    text: "text-primary hover:bg-primary/5",
    danger: "bg-stadium-error text-stadium-on-error hover:shadow-md hover:brightness-110",
  };
  
  const sizes = {
    sm: "px-4 py-1.5 text-sm h-8",
    md: "px-6 py-2.5 text-base h-10",
    lg: "px-8 py-3.5 text-lg h-12",
  };

  const widthStyle = fullWidth ? "w-full" : "";

  return (
    <button
      className={`${baseStyle} ${variants[variant]} ${sizes[size]} ${widthStyle} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};
export default Button;
