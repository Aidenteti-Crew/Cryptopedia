const inputClass =
  'mt-2 h-11 w-full border border-[var(--editorial-line)] bg-transparent px-3 text-[15px] text-[var(--editorial-strong)] outline-none placeholder:text-[var(--editorial-muted)] focus:border-[var(--editorial-accent)]'

export function AuthField({
  id,
  label,
  type = 'text',
  value,
  onChange,
  autoComplete,
  placeholder,
  hint,
}: {
  id: string
  label: string
  type?: 'text' | 'email' | 'password'
  value: string
  onChange: (value: string) => void
  autoComplete?: string
  placeholder?: string
  hint?: string
}) {
  return (
    <div className="mt-4 first:mt-0">
      <label htmlFor={id} className="text-sm text-[var(--editorial-muted)]">
        {label}
      </label>
      <input
        id={id}
        type={type}
        inputMode={type === 'email' ? 'email' : undefined}
        autoComplete={autoComplete}
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-describedby={hint ? `${id}-hint` : undefined}
        className={inputClass}
      />
      {hint && (
        <p id={`${id}-hint`} className="mt-2 text-xs leading-5 text-[var(--editorial-muted)]">
          {hint}
        </p>
      )}
    </div>
  )
}
