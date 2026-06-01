import { createInstance } from "@amplitude/analytics-node";

type AmplitudeNodeClient = ReturnType<typeof createInstance>;

let amplitudeClient: AmplitudeNodeClient | null = null;

export function getAmplitudeClient(): AmplitudeNodeClient | null {
  const apiKey = process.env.AMPLITUDE_API_KEY;
  if (!apiKey) return null;

  if (!amplitudeClient) {
    amplitudeClient = createInstance();
    amplitudeClient.init(apiKey, { serverUrl: "https://api2.amplitude.com" });
  }
  return amplitudeClient;
}

export async function flushAmplitude() {
  if (amplitudeClient) {
    await amplitudeClient.flush();
  }
}
