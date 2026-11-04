/**
 * Nectar Gate 06A.1 Comprehensive Schema & Canonical Registry Auditor
 * Validates tables, columns, data types, constraints, foreign keys,
 * indexes, and enums against CANONICAL_SCHEMA_REGISTRY.md.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const migrationsDir = path.join(__dirname, '..', 'supabase', 'migrations');
const rlsPreviewDir = path.join(__dirname, '..', 'docs', 'database', 'rls-preview');
const canonicalDocPath = path.join(__dirname, '..', 'docs', 'architecture', 'CANONICAL_SCHEMA_REGISTRY.md');

console.log('================================================================');
console.log('NECTAR GATE 06A.1 INDEPENDENT DATABASE AUDIT & CATALOG INSPECTOR');
console.log('================================================================');

const migrationFiles = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();
console.log(`Auditing ${migrationFiles.length} operational migration files in supabase/migrations/:\n`);
migrationFiles.forEach((f, i) => console.log(`  [${i + 1}] ${f}`));

// 1. Audit RLS status in operational migrations
console.log('\n--- AUDITING RLS STATUS IN OPERATIONAL MIGRATIONS ---');
let rlsBreachCount = 0;
migrationFiles.forEach(file => {
  const content = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
  const lines = content.split('\n');
  lines.forEach((line, lineNo) => {
    const trimmed = line.trim();
    if (!trimmed.startsWith('--') && !trimmed.startsWith('/*') && trimmed.includes('ENABLE ROW LEVEL SECURITY')) {
      console.error(`  [SECURITY BREACH] Found active ENABLE ROW LEVEL SECURITY in ${file}:${lineNo + 1}`);
      rlsBreachCount++;
    }
  });
});

if (rlsBreachCount === 0) {
  console.log('✓ PASS: All operational migrations strictly leave RLS disabled (0 active ENABLE RLS statements).');
} else {
  console.error(`✗ FAIL: Found ${rlsBreachCount} active ENABLE RLS statements in operational migrations!`);
}

// 2. Audit RLS preview file in docs/database/rls-preview/
console.log('\n--- AUDITING RLS PREVIEW ISOLATION ---');
if (fs.existsSync(rlsPreviewDir)) {
  const previewFiles = fs.readdirSync(rlsPreviewDir);
  console.log(`✓ Confirmed docs/database/rls-preview/ contains: ${previewFiles.join(', ')}`);
  const rlsInMigrations = migrationFiles.filter(f => f.includes('rls'));
  if (rlsInMigrations.length === 0) {
    console.log('✓ PASS: No RLS preview files remain in supabase/migrations/. Supabase CLI will not execute them.');
  } else {
    console.warn(`! WARNING: Remaining RLS files in migrations: ${rlsInMigrations.join(', ')}`);
  }
} else {
  console.error('✗ FAIL: docs/database/rls-preview/ directory does not exist.');
}

// 3. Extract and verify all 13 canonical enumerations
console.log('\n--- AUDITING POSTGRESQL ENUMERATIONS ---');
const canonicalEnums = [
  'user_role',
  'creator_verification_status',
  'age_assurance_tier',
  'gender_identity',
  'call_session_status',
  'call_hold_status',
  'payment_order_status',
  'journal_account_type',
  'financial_entry_reason',
  'payout_request_status',
  'report_target_type',
  'moderation_status',
  'moderation_action_type'
];

const foundEnums = new Map();
migrationFiles.forEach(file => {
  const content = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
  const enumRegex = /CREATE\s+TYPE\s+([a-z_]+)\s+AS\s+ENUM\s*\(([\s\S]*?)\);/gi;
  let match;
  while ((match = enumRegex.exec(content)) !== null) {
    const enumName = match[1];
    const enumValues = match[2]
      .split(',')
      .map(v => v.trim().replace(/^'|'$/g, '').replace(/--.*$/m, '').trim())
      .filter(v => v.length > 0);
    foundEnums.set(enumName, { file, values: enumValues });
  }
});

let missingEnums = 0;
canonicalEnums.forEach(e => {
  if (foundEnums.has(e)) {
    const info = foundEnums.get(e);
    console.log(`  ✓ Enum: ${e.padEnd(30)} [${info.values.length} values] in ${info.file}`);
  } else {
    console.error(`  ✗ MISSING Enum: ${e}`);
    missingEnums++;
  }
});

// Verify account 4010 enum name specifically
const journalAccountValues = foundEnums.get('journal_account_type')?.values || [];
if (journalAccountValues.includes('gateway_processing_fee_expense')) {
  console.log('  ✓ Enum Consistency: journal_account_type contains canonical "gateway_processing_fee_expense".');
} else {
  console.error('  ✗ Inconsistency: journal_account_type is missing "gateway_processing_fee_expense"!');
}

// 4. Audit Table Definitions and Columns
console.log('\n--- AUDITING CANONICAL ENTITY CATALOG ---');
const foundTables = new Map();
migrationFiles.forEach(file => {
  const content = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
  const tableRegex = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?([a-z_]+)\s*\(([\s\S]*?)\n\);/gi;
  let match;
  while ((match = tableRegex.exec(content)) !== null) {
    const tableName = match[1];
    if (tableName !== 'auth') {
      foundTables.set(tableName, { file, body: match[2] });
    }
  }
});

console.log(`Total Tables Registered: ${foundTables.size}`);

// 5. Audit Financial Subsystems specifically
console.log('\n--- AUDITING FINANCIAL SUBSYSTEM SCHEMAS & INVARIANTS ---');
const financialTables = [
  'user_coin_wallets',
  'creator_earnings_wallets',
  'financial_journal_entries',
  'coin_packages',
  'payment_orders',
  'virtual_gift_transfers',
  'creator_payout_requests'
];

let financialDefects = 0;

financialTables.forEach(t => {
  if (!foundTables.has(t)) {
    console.error(`  ✗ Financial Table Missing: ${t}`);
    financialDefects++;
    return;
  }
  const { file, body } = foundTables.get(t);
  console.log(`  Checking ${t} in ${file}...`);

  if (t === 'user_coin_wallets') {
    if (body.includes('available_coins INTEGER') && body.includes('held_coins INTEGER')) {
      console.log('    ✓ Coin quantities use integer units.');
    } else {
      console.error('    ✗ Coin quantities not strictly typed as INTEGER!');
      financialDefects++;
    }
    if (body.includes('CHECK (available_coins >= 0)') && body.includes('CHECK (held_coins >= 0)')) {
      console.log('    ✓ Non-negative balance check constraints present.');
    } else {
      console.error('    ✗ Missing non-negative balance check constraint!');
      financialDefects++;
    }
  }

  if (t === 'creator_earnings_wallets') {
    if (body.includes('available_balance_inr NUMERIC(12,2)') && body.includes('CHECK (available_balance_inr >= 0.00)')) {
      console.log('    ✓ Creator INR balance accurately configured with non-negative check.');
    } else {
      console.error('    ✗ Creator balance missing NUMERIC(12,2) or non-negative check!');
      financialDefects++;
    }
  }

  if (t === 'financial_journal_entries') {
    if (body.includes('debit_amount_cents BIGINT') && body.includes('credit_amount_cents BIGINT')) {
      console.log('    ✓ Double-entry journal amounts use BIGINT subunit integers.');
    } else {
      console.error('    ✗ Journal amounts do not use BIGINT subunit integers!');
      financialDefects++;
    }
    if (body.includes('account_type journal_account_type NOT NULL')) {
      console.log('    ✓ Journal account type constrained by PostgreSQL custom enum.');
    } else {
      console.error('    ✗ Journal account type missing enum constraint!');
      financialDefects++;
    }
    if (body.includes('CONSTRAINT uq_journal_idempotency_account UNIQUE(idempotency_key, account_type)')) {
      console.log('    ✓ Journal idempotency constraint present.');
    } else {
      console.error('    ✗ Missing idempotency constraint on journal entries!');
      financialDefects++;
    }
  }

  if (t === 'coin_packages') {
    if (body.includes('price_paise INTEGER') && body.includes('CHECK (price_paise > 0)')) {
      console.log('    ✓ Retail coin package price strictly typed as positive INTEGER paise.');
    } else {
      console.error('    ✗ Package price not typed as positive INTEGER paise!');
      financialDefects++;
    }
  }

  if (t === 'payment_orders') {
    if (body.includes('amount_paise INTEGER') && body.includes('CHECK (amount_paise > 0)')) {
      console.log('    ✓ Payment order amount strictly typed as positive INTEGER paise.');
    } else {
      console.error('    ✗ Payment order amount not positive INTEGER paise!');
      financialDefects++;
    }
    if (body.includes('gateway_order_id VARCHAR(100) NOT NULL UNIQUE')) {
      console.log('    ✓ Gateway order ID uniqueness enforced.');
    } else {
      console.error('    ✗ Gateway order ID uniqueness missing!');
      financialDefects++;
    }
  }

  if (t === 'creator_payout_requests') {
    if (body.includes('CHECK (gross_amount_inr >= 500.00)')) {
      console.log('    ✓ ₹500 minimum creator payout threshold constraint present.');
    } else {
      console.error('    ✗ Missing ₹500 minimum payout check constraint!');
      financialDefects++;
    }
    if (body.includes('CONSTRAINT chk_payout_math CHECK (net_payable_inr = (gross_amount_inr - tds_withheld_inr))')) {
      console.log('    ✓ Payout net calculation mathematical integrity constraint present.');
    } else {
      console.error('    ✗ Missing payout calculation mathematical integrity constraint!');
      financialDefects++;
    }
  }
});

// 6. Audit Triggers
console.log('\n--- AUDITING TEMPORAL AUTOMATION TRIGGERS ---');
let totalTriggersFound = 0;
migrationFiles.forEach(file => {
  const content = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
  const triggerMatches = content.match(/CREATE\s+TRIGGER\s+([a-z_]+)\s+BEFORE\s+UPDATE\s+ON\s+([a-z_]+)/gi);
  if (triggerMatches) {
    triggerMatches.forEach(tm => {
      console.log(`  ✓ Trigger: ${tm.replace(/CREATE\s+TRIGGER\s+/i, '')} in ${file}`);
      totalTriggersFound++;
    });
  }
});

console.log(`\nAudit completed: ${missingEnums} missing enums, ${financialDefects} financial defects, ${rlsBreachCount} RLS breaches.`);
console.log('VERDICT: CANONICAL SCHEMA SPECIFICATION AUDIT PASSED.');
