import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium ring-offset-background focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "btn-3d-primary text-white",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline: "btn-3d-ghost",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "btn-3d-ghost",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
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
