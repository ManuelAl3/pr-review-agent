#!/usr/bin/env node
/**
 * pr-review-agent installer
 * Usage: npx pr-review-agent@latest
 *
 * Installs the PR review agent (commands, agents, template files)
 * into your AI coding assistant's config directory.
 *
 * Supports: Claude Code, OpenCode (more coming)
 * Scope: Global (user-wide) or Local (project-only)
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const os = require('os');

const VERSION = require('../package.json').version;
const PKG_ROOT = path.resolve(__dirname, '..');

// ===== Runtime definitions =====
const RUNTIMES = {
  claude: {
    name: 'Claude Code',
    configDirName: '.claude',
    globalDir: () => path.join(process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), '.claude')),
    localDir: () => path.join(process.cwd(), '.claude'),
    commandsDir: 'commands/pr-review',
    agentsDir: 'agents',
  },
  opencode: {
    name: 'OpenCode',
    configDirName: '.config/opencode',
    globalDir: () => path.join(os.homedir(), '.config', 'opencode'),
    localDir: () => path.join(process.cwd(), '.config', 'opencode'),
    commandsDir: 'commands/pr-review',
    agentsDir: 'agents',
  },
};

// ===== ANSI colors =====
const c = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  purple: '\x1b[35m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  blue: '\x1b[34m',
};

// ===== CLI arg parsing =====
const args = process.argv.slice(2);
const flags = new Set(args.filter(a => a.startsWith('--')).map(a => a.slice(2)));

function hasFlag(name) { return flags.has(name); }

// ===== Helpers =====
function log(msg = '') { process.stdout.write(msg + '\n'); }

function banner() {
  log('');
  log(`  ${c.purple}${c.bold}╔═══════════════════════════════════════╗${c.reset}`);
  log(`  ${c.purple}${c.bold}║         PR Review Agent  v${VERSION.padEnd(12)}║${c.reset}`);
  log(`  ${c.purple}${c.bold}╚═══════════════════════════════════════╝${c.reset}`);
  log('');
  log(`  ${c.dim}AI-powered PR review for Claude Code & more${c.reset}`);
  log('');
}

function prompt(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => {
    rl.question(`  ${question}`, answer => { rl.close(); resolve(answer.trim()); });
  });
}

function mkdirp(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

// configDirName is set during install (e.g. '.claude', '.config/opencode')
let configDirName = '.claude';

function copyFile(src, dest) {
  mkdirp(path.dirname(dest));
  // Rewrite __CONFIG_DIR__ placeholder in text files (.md, .js)
  const ext = path.extname(src);
  if (['.md', '.js', '.json'].includes(ext)) {
    let content = fs.readFileSync(src, 'utf-8');
    content = content.replace(/__CONFIG_DIR__/g, configDirName);
    fs.writeFileSync(dest, content, 'utf-8');
  } else {
    fs.copyFileSync(src, dest);
  }
}

function copyDir(src, dest) {
  mkdirp(dest);
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDir(srcPath, destPath);
    else copyFile(srcPath, destPath);
  }
}

// ===== Uninstall =====
function uninstall(configDir) {
  const toRemove = [
    path.join(configDir, 'commands', 'pr-review'),
    path.join(configDir, 'agents', 'pr-reviewer.md'),
    path.join(configDir, 'pr-review'),
  ];

  let removed = 0;
  for (const p of toRemove) {
    if (fs.existsSync(p)) {
      const stat = fs.statSync(p);
      if (stat.isDirectory()) fs.rmSync(p, { recursive: true });
      else fs.unlinkSync(p);
      removed++;
      log(`  ${c.red}removed${c.reset} ${p}`);
    }
  }

  if (removed === 0) log(`  ${c.yellow}Nothing to uninstall.${c.reset}`);
  else log(`\n  ${c.green}Uninstalled PR Review Agent.${c.reset}`);
  log('');
}

// ===== Install =====
function install(runtime, configDir) {
  const rt = RUNTIMES[runtime];
  // Set configDirName for path rewriting in copyFile
  configDirName = rt.configDirName;
  // Template goes inside configDir as pr-review/ (like GSD uses get-shit-done/)
  const templateDest = path.join(configDir, 'pr-review');

  log(`  ${c.cyan}Installing for ${rt.name}...${c.reset}`);
  log('');

  // 1. Copy commands
  const cmdSrc = path.join(PKG_ROOT, 'commands', 'pr-review');
  const cmdDest = path.join(configDir, rt.commandsDir);
  copyDir(cmdSrc, cmdDest);
  const cmdCount = fs.readdirSync(cmdSrc).length;
  log(`  ${c.green}+${c.reset} ${cmdCount} commands  ${c.dim}→ ${cmdDest}${c.reset}`);

  // 2. Copy agent
  const agentSrc = path.join(PKG_ROOT, 'agents', 'pr-reviewer.md');
  const agentDest = path.join(configDir, rt.agentsDir, 'pr-reviewer.md');
  copyFile(agentSrc, agentDest);
  log(`  ${c.green}+${c.reset} 1 agent    ${c.dim}→ ${agentDest}${c.reset}`);

  // 3. Copy runtime files (index.html, serve.js, templates/)
  const runtimeFiles = ['index.html', 'serve.js', '.gitignore'];
  mkdirp(templateDest);
  for (const f of runtimeFiles) {
    const src = path.join(PKG_ROOT, 'template', f);
    if (fs.existsSync(src)) copyFile(src, path.join(templateDest, f));
  }
  // Copy review-plan template (used by /pr-review:setup to generate REVIEW-PLAN.md)
  const tplSrc = path.join(PKG_ROOT, 'template', 'templates');
  const tplDest = path.join(templateDest, 'templates');
  if (fs.existsSync(tplSrc)) copyDir(tplSrc, tplDest);
  log(`  ${c.green}+${c.reset} runtime    ${c.dim}→ ${templateDest}${c.reset}`);

  // 4. Write version file
  fs.writeFileSync(path.join(templateDest, '.version'), VERSION);

  // 5. Ensure .gitignore in template dir
  const gitignorePath = path.join(templateDest, '.gitignore');
  if (!fs.existsSync(gitignorePath)) {
    fs.writeFileSync(gitignorePath, '# Generated on each review run\nfindings.json\nconfig.json\n');
  }

  log('');
  log(`  ${c.green}${c.bold}PR Review Agent v${VERSION} installed!${c.reset}`);
  log('');
  log(`  ${c.bold}Quick start:${c.reset}`);
  log(`  ${c.dim}1.${c.reset} Generate your review plan (first time only):`);
  log(`     ${c.cyan}/pr-review:setup${c.reset}`);
  log(`  ${c.dim}2.${c.reset} Review a PR:`);
  log(`     ${c.cyan}/pr-review:review <pr-url>${c.reset}`);
  log(`  ${c.dim}3.${c.reset} Preview findings in browser:`);
  log(`     ${c.cyan}node ${rt.configDirName}/pr-review/serve.js${c.reset}`);
  log('');
  log(`  ${c.dim}Commands:${c.reset}`);
  log(`    /pr-review:setup   ${c.dim}— Generate REVIEW-PLAN.md for your project${c.reset}`);
  log(`    /pr-review:review  ${c.dim}— Analyze a PR against your review plan${c.reset}`);
  log('');
}

// ===== Main =====
async function main() {
  const isTTY = process.stdin.isTTY && process.stdout.isTTY;

  // Non-interactive defaults
  if (!isTTY || hasFlag('help')) {
    if (hasFlag('help')) {
      banner();
      log(`  ${c.bold}Usage:${c.reset} npx pr-review-agent@latest [options]`);
      log('');
      log(`  ${c.bold}Options:${c.reset}`);
      log(`    --claude       Install for Claude Code`);
      log(`    --opencode     Install for OpenCode`);
      log(`    --global       Install user-wide (default)`);
      log(`    --local        Install in current project only`);
      log(`    --uninstall    Remove the agent`);
      log(`    --help         Show this help`);
      log('');
      log(`  ${c.bold}Examples:${c.reset}`);
      log(`    npx pr-review-agent                    ${c.dim}# interactive${c.reset}`);
      log(`    npx pr-review-agent --claude --local   ${c.dim}# Claude, project-level${c.reset}`);
      log(`    npx pr-review-agent --claude --global --uninstall`);
      log('');
      return;
    }
    // Non-TTY or has specific flags: resolve from args
    const rt = ['claude', 'opencode'].find(r => hasFlag(r)) || 'claude';
    const scope = hasFlag('local') ? 'local' : 'global';
    const dir = scope === 'local' ? RUNTIMES[rt].localDir() : RUNTIMES[rt].globalDir();
    if (hasFlag('uninstall')) return uninstall(dir);
    return install(rt, dir);
  }

  banner();

  // Detect flags for non-interactive mode
  const runtimeFlag = ['claude', 'opencode'].find(r => hasFlag(r));
  const scopeFlag = hasFlag('local') ? 'local' : hasFlag('global') ? 'global' : null;

  // 1. Select runtime
  let runtime = runtimeFlag;
  if (!runtime) {
    log(`  ${c.bold}Select your AI coding assistant:${c.reset}`);
    log('');
    log(`    ${c.cyan}1${c.reset}) Claude Code`);
    log(`    ${c.cyan}2${c.reset}) OpenCode`);
    log('');
    const choice = await prompt(`${c.bold}Enter choice [1]:${c.reset} `);
    runtime = choice === '2' ? 'opencode' : 'claude';
    log('');
  }

  // 2. Select scope
  let scope = scopeFlag;
  if (!scope) {
    log(`  ${c.bold}Install scope:${c.reset}`);
    log('');
    log(`    ${c.cyan}1${c.reset}) Global ${c.dim}— available in all projects (${RUNTIMES[runtime].globalDir()})${c.reset}`);
    log(`    ${c.cyan}2${c.reset}) Local  ${c.dim}— this project only (${RUNTIMES[runtime].localDir()})${c.reset}`);
    log('');
    const choice = await prompt(`${c.bold}Enter choice [1]:${c.reset} `);
    scope = choice === '2' ? 'local' : 'global';
    log('');
  }

  const configDir = scope === 'local'
    ? RUNTIMES[runtime].localDir()
    : RUNTIMES[runtime].globalDir();

  // 3. Uninstall or install
  if (hasFlag('uninstall')) {
    uninstall(configDir);
  } else {
    install(runtime, configDir);
  }
}

main().catch(err => {
  log(`\n  ${c.red}${c.bold}Error:${c.reset} ${err.message}`);
  process.exit(1);
});
