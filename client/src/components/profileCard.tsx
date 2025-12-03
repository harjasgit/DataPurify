import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useUser } from "@/context/userContext";

export default function ProfileCard() {
  const { displayName, avatarUrl, plan } = useUser();

  return (
    <div className="flex flex-col items-center space-y-2 p-4 bg-card rounded-xl shadow-md w-56">
      <Avatar className="w-16 h-16">
        {avatarUrl ? (
          <AvatarImage src={avatarUrl} alt={displayName} />
        ) : (
          <AvatarFallback className="text-lg">
            {displayName.charAt(0).toUpperCase()}
          </AvatarFallback>
        )}
      </Avatar>

      <h3 className="text-lg font-semibold text-foreground">
        {displayName}
      </h3>

      <span className="px-3 py-1 text-xs rounded-full bg-primary text-primary-foreground capitalize">
        {plan === "pro" ? "Pro Plan" : "Free Plan"}
      </span>
    </div>
  );
}
