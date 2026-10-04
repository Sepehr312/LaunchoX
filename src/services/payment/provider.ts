import "server-only";

export interface PaymentProvider {
  name: string;
  requestPayment(input: {
    orderId: string;
    amount: number;
    description: string;
    callbackUrl: string;
    mobile?: string;
    email?: string;
  }): Promise<{ redirectUrl: string; authority: string }>;
  verifyPayment(input: {
    authority: string;
    amount: number;
    params: Record<string, string>;
  }): Promise<{ success: boolean; refId?: string; message?: string }>;
}
