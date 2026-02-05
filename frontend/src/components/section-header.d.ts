import type { HTMLAttributes } from "react";
interface SectionHeaderProps extends HTMLAttributes<HTMLDivElement> {
    eyebrow: string;
    title: string;
    description: string;
}
export declare function SectionHeader({ eyebrow, title, description, className, ...props }: SectionHeaderProps): import("react/jsx-runtime").JSX.Element;
export {};
