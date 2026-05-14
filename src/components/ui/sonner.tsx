import {
  CircleCheckIcon,
  InfoIcon,
  Loader2Icon,
  OctagonXIcon,
  TriangleAlertIcon,
} from "lucide-react"
import { useTheme } from "next-themes"
import { Toaster as Sonner, type ToasterProps } from "sonner"

// Project-wide toast styling.
//
// Tweaks vs. shadcn's default:
//   • Slightly larger, more legible font (`text-sm font-medium`, leading-snug).
//   • Generous padding so the message has breathing room.
//   • Bigger icons (size-5) aligned to the top of the title for two-line toasts.
//   • Soft shadow + 16px radius + 1.5px border so toasts read as a card, not a sliver.
//   • Title and description get distinct weight/colour for hierarchy.
//   • Per-type accent borders for richColors mode (green / red / amber / sky).
const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      // Wider toasts so descriptions wrap less aggressively at top-center.
      // The default 356px feels cramped for the auth pages' descriptions.
      offset={{ top: 20 }}
      icons={{
        success: <CircleCheckIcon className="size-5" />,
        info:    <InfoIcon         className="size-5" />,
        warning: <TriangleAlertIcon className="size-5" />,
        error:   <OctagonXIcon     className="size-5" />,
        loading: <Loader2Icon      className="size-5 animate-spin" />,
      }}
      toastOptions={{
        // Use Tailwind utility classes via Sonner's classNames API so the
        // typography and spacing stay in sync with the rest of the app.
        classNames: {
          toast:
            "group toast " +
            "min-w-[320px] sm:min-w-[420px] max-w-[520px] " +
            "rounded-2xl border-[1.5px] shadow-xl " +
            "px-5 py-4 gap-3 " +
            "font-sans antialiased",
          title:
            "text-[15px] font-semibold leading-snug tracking-tight",
          description:
            "text-[13px] font-medium leading-relaxed opacity-90 mt-1",
          icon:
            "shrink-0 self-start mt-0.5",
          actionButton:
            "rounded-lg px-3 py-1.5 text-xs font-semibold",
          cancelButton:
            "rounded-lg px-3 py-1.5 text-xs font-medium",
          closeButton:
            "rounded-full border-[1.5px] hover:scale-110 transition-transform",
          // richColors accents — bumped contrast so they're readable on both
          // light and dark backgrounds.
          success:
            "!bg-emerald-50 !text-emerald-900 !border-emerald-300 " +
            "dark:!bg-emerald-950/80 dark:!text-emerald-100 dark:!border-emerald-800",
          error:
            "!bg-red-50 !text-red-900 !border-red-300 " +
            "dark:!bg-red-950/80 dark:!text-red-100 dark:!border-red-800",
          warning:
            "!bg-amber-50 !text-amber-900 !border-amber-300 " +
            "dark:!bg-amber-950/80 dark:!text-amber-100 dark:!border-amber-800",
          info:
            "!bg-sky-50 !text-sky-900 !border-sky-300 " +
            "dark:!bg-sky-950/80 dark:!text-sky-100 dark:!border-sky-800",
        },
      }}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          // Slightly chunkier radius than the global --radius for a softer
          // card look on the toast specifically.
          "--border-radius": "1rem",
        } as React.CSSProperties
      }
      {...props}
    />
  )
}

export { Toaster }
