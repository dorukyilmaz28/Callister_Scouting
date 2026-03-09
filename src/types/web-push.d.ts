declare module "web-push" {
  function setVapidDetails(
    subject: string,
    publicKey: string,
    privateKey: string
  ): void;
  function sendNotification(
    subscription: { endpoint: string; keys: { p256dh: string; auth: string } },
    payload: string | Buffer | null,
    options?: { TTL?: number }
  ): Promise<{ statusCode: number }>;
  const defaultExport: {
    setVapidDetails: typeof setVapidDetails;
    sendNotification: typeof sendNotification;
  };
  export default defaultExport;
}
