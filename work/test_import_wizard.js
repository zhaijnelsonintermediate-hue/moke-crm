const fs = require("fs");

const html = fs.readFileSync("outputs/moke-crm-mvp.html", "utf8");
let script = [...html.matchAll(/<script>(?![^>]*src)([\s\S]*?)<\/script>/g)]
  .map(match => match[1])
  .join("\n");
script = script.replace(/\n\s*init\(\);\s*$/, "");

const storage = new Map();
globalThis.window = {};
globalThis.localStorage = {
  getItem: key => storage.has(key) ? storage.get(key) : null,
  setItem: (key, value) => storage.set(key, String(value)),
  removeItem: key => storage.delete(key),
};
globalThis.confirm = () => true;
globalThis.alert = () => {};

const api = new Function(`${script}
return {
  parseImportFile,
  buildImportPreview,
  parseCsvWithMeta
};`)();

function csvFile(name, text) {
  return {
    name,
    async text() {
      return text;
    }
  };
}

async function runCase(name, csv, expectedRows, expectedNeedle) {
  const parseResult = await api.parseImportFile(csvFile(name, csv));
  const preview = api.buildImportPreview(parseResult);
  const text = JSON.stringify(preview);
  const result = {
    name,
    uploaded_file_name: preview.uploaded_file_name,
    parsed_header: preview.parsed_header,
    parsed_row_count: preview.parsed_row_count,
    preview_rows: preview.rows.length,
    detected_table: preview.detected_table,
    containsNeedle: expectedNeedle ? text.includes(expectedNeedle) : true,
  };
  if (preview.parsed_row_count !== expectedRows || preview.rows.length !== expectedRows || !result.containsNeedle) {
    console.error(JSON.stringify(result, null, 2));
    process.exit(1);
  }
  console.log(JSON.stringify(result, null, 2));
  return preview;
}

const headers = "公司名,试吃产品,样品编号,试吃日期,总体评价,下单意愿,喜欢点,吐槽/不喜欢,甜度反馈,口感反馈,香气反馈,价格接受,原始评论,跟进人";
const canaryRows = [
  "ZZZ_CANARY_CUSTOMER_ALPHA,海盐开心果巧克力,S-CANARY-1,2026-06-10,非常喜欢,很喜欢,坚果香,苦,正好,脆,可可香,可接受,canary alpha,小翟",
  "ZZZ_CANARY_CUSTOMER_BETA,白巧柚子,S-CANARY-2,2026-06-10,一般,考虑购买,果香,太甜,太甜,顺滑,果香,价格高,canary beta,小翟",
  "ZZZ_CANARY_CUSTOMER_GAMMA,树莓巧克力,S-CANARY-3,2026-06-10,不喜欢,无意愿,果香,酸,不够甜,颗粒,果香,不可接受,canary gamma,小翟",
];

const twentyTwoRows = Array.from({ length: 22 }, (_, index) => {
  const n = index + 1;
  return `测试客户${n},海盐开心果巧克力,S-T-${n},2026-06-10,很喜欢,愿意购买,坚果香,涩,正好,脆,可可香,可接受,测试反馈${n},小翟`;
});

