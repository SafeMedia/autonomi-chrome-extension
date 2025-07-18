import * as React from "react";

import { cn } from "@/lib/utils";

export interface InputProps
    extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
    ({ className, type, ...props }, ref) => {
        return (
            <input
                type={type}
                className={cn(
                    "block w-full h-9 bg-white text-black text-sm",
                    type !== "file" && "px-3", // Apply px-3 only to non-file inputs
                    "appearance-none",
                    "border border-gray-300 rounded-md overflow-hidden",
                    // File selector styling
                    "file:bg-black file:text-white file:border-0 file:rounded-none file:px-4 file:py-1 file:mr-3 file:h-full file:cursor-pointer",
                    "focus:outline-none focus:ring-1 focus:ring-blue-500",
                    className
                )}
                ref={ref}
                {...props}
            />
        );
    }
);

Input.displayName = "Input";

export { Input };
