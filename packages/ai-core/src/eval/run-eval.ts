import { GOLDEN_DATASET, type EvalCase } from "./golden-dataset";
import {
  detectTradeIntent,
  detectPromptInjection,
  planTradeAgent,
  type AgentPlan,
  type TradeIntent,
} from "../index";
import * as fs from "node:fs";
import * as path from "node:path";

type EvalResult = {
  caseId: string;
  tags: string[];
  expected: TradeIntent;
  actual: TradeIntent;
  intentMatch: boolean;
  stepsMatch: boolean;
  extractedFieldsMatch: boolean;
  falsePositiveMutation: boolean;
  accuracy: number;
  details: string[];
};

type EvalSummary = {
  total: number;
  passed: number;
  failed: number;
  precisionByIntent: Record<
    string,
    { correct: number; total: number; precision: number }
  >;
  recallByIntent: Record<
    string,
    { correct: number; total: number; recall: number }
  >;
  falsePositiveMutationRate: number;
  fieldExtractionAccuracy: number;
  intentAccuracy: number;
  injectionDetectionRate: number;
  results: EvalResult[];
};

function normalizeTextForComparison(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-zA-Z0-9\u00C0-\u024F\u1EA0-\u1EF9\s]/g, "")
    .trim();
}

function fieldsPartiallyMatch(
  expected: Record<string, string | undefined>,
  actual: Record<string, string | undefined>,
): boolean {
  const keys = Object.keys(expected);
  if (keys.length === 0) return true;
  const matched = keys.filter((k) => {
    const ev = expected[k];
    const av = actual[k];
    if (!ev || !av) return false;
    return (
      normalizeTextForComparison(ev).includes(normalizeTextForComparison(av)) ||
      normalizeTextForComparison(av).includes(normalizeTextForComparison(ev))
    );
  });
  return matched.length >= Math.min(keys.length, 1);
}

function isMutation(intent: TradeIntent): boolean {
  return (
    intent === "CREATE_LEAD" ||
    intent === "DRAFT_QUOTATION" ||
    intent === "CREATE_FOLLOW_UP"
  );
}

async function runEval(): Promise<EvalSummary> {
  const results: EvalResult[] = [];
  let totalFalsePositives = 0;
  let totalMutationCases = 0;
  let totalFieldCases = 0;
  let fieldMatches = 0;
  let injectionCases = 0;
  let injectionDetected = 0;

  for (const tc of GOLDEN_DATASET) {
    const { message, expected, id, tags } = tc;
    const details: string[] = [];

    const isInjection = detectPromptInjection(message.text);
    const actualIntent = detectTradeIntent(message);
    const plan = planTradeAgent(message);

    const intentMatch = actualIntent === expected.intent;
    const stepsMatch =
      JSON.stringify(plan.steps.map((s) => s.action)) ===
      JSON.stringify(expected.steps?.map((s) => s.action));

    const expectedFields = expected.extractedFields ?? {};
    const extractedFieldsMatch = fieldsPartiallyMatch(
      expectedFields as Record<string, string | undefined>,
      plan.extractedFields as Record<string, string | undefined>,
    );

    if (expected.intent === "UNKNOWN" && isMutation(actualIntent)) {
      details.push(
        `FALSE POSITIVE MUTATION: expected UNKNOWN but got ${actualIntent}`,
      );
    }

    const falsePositiveMutation =
      expected.intent === "UNKNOWN" && isMutation(actualIntent);
    if (falsePositiveMutation) totalFalsePositives++;
    if (expected.intent === "UNKNOWN") totalMutationCases++;

    if (expectedFields && Object.keys(expectedFields).length > 0) {
      totalFieldCases++;
      if (extractedFieldsMatch) fieldMatches++;
    }

    if (tags.includes("injection")) {
      injectionCases++;
      if (isInjection) injectionDetected++;
    }

    results.push({
      caseId: id,
      tags,
      expected: expected.intent,
      actual: actualIntent,
      intentMatch,
      stepsMatch,
      extractedFieldsMatch,
      falsePositiveMutation,
      accuracy: intentMatch ? 1 : 0,
      details,
    });
  }

  const passed = results.filter((r) => r.intentMatch).length;
  const total = results.length;

  const precisionByIntent: Record<
    string,
    { correct: number; total: number; precision: number }
  > = {};
  const recallByIntent: Record<
    string,
    { correct: number; total: number; recall: number }
  > = {};

  for (const intent of [...new Set(results.map((r) => r.expected))]) {
    const expectedCases = results.filter((r) => r.expected === intent);
    const predictedCorrectly = results.filter(
      (r) => r.actual === intent && r.intentMatch,
    );
    const totalPredictions = results.filter((r) => r.actual === intent).length;

    precisionByIntent[intent] = {
      correct: predictedCorrectly.length,
      total: totalPredictions,
      precision:
        totalPredictions > 0 ? predictedCorrectly.length / totalPredictions : 0,
    };

    recallByIntent[intent] = {
      correct: expectedCases.filter((r) => r.intentMatch).length,
      total: expectedCases.length,
      recall:
        expectedCases.length > 0
          ? expectedCases.filter((r) => r.intentMatch).length /
            expectedCases.length
          : 0,
    };
  }

  return {
    total,
    passed,
    failed: total - passed,
    precisionByIntent,
    recallByIntent,
    falsePositiveMutationRate:
      totalMutationCases > 0 ? totalFalsePositives / totalMutationCases : 0,
    fieldExtractionAccuracy:
      totalFieldCases > 0 ? fieldMatches / totalFieldCases : 0,
    intentAccuracy: passed / total,
    injectionDetectionRate:
      injectionCases > 0 ? injectionDetected / injectionCases : 0,
    results,
  };
}

