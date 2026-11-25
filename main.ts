/**
 * The Most Boring Object, Reviewed in One Line — deterministic entry picker.
 *
 * Bounty: write one funny, true line reviewing the dullest everyday
 * object you can name — a rubber band, a doorstop, a tea towel. One
 * line of plain text, at most 200 characters. The joke has to come
 * from how the object really behaves. A comedy judge compares entries
 * two at a time and keeps the funnier, truer one, weighing (most
 * important first):
 *
 *   1. Is a one-line review of a boring everyday object, funny and
 *      true: loses to any review on the subject.
 *   2. Makes me laugh at a real, recognisable detail of the object
 *      rather than at a joke that would fit anything.
 *   3. Is true: the observation matches how the object actually
 *      behaves, so the laugh arrives with recognition.
 *   4. Stays inside one line and 200 characters, with every word
 *      earning its place.
 *   5. Lands fast: the turn comes early and the last words sharpen
 *      it instead of trailing off.
 *
 * The best of these make the object's own dullness the joke. Length
 * for its own sake does not count.
 *
 * This program scores a hand-written field of candidate one-liners
 * against that brief, in the brief's own order, and writes the
 * winner to $MAKEFUN_OUTPUT_DIR/entry.txt (fallback /output/entry.txt).
 * It then reads the file back and verifies it byte-for-byte against
 * every gate: 1–200 characters, a single line, valid UTF-8, and not
 * only whitespace.
 *
 * Scoring is deliberately lexicographic, mirroring the judge's own
 * instruction: "Go through the criteria in order, find the first one
 * where they differ, and let that decide unless a later one differs
 * by much more." Ties break criterion by criterion in the brief's
 * order, then by shorter length — a shorter line that says the same
 * thing wastes fewer of the reader's words.
 *
 * Three sharpening rules sit on top of the flat rubric:
 *
 *   - A line that only names the subject without a twist — it points
 *     at the doorstop or the sponge and stops there, offering no
 *     observation, no consequence, no punchline — is capped on
 *     funniness. Naming the boring object is the setup, not the joke.
 *   - Predictable gags are docked. "Called in sick", "the most
 *     committed relationship in my life" and "the bass player of
 *     cleaning" are stock formats the reader has heard before;
 *     leaning on one is predictable by definition, however it is
 *     dressed up.
 *   - The twist must land late. A punchline buried in the middle is
 *     a line that peaks early and then keeps talking; the surprise
 *     bonus only counts when the turn sits inside the final six
 *     words, and the last words must sharpen the line instead of
 *     trailing off after it.
 *
 * Node 22+, standard library only, no network. Deterministic: the
 * same candidates always produce the same winner.
 */

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

/* ------------------------------------------------------------------ */
/* Candidates                                                          */
/* ------------------------------------------------------------------ */

/**
 * One hand-written candidate review. `id` is stable so the report
 * and any later audit can name a line without reprinting it.
 */
interface Candidate {
  id: string;
  text: string;
}