(async () => {
  const canaryPreview = await runCase("customer_feedback.csv", [headers, ...canaryRows].join("\n"), 3, "ZZZ_CANARY_CUSTOMER_ALPHA");
  if (canaryPreview.mapped_first_row_preview.customer_name !== "ZZZ_CANARY_CUSTOMER_ALPHA" || canaryPreview.mapped_first_row_preview.overall_liking !== 5) {
    console.error(JSON.stringify(canaryPreview.mapped_first_row_preview, null, 2));
    process.exit(1);
  }
  await runCase("customer_feedback.csv", [headers, ...twentyTwoRows].join("\n"), 22, "测试客户22");
  const aliasPreview = await runCase("customer_feedback.csv", [
    headers,
    "Auckland Artisan Foods,海盐开心果黑巧,S-ALIAS-1,2026-06-10,很好吃,会买,坚果香,包装需要更礼品化,正好,脆,可可香,可接受,别名测试,小翟"
  ].join("\n"), 1, "Auckland Artisan Foods");
  if (
    aliasPreview.rows[0].import_status !== "need_review" ||
    aliasPreview.rows[0].record.product_id !== "PRO-0001" ||
    aliasPreview.rows[0].record.price_acceptance !== "Acceptable" ||
    !aliasPreview.rows[0].warnings.join(" ").includes("negative_comment") ||
    !aliasPreview.rows[0].review_reasons.includes("product_alias_match") ||
    !aliasPreview.rows[0].review_reasons.includes("natural_language_rating") ||
    !aliasPreview.rows[0].review_reasons.includes("non_flavor_negative_comment")
  ) {
    console.error(JSON.stringify(aliasPreview.rows[0], null, 2));
    process.exit(1);
  }
  const pricePreview = await runCase("customer_feedback.csv", [
    headers,
    "Auckland Artisan Foods,白巧柚子,S-PRICE-1,2026-06-10,很喜欢,愿意购买,果香,太甜,偏甜,顺滑,果香,高端价可接受,价格测试,小翟",
    "Auckland Artisan Foods,白巧柚子,S-PRICE-2,2026-06-10,很喜欢,愿意购买,果香,太甜,偏甜,顺滑,果香,性价比高,价格测试,小翟",
    "Auckland Artisan Foods,白巧柚子,S-PRICE-3,2026-06-10,很喜欢,愿意购买,果香,太甜,偏甜,顺滑,果香,有点贵,价格测试,小翟"
  ].join("\n"), 3, "高端价可接受");
  const prices = pricePreview.rows.map(row => row.record.price_acceptance).join("|");
  if (prices !== "Premium Acceptable|Good Value|Too Expensive") {
    console.error(JSON.stringify(pricePreview.rows.map(row => row.record), null, 2));
    process.exit(1);
  }
  const missingCustomerPreview = await runCase("customer_feedback.csv", [
    headers,
    ",白巧柚子,S-MISS-1,2026-06-10,很喜欢,愿意购买,果香,太甜,偏甜,顺滑,果香,可接受,缺客户测试,小翟"
  ].join("\n"), 1, "白巧柚子");
  if (!missingCustomerPreview.rows[0].errors.includes("缺 customer_name")) {
    console.error(JSON.stringify(missingCustomerPreview.rows[0], null, 2));
    process.exit(1);
  }
  const conflictPreview = await runCase("customer_feedback.csv", [
    "客户名称,客户类型,国家,城市,客户等级,状态,负责人",
    "Conflict Customer,Retailer,China,Shanghai,A,Active,小翟"
  ].join("\n"), 1, "Conflict Customer");
  if (conflictPreview.detected_table !== "file_type_conflict" || !conflictPreview.file_type_conflict.includes("文件名像 Customer_Feedback，但表头像 Customers")) {
    console.error(JSON.stringify(conflictPreview, null, 2));
    process.exit(1);
  }
  const unknownCustomerParse = await api.parseImportFile(csvFile("customer_feedback.csv", [
    headers,
    "ZZZ_UNKNOWN_DEPENDENCY_CUSTOMER,白巧柚子,S-UNKNOWN-1,2026-06-10,很喜欢,很喜欢,果香,太甜,偏甜,顺滑,果香,可接受,未知客户依赖测试,小翟"
  ].join("\n")));
  const unknownCustomerPreview = api.buildImportPreview(unknownCustomerParse);
  if (
    unknownCustomerPreview.rows[0].import_status !== "need_review" ||
    !unknownCustomerPreview.rows[0].review_reasons.includes("unknown_customer_need_review") ||
    unknownCustomerPreview.dependency_check.customer_match_rate !== 0 ||
    !unknownCustomerPreview.dependency_warning.includes("当前反馈文件中的客户大部分不在 CRM 中")
  ) {
    console.error(JSON.stringify(unknownCustomerPreview, null, 2));
    process.exit(1);
  }
  const unknownCustomerErrorPreview = api.buildImportPreview(unknownCustomerParse, { unknownCustomerMode: "error" });
  if (unknownCustomerErrorPreview.rows[0].import_status !== "error" || !unknownCustomerErrorPreview.rows[0].errors.join(" ").includes("客户不存在")) {
    console.error(JSON.stringify(unknownCustomerErrorPreview.rows[0], null, 2));
    process.exit(1);
  }
})();
