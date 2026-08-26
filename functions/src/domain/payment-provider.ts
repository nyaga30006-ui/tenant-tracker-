export type ProviderName = "mpesa" | "kcb";

export interface PaymentRequest { amount: number; accountReference: string; phoneNumber?: string; description: string; }
export interface PaymentRequestResult { provider: ProviderName; requestId: string; status: "pending" | "accepted" | "rejected"; providerReference?: string; }
export interface ProviderCallback { provider: ProviderName; providerReference: string; accountReference: string; amount: number; receivedAt: string; rawEventId: string; }
export interface PaymentProviderClient { readonly name: ProviderName; requestPayment(request: PaymentRequest): Promise<PaymentRequestResult>; parseCallback(payload: unknown): Promise<ProviderCallback>; }

