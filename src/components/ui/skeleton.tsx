import { cn } from "@/lib/utils"

/** Placeholder with shimmer; `shimmer` utility honours prefers-reduced-motion (see index.css). */
function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      aria-hidden="true"
      className={cn("shimmer rounded-md", className)}
      {...props}
    />
  )
}

export { Skeleton }
