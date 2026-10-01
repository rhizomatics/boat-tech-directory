// The site's sections, in navigation order. Single source for both the sidebar
// (astro.config.mjs) and the home page's "Sections" list (scripts/sync-readme.mjs), so the
// two can't drift apart. `children` are shown indented under their parent in both.
export const sections = [
  { label: "Social", slug: "social", description: "Blogs, vlogs, video channels and forums." },
  { label: "Charts and Data", slug: "charts", description: "Open and volunteer charting projects." },
  { label: "Open Source Projects", slug: "open-source-projects", description: "Software and firmware, including NMEA libraries." },
  { label: "Protocols", slug: "protocols", description: "NMEA, Seatalk, CANBus, SAE and other marine networking standards." },
  { label: "Vendors", slug: "vendors", description: "Hardware and software vendors, and specialist consultants." },
  { label: "News", slug: "news", description: "News and reviews." },
  { label: "Education", slug: "education", description: "Courses, certification and tutorials." },
  { label: "Servicing and Spares", slug: "servicing", description: "Servicing, spares and manufacturer support." },
  { label: "Checklists and Templates", slug: "checklists", description: "Shared checklists and passage planning templates." },
  { label: "Reference", slug: "reference", description: "Technical references." },
  { label: "Index", slug: "index-of-terms", description: "A–Z index of every entry." },
  { label: "Contributing", slug: "contributing", description: "How to suggest links or corrections." },
  {
    label: "Downloads",
    slug: "downloads",
    description: "Spreadsheets and printable PDFs.",
    children: [
      { label: "Example Checklists", slug: "downloads/example-checklists", description: "Before and after sailing, storm prep, laying up and haul-out." },
      { label: "Navigation Templates", slug: "downloads/navigation-templates", description: "Tidal planner for timing tidal gates." },
      { label: "NMEA Wi-Fi Gateways", slug: "downloads/nmea-wifi-gateways", description: "Comparison of NMEA 0183 and 2000 Wi-Fi gateways." },
    ],
  },
];
