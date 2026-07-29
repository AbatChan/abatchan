// Starting set of client reviews, used until the dashboard saves its own.
//
// Every quote is the client's own words on Upwork or Fiverr, in full. Long
// ones are clamped in the page and open on demand rather than being cut, so
// nothing is edited down to the flattering part. Contracts that closed with
// no written feedback are left out rather than padded with a bare rating.
//
// Clients know Abat by his legal name, Akinyugha Babajide Mathew, so the
// quotes name him variously as Mathew, Matthew, Akinyugha and Abat. They are
// published as written; /about explains the names.
window.ABATCHAN_REVIEW_DEFAULTS = [
  {
    id: 'review-rescue-2025-01',
    quote: "Akinyugha did an amazing job. Can\u2019t wait to work with him again. He came in after the previous developer went M.I.A. Akinyugha took a look at the site and discovered the horrible job the previous developer had done. This young man got the site ready for launch in a couple of days. He did what I asked and understood the assignment. I will definitely work with him again.",
    engagement: 'Website rescue and launch',
    source: 'Upwork', date: 'January 2025', rating: 5,
    pages: 'home', published: true, featured: false, position: 0
  },
  {
    id: 'review-fix-2026-03',
    quote: "Akinyugha was very professional to work with and very responsive. I had an issue, and within 3 hours he was able to completely fix and complete it for me. I will be hiring him again in the future if more assistance is needed.",
    engagement: 'BookingKoala repair',
    source: 'Upwork', date: 'March 2026', rating: 5,
    pages: 'home', published: true, featured: true, position: 1
  },
  {
    id: 'review-ghl-2025-10',
    quote: "Thank you Matthew for sticking through this tricky project. It wasn't the most straightforward integration, but Matthew made sure the job got done and didn't leave me hanging. Will be using again in the future.",
    engagement: 'GoHighLevel automation',
    source: 'Upwork', date: 'October 2025', rating: 5,
    pages: 'home', published: true, featured: false, position: 2
  },
  {
    id: 'review-bandzoogle-2024-04',
    quote: "Akinyugha is fantastic! So glad he could help me migrate my site from Wordpress to Bandzoogle. One of the best people to hire on Upwork for Bandzoogle sites and custom CSS!",
    engagement: 'WordPress to Bandzoogle migration',
    source: 'Upwork', date: 'April 2024', rating: 4.9,
    pages: 'home', published: true, featured: false, position: 3
  },
  {
    id: 'review-turnaround-2024-02',
    quote: "Absolutely Phenomenal - A Solid 10 out of 10 Experience! I had the pleasure of working with Akinyugha, an exceptional freelancer specializing in Booking Koala integrations and setup. The results were truly outstanding, with an impressively quick turnaround of just one day! Akinyugha's communication skills were top-notch, ensuring a seamless process by meeting with me at every step to guarantee precise delivery. Their kindness and responsiveness added an extra layer of satisfaction to the experience. Don't waste time searching\u2014hire him now! You'll be more than pleased with the results.",
    engagement: 'BookingKoala and quote form setup',
    source: 'Upwork', date: 'February 2024', rating: 5,
    pages: 'home', published: true, featured: false, position: 4
  },
  {
    id: 'review-cleaning-2026-05',
    quote: "Matthew did an outstanding job building my cleaning website on BookingKoala. He understood exactly what I needed, executed every detail with precision, and delivered a clean, modern, and fully functional site. His communication was excellent throughout the entire project. Highly recommend working with him!",
    engagement: 'BookingKoala cleaning site',
    source: 'Upwork', date: 'May 2026', rating: 5,
    pages: 'pricing', published: true, featured: false, position: 5
  },
  {
    id: 'review-finishing-2026-05',
    quote: "Matthew did an outstanding job putting the finishing touches on my cleaning website. He refined the layout, tightened the design, and made sure every detail looked clean, modern, and ready for customers. His expertise and attention to detail truly elevated the final product. Highly recommend his work.",
    engagement: 'Cleaning site refinements',
    source: 'Upwork', date: 'May 2026', rating: 5,
    pages: 'pricing', published: true, featured: false, position: 6
  },
  {
    id: 'review-quo-2026-02',
    quote: "Great to work with. Knows his stuff and will work to get the job done even if it's complicated and not easy to figure out. Will be working with Matthew again in the future.",
    engagement: 'Quo and BookingKoala integration',
    source: 'Upwork', date: 'February 2026', rating: 5,
    pages: 'pricing', published: true, featured: false, position: 7
  },
  {
    id: 'review-consult-2026-04',
    quote: "Matthew was great! He was very helpful in helping fix my booking section of my website on Booking Koala and also helping me clean up the home page and make final tweaks. Definitely very helpful and will use him again in the future for other websites!",
    engagement: 'Consultation and fixes',
    source: 'Upwork', date: 'April 2026', rating: 5,
    pages: 'pricing', published: true, featured: false, position: 8
  },
  {
    id: 'review-kartra-2025-11',
    quote: "Great contractor and always willing to get things done even if the task is hard.",
    engagement: 'Kartra migration',
    source: 'Upwork', date: 'November 2025', rating: 5,
    pages: 'pricing', published: true, featured: false, position: 9
  },
  {
    id: 'review-voxel',
    quote: "He is very helpful and knowledgeable in wordpress, elementor, voxel. If you need help ask him",
    engagement: 'WordPress, Elementor and Voxel',
    source: 'Fiverr', client: 'missashleigh20', date: '', rating: 5,
    pages: 'pricing', published: true, featured: false, position: 10
  },
  {
    id: 'review-booking-page-2025-09',
    quote: "Akinyugha was great to work with and did exactly what I needed seamlessly! Highly recommend!",
    engagement: 'Full booking page',
    source: 'Upwork', date: 'September 2025', rating: 5,
    pages: 'archive', published: true, featured: false, position: 11
  },
  {
    id: 'review-flawless-2024-02',
    quote: "Akinyugha's Booking Koala integration for my site was a flawless experience. He delivered remarkable results, showcasing expertise, seamless communication, and unmatched responsiveness. For top-tier Booking Koala integrations, Akinyugha is the go-to choice.",
    engagement: 'BookingKoala integration',
    source: 'Upwork', date: 'February 2024', rating: 5,
    pages: 'archive', published: true, featured: false, position: 12
  },
  {
    id: 'review-ownerrez-2023-04',
    quote: "Abat did a great job .He followed through all the way until I was completely satisfied with the work I had given him. I would use his services again if I had a similar project",
    engagement: 'Vacation rental site with OwnerRez and Smoobu',
    source: 'Upwork', date: 'April 2023', rating: 5,
    pages: 'archive', published: true, featured: false, position: 13
  },
  {
    id: 'review-api-2023-02',
    quote: "I would definitely recommend Abat. Great attitude. Fun to work with. Always communicating and does excellent work.",
    engagement: 'Custom API integration',
    source: 'Upwork', date: 'February 2023', rating: 5,
    pages: 'archive', published: true, featured: false, position: 14
  },
  {
    id: 'review-cleaning-2023-05',
    quote: "Abat was great to work with, Super responsive and takes pride in his work. Highly recommended!",
    engagement: 'Cleaning service website',
    source: 'Upwork', date: 'May 2023', rating: 5,
    pages: 'archive', published: true, featured: false, position: 15
  },
  {
    id: 'review-wix-2024-03',
    quote: "Skilled, fast, and very communicative and open to feedback. Thank you! Will hire again for similar tasks if needed.",
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
    quote: "I met with him a for a consultation and he listened to my vision for modifying my website and offered solid feedback. I can't actually rate him on skill or quality of work yet since we hadn't started a project yet.",
    engagement: 'Consultation',
    source: 'Upwork', date: 'June 2025', rating: 5,
    pages: 'archive', published: true, featured: false, position: 18
  },
  {
    id: 'review-professional-2025-01',
    quote: "He is a true professional. Love working with him every time",
    engagement: 'Web development and maintenance',
    source: 'Upwork', date: 'January 2025', rating: 5,
    pages: 'archive', published: true, featured: false, position: 19
  },
  {
    id: 'review-every-time-2026-04',
    quote: "Excellent work every time",
    engagement: 'Ongoing site maintenance',
    source: 'Upwork', date: 'April 2026', rating: 5,
    pages: 'archive', published: true, featured: false, position: 20
  },
  {
    id: 'review-balance',
    quote: "I had the pleasure of working with Matthew, and I can confidently say he is one of the best website designers I have ever worked with. From the very beginning, he demonstrated a deep understanding of my vision and transformed it into a stunning, functional, and user-friendly website that exceeded all my expectations.\n\nWhat stood out the most was Matthew's attention to detail and his ability to think creatively while still keeping the end-user in mind. He seamlessly balanced aesthetics with functionality, ensuring that every element of the site served a purpose. His design choices were not just visually appealing but also strategically aligned with my business goals.\n\nThroughout the entire process, Matthew\u2019s professionalism, communication, and dedication were unparalleled. He was always open to feedback, quick to implement changes, and incredibly patient in explaining technical aspects in a way that was easy to understand. It felt like a true partnership.\n\nBeyond his technical expertise, what sets Matthew apart is his passion for his craft. He didn\u2019t just deliver a website\u2014he created an online presence that truly reflects my brand and connects with my audience. The positive feedback I\u2019ve received since the site launched has been overwhelming, and it\u2019s all thanks to his hard work.\n\nIf you\u2019re looking for a website designer who combines top-notch skills, creative flair, and a genuine commitment to your success, I cannot recommend Matthew highly enough. He\u2019s a rare talent, and I look forward to working with him again in the future!",
    engagement: 'Website design and build',
    source: 'Fiverr', client: 'kevinjeffers540', date: '', rating: 5,
    pages: 'archive', published: true, featured: false, position: 21
  },
  {
    id: 'review-amazes',
    quote: "Mathew truly AMAZES with his exceptional website development skills, demonstrating unparalleled professionalism and code expertise. His proactive communication and cooperative nature make the collaboration delightful. Highly polite and MORE than good at what he does, working with him was a breeze. \ud83d\ude0a",
    engagement: 'Website development',
    source: 'Fiverr', client: 'laurelemboumba', date: '', rating: 5,
    pages: 'archive', published: true, featured: false, position: 22
  },
  {
    id: 'review-timeframe',
    quote: "Always the best. Mathew is the best developer on fiverr. he will get the job done correctly and within the time frame.",
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
    quote: "Mathew did a great job with my logo! Fast delivery, clean design and exactly what I wanted. Easy to work with too. Recommend 100%.",
    engagement: 'Logo design',
    source: 'Fiverr', client: 'lifely_', date: '', rating: 5,
    pages: 'archive', published: true, featured: false, position: 25
  }
];
