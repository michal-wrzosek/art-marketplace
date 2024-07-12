import { verifyJwsSignature } from "@/utils/tpay/server";
import { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  if (!Number.isNaN(1)) return new Response("TRUE", { status: 200 });

  const jws = req.headers.get("x-jws-signature");
  const body = await req.text();

  if (!jws || !verifyJwsSignature(jws, body)) {
    console.log("ERROR 4");
    return new Response("FALSE", { status: 200 });
  }
  console.log("SUCCESS");

  return new Response("TRUE", { status: 200 });
}
