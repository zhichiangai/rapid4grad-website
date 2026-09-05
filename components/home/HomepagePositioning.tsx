import Link from "next/link";

const navigationSteps = [
  ["01", "Weekly", "研究進度", "留下這週完成了什麼、卡在哪裡。"],
  ["02", "Meeting", "教授討論", "把討論與決策留在研究路徑上。"],
  ["03", "Actions", "下一步", "把 Meeting 變成可以完成的行動。"],
  ["04", "Thesis", "論文里程碑", "知道現在位於哪個論文階段。"],
  ["05", "Risk", "目前風險", "找到現在最值得優先處理的問題。"],
  ["06", "Next", "回到下一步", "把研究全貌帶回今天真正要做的事。"],
];

const studentCapabilities = [
  ["01", "每週研究進度", "每週留下完成事項、卡點與下週計畫，避免研究節奏在 Meeting 之間消失。"],
  ["02", "研究 Meeting", "記錄討論、決策與下一次 Meeting，讓教授的建議不再只留在筆記裡。"],
  ["03", "我的下一步", "把 Meeting 決策變成可以實際執行的下一步，而不是一張越列越長的待辦表。"],
  ["04", "論文進度", "看懂目前位於研究方向、方法、執行、分析、寫作或口試哪個階段。"],
  ["05", "畢業風險", "根據你留下的研究進度，提醒目前最值得優先處理的研究問題。"],
];

const professorViews = [
  ["Needs Attention", "先看誰現在需要注意。"],
  ["This Week", "掌握學生本週留下的進度。"],
  ["Upcoming Meetings", "知道下一次討論何時發生。"],
  ["Students", "用 supervision view 看見研究脈絡。"],
];

function Eyebrow({ children }: { children: React.ReactNode }) {
  return <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-300">{children}</p>;
}

function ProductPreview() {
  return (
    <div className="relative mx-auto w-full max-w-xl lg:ml-auto">
      <div className="absolute -inset-8 rounded-[3rem] bg-cyan-500/10 blur-3xl" />
      <div className="relative overflow-hidden rounded-[2rem] border border-white/15 bg-slate-950/90 shadow-2xl shadow-cyan-950/30">
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-300">Research 360</p>
            <p className="mt-1 text-xs text-slate-500">產品示意</p>
          </div>
          <span className="rounded-full border border-amber-300/30 bg-amber-300/10 px-3 py-1 text-xs font-medium text-amber-200">需要注意</span>
        </div>
        <div className="space-y-5 p-5 sm:p-7">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">目前研究狀態</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-white">有一件事值得先處理</h2>
            <p className="mt-2 text-sm leading-6 text-slate-400">研究進度不一定停住了，但下一步需要更清楚。</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-amber-300/20 bg-amber-300/[0.07] p-4"><p className="text-xs text-amber-200">主要原因</p><p className="mt-2 font-medium text-slate-100">1 項 Action 已逾期</p></div>
            <div className="rounded-2xl border border-blue-300/20 bg-blue-300/[0.07] p-4"><p className="text-xs text-blue-200">本週</p><p className="mt-2 font-medium text-slate-100">Weekly 已更新</p></div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
            <div className="flex items-end justify-between gap-3"><div><p className="text-xs uppercase tracking-[0.18em] text-slate-500">論文進度</p><p className="mt-2 font-medium text-white">研究方法與實驗設計</p></div><p className="font-mono text-sm text-cyan-200">3 / 8</p></div>
            <div className="mt-4 h-2 rounded-full bg-slate-800"><div className="h-2 w-[37.5%] rounded-full bg-cyan-300" /></div>
          </div>
          <div className="flex flex-col gap-3 rounded-2xl border border-cyan-300/20 bg-cyan-300/[0.08] p-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-xs text-cyan-200">現在最值得做</p><p className="mt-1 font-medium text-white">完成實驗設計整理</p><p className="mt-1 text-xs text-slate-400">Next Meeting：09/12</p></div><span className="inline-flex shrink-0 items-center justify-center rounded-xl bg-cyan-300 px-4 py-2 text-sm font-semibold text-slate-950">處理下一步</span></div>
        </div>
      </div>
    </div>
  );
}

