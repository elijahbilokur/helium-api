#!/usr/bin/env node
import * as readline from "readline";

// ─────────────────────────────────────────────────────────────────────────────
// ANSI color helpers (no external dep)
// ─────────────────────────────────────────────────────────────────────────────

const RS    = "\x1b[0m";      // reset
const BOLD  = "\x1b[1m";
const DIM   = "\x1b[2m";
const BBLUE = "\x1b[94m";    // bright blue — Relay brand color
const BWHITE= "\x1b[97m";
const CYAN  = "\x1b[96m";
const GREEN = "\x1b[92m";

const bl = (s: string): string => `${BBLUE}${s}${RS}`;
const bw = (s: string): string => `${BOLD}${BWHITE}${s}${RS}`;
const dm = (s: string): string => `${DIM}${s}${RS}`;
const cy = (s: string): string => `${CYAN}${s}${RS}`;

// ─────────────────────────────────────────────────────────────────────────────
// ASCII art — Relay triple-swirl mark
//
//  Three rounded loops arranged in a trefoil (shamrock) pattern.
//  Upper-left and upper-right loops connect through a shared center crossing;
//  a third loop hangs below, completing the three-swirl motif.
// ─────────────────────────────────────────────────────────────────────────────

const SWIRL = [
  "   /~\\   /~\\   ",
  "  (   \\ /   )  ",
  "   \\ /~\\ /    ",
  "    X   X     ",
  "   / \\_/ \\   ",
  "  (         ) ",
  "   \\  /~\\  /  ",
  "    \\(   )/   ",
  "     \\   /    ",
  "      \\_/     ",
];

// ─────────────────────────────────────────────────────────────────────────────
// ASCII art — RELAY wordmark
//  Hand-crafted block font using +  -  |  /  \  characters.
// ─────────────────────────────────────────────────────────────────────────────

const WORDMARK = [
  " +--\\   +---+  +      /\\    \\   /",
  " |   |  +--    |     /  \\    \\ / ",
  " +--/   +--    |    /----\\    +  ",
  " |  \\   |      |   /      \\   |  ",
  " +   \\  +---+  +--/        \\  +  ",
];

// ─────────────────────────────────────────────────────────────────────────────
// Learn-more links
// ─────────────────────────────────────────────────────────────────────────────

const LINKS = [
  "docs.relay.io",
  "relay.io/quickstart",
  "relay.io/api-reference",
  "relay.io/examples",
];

// ─────────────────────────────────────────────────────────────────────────────
// Layout helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Strip ANSI escape codes so we can measure visible length. */
function visLen(s: string): number {
  return s.replace(/\x1b\[[0-9;]*m/g, "").length;
}

/** Right-pad a (possibly ANSI-colored) string to a visible width. */
function pad(s: string, width: number): string {
  const extra = Math.max(0, width - visLen(s));
  return s + " ".repeat(extra);
}

const BOX_W = 72; // visible characters between left ║ and right ║

function top():     void { console.log(bl("╔" + "═".repeat(BOX_W) + "╗")); }
function bot():     void { console.log(bl("╚" + "═".repeat(BOX_W) + "╝")); }
function div():     void { console.log(bl("╠" + "═".repeat(BOX_W) + "╣")); }
function blank():   void { line(""); }
function line(content: string): void {
  console.log(bl("║") + pad(" " + content, BOX_W) + bl("║"));
}

// ─────────────────────────────────────────────────────────────────────────────
// printWelcome — assembles and prints the full splash screen
// ─────────────────────────────────────────────────────────────────────────────

function printWelcome(): void {
  process.stdout.write("\x1b[2J\x1b[H"); // clear + home
  console.log();

  top();
  blank();

  // ── swirl (left) + wordmark (right) on same rows ──────────────────────────
  const LEFT_W  = 18;  // swirl column visible width
  const RIGHT_W = BOX_W - LEFT_W - 3; // remainder (with " " separator + space)

  const logoRows = Math.max(SWIRL.length, WORDMARK.length + 3);
  const wOff     = Math.floor((logoRows - WORDMARK.length) / 2); // vertical center

  for (let i = 0; i < logoRows; i++) {
    const swirlCell    = bl(pad(SWIRL[i] ?? "", LEFT_W));
    const wordmarkLine = WORDMARK[i - wOff];
    const rightCell    = wordmarkLine
      ? bw(pad(wordmarkLine, RIGHT_W))
      : " ".repeat(RIGHT_W);

    console.log(
      bl("║") + " " + swirlCell + "  " + rightCell + " " + bl("║")
    );
  }

  blank();
  line(dm("  Helium Network Data API  •  relay.io"));
  blank();
  div();
  blank();

  // ── two-column: sign-in (left) | learn-more (right) ──────────────────────
  const COL_L = Math.floor(BOX_W / 2);  // left col visible width
  const COL_R = BOX_W - COL_L - 1;      // right col (minus │ separator)

  const leftCol: string[] = [
    bw("  Sign in"),
    "",
    "  Enter your email address to",
    "  authenticate and get started.",
    "",
    "",
    "",
  ];

  const rightCol: string[] = [
    bw("  Learn more"),
    "",
    ...LINKS.map((url) => `  ${cy("›")} ${url}`),
    "",
  ];

  const nRows = Math.max(leftCol.length, rightCol.length);
  for (let i = 0; i < nRows; i++) {
    const lc = pad(leftCol[i]  ?? "", COL_L);
    const rc = pad(rightCol[i] ?? "", COL_R);
    console.log(bl("║") + lc + bl("│") + rc + bl("║"));
  }

  blank();
  bot();
  console.log();
}

// ─────────────────────────────────────────────────────────────────────────────
// promptEmail — shows the welcome screen and reads an email address
// ─────────────────────────────────────────────────────────────────────────────

export async function promptEmail(): Promise<string> {
  printWelcome();

  const rl = readline.createInterface({
    input:  process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(
      `  ${BBLUE}>${RS} Enter your email address: `,
      (answer) => {
        rl.close();
        console.log();
        console.log(
          `  ${GREEN}✓${RS} ${BOLD}${BWHITE}Connected${RS}  ` +
          dm("(authentication not yet wired — stub)")
        );
        console.log();
        resolve(answer.trim());
      }
    );
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Standalone preview:  npx ts-node src/welcome.ts
// ─────────────────────────────────────────────────────────────────────────────

if (require.main === module) {
  promptEmail()
    .then((email) => {
      if (email) console.log(`  Email captured: ${dm(email)}`);
      console.log(`  ${dm("Press Ctrl+C to exit.")}`);
      console.log();
    })
    .catch(console.error);
}
