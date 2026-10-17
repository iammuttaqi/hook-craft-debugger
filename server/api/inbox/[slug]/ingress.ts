import { handleWebhookIngress } from '~/server/utils/ingress';

export default defineEventHandler(async (event) => {
  return handleWebhookIngress(event);
});