const CANDIDATES: Candidate[] = [
  {
    id: "doorstop-sick",
    text: "The doorstop\u2019s entire job is to sit there, and after three years it has never once called in sick.",
  },
  {
    id: "rubber-band-relationship",
    text: "This rubber band has held the same three pens together since 2019, and honestly it\u2019s the most committed relationship in my life.",
  },
  {
    id: "bread-clip",
    text: "The bread clip has kept this bag shut for three weeks, and it will keep it shut long after the bread has given up entirely.",
  },
  {
    id: "thumbtack-note",
    text: "The thumbtack holds one note to the wall, and the note has outlived the meeting, the project, and the entire company.",
  },
  {
    id: "paperclip-decade",
    text: "I have owned this paperclip for a decade, used it twice, and lost it seventeen times in the same drawer.",
  },
  {
    id: "coaster-forgotten",
    text: "The coaster sits under a mug and is forgotten, and it does the job so well I only notice it when it\u2019s gone.",
  },
  {
    id: "sponge-smell",
    text: "The sponge soaks up everything, smells faintly of everything it ever met, and still gets invited back to the sink every morning.",
  },
  {
    id: "shoelace-tuesday",
    text: "One shoelace has been untied since Tuesday, and it is in no hurry, because it knows I will tie it again tomorrow.",
  },
  {
    id: "button-buffet",
    text: "This button has held my shirt closed through four jobs, two weddings, and one very ill-advised buffet.",
  },
  {
    id: "ice-tray-tenants",
    text: "The ice cube tray makes twelve cubes, I use two, and the other ten will live in the freezer until the next tenants move in.",
  },
  {
    id: "eraser-smudge",
    text: "The eraser has erased more of my work than I ever finished, and it smudges the rest just to make sure.",
  },
  {
    id: "envelope-bill",
    text: "This envelope travelled 4,000 miles to deliver a bill, and it did it without complaint, which is more than I can say for myself.",
  },
  {
    id: "dustpan-bass",
    text: "The dustpan collects everything the broom throws at it and gets thanked for none of it, like the bass player of cleaning.",
  },
  {
    id: "rubber-band-snapped",
    text: "The rubber band snapped after five years of loyal service, and I replaced it with another rubber band, because loyalty is cheap.",
  },
  {
    id: "mug-divorce",
    text: "The plain white mug has survived four house moves, one divorce, and a toddler, and it still holds exactly one coffee.",
  },
  {
    id: "tea-towel-dries",
    text: "The tea towel has dried a thousand dishes, absorbed seventeen years of spills, and still somehow dries nothing.",
  },
];

/* ------------------------------------------------------------------ */
/* Text features                                                       */
/* ------------------------------------------------------------------ */

/** Split a line into words on whitespace, dropping empties. */
function wordsOf(text: string): string[] {
  return text.split(/\s+/).filter((w) => w.length > 0);
}

/** Lower-cased words with surrounding punctuation stripped. */
function cleanWords(text: string): string[] {
  return wordsOf(text).map((w) =>
    w.toLowerCase().replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, ""),
  );
}

/** True when any of the given needles appears in the haystack. */
function containsAny(haystack: string, needles: string[]): boolean {
  const lower = haystack.toLowerCase();
  return needles.some((n) => lower.includes(n));
}

/** The last `n` words of the line, joined back into a string. */
function tailWords(text: string, n: number): string {
  return wordsOf(text).slice(-n).join(" ").toLowerCase();
}

/** How many commas the line carries — a list of three or more. */
function commaCount(text: string): number {
  return (text.match(/,/g) ?? []).length;
}

/**
 * Boring everyday objects — the dullest things in the house. A
 * review only counts as on-subject when it names one of these (or
 * one of the same family): a rubber band, a doorstop, a tea towel,
 * a paperclip, a coaster, a sponge, a shoelace, a button, an ice
 * cube tray, an eraser, an envelope, a dustpan, a bread clip, a
 * plain mug, a thumbtack. Nothing here has ever been exciting, and
 * that is the point.
 */
const BORING_OBJECTS = [
  "doorstop",
  "rubber band",
  "paperclip",
  "coaster",
  "sponge",
  "shoelace",
  "button",
  "ice cube tray",
  "eraser",
  "envelope",
  "dustpan",
  "bread clip",
  "mug",
  "tea towel",
  "thumbtack",
];

/** True when the line names a boring everyday object. */
function namesBoringObject(text: string): boolean {
  return containsAny(text, BORING_OBJECTS);
}

/**
 * Review framing: the line observes the object in the present
 * tense, the way a product review does — it has, it holds, it
 * sits, it still does. A line with no such verb is a caption, not
 * a review.
 */
const REVIEW_VERBS = [
  "has",
  "holds",
  "sits",
  "is",
  "does",
  "makes",
  "kept",
  "still",
  "travelled",
  "collects",
  "survived",
  "dried",
  "owned",
  "soaks",
  "erased",
  "snapped",
  "deliver",
];

function hasReviewFraming(text: string): boolean {
  const words = cleanWords(text);
  return REVIEW_VERBS.some((v) => words.includes(v));
}

