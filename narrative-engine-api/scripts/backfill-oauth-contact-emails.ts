#!/usr/bin/env tsx
/**
 * Backfill engine_runs.contact_email for OAuth runs by looking up each Privy user.
 *
 * Run:
 *   npm run backfill:oauth-emails -- --dry-run   # preview only
 *   npm run backfill:oauth-emails                # apply updates
 *
 * Requires: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, PRIVY_APP_ID, PRIVY_APP_SECRET
 */
import { config as loadDotenv } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { PrivyClient } from '@privy-io/server-auth';
import { extractPrivyEmail } from '../src/services/PrivyAuthService.js';

const API_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
loadDotenv({ path: join(API_ROOT, '.env') });

type OAuthGrantRow = {
  id: string;
  run_id: string;
  principal_id: string;
  metadata: { email?: string } | null;
  engine_runs: { contact_email: string | null } | { contact_email: string | null }[] | null;
};

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function runContactEmail(run: OAuthGrantRow['engine_runs']): string | null {
  if (!run) return null;
  if (Array.isArray(run)) return run[0]?.contact_email ?? null;
  return run.contact_email ?? null;
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const privyAppId = process.env.PRIVY_APP_ID;
  const privyAppSecret = process.env.PRIVY_APP_SECRET;

  if (!url?.startsWith('http') || !key) {
    console.error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in narrative-engine-api/.env');
    process.exit(1);
  }
  if (!privyAppId || !privyAppSecret) {
    console.error('Set PRIVY_APP_ID and PRIVY_APP_SECRET in narrative-engine-api/.env');
    process.exit(1);
  }

  const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const privy = new PrivyClient(privyAppId, privyAppSecret);

  const { data: grants, error } = await db
    .from('run_access_grants')
    .select('id, run_id, principal_id, metadata, engine_runs(contact_email)')
    .eq('grant_type', 'oauth')
    .eq('principal_type', 'privy_user')
    .not('principal_id', 'is', null);

  if (error) {
    console.error('Failed to load OAuth grants:', error.message);
    process.exit(1);
  }

  const rows = (grants ?? []) as OAuthGrantRow[];

  const audit = rows.map((row) => {
    const contact = runContactEmail(row.engine_runs);
    const metadataEmail = row.metadata?.email?.trim().toLowerCase() || null;
    const needsPrivyLookup = !contact && !metadataEmail;
    const needsMetadataSync = !contact && Boolean(metadataEmail);
    return { row, contact, metadataEmail, needsPrivyLookup, needsMetadataSync };
  });

  const needsPrivyLookup = audit.filter((entry) => entry.needsPrivyLookup);
  const needsMetadataSync = audit.filter((entry) => entry.needsMetadataSync);
  const complete = audit.filter((entry) => entry.contact);

  console.log(`${dryRun ? '[dry-run] ' : ''}OAuth contact email audit`);
  console.log(`  Total OAuth grants: ${rows.length}`);
  console.log(`  Already have contact_email: ${complete.length}`);
  console.log(`  Can sync from grant metadata: ${needsMetadataSync.length}`);
  console.log(`  Need Privy lookup: ${needsPrivyLookup.length}`);
  console.log('');

  for (const entry of audit) {
    const status = entry.contact
      ? 'ok'
      : entry.needsMetadataSync
        ? 'sync-metadata'
        : 'needs-privy';
    console.log(
      `  [${status}] run ${entry.row.run_id} | contact=${entry.contact ?? '—'} | metadata=${entry.metadataEmail ?? '—'}`,
    );
  }
  console.log('');

  const uniquePrivyIds = [...new Set(needsPrivyLookup.map((entry) => entry.row.principal_id))];

  if (needsPrivyLookup.length === 0 && needsMetadataSync.length === 0) {
    console.log('Nothing to backfill — all OAuth runs already have contact_email.');
    return;
  }

  const emailByPrivyId = new Map<string, string>();
  const unresolvedPrivyIds = new Set<string>();

  for (const privyUserId of uniquePrivyIds) {
    try {
      const user = await privy.getUser(privyUserId);
      const email = extractPrivyEmail(user);
      if (email) {
        emailByPrivyId.set(privyUserId, email);
        console.log(`  ✓ ${privyUserId} → ${email}`);
      } else {
        unresolvedPrivyIds.add(privyUserId);
        console.warn(`  ✗ ${privyUserId} → no linked email in Privy profile`);
      }
    } catch (e) {
      unresolvedPrivyIds.add(privyUserId);
      const message = e instanceof Error ? e.message : String(e);
      console.warn(`  ✗ ${privyUserId} → Privy lookup failed: ${message}`);
    }
    await sleep(150);
  }

  let updatedRuns = 0;
  let updatedGrants = 0;
  let skipped = 0;

  for (const entry of needsMetadataSync) {
    const email = entry.metadataEmail!;
    console.log(`${dryRun ? '[dry-run] ' : ''}run ${entry.row.run_id} ← ${email} (from grant metadata)`);
    if (!dryRun) {
      const { error: runError } = await db
        .from('engine_runs')
        .update({ contact_email: email })
        .eq('id', entry.row.run_id)
        .is('contact_email', null);
      if (runError) {
        console.error(`  failed to update run ${entry.row.run_id}:`, runError.message);
        skipped += 1;
        continue;
      }
    }
    updatedRuns += 1;
  }

  for (const entry of needsPrivyLookup) {
    const row = entry.row;
    const email = emailByPrivyId.get(row.principal_id);
    if (!email) {
      skipped += 1;
      continue;
    }

    console.log(`${dryRun ? '[dry-run] ' : ''}run ${row.run_id} ← ${email} (from Privy profile)`);

    if (!dryRun) {
      const { error: runError } = await db
        .from('engine_runs')
        .update({ contact_email: email })
        .eq('id', row.run_id)
        .is('contact_email', null);

      if (runError) {
        console.error(`  failed to update run ${row.run_id}:`, runError.message);
        skipped += 1;
        continue;
      }

      const metadata = { ...(row.metadata ?? {}), email };
      const { error: grantError } = await db
        .from('run_access_grants')
        .update({ metadata })
        .eq('id', row.id);

      if (grantError) {
        console.error(`  failed to update grant ${row.id}:`, grantError.message);
      } else {
        updatedGrants += 1;
      }
    }

    updatedRuns += 1;
  }

  console.log('');
  console.log('Summary:');
  console.log(`  Privy users resolved: ${emailByPrivyId.size}`);
  console.log(`  Privy users unresolved: ${unresolvedPrivyIds.size}`);
  console.log(`  Runs ${dryRun ? 'would update' : 'updated'}: ${updatedRuns}`);
  if (!dryRun) console.log(`  Grants metadata updated: ${updatedGrants}`);
  console.log(`  Runs skipped (no email found): ${skipped}`);

  if (unresolvedPrivyIds.size > 0) {
    console.log('');
    console.log('Unresolved Privy user IDs (no email available — left unchanged):');
    for (const id of unresolvedPrivyIds) console.log(`  - ${id}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
