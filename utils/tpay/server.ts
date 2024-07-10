import { z } from "zod";

const TpayAuthResponseSchema = z.object({
  /** @example 1720298590 */
  issued_at: z.number().int(),
  /** @example "read" */
  scope: z.string(),
  token_type: z.literal("Bearer"),
  /** @example 7200 */
  expires_in: z.number().int(),
  client_id: z.string(),
  access_token: z.string(),
});

export async function test() {
  const response = await fetch(
    `https://${process.env.TPAY_API_DOMAIN!}/oauth/auth`,
    {
      method: "POST",
      body: JSON.stringify({
        client_id: process.env.TPAY_CLIENT_ID!,
        client_secret: process.env.TPAY_SECRET!,
        scope: "read write",
      }),
      headers: {
        "Content-Type": "application/json",
      },
    }
  );

  const json = TpayAuthResponseSchema.parse(await response.json());

  console.log(JSON.stringify(json, null, 2));

  const tokenInfoResponse = await fetch(
    `https://${process.env.TPAY_API_DOMAIN!}/oauth/tokeninfo`,
    {
      headers: {
        Authorization: `Bearer ${json.access_token}`,
      },
    }
  );

  console.log(await tokenInfoResponse.json());

  // const transationCreateResponse = await fetch(
  //   `https://${process.env.TPAY_API_DOMAIN!}/marketplace/v1/transaction`,
  //   {
  //     method: "POST",
  //     body: JSON.stringify({
  //       "currency": "PLN",
  //       "description": "Test marketplace transaction",
  //       "hiddenDescription": "Hidden description",
  //       "languageCode": "PL",
  //       "preSelectedChannelId": "64",
  //       "pos": {
  //         "id": "01G6WAS5MNGQ2X728AW53D8JPR"
  //       },
  //       "billingAddress": {
  //         "email": "noreply@tpay.com",
  //         "name": "string",
  //         "phone": "string",
  //         "street": "string",
  //         "postalCode": "string",
  //         "city": "string",
  //         "country": "PL",
  //         "houseNo": "string",
  //         "flatNo": "string"
  //       },
  //       "childTransactions": [
  //         {
  //           "amount": 1,
  //           "description": "string",
  //           "merchant": {
  //             "id": "01G6WAPZFNNX4CXBPKQH5MYD4R"
  //           }
  //         }
  //       ],
  //       "transactionCallbacks": [
  //         {
  //           "type": 1,
  //           "value": "https://domain.com/transactionCallback"
  //         }
  //       ]
  //     }),
  //   }
  // )
}