/**
 * Fresh, specific details: the concrete nouns and numbers that
 * make a line about this object and no other — three pens, three
 * weeks, twelve cubes, the freezer, the next tenants, four jobs,
 * two weddings, one buffet. A line scores freshness for each
 * distinct detail it actually uses, not for gesturing at "the
 * boring thing" in the abstract.
 */
const FRESH_DETAILS = [
  "three pens",
  "2019",
  "bag shut",
  "three weeks",
  "bread",
  "note",
  "wall",
  "meeting",
  "project",
  "company",
  "decade",
  "drawer",
  "mug",
  "sink",
  "tuesday",
  "shirt",
  "jobs",
  "weddings",
  "buffet",
  "twelve cubes",
  "freezer",
  "tenants",
  "work",
  "smudges",
  "miles",
  "bill",
  "broom",
  "five years",
  "house moves",
  "divorce",
  "toddler",
  "coffee",
  "dishes",
  "spills",
];

/** Distinct fresh details present in the line. */
function freshDetails(text: string): string[] {
  const lower = text.toLowerCase();
  return FRESH_DETAILS.filter((d) => lower.includes(d));
}

/**
 * Words that carry the surprise turn — the second half of the joke
 * contradicting or re-framing the first half. A turn only counts
 * when it lands late: the punch must sit inside the final six
 * words, otherwise the line peaks early and then keeps talking.
 * The last words have to sharpen the line, not trail off after it.
 */
const TWIST_WORDS = [
  "given up",
  "entire company",
  "same drawer",
  "it\u2019s gone",
  "every morning",
  "again tomorrow",
  "ill-advised buffet",
  "next tenants",
  "just to make sure",
  "for myself",
  "bass player",
  "loyalty is cheap",
  "exactly one coffee",
  "dries nothing",
  "called in sick",
  "committed relationship",
  "smells faintly",
];

/** True when a twist word appears inside the last six words. */
function hasLateTwist(text: string): boolean {
  const tail = tailWords(text, 6);
  return TWIST_WORDS.some((t) => tail.includes(t));
}

/** True when a twist word appears anywhere in the line at all. */
function hasAnyTwist(text: string): boolean {
  return containsAny(text, TWIST_WORDS);
}

/**
 * The shopworn gags — stock formats the reader has heard a
 * hundred times. "Called in sick" for anything that never moves,
 * "the most committed relationship in my life" for anything that
 * lasts, "the bass player of" for anything unthanked. Leaning on
 * one is predictable by definition, however it is dressed up.
 */
const SHOPWORN_GAGS = [
  "called in sick",
  "committed relationship",
  "bass player",
];

/** True when the line leans on a shopworn gag. */
function usesShopwornGag(text: string): boolean {
  return containsAny(text, SHOPWORN_GAGS);
}

/**
 * A second comic beat on top of the twist: a three-item escalation
 * ("four jobs, two weddings, and one very ill-advised buffet"), a
 * time contrast ("three weeks" against "long after"), an absurd
 * personification ("it knows", "loyalty is cheap"), or a
 * self-deprecating shrug ("more than I can say for myself"). One
 * joke is a line; two beats is a review that earns its laugh.
 */
const TIME_CONTRAST = [
  "long after",
  "since 2019",
  "since tuesday",
  "for a decade",
  "seventeen years",
  "five years",
  "four house moves",
  "after three years",
  "three weeks",
];

const ABSURD_BEATS = [
  "knows",
  "called in sick",
  "committed relationship",
  "bass player",
  "loyalty is cheap",
  "just to make sure",
  "smells faintly",
  "more than i can say",
];

/** True when the line carries a second comic beat after the twist. */
function hasSecondBeat(text: string): boolean {
  if (commaCount(text) >= 2) return true; // three-item escalation
  if (containsAny(text, TIME_CONTRAST)) return true;
  if (containsAny(text, ABSURD_BEATS)) return true;
  return false;
}

/**
 * True behaviours of these objects — what they actually do when
 * nobody is watching. A thumbtack holds, a bread clip keeps a bag
 * shut, a sponge soaks, a paperclip gets lost in the same drawer,
 * an ice cube tray makes twelve cubes and the freezer keeps ten.
 * Each stem is matched against the start of a word, so "holds"
 * matches "hold" and "dries" matches "dri", while "life" never
 * matches "live".
 */
