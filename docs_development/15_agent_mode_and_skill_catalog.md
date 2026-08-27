# RAPID4GRAD V4 Agent Mode and Skill Catalog

## Scope

`/ai-command` is RAPID AI Navigator. It keeps the V3 Chat Prompt Pack and adds an Agent Execution Pack. Chat mode only prepares prompts for external AI conversations. Agent mode prepares an execution instruction for Codex, Claude Code, Cursor, GitHub Copilot, or OpenCode; RAPID does not execute an Agent, call an AI provider, read local files, or upload research material.

The default mode is `chat`. Existing anonymous usage, Email verification, Google login, CMS templates, and Phase 1 fallback behavior remain unchanged. Agent generation consumes one existing usage event, not one event per platform. Preview mode generates locally and does not call the usage API.

## Interaction Modes

| Mode | User experience | Output |
|---|---|---|
| Chat / 分析 | Let an external AI understand material and provide advice. | V3 four-platform Prompt Pack with five steps per platform. |
| Agent / 直接執行 | Prepare a controlled instruction for an Agent to inspect, operate, modify, and verify. | One Agent Pack, five platform adapters, and up to two approved Skills. |

## Agent Tasks and Recommendations

| Task | Value | Recommended platform |
|---|---|---|
| 文獻 / Gap | `literature` | Claude Code |
| 論文 / Thesis | `paper` | Claude Code |
| 數據 / 統計 | `data` | Codex |
| Figure / 圖表 | `figure` | Codex |
| 簡報 / 口試 | `slides` | Claude Code |
| 實驗設計 | `experiment` | Claude Code |
| 研究程式 / 自動化 | `coding` | Codex |
| 專案整理 / 重現性 | `reproducibility` | Codex |

The user may provide an optional task description (maximum 1500 characters), working path/file hints, and additional constraints. The latter two fields are prompt content only; they are never sent as usage telemetry.

## Supported Platforms

Only these five platforms are supported: Codex, Claude Code, Cursor, GitHub Copilot, and OpenCode. Platform tabs only change the prepared text and do not generate another usage event.

## Approved Skills

Skills are an allowlist, not an open-ended GitHub search feature. At most two Skills are selected per task. Every reference is pinned to an approved repository and commit:

| Source | Revision | License | Review |
|---|---|---|---|
| `K-Dense-AI/scientific-agent-skills` | `36d8f13a1e754618794bf42f417884940077b4ae` | MIT | 2026-08-28 |
| `obra/superpowers` | `b36e0829c6d0140e93cfef2ca599b1b07d4a7797` | MIT | 2026-08-28 |

Allowed catalog IDs are `literature-review`, `citation-management`, `scientific-writing`, `statistical-analysis`, `scientific-visualization`, `scientific-slides`, `experimental-design`, `scientific-brainstorming`, `test-driven-development`, and `verification-before-completion`. The catalog must never include a synthetic `superpowers` entry, `Imbad0202`, or substitute repositories.

| Task | Skills |
|---|---|
| `literature` | `literature-review`, `citation-management` |
| `paper` | `scientific-writing`, `citation-management` |
| `data` | `statistical-analysis`, `scientific-visualization` |
| `figure` | `scientific-visualization` |
| `slides` | `scientific-slides`, `scientific-visualization` |
| `experiment` | `experimental-design`, `scientific-brainstorming` |
| `coding` | `test-driven-development`, `verification-before-completion` |
| `reproducibility` | `verification-before-completion` |

The generated platform-specific bootstrap uses GitHub CLI `gh skill` as the preferred installer. It checks whether the exact Skill is already installed and discoverable, does not reinstall an available Skill, previews before installing, inspects `SKILL.md`, prefers project-scoped installation, and does not execute bundled scripts merely because they exist. It pins the approved SHA and exact path, never uses global scope, `--force`, `--all`, or update commands. If `gh skill` is unavailable, the prompt describes a temporary-checkout, project-local manual fallback without cloning and copying the whole repository. It forbids `curl | sh`, `wget | bash`, and `irm ... | iex`, and instructs the Agent to report when installation is unavailable. It must not search GitHub for substitutes.

## Platform Adapter

| Platform | Agent host | Project Skill directory | Instruction files |
|---|---|---|---|
| Codex | `codex` | `.agents/skills` | `AGENTS.md` |
| Claude Code | `claude-code` | `.claude/skills` | `CLAUDE.md` |
| Cursor | `cursor` | `.agents/skills` | `AGENTS.md`, `.cursor/rules` |
| GitHub Copilot | `github-copilot` | `.agents/skills` | `.github/copilot-instructions.md`, `AGENTS.md` |
| OpenCode | `opencode` | `.agents/skills` | `AGENTS.md`, `opencode.json`, `opencode.jsonc` |

Each platform receives a different bootstrap prompt. Every Skill is dynamically represented with `gh skill list`, `gh skill preview`, `gh skill install`, `--scope project`, `--pin`, its approved repository, exact path, and the corresponding project target directory. Conflicting same-name Skills are not overwritten or deleted.

## Prompt Phases

Every Agent pack contains these phases:

1. `PHASE 0 — Safety & Capability Preflight`
2. `PHASE 1 — Skill Bootstrap`
3. `PHASE 2 — Inspect Workspace`
4. `PHASE 3 — Execute Research Task`
5. `PHASE 4 — Verify`
6. `PHASE 5 — Deliver`

Platform adapters are intentionally different: Codex uses AGENTS.md and terminal verification; Claude Code uses CLAUDE.md/.claude/skills and evidence-first work; Cursor uses codebase/symbol search and Agent Mode; GitHub Copilot uses Issue and Acceptance Criteria structure; OpenCode uses AGENTS.md, native skills, configuration, and permission boundaries.

## Integrity and Privacy

All packs require Traditional Chinese responses where appropriate, allow academic English terminology, prohibit fabricated literature/DOI/data/experiments/references, require evidence and interpretation to be separated, mark missing information, preserve raw data, confirm file purpose before editing, and use reproducible workflows.

Only `agentContext`, `workingPath`, and `constraints` exist in React state. The usage request sends a compact `V4_AGENT_PACK` summary with task, recommended platform, Skill IDs, and `platforms=5`; it never sends context, path, constraints, or the full prompt. Legacy telemetry maps Codex to `chatgpt`, Claude Code to `claude`, and the other platforms to `chatgpt`.

## Result UX

The full prompt is collapsed by default. The primary action copies `複製完整 Agent 指令`; secondary actions copy only Skill preparation or the task. Technical metadata is collapsed and displays repository, commit, license, and review date. Before the result, the layout is one column on narrow screens; after the result, the five platform tabs are horizontally scrollable.
