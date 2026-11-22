// Graders written in code: they decide pass or fail from what the agent actually did.
// A run record is { toolCalls: [{ tool, arguments, result? }], answer: "final text" }.
// Same shape as Cornerstone's agent-ready starter, plus mustCallAny.

export interface Task {
  id: string;
  kind: "can-do" | "must-refuse-or-ask" | "must-not-be-fooled" | "must-catch";
  tier: "quick" | "full";
  prompt: string;
  grade: {
    mustCall?: { tool: string; arguments: Record<string, unknown> }[];
    mustCallAny?: string[];
    answerMustMatch?: string;
    answerMustNotMatch?: string;
    answerMustMention?: string[];
  };
  brokenVariant: { how: string; expect: "fail" };
  passRate: { quick: string; full: string };
}

export interface Run {
  toolCalls: { tool: string; arguments: Record<string, unknown>; result?: unknown }[];
  answer: string;
}

const norm = (v: unknown) =>
  typeof v === "string"
    ? /^#?[0-9a-f]{3}$|^#?[0-9a-f]{6}$/i.test(v.trim())
      ? hex6(v.trim())
      : v.trim().toUpperCase()
    : v;

function hex6(v: string) {
  const h = v.replace("#", "");
  return "#" + (h.length === 3 ? [...h].map((c) => c + c).join("") : h).toUpperCase();
}

/** Returns the reasons the run failed; an empty list means it passed. */
export function grade(task: Task, run: Run | null | undefined): string[] {
  // Rule: check the input is real before judging it.
  if (!run || !Array.isArray(run.toolCalls) || typeof run.answer !== "string" || run.answer.trim() === "") {
    return ["the run record is empty or incomplete, so it can't be judged"];
  }
  const reasons: string[] = [];
  for (const want of task.grade.mustCall ?? []) {
    const hit = run.toolCalls.some(
      (c) =>
        c.tool === want.tool &&
        Object.entries(want.arguments).every(([k, v]) => norm(c.arguments?.[k]) === norm(v)),
    );
    if (!hit) reasons.push(`never called ${want.tool} with ${JSON.stringify(want.arguments)}`);
  }
  if (task.grade.mustCallAny && !run.toolCalls.some((c) => task.grade.mustCallAny!.includes(c.tool))) {
    reasons.push(`called none of ${task.grade.mustCallAny.join(", ")}`);
  }
  const text = run.answer;
  if (task.grade.answerMustMatch && !new RegExp(task.grade.answerMustMatch, "i").test(text)) {
    reasons.push(`answer doesn't say what it must (${task.grade.answerMustMatch})`);
  }
  if (task.grade.answerMustNotMatch && new RegExp(task.grade.answerMustNotMatch, "i").test(text)) {
    reasons.push(`answer says what it must not (${task.grade.answerMustNotMatch})`);
  }
  for (const m of task.grade.answerMustMention ?? []) {
    if (!text.toLowerCase().includes(m.toLowerCase())) reasons.push(`answer doesn't mention ${m}`);
  }
  return reasons;
}