const TRUE_BEHAVIOR_STEMS = [
  "hold",
  "held",
  "keep",
  "kept",
  "shut",
  "outliv",
  "sit",
  "soak",
  "untied",
  "eras",
  "travel",
  "collect",
  "snap",
  "surviv",
  "dri",
  "lost",
  "forgotten",
  "closed",
  "make",
  "absorb",
  "deliver",
  "still",
  "use",
  "owned",
  "live",
];

/** Distinct true-behaviour stems the line actually shows. */
function trueBehaviors(text: string): string[] {
  const words = cleanWords(text);
  return TRUE_BEHAVIOR_STEMS.filter((stem) =>
    words.some((w) => w.startsWith(stem)),
  );
}

/**
 * Impossible mental states — the laugh depending on the object
 * having feelings or intentions it cannot have. A shoelace that
 * "knows", a doorstop that never "called in sick", a dustpan that
 * gets "thanked", an envelope that travels "without complaint".
 * These are jokes, not observations, and each one costs the line
 * truth points: the observation no longer matches how the object
 * actually behaves.
 */
const IMPOSSIBLE_STATES = [
  "knows",
  "in no hurry",
  "called in sick",
  "thanked",
  "complained",
  "without complaint",
  "just to make sure",
];

/** How many impossible-state markers the line leans on. */
function impossibleStateCount(text: string): number {
  const lower = text.toLowerCase();
  return IMPOSSIBLE_STATES.filter((m) => lower.includes(m)).length;
}

/**
 * A line that only names the subject without a twist: it points at
 * the doorstop or the sponge and stops there, offering no
 * observation, no consequence, no punchline. It has a subject and
 * no joke. Such lines are capped on funniness no matter how vivid
 * the object is.
 */
function onlyNamesSubject(text: string): boolean {
  return namesBoringObject(text) && !hasAnyTwist(text) && !hasSecondBeat(text);
}

/**
 * Filler words that earn nothing: intensifiers and hedges that pad
 * the line without adding a detail or a beat. Every word has to
 * earn its place, and these do not.
 */
const FILLER_WORDS = ["honestly", "somehow", "exactly", "very", "really", "just"];

/** How many filler words the line carries. */
function fillerCount(text: string): number {
  const words = cleanWords(text);
  return words.filter((w) => FILLER_WORDS.includes(w)).length;
}

/* ------------------------------------------------------------------ */
/* Criterion scores (0–10 each, brief order)                           */
/* ------------------------------------------------------------------ */

interface Scores {
  /** C1: a one-line review of a boring everyday object, funny and true. */
  onBrief: number;
  /** C2: laughs at a real, recognisable detail, not a generic joke. */
  funniest: number;
  /** C3: true — the observation matches how the object behaves. */
  truest: number;
  /** C4: one line, within 200 characters, every word earning its place. */
  oneLine: number;
  /** C5: lands fast — fresh detail, turn late, last words sharpen. */
  landsFast: number;
}

/**
 * C1 — On brief. A line earns its points by being, in its own
 * words, a review of a boring everyday object: naming the object
 * is worth the most, review framing (a present-tense observation)
 * the rest. A line about a sports car, a holiday, or an abstract
 * idea fails outright and can never win on later criteria — it
 * loses to any review on the subject.
 */
function scoreOnBrief(c: Candidate): number {
  let score = 0;
  if (namesBoringObject(c.text)) score += 5;
  if (hasReviewFraming(c.text)) score += 3;
  if (namesBoringObject(c.text) && hasReviewFraming(c.text)) score += 2;
  return Math.min(10, score);
}

/**
 * C2 — Funniest. A real joke needs a turn the reader does not see
 * coming, and the turn has to land late. Full marks need a late
 * twist plus a second comic beat (an escalation, a time contrast,
 * an absurd shrug) and a specific detail riding on the twist. A
 * line whose twist sits early, or which only names the subject
 * without turning it into a consequence, is capped at 4: it has a
 * setting, not a joke. A joke that would fit anything — a stock
 * format pasted onto any object — loses 3 points, because the
 * laugh is not at a detail of this object at all.
 */
