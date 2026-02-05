import * as React from "react";
import { type VariantProps } from "class-variance-authority";
declare const buttonVariants: (props?: ({
    variant?: "primary" | "secondary" | "ghost" | null | undefined;
    size?: "sm" | "md" | "lg" | null | undefined;
} & import("class-variance-authority/types").ClassProp) | undefined) => string;
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
}
export declare function Button({ className, variant, size, ...props }: ButtonProps): import("react/jsx-runtime").JSX.Element;
export {};
