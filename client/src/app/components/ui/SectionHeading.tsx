/**
 * Section heading with an error badge: renders a red dot with the error count
 * when any field inside the section is invalid.
 */
export default function SectionHeading({ title, errorCount }: { title: string; errorCount?: number }) {
  return (
    <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-secondary-900">
      {title}
      {errorCount ? (
        <span className="section-error-badge" title={`${errorCount} field${errorCount === 1 ? '' : 's'} need attention`}>
          {errorCount}
        </span>
      ) : null}
    </h3>
  )
}
