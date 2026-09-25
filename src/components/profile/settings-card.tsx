import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";

// Card for a settings section: a titled header, a body and an optional
// footer bar for actions. Body and footer are separate so a form can wrap
// both (fields in the body, submit button in the footer).
export function SettingsCard({
  title,
  description,
  children,
  className,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "overflow-hidden rounded-xl border bg-card text-card-foreground shadow-xs",
        className,
      )}
    >
      <header className="border-b px-5 py-4 sm:px-6">
        <h2 className="text-base font-semibold">{title}</h2>
        {description && (
          <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
        )}
      </header>
      {children}
    </section>
  );
}

export function SettingsCardBody({
  className,
  ...props
}: ComponentProps<"div">) {
  return <div className={cn("px-5 py-5 sm:px-6", className)} {...props} />;
}

export function SettingsCardFooter({
  className,
  ...props
}: ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "flex items-center justify-end gap-2 border-t bg-muted/40 px-5 py-3 sm:px-6",
        className,
      )}
      {...props}
    />
  );
}
