export default function FieldError({ message, inputId }: { message?: string; inputId?: string }) {
  if (!message) return null
  return (
    <p className="field-error-text" role="alert" {...(inputId ? { id: `${inputId}-error` } : {})}>
      {message}
    </p>
  )
}
