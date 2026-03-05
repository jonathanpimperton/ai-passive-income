/**
 * MailerLite Drip Automation Setup Script
 *
 * Run: MAILERLITE_API_KEY=ml_xxx npx tsx scripts/setup-mailerlite-drip.ts
 *
 * What this script does:
 * 1. Creates custom fields (signup_source) if they don't exist
 * 2. Creates two automation drafts (newsletter welcome + results drip)
 * 3. Outputs instructions for the one manual step (pasting email HTML)
 *
 * The actual email content/steps must be configured in the MailerLite UI
 * because the API only supports creating draft automations (no email steps).
 */

const API_BASE = 'https://connect.mailerlite.com/api';
const GROUP_ID = '180838346043426395'; // "Calculator Results" group

const API_KEY = process.env.MAILERLITE_API_KEY;
if (!API_KEY) {
  console.error('ERROR: Set MAILERLITE_API_KEY environment variable');
  console.error('Usage: MAILERLITE_API_KEY=ml_xxx npx tsx scripts/setup-mailerlite-drip.ts');
  process.exit(1);
}

const headers = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${API_KEY}`,
};

async function apiGet(path: string) {
  const res = await fetch(`${API_BASE}${path}`, { headers });
  if (!res.ok) throw new Error(`GET ${path} failed: ${res.status} ${await res.text()}`);
  return res.json();
}

async function apiPost(path: string, body: unknown) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`POST ${path} failed: ${res.status} ${await res.text()}`);
  return res.json();
}

// Step 1: Ensure custom fields exist
async function ensureFields() {
  console.log('\n--- Step 1: Checking custom fields ---');

  const { data: fields } = await apiGet('/fields?limit=100') as { data: Array<{ key: string; name: string }> };
  const existingKeys = new Set(fields.map((f: { key: string }) => f.key));

  const requiredFields = [
    { name: 'signup_source', type: 'text' },
    { name: 'calculator_slug', type: 'text' },
  ];

  for (const field of requiredFields) {
    if (existingKeys.has(field.name)) {
      console.log(`  ✓ Field "${field.name}" already exists`);
    } else {
      const result = await apiPost('/fields', field) as { data: { key: string } };
      console.log(`  + Created field "${field.name}" (key: ${result.data.key})`);
    }
  }
}

// Step 2: Create automation drafts
async function createAutomations() {
  console.log('\n--- Step 2: Creating automation drafts ---');

  // Check existing automations to avoid duplicates
  const { data: existing } = await apiGet('/automations?limit=100') as { data: Array<{ name: string; id: string }> };
  const existingNames = new Set(existing.map((a: { name: string }) => a.name));

  const automations = [
    { name: 'CalcRun Drip: Newsletter Subscribers (Welcome + Full Sequence)' },
    { name: 'CalcRun Drip: Results Subscribers (Skip Welcome, Start at Email 2)' },
  ];

  for (const auto of automations) {
    if (existingNames.has(auto.name)) {
      const match = existing.find((a: { name: string }) => a.name === auto.name);
      console.log(`  ✓ Automation "${auto.name}" already exists (ID: ${match?.id})`);
    } else {
      try {
        const result = await apiPost('/automations', { name: auto.name }) as { data: { id: string } };
        console.log(`  + Created draft automation "${auto.name}" (ID: ${result.data.id})`);
      } catch (err) {
        console.log(`  ! Could not create automation "${auto.name}": ${err}`);
        console.log(`    (Create it manually in the MailerLite UI)`);
      }
    }
  }
}

// Step 3: Verify group exists
async function verifyGroup() {
  console.log('\n--- Step 3: Verifying group ---');
  try {
    const { data: group } = await apiGet(`/groups/${GROUP_ID}`) as { data: { name: string; subscriber_count: number } };
    console.log(`  ✓ Group "${group.name}" exists (${group.subscriber_count} subscribers)`);
  } catch {
    console.log(`  ! Group ${GROUP_ID} not found. Create "Calculator Results" group in MailerLite.`);
  }
}

async function main() {
  console.log('=== MailerLite Drip Setup ===');
  console.log(`API Key: ${API_KEY.slice(0, 8)}...${API_KEY.slice(-4)}`);

  await verifyGroup();
  await ensureFields();
  await createAutomations();

  console.log('\n=== Setup Complete ===\n');
  console.log('REMAINING MANUAL STEPS:');
  console.log('');
  console.log('1. Go to app.mailerlite.com > Automations');
  console.log('');
  console.log('2. Open "CalcRun Drip: Newsletter Subscribers" and configure:');
  console.log('   - Trigger: "When subscriber joins a group" → Calculator Results');
  console.log('   - Condition: signup_source equals "newsletter"');
  console.log('   - Add steps: Email 1 (Welcome) → 3d delay → Email 2 → 4d delay → ...');
  console.log('   - Paste HTML from docs/mailerlite-drip-setup.md for each email');
  console.log('   - Sender: CalcRun <hello@calcrun.com>');
  console.log('');
  console.log('3. Open "CalcRun Drip: Results Subscribers" and configure:');
  console.log('   - Trigger: "When subscriber joins a group" → Calculator Results');
  console.log('   - Condition: signup_source equals "results"');
  console.log('   - Add steps: 3d delay → Email 2 → 4d delay → Email 3 → ...');
  console.log('   - (Skip Email 1 — their results email IS their welcome)');
  console.log('   - Paste same HTML templates from docs/mailerlite-drip-setup.md');
  console.log('');
  console.log('4. Activate both automations');
  console.log('');
  console.log('Email subjects & timing (see docs/mailerlite-drip-setup.md for full HTML):');
  console.log('  #1  Immediate  "Welcome to CalcRun"');
  console.log('  #2  Day 3      "The one number that changes everything"');
  console.log('  #3  Day 7      "One thing that could help"');
  console.log('  #4  Day 14     "What waiting 5 years actually costs you"');
  console.log('  #5  Day 21     "What 1% in fees actually costs you"');
  console.log('  #6  Day 30     "Your monthly money check-in"');
  console.log('  #7  Day 45     "The debt question everyone gets wrong"');
  console.log('  #8  Day 60     "Your savings lost purchasing power this year"');
  console.log('  #9  Day 90     "Quick check-in: how are your numbers looking?"');
  console.log('  #10 Day 120    "The one thing millionaires do differently"');
}

main().catch((err) => {
  console.error('Setup failed:', err);
  process.exit(1);
});