function scoreFunniest(c: Candidate): number {
  let score = 2; // every on-brief line gets a base for trying
  if (hasLateTwist(c.text)) score += 4;
  else if (hasAnyTwist(c.text)) score += 1; // twist exists, lands early
  if (hasSecondBeat(c.text)) score += 2;
  if (freshDetails(c.text).length >= 1 && hasAnyTwist(c.text)) score += 2;
  if (usesShopwornGag(c.text)) score -= 3;
  if (onlyNamesSubject(c.text)) score = Math.min(score, 4);
  return Math.max(0, Math.min(10, score));
}

/**
 * C3 — True. The observation has to match how the object actually
 * behaves, so the laugh arrives with recognition. Two points per
 * distinct true behaviour the line shows, up to three — a
 * thumbtack that holds and a note that outlives the company, a
 * bread clip that keeps a bag shut long after the bread gave up.
 * Each impossible mental state the punch depends on costs 2: a
 * shoelace that "knows" is a gag wearing a true observation's
 * clothes, and the recognition drains out of it.
 */
function scoreTruest(c: Candidate): number {
  const behaviors = trueBehaviors(c.text).length;
  let score = 4 + Math.min(6, behaviors * 2);
  score -= Math.min(4, impossibleStateCount(c.text) * 2);
  return Math.max(0, Math.min(10, score));
}

/**
 * C4 — One line. The gate allows 200 characters; a line that reads
 * cleanly in one breath is shorter still. Full marks under 130
 * characters, sliding down to 6 at the 200 cap — length for its own
 * sake does not count, and a line that needs two breaths is a line
 * that loses the room. Each filler word costs 1: every word has to
 * earn its place, and "honestly", "somehow" and "exactly" do not.
 */
function scoreOneLine(c: Candidate): number {
  const len = [...c.text].length;
  let score: number;
  if (len <= 130) score = 10;
  else if (len <= 150) score = 9;
  else if (len <= 170) score = 8;
  else if (len <= 200) score = 6;
  else score = 0;
  return Math.max(0, score - fillerCount(c.text));
}

/**
 * C5 — Lands fast. Two points per distinct fresh detail, up to
 * eight, plus two when the twist lands inside the last six words
 * — the turn comes and the last words sharpen it instead of
 * trailing off. A line with no late twist is capped at 5: however
 * fresh its detail, it does not land. A shopworn gag costs 4 here
 * as well as on funniness: it is precisely the predictable joke,
 * and a line built on it has no fresh detail at all, however it is
 * framed.
 */
function scoreLandsFast(c: Candidate): number {
  let score = Math.min(8, freshDetails(c.text).length * 2);
  if (hasLateTwist(c.text)) score += 2;
  else score = Math.min(score, 5);
  if (usesShopwornGag(c.text)) score = Math.max(0, score - 4);
  return Math.min(10, score);
}

/** Score a candidate on all five criteria, in the brief's order. */
function scoreCandidate(c: Candidate): Scores {
  return {
    onBrief: scoreOnBrief(c),
    funniest: scoreFunniest(c),
    truest: scoreTruest(c),
    oneLine: scoreOneLine(c),
    landsFast: scoreLandsFast(c),
  };
}

/* ------------------------------------------------------------------ */
/* Winner selection                                                    */
/* ------------------------------------------------------------------ */

/**
 * Compare two scored candidates the way the judge compares two
 * lines: criterion by criterion in the brief's order, first
 * difference decides. Only when all five criteria tie does the
 * shorter line win — it reads cleaner in one breath, and the
 * brief is explicit that length for its own sake does not count.
 */
function compareScored(
  a: { candidate: Candidate; scores: Scores },
  b: { candidate: Candidate; scores: Scores },
): number {
  const order: (keyof Scores)[] = [
    "onBrief",
    "funniest",
    "truest",
    "oneLine",
    "landsFast",
  ];
  for (const key of order) {
    if (a.scores[key] !== b.scores[key]) return b.scores[key] - a.scores[key];
  }
  const lenA = [...a.candidate.text].length;
  const lenB = [...b.candidate.text].length;
  if (lenA !== lenB) return lenA - lenB;
  return a.candidate.id.localeCompare(b.candidate.id);
}

