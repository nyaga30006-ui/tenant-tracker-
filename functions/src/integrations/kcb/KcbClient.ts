import type { PaymentProviderClient, PaymentRequest, PaymentRequestResult, ProviderCallback } from "../../domain/payment-provider.js";

export class KcbClient implements PaymentProviderClient {
  readonly name = "kcb" as const;
  async requestPayment(_request: PaymentRequest): Promise<PaymentRequestResult> { throw new Error("KCB is not configured. Connect Buni sandbox credentials first."); }
  async parseCallback(_payload: unknown): Promise<ProviderCallback> { throw new Error("KCB notification validation is not configured yet."); }
}
