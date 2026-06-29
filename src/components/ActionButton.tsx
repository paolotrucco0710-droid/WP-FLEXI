"use client";

interface ActionButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  href?: string;
  variant?: "green" | "orange" | "purple" | "outline-green" | "outline-red";
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  size?: "sm" | "md" | "lg";
  type?: "button" | "submit";
}

const variants = {
  green: "bg-flexi-green text-white hover:bg-green-700",
  orange: "bg-flexi-orange text-white hover:bg-orange-700",
  purple: "bg-flexi-purple text-white hover:bg-violet-700",
  "outline-green":
    "border-2 border-flexi-green text-flexi-green bg-white hover:bg-flexi-green-light",
  "outline-red":
    "border-2 border-flexi-red text-flexi-red bg-white hover:bg-red-50",
};

const sizes = {
  sm: "px-4 py-1.5 text-sm",
  md: "px-5 py-2.5 text-sm font-semibold",
  lg: "px-6 py-4 text-base font-bold",
};

export function ActionButton({
  children,
  onClick,
  variant = "green",
  loading,
  disabled,
  fullWidth,
  size = "md",
  type = "button",
}: ActionButtonProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`rounded-xl transition-all active:scale-[0.98] disabled:opacity-50 ${variants[variant]} ${sizes[size]} ${fullWidth ? "w-full" : ""}`}
    >
      {loading ? "Invio..." : children}
    </button>
  );
}
