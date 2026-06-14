import Link from 'next/link';

type RoleAccessPanelProps = {
  roleLabel: string;
  title: string;
  description: string;
  loginHref: string;
  guestHref: string;
  loginLabel: string;
  guestLabel: string;
  note: string;
  highlights: string[];
};

export function RoleAccessPanel({
  roleLabel,
  title,
  description,
  loginHref,
  guestHref,
  loginLabel,
  guestLabel,
  note,
  highlights
}: RoleAccessPanelProps) {
  return (
    <section className="rounded-[34px] border border-[#dbe6ff] bg-white p-6 shadow-[0_18px_44px_rgba(16,32,58,0.08)] sm:p-7">
      <div className="inline-flex rounded-full bg-[#e9efff] px-3 py-1 text-xs font-bold tracking-[0.12em] text-[#2144b2]">
        {roleLabel}
      </div>
      <h2 className="mt-4 text-3xl font-black tracking-tight text-[#10203a]">{title}</h2>
      <p className="mt-3 text-[15px] leading-7 text-[#62708d]">{description}</p>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <Link
          href={loginHref}
          className="inline-flex min-h-12 items-center justify-center rounded-full bg-[linear-gradient(135deg,#315ef6,#2144b2)] px-5 text-sm font-bold text-white shadow-[0_14px_28px_rgba(33,68,178,0.18)] transition hover:-translate-y-0.5"
        >
          {loginLabel}
        </Link>
        <Link
          href={guestHref}
          className="inline-flex min-h-12 items-center justify-center rounded-full border border-[#dbe6ff] bg-white px-5 text-sm font-bold text-[#2144b2] transition hover:bg-[#f8faff]"
        >
          {guestLabel}
        </Link>
      </div>

      <div className="mt-5 grid gap-2">
        {highlights.map((item) => (
          <div key={item} className="rounded-[22px] bg-[#f8faff] px-4 py-3 text-sm leading-6 text-[#20304b]">
            {item}
          </div>
        ))}
      </div>

      <p className="mt-4 text-sm leading-7 text-[#62708d]">{note}</p>
    </section>
  );
}
