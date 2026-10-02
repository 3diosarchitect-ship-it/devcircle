import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn, getInitials } from "@/lib/utils";

const sizes = {
  sm: "size-8 text-[10px]",
  md: "size-10 text-xs",
  lg: "size-14 text-sm",
  xl: "size-20 text-lg",
};

export function UserAvatar({
  name,
  src,
  size = "md",
  className,
}: {
  name?: string | null;
  src?: string | null;
  size?: keyof typeof sizes;
  className?: string;
}) {
  return (
    <Avatar className={cn(sizes[size], className)}>
      <AvatarImage src={src || undefined} alt={name || "User"} />
      <AvatarFallback className="bg-primary/15 text-primary">
        {getInitials(name)}
      </AvatarFallback>
    </Avatar>
  );
}
