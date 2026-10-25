import { lstatSync, realpathSync } from 'node:fs';
import { dirname, isAbsolute, relative, resolve, sep } from 'node:path';
import { ToolConfirmationOutcome, ToolConfirmationType, type ClientPermissionHandler } from '@factory/droid-sdk/node';
import type { FighterIO, FighterRunInput } from '../types.js';

/** Resolve existing ancestors too: a sandbox symlink must never grant outside access. */
export function insideSandbox(sandbox: string, target: string): boolean {
  if (!target || target.includes('\0') || target.startsWith('~')) return false;
  const root = realpathSync(sandbox);
  let path = resolve(root, target);
  const tail: string[] = [];
  while (true) {
    try { path = resolve(realpathSync(path), ...tail.reverse()); break; }
    catch {
      // A dangling symlink is an existing escape, not an ordinary missing parent.
      try { if (lstatSync(path).isSymbolicLink()) return false; } catch { /* missing path */ }
      const parent = dirname(path); if (parent === path) return false; tail.push(relative(parent, path)); path = parent;
    }
  }
  const rel = relative(root, path);
  return rel !== '..' && !rel.startsWith(`..${sep}`) && !isAbsolute(rel);
}

export function commandAllowed(_input: FighterRunInput, _command: string): boolean {
  // A Python source/command blacklist cannot constrain host file/network access.
  // H0 has no OS-isolated verification executor, so there is no execution grant.
  // Deliberately no environment toggle: an isolated executor needs code + validation.
  return false;
}

type Decision = { allowed: boolean; summary: string };
/** Unknown shapes fail closed. Never return raw paths, commands or tool details to the public feed. */
export function decide(input: FighterRunInput, details: Record<string, unknown>): Decision {
  const type = details.type;
  if (type === ToolConfirmationType.Execute) {
    const command = details.fullCommand ?? details.command;
    const allowed = typeof command === 'string' && commandAllowed(input, command);
    return { allowed, summary: 'execution unavailable without OS isolation' };
  }
  if (type === ToolConfirmationType.Create || type === ToolConfirmationType.Edit || type === 'read') {
    const path = details.filePath ?? details.path;
    return { allowed: typeof path === 'string' && insideSandbox(input.sandboxDir, path), summary: 'touched files outside the arena' };
  }
  if (type === ToolConfirmationType.ApplyPatch) {
    const files = Array.isArray(details.files) ? details.files : [details];
    return { allowed: files.length > 0 && files.every((f) => typeof f.filePath === 'string' && insideSandbox(input.sandboxDir, f.filePath) && (!f.moveTo || typeof f.moveTo === 'string' && insideSandbox(input.sandboxDir, f.moveTo))), summary: 'touched files outside the arena' };
  }
  if (type === ToolConfirmationType.McpTool) {
    const server = details.serverName ?? details.mcpServerName;
    const name = details.actualToolName ?? details.toolName;
    return { allowed: server === 'arena' && (name === 'submit_answer' || name === 'taunt'), summary: 'used an unauthorized tool' };
  }
  return { allowed: false, summary: 'used an unauthorized tool' };
}

export function createReferee(input: FighterRunInput, io: () => FighterIO | undefined, interrupt: () => Promise<void>): ClientPermissionHandler {
  let denials = 0;
  return async (request) => {
    let allowed = request.toolUses.length > 0;
    for (const use of request.toolUses) {
      if (use.details.type === ToolConfirmationType.AskUser) { allowed = false; continue; }
      const decision = decide(input, use.details as unknown as Record<string, unknown>);
      io()?.referee({ allowed: decision.allowed, tool: 'referee', summary: decision.allowed ? 'allowed arena action' : decision.summary });
      if (!decision.allowed) {
        allowed = false;
        denials++;
      }
    }
    if (denials >= 3 || io()?.isOut()) { void interrupt().catch(() => undefined); allowed = false; }
    const outcome = allowed ? ToolConfirmationOutcome.ProceedOnce : ToolConfirmationOutcome.Cancel;
    return request.options.some((o) => o.value === outcome) ? outcome : ToolConfirmationOutcome.Cancel;
  };
}
