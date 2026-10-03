import { supabase } from "./supabase";

export interface ClientProfile {
  id: string;
  name: string;
  phone: string;
  tier: "regular" | "vip_1" | "wholesale_1";
  notes?: string;
  created_at: string;
}

const CRM_STAGE = "CRM_CLIENT";

export async function getClients(): Promise<ClientProfile[]> {
  try {
    // 1. Intentar consultar tabla dedicada core_clients si existe
    const { data: dedicatedClients, error: dedicatedErr } = await supabase
      .from("core_clients")
      .select("*")
      .order("name", { ascending: true });

    if (!dedicatedErr && dedicatedClients) {
      return dedicatedClients.map((c: any) => ({
        id: c.id,
        name: c.name,
        phone: c.phone || "",
        tier: c.tier || "regular",
        notes: c.notes || "",
        created_at: c.created_at || new Date().toISOString()
      }));
    }
  } catch {
    // Ignorar y usar fallback persistente
  }

  // Fallback transparente: usar core_protocols con stage = CRM_CLIENT
  const { data, error } = await supabase
    .from("core_protocols")
    .select("*")
    .eq("stage", CRM_STAGE)
    .order("created_at", { ascending: true });

  if (error || !data) return [];

  return data.map((p: any) => {
    let parsedContent: any = {};
    try {
      parsedContent = JSON.parse(p.content || "{}");
    } catch {
      parsedContent = { notes: p.content };
    }

    return {
      id: p.id,
      name: p.title || "Sin Nombre",
      phone: p.topic || "",
      tier: parsedContent.tier || "regular",
      notes: parsedContent.notes || "",
      created_at: p.created_at || new Date().toISOString()
    };
  });
}

export async function saveClient(client: {
  id?: string;
  name: string;
  phone?: string;
  tier?: "regular" | "vip_1" | "wholesale_1";
  notes?: string;
}): Promise<{ data: ClientProfile | null; error: any }> {
  const tier = client.tier || "regular";
  const phone = client.phone || "";
  const notes = client.notes || "";
  const contentStr = JSON.stringify({ tier, notes });

  if (client.id) {
    // Update
    const { data, error } = await supabase
      .from("core_protocols")
      .update({
        title: client.name.trim(),
        topic: phone.trim(),
        content: contentStr
      })
      .eq("id", client.id)
      .select()
      .single();

    if (error) return { data: null, error };
    return {
      data: {
        id: data.id,
        name: data.title,
        phone: data.topic,
        tier,
        notes,
        created_at: data.created_at
      },
      error: null
    };
  } else {
    // Insert
    const { data, error } = await supabase
      .from("core_protocols")
      .insert([
        {
          title: client.name.trim(),
          stage: CRM_STAGE,
          topic: phone.trim(),
          content: contentStr
        }
      ])
      .select()
      .single();

    if (error) return { data: null, error };
    return {
      data: {
        id: data.id,
        name: data.title,
        phone: data.topic,
        tier,
        notes,
        created_at: data.created_at
      },
      error: null
    };
  }
}

export async function deleteClient(id: string): Promise<{ error: any }> {
  const { error } = await supabase.from("core_protocols").delete().eq("id", id);
  return { error };
}

// Inicializar y sincronizar clientes históricos que figuren en core_sales
export async function syncHistoricalClients(): Promise<ClientProfile[]> {
  const existing = await getClients();
  const existingNames = new Set(existing.map(c => c.name.toLowerCase().trim()));

  const { data: sales } = await supabase
    .from("core_sales")
    .select("customer_name, client")
    .neq("client", "proveedor_opex");

  if (!sales) return existing;

  const discovered = new Set<string>();
  sales.forEach((s: any) => {
    const raw = (s.customer_name || "").trim();
    if (raw && raw !== "Desconocido" && !existingNames.has(raw.toLowerCase())) {
      discovered.add(raw);
    }
  });

  for (const name of Array.from(discovered)) {
    await saveClient({
      name,
      phone: "",
      tier: "regular",
      notes: "Importado automáticamente desde ventas históricas"
    });
  }

  return await getClients();
}
