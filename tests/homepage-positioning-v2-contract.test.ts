import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const read = (path: string) => fs.readFileSync(path, "utf8");

test("Homepage positions RAPID as a student-first graduate navigation system", () => {
  const page = read("components/home/HomepagePositioning.tsx");
  const route = read("app/page.tsx");

  assert.match(route, /HomepagePositioning/);
  assert.match(page, /Graduate Navigation System/);
  assert.match(page, /研究生的/);
  assert.match(page, /畢業導航系統/);
  assert.match(page, /開始研究狀態診斷/);
  assert.match(page, /href="\/quiz"/);
  assert.match(page, /登入研究工作台/);
  assert.match(page, /Weekly/);
  assert.match(page, /Meeting/);
  assert.match(page, /Actions/);
  assert.match(page, /Thesis/);
  assert.match(page, /Risk/);
  assert.match(page, /研究生的 Research Workspace/);
  assert.match(page, /Professor Supervision/);
  assert.match(page, /AI 是研究流程中的工具/);
  assert.doesNotMatch(page, /Academic AI Command Builder[\s\S]{0,120}h1/);
  assert.doesNotMatch(page, /畢業率|畢業機率|保證畢業|testimonial|使用者數/);
});

test("Homepage keeps public routes and protected workspace entry points intact", () => {
  const page = read("components/home/HomepagePositioning.tsx");
  const layout = read("app/layout.tsx");

  for (const route of ["/quiz", "/guide", "/course", "/login", "/ai-command"]) {
    assert.match(page, new RegExp(route.replace("/", "\\/")));
  }
  assert.match(layout, /研究生畢業導航系統/);
  assert.match(layout, /研究進度、教授 Meeting、下一步/);
});