export function HomepagePositioning() {
  return (
    <main className="min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,rgba(37,99,235,0.2),transparent_34rem),radial-gradient(circle_at_85%_18%,rgba(6,182,212,0.12),transparent_30rem),linear-gradient(180deg,#020617_0%,#0b1224_46%,#020617_100%)] text-white">
      <header className="mx-auto w-full max-w-7xl px-4 pt-5 sm:px-6 lg:px-8"><nav className="flex items-center justify-between rounded-2xl border border-white/10 bg-slate-950/65 px-4 py-3 backdrop-blur sm:rounded-full sm:px-5"><Link href="/" className="text-sm font-semibold tracking-[0.2em] text-white">RAPID4GRAD</Link><div className="hidden items-center gap-6 text-sm text-slate-300 md:flex"><a href="#product" className="transition hover:text-white">產品</a><a href="#tools" className="transition hover:text-white">免費工具</a><a href="#professor" className="transition hover:text-white">教授端</a><Link href="/course" className="transition hover:text-white">課程</Link><Link href="/guide" className="transition hover:text-white">指南</Link><Link href="/login" className="transition hover:text-white">登入</Link><Link href="/quiz" className="rounded-xl bg-cyan-300 px-4 py-2 font-semibold text-slate-950 transition hover:bg-cyan-200">開始診斷</Link></div><details className="relative md:hidden"><summary className="cursor-pointer list-none rounded-xl border border-white/10 px-3 py-2 text-sm text-slate-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-300">選單</summary><div className="absolute right-0 z-20 mt-3 grid min-w-48 gap-1 rounded-2xl border border-white/10 bg-slate-950 p-2 shadow-2xl shadow-black/30"><a href="#product" className="rounded-xl px-3 py-2 text-sm text-slate-200 hover:bg-white/10">產品</a><a href="#tools" className="rounded-xl px-3 py-2 text-sm text-slate-200 hover:bg-white/10">免費工具</a><a href="#professor" className="rounded-xl px-3 py-2 text-sm text-slate-200 hover:bg-white/10">教授端</a><Link href="/course" className="rounded-xl px-3 py-2 text-sm text-slate-200 hover:bg-white/10">課程</Link><Link href="/guide" className="rounded-xl px-3 py-2 text-sm text-slate-200 hover:bg-white/10">指南</Link><Link href="/login" className="rounded-xl px-3 py-2 text-sm text-slate-200 hover:bg-white/10">登入</Link><Link href="/quiz" className="mt-1 rounded-xl bg-cyan-300 px-3 py-2 text-center text-sm font-semibold text-slate-950">開始診斷</Link></div></details></nav></header>
      <section className="mx-auto grid w-full max-w-7xl items-center gap-14 px-4 pb-24 pt-16 sm:px-6 sm:pt-24 lg:grid-cols-[0.92fr_1.08fr] lg:px-8 lg:pt-28"><div><Eyebrow>Graduate Navigation System</Eyebrow><h1 className="mt-6 max-w-3xl text-5xl font-semibold leading-[1.05] tracking-[-0.04em] text-white sm:text-6xl lg:text-7xl">研究生的<span className="block text-cyan-200">畢業導航系統</span></h1><p className="mt-7 max-w-2xl text-lg leading-8 text-slate-300 sm:text-xl">不只是記錄進度，而是知道下一步該做什麼。</p><p className="mt-4 max-w-2xl text-base leading-8 text-slate-400">把每週進度、教授 Meeting、下一步與論文里程碑放在同一條研究路徑上，讓你隨時知道目前做到哪裡、哪裡卡住，以及接下來最值得處理什麼。</p><div className="mt-9 flex flex-col gap-3 sm:flex-row"><Link href="/quiz" className="inline-flex items-center justify-center rounded-2xl bg-cyan-300 px-6 py-4 text-sm font-semibold text-slate-950 shadow-lg shadow-cyan-950/20 transition hover:bg-cyan-200">開始研究狀態診斷</Link><Link href="/login" className="inline-flex items-center justify-center rounded-2xl border border-white/15 bg-white/[0.04] px-6 py-4 text-sm font-semibold text-slate-100 transition hover:bg-white/[0.09]">登入研究工作台</Link></div><p className="mt-5 text-sm text-slate-500">先用 7 題了解目前研究狀態，再決定下一步。</p></div><ProductPreview /></section>
      <section className="border-y border-white/10 bg-white/[0.025] px-4 py-16 sm:px-6 lg:px-8"><div className="mx-auto grid w-full max-w-7xl gap-8 lg:grid-cols-[0.75fr_1.25fr] lg:items-center"><div><Eyebrow>Research Reality</Eyebrow><h2 className="mt-4 max-w-xl text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">研究最容易失控的，不是工作太少，而是不知道現在該先處理什麼。</h2></div><div className="grid gap-3 sm:grid-cols-3">{[["進度散落","Meeting 在一個地方，待辦在另一個地方，論文進度靠自己記。"],["Meeting 後斷線","教授講完很多事情，但沒有變成可追蹤的下一步。"],["看不到研究全貌","每天都很忙，卻不知道離下一個論文階段更近了沒有。"]].map(([title,body])=><article key={title} className="border-l border-cyan-300/40 pl-4"><h3 className="font-semibold text-white">{title}</h3><p className="mt-2 text-sm leading-6 text-slate-400">{body}</p></article>)}</div></div></section>
      <section id="loop" className="mx-auto w-full max-w-7xl px-4 py-24 sm:px-6 lg:px-8"><div className="max-w-2xl"><Eyebrow>How RAPID Works</Eyebrow><h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">RAPID 把研究變成一條可以看懂的路徑</h2><p className="mt-4 text-base leading-7 text-slate-400">每一次留下的研究紀錄，都會接回下一個更清楚的研究決定。</p></div><div className="mt-12 grid gap-px overflow-hidden rounded-[2rem] border border-white/10 bg-white/10 sm:grid-cols-2 lg:grid-cols-6">{navigationSteps.map(([number,name,title,body],index)=><div key={name} className="relative bg-slate-950/85 p-5 lg:min-h-56"><p className="font-mono text-xs text-cyan-300">{number}</p><h3 className="mt-8 text-lg font-semibold text-white">{title}</h3><p className="mt-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{name}</p><p className="mt-4 text-sm leading-6 text-slate-400">{body}</p>{index<navigationSteps.length-1&&<span aria-hidden="true" className="absolute right-4 top-5 hidden text-cyan-300/50 lg:block">→</span>}</div>)}</div></section>
      <section id="product" className="bg-slate-950/60 px-4 py-24 sm:px-6 lg:px-8"><div className="mx-auto grid w-full max-w-7xl gap-14 lg:grid-cols-[0.7fr_1.3fr] lg:items-start"><div className="lg:sticky lg:top-8"><Eyebrow>Research 360</Eyebrow><h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">打開 RAPID，30 秒看懂現在的研究狀態</h2><p className="mt-5 text-base leading-8 text-slate-400">從目前狀態、主要原因到下一步，研究全貌不必再靠腦中拼湊。</p><Link href="/quiz" className="mt-7 inline-flex text-sm font-semibold text-cyan-200 underline decoration-cyan-300/40 underline-offset-4 hover:text-cyan-100">先看看我的研究狀態 →</Link></div><div className="grid gap-4 sm:grid-cols-3">{[["我現在在哪裡？","Thesis Progress","看懂目前位於哪一個論文階段。"],["我目前哪裡有問題？","Graduation Risk","收到研究導航提醒，而不是機率預測。"],["我現在應該做什麼？","Actions / Next Step","把研究決定轉成今天可以開始的行動。"]].map(([question,answer,body])=><article key={question} className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 sm:p-6"><p className="text-sm font-semibold text-cyan-200">{question}</p><h3 className="mt-8 text-xl font-semibold text-white">{answer}</h3><p className="mt-3 text-sm leading-6 text-slate-400">{body}</p></article>)}</div></div></section>
      <section className="mx-auto w-full max-w-7xl px-4 py-24 sm:px-6 lg:px-8"><div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end"><div><Eyebrow>Student Workspace</Eyebrow><h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">給研究生的 Research Workspace</h2></div><p className="max-w-md text-sm leading-6 text-slate-400">不是更多功能，而是把研究中最需要接起來的五件事放在同一條路徑上。</p></div><div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">{studentCapabilities.map(([number,title,body])=><article key={title} className="rounded-2xl border border-white/10 bg-white/[0.03] p-5"><p className="font-mono text-xs text-cyan-300">{number}</p><h3 className="mt-8 text-lg font-semibold text-white">{title}</h3><p className="mt-3 text-sm leading-6 text-slate-400">{body}</p></article>)}</div></section>
      <section id="professor" className="border-y border-white/10 bg-blue-950/20 px-4 py-20 sm:px-6 lg:px-8"><div className="mx-auto grid w-full max-w-7xl gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center"><div><Eyebrow>Professor Supervision</Eyebrow><h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">教授不需要更多報表，只需要知道誰現在需要注意。</h2><p className="mt-5 max-w-xl text-base leading-8 text-slate-400">RAPID 將學生的 Weekly、Meeting 與研究狀態整理成 supervision view，讓教授快速掌握需要介入的學生、本週進度與接下來的 Meeting。</p><Link href="/login" className="mt-7 inline-flex rounded-2xl border border-cyan-300/30 bg-cyan-300/10 px-5 py-3 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-300/15">我是教授</Link></div><div className="grid gap-3 sm:grid-cols-2">{professorViews.map(([title,body])=><article key={title} className="rounded-2xl border border-white/10 bg-slate-950/50 p-5"><h3 className="font-semibold text-white">{title}</h3><p className="mt-2 text-sm leading-6 text-slate-400">{body}</p></article>)}</div></div></section>
      <section id="tools" className="mx-auto grid w-full max-w-7xl gap-8 px-4 py-20 sm:px-6 lg:grid-cols-[1fr_0.8fr] lg:px-8"><div><Eyebrow>Research Tools</Eyebrow><h2 className="mt-4 text-3xl font-semibold tracking-tight">研究導航之外，也提供 AI 研究工具</h2><p className="mt-4 max-w-2xl text-base leading-7 text-slate-400">AI 是研究流程中的工具，不是整個產品本身。需要時，再用更精準的指令處理 Meeting 預演與 PDF 稽核。</p></div><div className="grid gap-3 sm:grid-cols-2"><Link href="/ai-command" className="rounded-2xl border border-white/10 bg-white/[0.035] p-5 transition hover:border-cyan-300/30 hover:bg-cyan-300/[0.05]"><p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">AI Command Builder</p><h3 className="mt-4 font-semibold text-white">Meeting 前，先知道教授可能怎麼問</h3><p className="mt-2 text-sm leading-6 text-slate-400">把研究情境整理成可以貼到外部 AI 的精準指令。</p></Link><Link href="/guide" className="rounded-2xl border border-white/10 bg-white/[0.035] p-5 transition hover:border-cyan-300/30 hover:bg-cyan-300/[0.05]"><p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">Free Guide</p><h3 className="mt-4 font-semibold text-white">研究生畢業避坑指南</h3><p className="mt-2 text-sm leading-6 text-slate-400">先理解常見卡點，再回到自己的研究狀態。</p></Link></div></section>
      <section className="mx-auto w-full max-w-7xl px-4 pb-20 sm:px-6 lg:px-8"><div className="rounded-[2rem] border border-cyan-300/20 bg-cyan-300/[0.08] px-6 py-12 text-center sm:px-10"><Eyebrow>Start With Your State</Eyebrow><h2 className="mx-auto mt-4 max-w-2xl text-3xl font-semibold tracking-tight sm:text-4xl">不知道現在該先處理什麼？</h2><p className="mx-auto mt-4 max-w-xl text-base leading-7 text-slate-300">先用 7 題了解目前研究狀態，再回到一條更清楚的研究路徑。</p><Link href="/quiz" className="mt-8 inline-flex rounded-2xl bg-cyan-300 px-6 py-4 text-sm font-semibold text-slate-950 shadow-lg shadow-cyan-950/20 transition hover:bg-cyan-200">開始研究狀態診斷</Link></div></section>
    </main>
  );
}
