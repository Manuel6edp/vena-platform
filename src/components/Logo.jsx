/**
 * Logo de VENA — gota de sangre estilizada + wordmark.
 * @param {{ className?: string, showText?: boolean, textClassName?: string }} props
 */
export default function Logo({ className = 'h-10 w-10', showText = true, textClassName = '' }) {
  return (
    <div className="flex items-center gap-3">
      <svg
        viewBox="0 0 48 48"
        className={className}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        {/* Gota */}
        <path
          d="M24 3C24 3 8 21 8 31a16 16 0 1 0 32 0C40 21 24 3 24 3Z"
          fill="#dc2626"
        />
        {/* Reflejo interno tipo "vena" */}
        <path
          d="M24 15c-4 5-6 9-6 13a6 6 0 0 0 6 6"
          stroke="#fff"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      {showText && (
        <span className={`text-2xl font-extrabold tracking-tight ${textClassName}`}>
          VENA
        </span>
      )}
    </div>
  )
}
