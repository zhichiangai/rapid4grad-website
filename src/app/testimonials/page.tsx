import { SiteShell } from '@/components/site-shell';

const testimonials = [
  {
    name: 'jason lin',
    school: '台科大電機所',
    quote: '溝通那個章節，對於不要說別人壞話、轉移話題的處理技巧印象深刻，非常有幫助。'
  },
  {
    name: '曾同學',
    school: '清華大學',
    quote: '謝謝學長願意撥出時間給予我建議的修改地方。'
  },
  {
    name: '王同學',
    school: '成功大學',
    quote: 'AI 工具真的太實用了，讓我的研究效率翻倍。'
  }
];

export default function TestimonialsPage() {
  return (
    <SiteShell>
      <section className="rounded-[38px] border border-[#dbe6ff] bg-white p-7 shadow-[0_18px_44px_rgba(16,32,58,0.08)] sm:p-10">
        <div className="inline-flex rounded-full bg-[#e9efff] px-3 py-1 text-xs font-semibold tracking-[0.12em] text-[#2144b2]">
          Testimonials
        </div>
        <h1 className="mt-5 text-4xl font-black tracking-tight text-[#10203a]">真實回饋</h1>
        <p className="mt-4 max-w-3xl text-[17px] leading-8 text-[#62708d]">
          保留原站的學員回饋內容，作為信任頁與社會證明。
        </p>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {testimonials.map((item) => (
            <article key={item.name} className="rounded-[28px] border border-[#dbe6ff] bg-[#f8faff] p-6">
              <div className="text-lg font-extrabold text-[#2144b2]">{item.name}</div>
              <div className="mt-1 text-sm font-semibold text-[#62708d]">{item.school}</div>
              <p className="mt-4 leading-7 text-[#20304b]">「{item.quote}」</p>
            </article>
          ))}
        </div>
      </section>
    </SiteShell>
  );
}