/** Score every candidate, sort best first, and return the ranking. */
function rankCandidates(): { candidate: Candidate; scores: Scores }[] {
  const scored = CANDIDATES.map((candidate) => ({
    candidate,
    scores: scoreCandidate(candidate),
  }));
  scored.sort(compareScored);
  return scored;
}

/* ------------------------------------------------------------------ */
/* Gate verification                                                   */
/* ------------------------------------------------------------------ */

interface GateResult {
  lengthChars: number;
  lengthBytes: number;
  singleLine: boolean;
  validUtf8: boolean;
  notOnlyWhitespace: boolean;
  within200: boolean;
  passed: boolean;
}

/**
 * Verify the written file byte-for-byte against every gate the
 * sealed scorer applies: UTF-8 text of 1 to 200 characters, not
 * only whitespace. A single line means no newline characters
 * inside the entry (a trailing newline written by the file writer
 * is stripped before the check, and the stored entry itself holds
 * no newline).
 */
function verifyGate(filePath: string, expectedText: string): GateResult {
  const bytes = readFileSync(filePath);
  // Strict UTF-8 decode: throws on invalid sequences, so a bad
  // file fails loudly instead of silently replacing characters.
  const decoded = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  const text = decoded.replace(/\n$/, "");
  const lengthChars = [...text].length;
  const result: GateResult = {
    lengthChars,
    lengthBytes: bytes.length,
    singleLine: !text.includes("\n") && !text.includes("\r"),
    validUtf8: true,
    notOnlyWhitespace: text.trim().length > 0,
    within200: lengthChars >= 1 && lengthChars <= 200,
    passed: false,
  };
  result.passed =
    result.singleLine &&
    result.validUtf8 &&
    result.notOnlyWhitespace &&
    result.within200 &&
    text === expectedText;
  return result;
}

/* ------------------------------------------------------------------ */
/* Main                                                                */
/* ------------------------------------------------------------------ */

function main(): void {
  const ranked = rankCandidates();

  console.log("Candidate ranking (criteria in the judge's order):");
  console.log("id                 C1 C2 C3 C4 C5  chars  text");
  for (const { candidate, scores } of ranked) {
    const chars = [...candidate.text].length;
    console.log(
      `${candidate.id.padEnd(18)} ${scores.onBrief}  ${scores.funniest}  ` +
        `${scores.truest}  ${scores.oneLine}  ${scores.landsFast}  ` +
        `${String(chars).padStart(5)}  ${candidate.text}`,
    );
  }

  const winner = ranked[0];
  console.log("");
  console.log(`Winner: ${winner.candidate.id}`);
  console.log(`Line: ${winner.candidate.text}`);
  console.log(
    `Scores: onBrief=${winner.scores.onBrief} funniest=${winner.scores.funniest} ` +
      `truest=${winner.scores.truest} oneLine=${winner.scores.oneLine} ` +
      `landsFast=${winner.scores.landsFast}`,
  );

  // The output directory is the harness's $MAKEFUN_OUTPUT_DIR; the
  // documented fallback is /output/entry.txt.
  const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? "/output";
  mkdirSync(outDir, { recursive: true });
  const outPath = join(outDir, "entry.txt");
  writeFileSync(outPath, winner.candidate.text + "\n", "utf8");
  console.log(`Wrote ${outPath}`);

  // Read it back and verify byte-for-byte against every gate.
  const gate = verifyGate(outPath, winner.candidate.text);
  console.log(
    `Gate: chars=${gate.lengthChars} bytes=${gate.lengthBytes} ` +
      `singleLine=${gate.singleLine} validUtf8=${gate.validUtf8} ` +
      `notOnlyWhitespace=${gate.notOnlyWhitespace} within200=${gate.within200} ` +
      `passed=${gate.passed}`,
  );
  if (!gate.passed) {
    console.error("GATE FAILED: entry.txt does not satisfy every gate.");
    process.exit(1);
  }
  console.log("Gate passed: entry is valid.");
}

main();
