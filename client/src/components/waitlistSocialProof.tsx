const avatars = [
  "https://i.pravatar.cc/100?img=1",
  "https://i.pravatar.cc/100?img=2",
  "https://i.pravatar.cc/100?img=3",
  "https://i.pravatar.cc/100?img=4",
  "https://i.pravatar.cc/100?img=5",
];

export default function WaitlistSocialProof({ count }: { count: number }) {
  return (
    <div className="flex items-center gap-3 mt-6">
      {/* Avatar Stack */}
      <div className="flex -space-x-3">
        {avatars.map((src, i) => (
          <img
            key={i}
            src={src}
            alt="user"
            className="w-9 h-9 rounded-full border-2 border-white dark:border-gray-800 shadow-sm"
          />
        ))}
      </div>

      {/* Text */}
      <p className="text-sm text-gray-600 dark:text-gray-400">
        <span className="font-semibold text-gray-900 dark:text-white">
          {count}+{" "}
        </span>
        users on the waitlist
      </p>
    </div>
  );
}
