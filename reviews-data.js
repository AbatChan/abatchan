// Starting set of client reviews, used until the dashboard saves its own.
//
// Every quote is verbatim from the client's own words on Upwork or Fiverr.
// Where a review ran long it is trimmed to one continuous passage, never
// stitched together from separate sentences, so nothing is made to say more
// than the client said. Contracts that closed without written feedback are
// left out rather than padded with a rating and no words.
//
// Clients know Abat by his legal name, Akinyugha Babajide Mathew, so the
// quotes name him variously as Mathew, Matthew, Akinyugha and Abat. They are
// published as written; /about explains the names.
window.ABATCHAN_REVIEW_DEFAULTS = [
  {
    id: 'review-rescue-2025-01',
    quote: 'He came in after the previous developer went M.I.A. Akinyugha took a look at the site and discovered the horrible job the previous developer had done. This young man got the site ready for launch in a couple of days.',
    engagement: 'Website rescue and launch',
    source: 'Upwork', date: 'January 2025', rating: 5,
    pages: 'home', published: true, featured: false, position: 0
  },
  {
    id: 'review-fix-2026-03',
    quote: 'I had an issue, and within 3 hours he was able to completely fix and complete it for me.',
    engagement: 'BookingKoala repair',
    source: 'Upwork', date: 'March 2026', rating: 5,
    pages: 'home', published: true, featured: true, position: 1
  },
  {
    id: 'review-ghl-2025-10',
    quote: "It wasn't the most straightforward integration, but Matthew made sure the job got done and didn't leave me hanging.",
    engagement: 'GoHighLevel automation',
    source: 'Upwork', date: 'October 2025', rating: 5,
    pages: 'home', published: true, featured: false, position: 2
  },
  {
    id: 'review-bandzoogle-2024-04',
    quote: 'So glad he could help me migrate my site from Wordpress to Bandzoogle. One of the best people to hire on Upwork for Bandzoogle sites and custom CSS!',
    engagement: 'WordPress to Bandzoogle migration',
    source: 'Upwork', date: 'April 2024', rating: 4.9,
    pages: 'home', published: true, featured: false, position: 3
  },
  {
    id: 'review-turnaround-2024-02',
    quote: 'The results were truly outstanding, with an impressively quick turnaround of just one day!',
    engagement: 'BookingKoala and quote form setup',
    source: 'Upwork', date: 'February 2024', rating: 5,
    pages: 'home', published: true, featured: false, position: 4
  },
  {
    id: 'review-cleaning-2026-05',
    quote: 'He understood exactly what I needed, executed every detail with precision, and delivered a clean, modern, and fully functional site.',
    engagement: 'BookingKoala cleaning site',
    source: 'Upwork', date: 'May 2026', rating: 5,
    pages: 'pricing', published: true, featured: false, position: 5
  },
  {
    id: 'review-finishing-2026-05',
    quote: 'He refined the layout, tightened the design, and made sure every detail looked clean, modern, and ready for customers.',
    engagement: 'Cleaning site refinements',
    source: 'Upwork', date: 'May 2026', rating: 5,
    pages: 'pricing', published: true, featured: false, position: 6
  },
  {
    id: 'review-quo-2026-02',
    quote: "Knows his stuff and will work to get the job done even if it's complicated and not easy to figure out.",
    engagement: 'Quo and BookingKoala integration',
    source: 'Upwork', date: 'February 2026', rating: 5,
    pages: 'pricing', published: true, featured: false, position: 7
  },
  {
    id: 'review-consult-2026-04',
    quote: 'He was very helpful in helping fix my booking section of my website on Booking Koala and also helping me clean up the home page and make final tweaks.',
    engagement: 'Consultation and fixes',
    source: 'Upwork', date: 'April 2026', rating: 5,
    pages: 'pricing', published: true, featured: false, position: 8
  },
  {
    id: 'review-kartra-2025-11',
    quote: 'Great contractor and always willing to get things done even if the task is hard.',
    engagement: 'Kartra migration',
    source: 'Upwork', date: 'November 2025', rating: 5,
    pages: 'pricing', published: true, featured: false, position: 9
  },
  {
    id: 'review-voxel',
    quote: 'He is very helpful and knowledgeable in wordpress, elementor, voxel. If you need help ask him',
    engagement: 'WordPress, Elementor and Voxel',
    source: 'Fiverr', client: 'missashleigh20', date: '', rating: 5,
    pages: 'pricing', published: true, featured: false, position: 10
  },
  {
    id: 'review-booking-page-2025-09',
    quote: 'Akinyugha was great to work with and did exactly what I needed seamlessly!',
    engagement: 'Full booking page',
    source: 'Upwork', date: 'September 2025', rating: 5,
    pages: 'archive', published: true, featured: false, position: 11
  },
  {
    id: 'review-flawless-2024-02',
    quote: "Akinyugha's Booking Koala integration for my site was a flawless experience. He delivered remarkable results, showcasing expertise, seamless communication, and unmatched responsiveness.",
    engagement: 'BookingKoala integration',
    source: 'Upwork', date: 'February 2024', rating: 5,
    pages: 'archive', published: true, featured: false, position: 12
  },
  {
    id: 'review-ownerrez-2023-04',
    quote: 'He followed through all the way until I was completely satisfied with the work I had given him. I would use his services again if I had a similar project',
    engagement: 'Vacation rental site with OwnerRez and Smoobu',
    source: 'Upwork', date: 'April 2023', rating: 5,
    pages: 'archive', published: true, featured: false, position: 13
  },
  {
    id: 'review-api-2023-02',
    quote: 'I would definitely recommend Abat. Great attitude. Fun to work with. Always communicating and does excellent work.',
    engagement: 'Custom API integration',
    source: 'Upwork', date: 'February 2023', rating: 5,
    pages: 'archive', published: true, featured: false, position: 14
  },
  {
    id: 'review-cleaning-2023-05',
    quote: 'Abat was great to work with, Super responsive and takes pride in his work. Highly recommended!',
    engagement: 'Cleaning service website',
    source: 'Upwork', date: 'May 2023', rating: 5,
    pages: 'archive', published: true, featured: false, position: 15
  },
  {
    id: 'review-wix-2024-03',
    quote: 'Skilled, fast, and very communicative and open to feedback.',
    engagement: 'Wix site edits',
    source: 'Upwork', date: 'March 2024', rating: 5,
    pages: 'archive', published: true, featured: false, position: 16
  },
  {
    id: 'review-signature-2024-01',
    quote: "Akinyugha was very easy to communicate and worked quickly. I'm happy with the end product.",
    engagement: 'Email signature banner',
    source: 'Upwork', date: 'January 2024', rating: 5,
    pages: 'archive', published: true, featured: false, position: 17
  },
  {
    id: 'review-consult-2025-06',
    quote: 'He listened to my vision for modifying my website and offered solid feedback.',
    engagement: 'Consultation',
    source: 'Upwork', date: 'June 2025', rating: 5,
    pages: 'archive', published: true, featured: false, position: 18
  },
  {
    id: 'review-professional-2025-01',
    quote: 'He is a true professional. Love working with him every time',
    engagement: 'Web development and maintenance',
    source: 'Upwork', date: 'January 2025', rating: 5,
    pages: 'archive', published: true, featured: false, position: 19
  },
  {
    id: 'review-every-time-2026-04',
    quote: 'Excellent work every time',
    engagement: 'Ongoing site maintenance',
    source: 'Upwork', date: 'April 2026', rating: 5,
    pages: 'archive', published: true, featured: false, position: 20
  },
  {
    id: 'review-balance',
    quote: 'He seamlessly balanced aesthetics with functionality, ensuring that every element of the site served a purpose.',
    engagement: 'Website design and build',
    source: 'Fiverr', client: 'kevinjeffers540', date: '', rating: 5,
    pages: 'archive', published: true, featured: false, position: 21
  },
  {
    id: 'review-amazes',
    quote: 'Mathew truly AMAZES with his exceptional website development skills, demonstrating unparalleled professionalism and code expertise.',
    engagement: 'Website development',
    source: 'Fiverr', client: 'laurelemboumba', date: '', rating: 5,
    pages: 'archive', published: true, featured: false, position: 22
  },
  {
    id: 'review-timeframe',
    quote: 'Always the best. Mathew is the best developer on fiverr. he will get the job done correctly and within the time frame.',
    engagement: 'Repeat engagements',
    source: 'Fiverr', client: 'missashleigh20', date: '', rating: 5,
    pages: 'archive', published: true, featured: false, position: 23
  },
  {
    id: 'review-repeat',
    quote: "He's very perfect, creative and goes all out on his work. Am now his repeat client. I highly recommend him.",
    engagement: 'Repeat engagements',
    source: 'Fiverr', client: 'quickprosa', date: '', rating: 5,
    pages: 'archive', published: true, featured: false, position: 24
  },
  {
    id: 'review-logo',
    quote: 'Fast delivery, clean design and exactly what I wanted. Easy to work with too.',
    engagement: 'Logo design',
    source: 'Fiverr', client: 'lifely_', date: '', rating: 5,
    pages: 'archive', published: true, featured: false, position: 25
  }
];
