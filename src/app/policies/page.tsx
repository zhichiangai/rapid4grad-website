import { SiteShell } from '@/components/site-shell';

const sections = [
  {
    title: '隱私權政策',
    items: [
      '我們只收集完成診斷、Email 培養與後續服務所需要的資料。',
      '診斷資料可能會用來產生個人化結果、Email 與 Dashboard 任務。',
      '我們不會出售你的個人資料給第三方。'
    ]
  },
  {
    title: '服務條款',
    items: [
      '本服務提供的是研究生畢業導航與學習支持，不是醫療、法律或正式學位保證。',
      '使用者應對自己輸入的資料負責，並確認內容真實。',
      '若你違反服務條款或濫用系統，我們可以暫停你的使用權限。'
    ]
  }
];

export default function PoliciesPage() {
  return (
    <SiteShell>
      <section className="rounded-[38px] border border-[#dbe6ff] bg-white p-7 shadow-[0_18px_44px_rgba(16,32,58,0.08)] sm:p-10">
        <div className="inline-flex rounded-full bg-[#e9efff] px-3 py-1 text-xs font-semibold tracking-[0.12em] text-[#2144b2]">
          Policies
        </div>
        <h1 className="mt-5 text-4xl font-black tracking-tight text-[#10203a]">隱私權政策與服務條款</h1>
        <p className="mt-4 max-w-3xl text-[17px] leading-8 text-[#62708d]">
          這一頁保留原本網站的信任內容，改成更簡潔、可讀的產品語氣。
        </p>

        <div className="mt-8 grid gap-5">
          {sections.map((section) => (
            <article key={section.title} className="rounded-[28px] border border-[#dbe6ff] bg-[#f8faff] p-6">
              <h2 className="text-2xl font-extrabold text-[#2144b2]">{section.title}</h2>
              <ul className="mt-4 grid gap-3 text-[#20304b]">
                {section.items.map((item) => (
                  <li key={item} className="rounded-2xl bg-white p-4 leading-7 shadow-[0_8px_16px_rgba(18,39,92,0.04)]">
                    {item}
                  </li>
                ))}
              </ul>
            </article>
          ))}

          <div className="rounded-[28px] border border-[#dbe6ff] bg-[linear-gradient(135deg,#315ef6,#2144b2)] p-6 text-white shadow-[0_18px_44px_rgba(33,68,178,0.2)]">
            <div className="text-sm font-semibold text-white/80">聯絡方式</div>
            <p className="mt-2 text-lg font-bold">如需修改資料或詢問使用條款，請透過 Email 聯絡我們。</p>
            <p className="mt-2 text-white/84">目前這是 MVP 階段，條款會隨產品功能持續更新。</p>
          </div>
        </div>
      </section>
    </SiteShell>
  );
}
