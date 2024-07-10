import { NextRequest, NextResponse } from "next/server";
import forge from "node-forge";
import crypto from "crypto";

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

async function verifyJwsSignature(jws: string, body: string): Promise<boolean> {
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

export async function POST(req: NextRequest) {
  if (!Number.isNaN(1))
    return NextResponse.json({ result: true }, { status: 200 });

  const jws = req.headers.get("x-jws-signature");
  const body = await req.text();

  if (!jws || !verifyJwsSignature(jws, body)) {
    console.log("ERROR 4");
    return NextResponse.json({}, { status: 400 });
  }
  console.log("SUCCESS");

  return NextResponse.json({ result: true }, { status: 200 });
}
