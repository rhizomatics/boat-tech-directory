// GoatCounter endpoint for the public site. Only emitted for production builds served
// from the root of the public domain: not in `astro dev`, and not in the SignalK plugin
// build (non-root BASE_URL), which runs on a boat's local server, often offline.
export const goatcounterUrl =
  import.meta.env.PROD && import.meta.env.BASE_URL === "/"
    ? "https://boat-tech-directory.goatcounter.com/count"
    : null;
