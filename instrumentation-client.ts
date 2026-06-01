import * as amplitude from "@amplitude/unified";

void amplitude.initAll(process.env.NEXT_PUBLIC_AMPLITUDE_API_KEY!, {
  analytics: {
    serverUrl: "https://api2.amplitude.com/2/httpapi", // browser API endpoint
    autocapture: {
      attribution: true,       // UTM / referrer
      pageViews: true,         // SPA route changes
      sessions: true,          // session start/end
      formInteractions: true,  // form starts + submits
      fileDownloads: true,     // file downloads
      elementInteractions: true,
    },
  },
  sessionReplay: { sampleRate: 1 },
  engagement: {},
});
