import React from "react";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "elevated" | "filled" | "outlined" | "glass";
  hoverable?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  variant = "elevated",
  hoverable = false,
  className = "",
  ...props
}) => {
  const baseStyle = "p-6 rounded-2xl transition-all duration-200";
  
  const variants = {
    elevated: "bg-stadium-surface shadow-md border border-stadium-outline/10 text-stadium-on-surface",
    filled: "bg-stadium-surface-var text-stadium-on-surface",
    outlined: "border border-stadium-outline text-stadium-on-surface bg-transparent",
    glass: "glass-panel text-stadium-on-surface shadow-lg",
  };

  const hoverStyle = hoverable ? "hover:scale-[1.01] hover:shadow-lg hover:border-primary/20 cursor-pointer" : "";

  return (
    <div
      className={`${baseStyle} ${variants[variant]} ${hoverStyle} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};
export default Card;
