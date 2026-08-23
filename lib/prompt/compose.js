// Turns a tenant record into everything the request path needs: the role
// instructions, the business facts, the commercial sheet, the verified
// destination directory, and the canary list.
//
// The engine owns the rules; a tenant owns its own sentences. That division is
// deliberate. Trying to generate a business's prose from structured fields
// produces stilted copy and a settings screen nobody can fill in, so the tenant
// supplies the wording it wants and the engine supplies the structure and the
// boundaries around it.

import { opening, voiceRules, commercialRules, scopeRules, CORE_CANARIES } from './engine.js';

const block = (heading, lines) => lines?.length ? `${heading}\n${lines.join('\n')}` : '';

export const composeRole = tenant => [
  opening(tenant),
  '',
  voiceRules(tenant),
  '',
  commercialRules(),
  '',
  scopeRules(tenant)
].join('\n');

// A site being migrated already has its facts written as prose that took real
// effort to word. Rewriting that through a template would change it for no
// reason, so a tenant may hand over the finished text instead. New tenants,
// which is every buyer, supply structured fields and get the prose composed.
export const composeFacts = tenant => {
  if (tenant.factsText) return tenant.factsText;
  const f = tenant.facts || {};
  return [
    block('Official brand facts:', f.brand),
    f.summary,
    block('Current starting prices:', f.pricing),
    f.pricingFooter,
    block('Typical delivery expectations:', f.delivery),
    f.process,
    block('Page directory:', pageDirectoryLines(tenant)),
    block(f.contactIntro, f.contactLines)
  ].filter(Boolean).join('\n\n');
};

export const composeCommercial = tenant => tenant.commercialText
  || block('Current delivery and commercial guidance:', tenant.commercial);

// One page entry renders as its own directory line. Sections are what make
// highlighting possible, so a page without them still works but can only be
// opened at the top.
const pageDirectoryLines = tenant => (tenant.pages || []).map(page => {
  const sections = (page.sections || [])
    .map(section => `[${section.label}](${page.path}#${section.anchor})`);
  const tail = sections.length
    ? ` ${page.sectionsLabel || 'Specific sections:'} ${joinList(sections)}.`
    : '';
  return `- [${page.label}](${page.path}): ${page.description}${tail}`;
});

const joinList = items => items.length < 2
  ? items[0] || ''
  : `${items.slice(0, -1).join(', ')}, and ${items.at(-1)}`;

// The server-validated destination directory. Navigation is only ever allowed
// to a route that appears here, so it is derived from the same tenant record
// rather than maintained separately and drifting out of step.
export const composePageMap = tenant => Object.fromEntries(
  (tenant.pages || []).map(page => [page.path, page.visitorState])
);

// A tenant's own wording deserves the same protection as the engine's, so its
// distinctive lines join the canary list.
export const composeCanaries = tenant => [
  ...CORE_CANARIES,
  ...(tenant.canaries || [])
].map(phrase => phrase.toLowerCase());

export const composeTenant = tenant => ({
  role: composeRole(tenant),
  facts: composeFacts(tenant),
  commercial: composeCommercial(tenant),
  pages: composePageMap(tenant),
  canaries: composeCanaries(tenant)
});
