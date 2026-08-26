import type { PaymentProviderClient, PaymentRequest, PaymentRequestResult, ProviderCallback } from "../../domain/payment-provider.js";

export class MpesaClient implements PaymentProviderClient {
  readonly name = "mpesa" as const;
  async requestPayment(_request: PaymentRequest): Promise<PaymentRequestResult> { throw new Error("M-Pesa is not configured. Connect Daraja sandbox credentials first."); }
  async parseCallback(_payload: unknown): Promise<ProviderCallback> { throw new Error("M-Pesa callback validation is not configured yet."); }
}
