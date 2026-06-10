export async function POST(request) {
  try {
    const body = await request.json();
    const { event, namespace, payload, timestamp } = body || {};

    if (!event || !namespace || !payload || !timestamp) {
      return Response.json(
        { ok: false, error: "缺少必填字段：event、namespace、timestamp、payload" },
        { status: 400 }
      );
    }

    if (!process.env.TIER0_API_URL) {
      return Response.json(
        { ok: false, error: "缺少环境变量 TIER0_API_URL" },
        { status: 500 }
      );
    }

    const headers = {
      "Content-Type": "application/json"
    };

    if (process.env.TIER0_API_KEY) {
      headers.Authorization = `Bearer ${process.env.TIER0_API_KEY}`;
    }

    const tier0Response = await fetch(process.env.TIER0_API_URL, {
      method: "POST",
      headers,
      body: JSON.stringify(body)
    });

    const responseText = await tier0Response.text();

    return Response.json({
      ok: tier0Response.ok,
      status: tier0Response.status,
      tier0_response: responseText
    });
  } catch (error) {
    return Response.json(
      { ok: false, error: error instanceof Error ? error.message : "Tier0 传输失败" },
      { status: 500 }
    );
  }
}

function methodNotAllowed() {
  return Response.json(
    { ok: false, error: "仅支持 POST 请求" },
    {
      status: 405,
      headers: {
        Allow: "POST"
      }
    }
  );
}

export {
  methodNotAllowed as GET,
  methodNotAllowed as PUT,
  methodNotAllowed as PATCH,
  methodNotAllowed as DELETE
};
