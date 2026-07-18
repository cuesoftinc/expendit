/**
 * FormRow — design.md §8.2: label + control + helper/error · state
 * default / focus / error / disabled (tax profile, org settings, manual
 * entry). Focus styling lives on the control; the row wires ids + text.
 */

import React, { useId } from "react";
import { cn } from "@/lib/cn";

export interface FormRowProps {
  label: string;
  /** Control render-prop receives the wired control id. */
  children: (controlId: string) => React.ReactNode;
  helper?: string;
  error?: string | null;
  disabled?: boolean;
  /** Marks the label with the required asterisk. */
  required?: boolean;
  className?: string;
}

export const FormRow: React.FC<FormRowProps> = ({
  label,
  children,
  helper,
  error = null,
  disabled = false,
  required = false,
  className,
}) => {
  const controlId = useId();
  return (
    <div
      data-state={error ? "error" : disabled ? "disabled" : "default"}
      className={cn("w-full", disabled && "opacity-60", className)}
    >
      <label
        htmlFor={controlId}
        className="mb-1 block text-[13px] font-medium text-text"
      >
        {label}
        {required ? (
          <span aria-hidden className="ml-0.5 text-expense">
            *
          </span>
        ) : null}
      </label>
      {children(controlId)}
      {error ? (
        <p role="alert" className="mt-1 text-[13px] text-expense">
          {error}
        </p>
      ) : helper ? (
        <p className="mt-1 text-[13px] text-text-2">{helper}</p>
      ) : null}
    </div>
  );
};

export default FormRow;
