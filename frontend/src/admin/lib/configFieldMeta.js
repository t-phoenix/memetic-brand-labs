/**
 * Admin UI metadata for business_config keys.
 * Falls back to type inference when a key is not listed.
 */
export const CONFIG_GROUPS = [
  {
    id: 'access',
    title: 'Access & verification',
    description: 'Who can unlock runs and how email domains are validated.',
    match: (key) => key.startsWith('access.') && key !== 'access.free_email_model_tier',
  },
  {
    id: 'x402',
    title: 'x402 payments',
    description: 'USDC network, facilitator, and treasury wallet for on-chain payments.',
    match: (key) => key.startsWith('x402.'),
  },
  {
    id: 'email',
    title: 'Results email (Resend)',
    description:
      'Delivered via Resend when a user unlocks their run. Verify your sending domain and set RESEND_API_KEY on the API before enabling. See docs/narrative-engine/resend-email-setup.md.',
    match: (key) => key.startsWith('email.results'),
  },
  {
    id: 'workshop',
    title: 'Workshop CTA',
    description: 'Optional workshop promotion inside results emails.',
    match: (key) => key.startsWith('email.workshop'),
  },
  {
    id: 'discovery',
    title: 'Agent discovery',
    description: 'How AI agents discover this API (capabilities, Bazaar metadata).',
    match: (key) => key.startsWith('discovery.'),
  },
];

export const CONFIG_FIELD_META = {
  'access.allow_oauth_personal_email': {
    type: 'boolean',
    label: 'Allow personal email via Google',
    hint: 'When enabled, users can sign in with Gmail and other consumer OAuth accounts.',
  },
  'access.email_vendor_enabled': {
    type: 'boolean',
    label: 'Third-party email verification',
    hint: 'Enable external email reputation checks (when integrated).',
  },
  'access.email_vendor_threshold': {
    type: 'select',
    label: 'Email vendor threshold',
    hint: 'When to call the external email vendor.',
    options: [
      { value: 'suspicious_domain_only', label: 'Suspicious domains only' },
      { value: 'always', label: 'Always' },
      { value: 'never', label: 'Never' },
    ],
  },
  'access.consumer_domain_blocklist': {
    type: 'tags',
    label: 'Blocked consumer email domains',
    hint: 'Typed company-email verification rejects these domains (comma-separated).',
  },
  'x402.network': {
    type: 'select',
    label: 'Blockchain network',
    hint: 'CAIP-2 chain ID used for x402 USDC payments.',
    options: [
      { value: 'eip155:8453', label: 'Base mainnet (eip155:8453)' },
      { value: 'eip155:84532', label: 'Base Sepolia testnet (eip155:84532)' },
    ],
  },
  'x402.facilitator_url': {
    type: 'url',
    label: 'Facilitator URL',
    hint: 'x402 payment facilitator endpoint (use production URL on mainnet).',
    placeholder: 'https://facilitator.xpay.sh',
  },
  'x402.pay_to': {
    type: 'text',
    label: 'Treasury wallet',
    hint: 'EVM address that receives USDC payments. Leave empty to use server env fallback.',
    placeholder: '0x…',
  },
  'discovery.bazaar_enabled': {
    type: 'boolean',
    label: 'Bazaar extension on 402',
    hint: 'Include Bazaar metadata in payment-required responses for agent marketplaces.',
  },
  'discovery.service_name': {
    type: 'text',
    label: 'Service name',
    hint: 'Displayed in agent discovery and Bazaar listings.',
    placeholder: 'MBL Narrative Engine',
  },
  'discovery.tags': {
    type: 'tags',
    label: 'Discovery tags',
    hint: 'Comma-separated tags for agent search (e.g. brand, positioning).',
  },
  'email.results_enabled': {
    type: 'boolean',
    label: 'Send results email',
    hint: 'Email the four narrative cards when a run unlocks. Requires Resend domain verification + RESEND_API_KEY on the API.',
  },
  'email.results_from': {
    type: 'text',
    label: 'From address',
    hint: 'Must use your Resend-verified domain (e.g. results@memetic.adpr.work). Format: Name <email@domain.com>',
    placeholder: 'Memetic Brand Labs <results@memetic.adpr.work>',
  },
  'email.results_reply_to': {
    type: 'email',
    label: 'Reply-to address',
    placeholder: 'hello@adpr.work',
  },
  'email.results_include_share_link': {
    type: 'boolean',
    label: 'Include public share link',
    hint: 'Add a shareable results URL in the results email.',
  },
  'email.workshop_cta_enabled': {
    type: 'boolean',
    label: 'Show workshop CTA',
    hint: 'Include an application link for the Memetic Brand Workshop.',
  },
  'email.workshop_cta_url': {
    type: 'url',
    label: 'Workshop application URL',
    placeholder: 'https://memetic.adpr.work/application-form',
  },
  'email.workshop_cta_label': {
    type: 'text',
    label: 'Workshop button label',
    placeholder: 'Apply for the Memetic Brand Workshop',
  },
};

export function inferFieldType(key, value) {
  const meta = CONFIG_FIELD_META[key];
  if (meta?.type) return meta.type;
  if (value === true || value === false) return 'boolean';
  if (typeof value === 'string') return 'text';
  if (Array.isArray(value)) return 'tags';
  return 'json';
}

export function humanizeConfigKey(key) {
  const meta = CONFIG_FIELD_META[key];
  if (meta?.label) return meta.label;
  const tail = key.split('.').slice(1).join(' ');
  return tail.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export function groupCommerceConfig(rows) {
  const assigned = new Set();
  const groups = CONFIG_GROUPS.map((g) => ({
    ...g,
    rows: [],
  }));

  for (const row of rows) {
    const group = groups.find((g) => g.match(row.config_key));
    if (group) {
      group.rows.push(row);
      assigned.add(row.config_key);
    }
  }

  const other = rows.filter((r) => !assigned.has(r.config_key));
  if (other.length) {
    groups.push({
      id: 'other',
      title: 'Other',
      description: 'Additional commerce settings.',
      rows: other,
    });
  }

  return groups.filter((g) => g.rows.length > 0);
}
