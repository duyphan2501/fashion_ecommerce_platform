import PayOS from "@payos/node";
import dotenv from "dotenv";
import axios from "axios";

dotenv.config({ quiet: true });

const payOS = new PayOS(
  process.env.PAYOS_CLIENT_ID,
  process.env.PAYOS_API_KEY,
  process.env.PAYOS_CHECKSUM_KEY,
);

const startNgrokAndConfirmWebhook = async () => {
  try {
    console.log("Waiting for ngrok to start...");
    let url;
    if (process.env.NODE_ENV === "development") {
      await new Promise((r) => setTimeout(r, 4000));
      const { data } = await axios.get(process.env.NGROK_API_URL);
      const tunnel = data.tunnels.find((t) => t.public_url.startsWith("https"));
      if (!tunnel) return console.error("No HTTPS tunnel found from ngrok");
      url = tunnel.public_url;
    } else url = process.env.BACKEND_URL;
    const webhookUrl = `${url}/api/payment/webhook/payos`;
    await payOS.confirmWebhook(webhookUrl);
    console.log("Webhook confirmed:", webhookUrl);
  } catch (e) {
    console.error("Webhook error:", e);
  }
};

export default startNgrokAndConfirmWebhook;

export { payOS, startNgrokAndConfirmWebhook };
