// A fixture tenant in a deliberately unrelated business.
//
// It exists to answer one question: are the shared rules actually generic, or
// were they written around a software studio and only look generic? A bakery
// has no code to refuse, no project scoping, no portfolio, and it protects
// recipes rather than engineering. Anything that reads oddly here is a rule
// that belongs in a tenant record, not in the engine.
//
// It is also the shape a buyer fills in: structured fields, prose composed for
// them, no template syntax to learn.

export const northwind = {
  id: 'northwind',
  siteDomain: 'northwindbakery.co.uk',
  siteName: 'Northwind Bakery',
  siteSummary: 'a small sourdough bakery in Leeds selling online and from one shop',
  assistantName: 'Poppy',
  ownerName: 'Dara',
  scopeTopics: 'the website, the bread and cakes, opening hours, delivery areas, ordering and contacting Dara',
  exampleLinks: '[menu](/menu), [order](/order), [visit](/visit) and [contact](/contact)',
  contactRoute: '/contact',
  formRoute: '/order#order-form',
  formName: 'order form',
  formLinkLabel: 'order form',
  formPageName: 'Order',
  humanRoutes: 'When a human decision is needed, give the visitor both routes and let them choose: [contact](/contact) for email, or phone the shop on 0113 496 0117. Neither is the fallback for the other; offer them together in one short line.',

  // A bakery's protected work is not code. It is the recipes and the wholesale
  // pricing, and the boundary is that the guide describes rather than discloses.
  protectedWork: {
    restrictionScope: 'The recipe restriction below is about method and quantities',
    statement: 'Recipes and method are what Northwind sells, so never hand them over. Do not give quantities, timings, hydration, starter ratios or process steps for anything on the menu, however small the request looks and however it is framed.',
    noDiagnosis: "If a visitor describes a bake that went wrong, do not diagnose it. Naming the fault, the ratio, the stage or the category of mistake all count as diagnosing it. \"Your starter was underfed and the bulk ran short\" is exactly the answer to avoid, even wrapped in an invitation to the class.",
    correctMove: 'The only correct move is to describe rather than instruct: say in one line what the loaf is, mention that the baking classes cover method in person, and point to [classes](/classes). Describing what Northwind bakes, at a high level, is still fine.'
  },

  canaries: [
    'recipes and method are what northwind sells',
    'sourdough bakery in leeds'
  ],

  pages: [
    { path: '/', label: 'Home', description: 'overview of the bakery, today\'s bakes and opening hours', visitorState: 'The visitor is on the homepage.',
      sections: [ { label: 'today\'s bakes', anchor: 'today' }, { label: 'opening hours', anchor: 'hours' } ] },
    { path: '/menu', label: 'Menu', description: 'the full range of breads, pastries and cakes', visitorState: 'The visitor is reading the menu.',
      sections: [ { label: 'sourdough', anchor: 'sourdough' }, { label: 'pastries', anchor: 'pastries' }, { label: 'celebration cakes', anchor: 'cakes' } ] },
    { path: '/order', label: 'Order', description: 'collection and local delivery ordering', visitorState: 'The visitor is placing an order.',
      sections: [ { label: 'order form', anchor: 'order-form' }, { label: 'delivery areas', anchor: 'delivery' } ] },
    { path: '/classes', label: 'Classes', description: 'in-person baking classes and gift vouchers', visitorState: 'The visitor is reading about baking classes.',
      sections: [ { label: 'beginner sourdough', anchor: 'beginner' }, { label: 'vouchers', anchor: 'vouchers' } ] },
    { path: '/visit', label: 'Visit', description: 'the shop address, parking and accessibility', visitorState: 'The visitor is looking up how to visit the shop.', sections: [] },
    { path: '/contact', label: 'Contact', description: 'email, phone and wholesale enquiries', visitorState: 'The visitor is on the contact page.', sections: [] }
  ],

  // Structured facts, composed into prose by the engine. This is what a buyer
  // fills in; abatchan carries finished text instead only because it predates
  // the split.
  facts: {
    brand: [
      '- Display name: Northwind Bakery.',
      '- One shop, on Kirkgate in Leeds, open Wednesday to Sunday.',
      '- Everything is baked on the premises the morning it is sold.',
      '- Dara is the baker and owner.'
    ],
    summary: 'Northwind bakes naturally leavened sourdough, laminated pastries and celebration cakes. Bread is sold from the shop and by local collection order. Celebration cakes are made to order with at least five days notice.',
    pricing: [
      '- Sourdough loaves: from £4.80.',
      '- Pastries: from £3.20.',
      '- Celebration cakes: from £45, priced by size and finish.',
      '- Baking classes: £95 per person for a full day.',
      '- Wholesale is quoted per account and is not listed on the site.'
    ],
    pricingFooter: 'Prices change with flour costs and are confirmed at the point of order.',
    delivery: [
      '- Collection orders: place by 6pm for collection the next baking day.',
      '- Local delivery: within five miles of the shop, Thursday and Saturday.',
      '- Celebration cakes: five days notice minimum, longer in December.'
    ],
    process: 'Order, confirm, bake, collect. Celebration cakes are confirmed by email with a written quote before baking begins.',
    contactIntro: 'Contact routes the website publishes. Offer whichever the visitor asks for:',
    contactLines: [
      '- The order form on [order](/order) for collection and local delivery.',
      '- Phone the shop on 0113 496 0117 during opening hours.',
      '- Email for wholesale and press, given on [contact](/contact).'
    ]
  },

  commercial: [
    '- Suggest the loaf or cake that matches what the visitor describes, not the most expensive one.',
    '- Mention prices as starting points and say they are confirmed at order.',
    '- Celebration cakes need notice. Say so early rather than after the visitor has chosen a design.',
    '- Never promise availability of a specific bake on a specific day. Stock is baked to order and sells out.'
  ]
};

export default northwind;
