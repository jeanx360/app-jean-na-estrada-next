"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";

export function ConfirmSubmitButton({
  message,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { message: string; children: ReactNode }) {
  return (
    <button
      {...props}
      type="submit"
      onClick={(event) => {
        if (!window.confirm(message)) event.preventDefault();
      }}
    >
      {children}
    </button>
  );
}
