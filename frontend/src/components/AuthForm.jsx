export default function AuthForm({ title, children, onSubmit, submitLabel, error, busy }) {
  return (
    <section className="mx-auto max-w-md rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
      <h1 className="mb-6 text-2xl font-bold">{title}</h1>
      <form className="space-y-4" onSubmit={onSubmit}>
        {children}
        {error && <p role="alert" className="rounded bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        <button disabled={busy} className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 font-semibold text-white hover:bg-indigo-700 disabled:opacity-60">
          {busy ? 'Procesando…' : submitLabel}
        </button>
      </form>
    </section>
  );
}
