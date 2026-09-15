import type { ReactNode } from 'react'
import FieldError from './FieldError'

/**
 * Standard form field: label + control + inline error.
 * The wrapper gets `field-invalid` when `error` is set, which styles the
 * control with a red border + light red tint (see index.css).
 *
 * Pass `children` to render a custom control (select/textarea); otherwise a
 * text input is rendered from the props. The input id doubles as the anchor
 * for auto-scroll/focus on failed submit.
 */
export default function FormField({
  id,
  label,
  required = false,
  error,
  value,
  onChange,
  onBlur,
  type = 'text',
  placeholder,
  children,
}: {
  id: string
  label: string
  required?: boolean
  error?: string
  value?: string
  onChange?: (value: string) => void
  onBlur?: () => void
  type?: string
  placeholder?: string
  children?: ReactNode
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-medium text-secondary-700">
        {label} {required && <span className="text-destructive-500">*</span>}
      </label>
      {children ? (
        <div className={error ? 'field-invalid' : undefined}>{children}</div>
      ) : (
        <input
          id={id}
          type={type}
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange?.(e.target.value)}
          onBlur={onBlur}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-error` : undefined}
          className={`w-full rounded-lg border px-4 py-2.5 text-sm focus:outline-none focus:ring-1 ${
            error
              ? 'border-destructive-500 bg-[#fdeaea] focus:border-destructive-500 focus:ring-destructive-500'
              : 'border-secondary-300 focus:border-primary-500 focus:ring-primary-500'
          }`}
        />
      )}
      <FieldError message={error} inputId={id} />
    </div>
  )
}
