import { createClient } from 'redis';
import dotenv from 'dotenv'
import { sendOrderConfirmEmail } from '../helpers/email.helper.js';
dotenv.config({quiet: true})

const REDIS_CHANNEL = "order_events"

const client = createClient({
    username: process.env.REDIS_USERNAME,
    password: process.env.REDIS_PASSWORD,
    socket: {
        host: process.env.REDIS_HOST,
        port: process.env.REDIS_PORT
    }
});

client.on('error', err => console.log('Redis Client Error', err));
client.on('connect', () => console.log('Redis Client connected successfully'));
await client.connect();

// --- CLIENT 2: Dành riêng cho SUBSCRIBER (Lắng nghe) ---
const subscriberClient = createClient({
    username: process.env.REDIS_USERNAME,
    password: process.env.REDIS_PASSWORD,
    socket: {
        host: process.env.REDIS_HOST,
        port: process.env.REDIS_PORT
    }
});
subscriberClient.on('error', err => console.error('Subscriber Client Error', err));
await subscriberClient.connect();
console.log('Subscriber Client connected successfully');

async function subscribeToOrderEvents() {
    await subscriberClient.subscribe(REDIS_CHANNEL, async (message) => {
        try {
            const orderData = JSON.parse(message);
            console.log(`Nhận được sự kiện đơn hàng mới: ${orderData.orderId}`);
            await sendOrderConfirmEmail(orderData);
            console.log("Đã gửi order email thành công")
        } catch (error) {
            console.error('Lỗi xử lý tin nhắn Redis Pub/Sub:', error);
        }
    });
    console.log(`Redis Subscriber đang lắng nghe trên kênh "${REDIS_CHANNEL}"`);
}

subscribeToOrderEvents();

export default client
