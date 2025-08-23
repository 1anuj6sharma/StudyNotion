const Razorpay = require("razorpay");

console.log("Razorpay Key:", process.env.RAZORPAY_KEY ? "Present" : "Missing");
console.log("Razorpay Secret:", process.env.RAZORPAY_SECRET ? "Present" : "Missing");

const razorpayInstance = new Razorpay({
    key_id: process.env.RAZORPAY_KEY,
    key_secret: process.env.RAZORPAY_SECRET,
});

// Test the instance
razorpayInstance.orders.create({
    amount: 100,
    currency: "INR",
    receipt: "test_receipt"
}).then(() => {
    console.log("Razorpay test order creation successful");
}).catch(err => {
    console.error("Razorpay initialization error:", err);
});

exports.instance = razorpayInstance;
