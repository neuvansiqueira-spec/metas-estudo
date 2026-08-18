import { spawnSync } from "node:child_process";

const result = spawnSync(process.execPath, ["--test", "tests/*.test.js"], {
  shell: true,
  encoding: "utf8",
  maxBuffer: 64 * 1024 * 1024
});
const output = `${result.stdout || ""}\n${result.stderr || ""}`;
const lines = output.split(/\r?\n/);
const failures = [];
for (let i = 0; i < lines.length; i += 1) {
  const match = lines[i].match(/^not ok \d+ - (.+)$/);
  if (!match) continue;
  const item = { name: match[1].trim(), location: "", error: "" };
  for (let j = i + 1; j < Math.min(lines.length, i + 18); j += 1) {
    const location = lines[j].match(/^\s*location:\s*'([^']+)'/);
    if (location) item.location = location[1];
    const error = lines[j].match(/^\s*error:\s*['|>-]?\s*(.*)$/);
    if (error && error[1]) item.error = error[1].trim();
    if (/^(ok|not ok) \d+ - /.test(lines[j])) break;
  }
  failures.push(item);
}
console.log(`FULL_SUITE_EXIT=${result.status}`);
console.log(`FAILURES=${failures.length}`);
for (const [index, failure] of failures.entries()) {
  console.log(`FAIL ${index + 1}: ${failure.name}`);
  if (failure.location) console.log(`  AT: ${failure.location}`);
  if (failure.error) console.log(`  ERROR: ${failure.error}`);
}
const summary = lines.filter((line) => /^# (tests|pass|fail|duration_ms) /.test(line)).slice(-8);
console.log("SUMMARY");
for (const line of summary) console.log(line);
process.exit(0);
