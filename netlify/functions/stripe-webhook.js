// netlify/functions/stripe-webhook.js
// Stripe appelle cette URL automatiquement après chaque paiement confirmé.
// C'est ici qu'on valide le paiement et qu'on crédite le client.
//
// ⚠️  Cette fonction nécessite la variable STRIPE_WEBHOOK_SECRET dans Netlify.

const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method not allowed" };
  }

  const sig = event.headers["stripe-signature"];
  let stripeEvent;

  try {
    stripeEvent = stripe.webhooks.constructEvent(
      event.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error("Webhook signature error:", err.message);
    return { statusCode: 400, body: `Webhook Error: ${err.message}` };
  }

  // On ne traite que les paiements confirmés
  if (stripeEvent.type === "checkout.session.completed") {
    const session = stripeEvent.data.object;
    const { clientCode, creditAmount, currency, bonus } = session.metadata;

    console.log(`✅ Paiement confirmé pour ${clientCode} : +${creditAmount} ${currency} (bonus: ${bonus})`);

    // Dans une vraie app avec base de données (ex: Supabase, FaunaDB, Airtable),
    // vous appelleriez ici votre API pour créditer le client.
    //
    // Exemple avec Supabase :
    // await supabase.from('clients').update({ credit: supabase.raw(`credit + ${creditAmount}`) }).eq('code', clientCode)
    //
    // Pour cette version, le crédit est géré côté client (localStorage).
    // La page payment-success lit les paramètres URL et met à jour le localStorage.
  }

  return { statusCode: 200, body: JSON.stringify({ received: true }) };
};
