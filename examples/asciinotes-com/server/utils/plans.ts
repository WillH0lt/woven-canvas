import { getFirestore } from "firebase-admin/firestore";

import { stripe } from "./stripe";

export async function assertActiveSubscription(uid: string): Promise<void> {
  const db = getFirestore();

  const customerRef = db.collection("customers").doc(uid);
  const customer = await customerRef.get();
  if (!customer.exists) {
    throw new Error("No customer found");
  }

  const customerId = customer.data()?.stripeId as string;

  const activeSubscriptions = await stripe.subscriptions.list({
    customer: customerId,
    status: "active",
  });

  if (activeSubscriptions.data.length === 0) {
    throw new Error("No active subscriptions found");
  }
}
