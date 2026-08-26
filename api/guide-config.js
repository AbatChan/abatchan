// GET /api/guide-config?site=KEY
//
// The public face of a tenant record: what the widget needs to paint itself
// before anyone has asked a question. The embed on a buyer's site has no other
// way to learn the assistant's name or suggested questions.
//
// Deliberately narrow. Everything here is already visible to any visitor of the
// site it belongs to, so nothing in the record that is not needed for painting
// is exposed: no instructions, no prices, no page directory, no origins list.

import { resolveTenant, originAllowed } from '../lib/tenants/registry.js';
import { handlePreflight, applyCors, isCrossOrigin } from '../lib/http/cors.js';

export default async function handler(req, res) {
  if (await handlePreflight(req, res)) return;
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const origin = String(req.headers.origin || '');
  const host = String(req.headers['x-forwarded-host'] || req.headers.host || '');
  const siteKey = String(req.query?.site || '').trim();
  const tenant = siteKey ? await resolveTenant(siteKey) : null;

  applyCors(req, res, isCrossOrigin(req) ? origin : '');
  if (!tenant) return res.status(400).json({ error: 'unknown_site' });
  if (!originAllowed(tenant, { origin, host })) return res.status(403).json({ error: 'origin_not_allowed' });

  const record = tenant.record;
  res.setHeader('Cache-Control', 'public, max-age=60');
  return res.status(200).json({
    siteKey,
    name: record.assistantName,
    subtitle: record.assistantSubtitle || `site help, backed by ${record.ownerName}`,
    placeholder: record.composerPlaceholder || 'Ask about your project…',
    disclaimer: record.disclaimer || 'Site help only, no account access, payments, or promises.',
    chips: (record.chips || []).slice(0, 6),
    avatar: record.avatar || null,
    // The routes the widget may navigate to. Without these an embed refuses
    // every destination, because its only other option is a list of somebody
    // else's pages. Paths only: the descriptions are for the model, not the
    // browser, and are not the buyer's to publish here.
    paths: (record.pages || []).map(page => page.path),
    enabled: record.enabled !== false
  });
}
