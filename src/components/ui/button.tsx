import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-bold ring-offset-background focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 transition-all duration-200 ease-out enabled:active:scale-[0.98]",
  {
    variants: {
      variant: {
        default: "btn-3d-primary text-white",
        destructive: cn(
          "rounded-xl bg-destructive text-destructive-foreground shadow-md",
          "enabled:hover:bg-destructive/90 enabled:hover:shadow-lg"
        ),
        outline: "btn-3d-ghost",
        secondary: cn(
          "rounded-xl bg-secondary text-secondary-foreground shadow-sm",
          "enabled:hover:bg-secondary/80 enabled:hover:shadow-md"
        ),
        ghost:
          "rounded-xl border border-transparent bg-transparent font-semibold text-[#565656] enabled:hover:bg-[#f4f3f8] enabled:hover:text-[#333333] enabled:hover:shadow-sm",
        link: "rounded-xl text-primary underline-offset-4 enabled:hover:underline",
      },
      size: {
        default: "min-h-11 rounded-xl px-6 py-3",
        sm: "min-h-9 rounded-xl px-4 py-2 text-sm",
        lg: "min-h-12 rounded-xl px-8 py-4 text-base",
        icon: "h-11 w-11 rounded-xl",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    const rippleRef = React.useRef<HTMLSpanElement | null>(null)

    const onPointerDown: React.PointerEventHandler<HTMLButtonElement> = (e) => {
      props.onPointerDown?.(e)
      const el = rippleRef.current
      if (!el) return
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top
      el.style.setProperty("--ripple-x", `${x}px`)
      el.style.setProperty("--ripple-y", `${y}px`)
      el.classList.remove("is-on")
      // force reflow
      void el.offsetWidth
      el.classList.add("is-on")
    }

    return (
      <Comp
        className={cn("relative", buttonVariants({ variant, size, className }))}
        ref={ref}
        onPointerDown={onPointerDown}
        {...props}
      >
        {asChild ? (
          props.children
        ) : (
          <>
            <span ref={rippleRef} className="ripple" />
            {props.children}
          </>
        )}
      </Comp>
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
