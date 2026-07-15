// One-time setup script: creates the single user allowed to log into FinanceHub.
// Run with: npm run create-user
require("dotenv").config();
const readline = require("readline");
const { migrate } = require("./migrate");
const { createAuth } = require("./auth");

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 12;
const KEYCODE = { ENTER: 13, NEWLINE: 10, BACKSPACE: 127, CTRL_C: 3, CTRL_D: 4 };

function readAllStdin() {
  return new Promise((resolve) => {
    let data = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (chunk) => { data += chunk; });
    process.stdin.on("end", () => resolve(data));
  });
}

function promptHiddenTty(question) {
  return new Promise((resolve) => {
    const stdin = process.stdin;
    process.stdout.write(question);
    stdin.resume();
    stdin.setRawMode(true);
    stdin.setEncoding("utf8");

    let input = "";
    const onData = (char) => {
      const code = char.charCodeAt(0);

      if (code === KEYCODE.ENTER || code === KEYCODE.NEWLINE) {
        stdin.setRawMode(false);
        stdin.pause();
        stdin.removeListener("data", onData);
        process.stdout.write("\n");
        resolve(input);
        return;
      }

      if (code === KEYCODE.CTRL_C || code === KEYCODE.CTRL_D) {
        process.stdout.write("\n");
        process.exit(1);
      }

      if (code === KEYCODE.BACKSPACE || code === 8) {
        input = input.slice(0, -1);
        return;
      }

      input += char;
    };

    stdin.on("data", onData);
  });
}

// Builds prompt/promptHidden functions bound to how stdin is being fed this run:
// a real TTY reads keystrokes live (and can mask the password); a pipe has to be
// buffered whole upfront, since Node's readline auto-closes as soon as piped stdin
// hits EOF, silently dropping any question asked after that point.
async function createPrompters() {
  if (process.stdin.isTTY) {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    const prompt = (question) => new Promise((resolve) => {
      rl.question(question, (answer) => resolve(answer.trim()));
    });
    return { prompt, promptHidden: promptHiddenTty, close: () => rl.close() };
  }

  console.warn("(non-interactive terminal — input will be visible)");
  const lines = (await readAllStdin()).split(/\r?\n/);
  let cursor = 0;
  const prompt = (question) => {
    process.stdout.write(question + "\n");
    return Promise.resolve((lines[cursor++] || "").trim());
  };
  return { prompt, promptHidden: prompt, close: () => {} };
}

async function main() {
  await migrate();
  const auth = createAuth();
  const { prompt, promptHidden, close } = await createPrompters();

  try {
    if ((await auth.countUsers()) > 0) {
      console.error("A user already exists. FinanceHub is single-user, so refusing to create another.");
      process.exitCode = 1;
      return;
    }

    const email = (await prompt("Email: ")).toLowerCase();
    if (!EMAIL_PATTERN.test(email)) {
      console.error("Invalid email address.");
      process.exitCode = 1;
      return;
    }

    const password = await promptHidden("Password: ");
    if (password.length < MIN_PASSWORD_LENGTH) {
      console.error(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
      process.exitCode = 1;
      return;
    }

    const confirmPassword = await promptHidden("Confirm password: ");
    if (password !== confirmPassword) {
      console.error("Passwords do not match.");
      process.exitCode = 1;
      return;
    }

    await auth.createUser(email, password);
    console.log(`User created: ${email}`);
  } finally {
    close();
  }
}

main();
