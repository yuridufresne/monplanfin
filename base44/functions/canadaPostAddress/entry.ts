import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const body = await req.json();
  const { action, searchTerm, id, lastId } = body;

  const API_KEY = Deno.env.get("CANADA_POST_API_KEY");
  if (!API_KEY) {
    return Response.json({ error: "CANADA_POST_API_KEY not set" }, { status: 500 });
  }

  if (action === "find") {
    const params = new URLSearchParams({
      Key: API_KEY,
      SearchTerm: searchTerm || "",
      Country: "CAN",
      LanguagePreference: "fr",
      MaxSuggestions: "8",
      ...(lastId ? { LastId: lastId } : {}),
    });
    const res = await fetch(`https://ws1.postescanada-canadapost.ca/AddressComplete/Interactive/Find/v2.10/json3.ws?${params}`);
    const data = await res.json();
    return Response.json(data);
  }

  if (action === "retrieve") {
    const params = new URLSearchParams({ Key: API_KEY, Id: id });
    const res = await fetch(`https://ws1.postescanada-canadapost.ca/AddressComplete/Interactive/Retrieve/v2.11/json3.ws?${params}`);
    const data = await res.json();
    return Response.json(data);
  }

  return Response.json({ error: "Invalid action" }, { status: 400 });
});