import { createClient } from "@/utils/supabase/server";
import { test } from "@/utils/tpay/server";

export default async function Notes() {
  const supabase = createClient();
  const { data: product } = await supabase.from("product").select();
  console.log("here");
  await test();

  return <pre>{JSON.stringify(product, null, 2)}</pre>;
}
