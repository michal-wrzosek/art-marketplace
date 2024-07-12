import forge from "node-forge";
import crypto from "crypto";
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

function base64urlDecode(str: string) {
  return Buffer.from(str, "base64").toString("utf8");
}

function base64urlEncode(str: string) {
  return Buffer.from(str)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

// Cache the trusted certificate
let trustedCertificate: forge.pki.Certificate | undefined = undefined;

async function getRemoteTrustedCertificate(): Promise<forge.pki.Certificate> {
  if (!trustedCertificate) {
    const trustedCertificatePem = await (
      await fetch(process.env.TPAY_CA_ROOT_CERTIFICATE!)
    ).text();

    trustedCertificate = forge.pki.certificateFromPem(trustedCertificatePem);
  }

  return trustedCertificate;
}

async function getRemoteCertificate(
  remoteCertificateUrl: string
): Promise<forge.pki.Certificate | undefined> {
  if (remoteCertificateUrl !== process.env.TPAY_SIGNATURE_CERTIFICATE) {
    console.log("ERROR 0");
    return undefined;
  }

  const certificatePem = await (await fetch(remoteCertificateUrl)).text();

  const certificate = forge.pki.certificateFromPem(certificatePem);

  const trustedCertificate = await getRemoteTrustedCertificate();

  if (!trustedCertificate.verify(certificate)) {
    console.log("ERROR 1");
    return undefined;
  }

  return certificate;
}

export async function verifyJwsSignature(
  jws: string,
  body: string
): Promise<boolean> {
  const jwsData = jws.split(".");
  const headers = jwsData[0];
  const signature = jwsData[2];

  if (!headers || !signature) {
    console.log("ERROR 2");
    return false;
  }

  const headersJson = base64urlDecode(headers);
  const headersData = JSON.parse(headersJson);
  const x5u = headersData["x5u"];

  const certificate = await getRemoteCertificate(x5u);

  if (!certificate) {
    console.log("ERROR 3");
    return false;
  }

  const publicKey = forge.pki.publicKeyToPem(certificate.publicKey);

  const payload = base64urlEncode(body);
  const decodedSignature = Buffer.from(signature, "base64");

  const verify = crypto.createVerify("SHA256");
  verify.update(headers + "." + payload);
  verify.end();

  return verify.verify(publicKey, decodedSignature);
}
