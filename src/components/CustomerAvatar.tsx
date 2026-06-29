interface CustomerAvatarProps {
  name: string;
  avatarUrl?: string | null;
  size?: "sm" | "md" | "lg";
}

const sizeClasses = {
  sm: "h-10 w-10",
  md: "h-12 w-12",
  lg: "h-20 w-20",
};

export function CustomerAvatar({
  name,
  avatarUrl,
  size = "md",
}: CustomerAvatarProps) {
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={name}
        className={`${sizeClasses[size]} rounded-full bg-gray-100 object-cover`}
      />
    );
  }

  return (
    <div
      className={`${sizeClasses[size]} flex items-center justify-center rounded-full bg-flexi-purple-light text-sm font-bold text-flexi-purple`}
    >
      {initials}
    </div>
  );
}
