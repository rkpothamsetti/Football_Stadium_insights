import React from "react";

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "text" | "circular" | "rectangular";
  width?: string | number;
  height?: string | number;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  variant = "rectangular",
  width,
  height,
  className = "",
  style,
  ...props
}) => {
  const shapeClass = {
    text: "rounded-md h-4 w-3/4",
    circular: "rounded-full",
    rectangular: "rounded-xl",
  };

  const customStyle = {
    width: width,
    height: height,
    ...style,
  };

  return (
    <div
      className={`animate-pulse bg-stadium-outline/25 ${shapeClass[variant]} ${className}`}
      style={customStyle}
      {...props}
    />
  );
};
export default Skeleton;
