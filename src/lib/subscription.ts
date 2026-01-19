import { prisma } from "@/lib/db";

/**
 * Check whether a user has an active PRO subscription
 */
export async function checkSubscription(userId: string): Promise<boolean> {
  if (!userId) return false;

  const subscription = await prisma.userSubscription.findUnique({
    where: {
      userId,
    },
  });

  if (!subscription) return false;

  // If you later add payments, this date will be set
  if (subscription.stripeCurrentPeriodEnd) {
    return subscription.stripeCurrentPeriodEnd > new Date();
  }

  return false;
}
