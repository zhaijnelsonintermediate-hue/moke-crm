async function readJsonBody(request) {
  if (request.body && typeof request.body === "object") {
    return request.body;
  }

  const chunks = [];
  for await (const chunk of request) {
    chunks.push(Buffer.from(chunk));
  }

  const rawBody = Buffer.concat(chunks).toString("utf8");
  return rawBody ? JSON.parse(rawBody) : {};
}

function sendJson(response, statusCode, body) {
  response.statusCode = statusCode;
  response.setHeader("Content-Type", "application/json");
  response.end(JSON.stringify(body));
}

module.exports = async function handler(request, response) {
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    return sendJson(response, 405, {
      ok: false,
      error: "仅支持 POST 请求"
    });
  }

  try {
    const body = await readJsonBody(request);

    if (!body.event || !body.namespace || !body.timestamp || !body.payload) {
      return sendJson(response, 400, {
        ok: false,
        error: "缺少必填字段：event、namespace、timestamp、payload"
      });
    }

    if (!process.env.TIER0_API_URL) {
      return sendJson(response, 500, {
        ok: false,
        error: "缺少环境变量 TIER0_API_URL"
      });
    }

    const tier0Response = await fetch(process.env.TIER0_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(process.env.TIER0_API_KEY
          ? { Authorization: `Bearer ${process.env.TIER0_API_KEY}` }
          : {})
      },
      body: JSON.stringify(body)
    });

    const responseText = await tier0Response.text();

    return sendJson(response, 200, {
      ok: tier0Response.ok,
      status: tier0Response.status,
      tier0_response: responseText
    });
  } catch (error) {
    return sendJson(response, 500, {
      ok: false,
      error: error.message || "Tier0 传输失败"
    });
  }
};
