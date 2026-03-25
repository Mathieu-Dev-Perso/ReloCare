// netlify/functions/create-checkout.js
// Cette fonction crée une session de paiement Stripe sécurisée.
// La clé secrète Stripe n'est JAMAIS exposée dans le HTML côté client.

const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

exports.handler = async (event) => {
  // Sécurité : uniquement les requêtes POST
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ error: "Method not allowed" }) };
  }

  let body;
  try {
    body = JSON.parse(event.body);
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: "Invalid JSON" }) };
  }

  const { amount, currency, clientCode, clientName, bonusPercent } = body;

  // Validations
  if (!amount || amount < 50) {
    return { statusCode: 400, body: JSON.stringify({ error: "Montant minimum : 50" }) };
  }
  if (!["chf", "eur"].includes((currency || "").toLowerCase())) {
    return { statusCode: 400, body: JSON.stringify({ error: "Devise invalide" }) };
  }
  if (!clientCode) {
    return { statusCode: 400, body: JSON.stringify({ error: "Code client requis" }) };
  }

  // Calcul du bonus
  const bonus = bonusPercent ? Math.round(amount * bonusPercent / 100) : 0;
  const totalCredit = amount + bonus;

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: currency.toLowerCase(),
            product_data: {
              name: "Recharge crédit ReloCare",
              description:
                `Client : ${clientName || clientCode}` +
                (bonus > 0 ? ` · Bonus ${bonusPercent}% inclus (+${bonus} ${currency.toUpperCase()})` : ""),
              images: [], // Vous pouvez ajouter votre logo ici
            },
            unit_amount: Math.round(amount * 100), // Stripe utilise les centimes
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      // Après paiement réussi → retour sur l'app avec paramètres
      success_url: `${process.env.URL}/payment-success?session_id={CHECKOUT_SESSION_ID}&client=${clientCode}&amount=${totalCredit}&currency=${currency}`,
      cancel_url: `${process.env.URL}/?cancelled=1`,
      metadata: {
        clientCode,
        clientName: clientName || "",
        creditAmount: String(totalCredit),
        currency: currency.toUpperCase(),
        bonus: String(bonus),
      },
    });

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: session.url, sessionId: session.id }),
    };
  } catch (err) {
    console.error("Stripe error:", err.message);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Erreur Stripe : " + err.message }),
    };
  }
};
