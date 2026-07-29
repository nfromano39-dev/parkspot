const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  // Only allow POST
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  try {
    const { amount, listing_id, listing_address, renter_email, hours, date } = req.body;

    if (!amount || amount < 50) {
      return res.status(400).json({ error: "Invalid amount" });
    }

    // Create PaymentIntent on Stripe
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Stripe uses cents
      currency: "usd",
      metadata: {
        listing_id: listing_id || "",
        listing_address: listing_address || "",
        renter_email: renter_email || "",
        hours: String(hours || ""),
        date: date || "",
      },
      description: `ParkSpot booking at ${listing_address} — ${hours} hr(s) on ${date}`,
    });

    return res.status(200).json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    });
  } catch (err) {
    console.error("Stripe error:", err);
    return res.status(500).json({ error: err.message });
  }
}