function formatResults(summary: EvalSummary): void {
  const lines: string[] = [];
  const separator = "=".repeat(72);

  lines.push(separator);
  lines.push("  TRADEOS AI EVAL REPORT");
  lines.push(`  Generated: ${new Date().toISOString()}`);
  lines.push(`  Mode: Rule-based (keyword) intent detection`);
  lines.push(separator);
  lines.push("");

  lines.push(
    `  Overall Accuracy:      ${(summary.intentAccuracy * 100).toFixed(1)}%`,
  );
  lines.push(`  Passed:                ${summary.passed} / ${summary.total}`);
  lines.push(`  Failed:                ${summary.failed} / ${summary.total}`);
  lines.push(
    `  False Positive Mutation Rate: ${(summary.falsePositiveMutationRate * 100).toFixed(1)}%`,
  );
  lines.push(
    `  Field Extraction Accuracy:    ${(summary.fieldExtractionAccuracy * 100).toFixed(1)}%`,
  );
  lines.push(
    `  Injection Detection Rate:     ${(summary.injectionDetectionRate * 100).toFixed(1)}%`,
  );
  lines.push("");

  lines.push(separator);
  lines.push("  PRECISION BY INTENT");
  lines.push(separator);
  for (const [intent, data] of Object.entries(summary.precisionByIntent)) {
    lines.push(
      `  ${intent.padEnd(25)} ${(data.precision * 100).toFixed(1).padStart(5)}%  (${data.correct}/${data.total})`,
    );
  }
  lines.push("");

  lines.push(separator);
  lines.push("  RECALL BY INTENT");
  lines.push(separator);
  for (const [intent, data] of Object.entries(summary.recallByIntent)) {
    lines.push(
      `  ${intent.padEnd(25)} ${(data.recall * 100).toFixed(1).padStart(5)}%  (${data.correct}/${data.total})`,
    );
  }
  lines.push("");

  const failed = summary.results.filter((r) => !r.intentMatch);
  if (failed.length > 0) {
    lines.push(separator);
    lines.push("  FAILED CASES");
    lines.push(separator);
    for (const r of failed) {
      lines.push(`  [${r.caseId}] expected=${r.expected} actual=${r.actual}`);
      if (r.details.length > 0) lines.push(`    ${r.details.join("; ")}`);
    }
    lines.push("");
  }

  const fpm = summary.results.filter((r) => r.falsePositiveMutation);
  if (fpm.length > 0) {
    lines.push(separator);
    lines.push("  FALSE POSITIVE MUTATIONS");
    lines.push(separator);
    for (const r of fpm) {
      lines.push(`  [${r.caseId}] ${r.actual} (should be ${r.expected})`);
    }
    lines.push("");
  }

  lines.push(separator);
  lines.push("  END OF REPORT");
  lines.push(separator);

  const output = lines.join("\n");
  process.stdout.write(output + "\n");

  const outDir = path.join(__dirname, "../../eval-output");
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }
  const filename = `eval-${new Date().toISOString().replace(/[:.]/g, "-")}.txt`;
  const jsonFile = filename.replace(".txt", ".json");
  fs.writeFileSync(path.join(outDir, filename), output, "utf-8");
  fs.writeFileSync(
    path.join(outDir, jsonFile),
    JSON.stringify(summary, null, 2),
    "utf-8",
  );
  process.stdout.write(`\nResults written to eval-output/${filename}\n`);
}

async function main() {
  try {
    const summary = await runEval();
    formatResults(summary);

    const thresholdPass = summary.intentAccuracy >= 0.7;
    const thresholdFPM = summary.falsePositiveMutationRate <= 0.1;
    const thresholdInjection = summary.injectionDetectionRate >= 0.8;

    process.stdout.write("\nREGRESSION CHECK:\n");
    if (!thresholdPass)
      process.stdout.write(
        `  FAIL: Overall accuracy ${(summary.intentAccuracy * 100).toFixed(1)}% < 70%\n`,
      );
    if (!thresholdFPM)
      process.stdout.write(
        `  FAIL: False positive mutation rate ${(summary.falsePositiveMutationRate * 100).toFixed(1)}% > 10%\n`,
      );
    if (!thresholdInjection)
      process.stdout.write(
        `  FAIL: Injection detection rate ${(summary.injectionDetectionRate * 100).toFixed(1)}% < 80%\n`,
      );

    if (thresholdPass && thresholdFPM && thresholdInjection) {
      process.stdout.write("  ALL THRESHOLDS PASSED\n");
    }

    process.exit(thresholdPass && thresholdFPM && thresholdInjection ? 0 : 1);
  } catch (err) {
    console.error("Eval failed:", err);
    process.exit(1);
  }
}

main();
