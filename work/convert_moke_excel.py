import json
import math
from pathlib import Path

import pandas as pd


INPUT = Path(r"C:\Users\zhaij\Downloads\moke_crm_realistic_import_demo (1).xlsx")
OUTPUT = Path(r"C:\Users\zhaij\Documents\Codex\2026-06-09\codex-codex\outputs\moke-crm-imported-data.js")


SHEET_TO_KEY = {
    "Customers": "customers",
    "Contacts": "contacts",
    "Products": "products",
    "Flavor_Tags": "flavorTags",
    "Product_Flavor_Scores": "productFlavorScores",
    "Samples": "samples",
    "Opportunities": "opportunities",
    "Quotes": "quotes",
    "Orders": "orders",
    "Interactions": "interactions",
    "Customer_Feedback": "customerFeedback",
    "Customer_Taste_Profiles": "customerTasteProfiles",
}


def clean(value):
    if value is None:
        return ""
    if isinstance(value, float) and math.isnan(value):
        return ""
    if isinstance(value, pd.Timestamp):
        return value.strftime("%Y-%m-%d")
    if hasattr(value, "strftime") and not isinstance(value, str):
        try:
            return value.strftime("%Y-%m-%d")
        except Exception:
            pass
    if isinstance(value, str):
        return value.strip()
    return value


def boolish(value):
    if isinstance(value, bool):
        return value
    return str(value).strip().lower() in {"true", "1", "yes", "y", "是"}


def number(value, default=""):
    value = clean(value)
    if value == "":
        return default
    if isinstance(value, (int, float)) and not isinstance(value, bool):
        return value
    text = str(value).replace(",", "").strip()
    try:
        parsed = float(text)
        return int(parsed) if parsed.is_integer() else parsed
    except ValueError:
        digits = "".join(ch for ch in text if ch.isdigit() or ch == ".")
        if digits:
            parsed = float(digits)
            return int(parsed) if parsed.is_integer() else parsed
    return default


def list_from_text(value):
    value = clean(value)
    if value == "":
        return []
    if isinstance(value, list):
        return value
    text = str(value)
    for sep in ["，", "、", ";", "；", "|"]:
        text = text.replace(sep, ",")
    return [part.strip() for part in text.split(",") if part.strip()]


def base(row):
    out = {k: clean(v) for k, v in row.items()}
    out.setdefault("source_system", "MOKE_CRM")
    out.setdefault("sync_status", "not_synced")
    out.setdefault("external_id", "")
    out.setdefault("created_at", "2026-06-10")
    out.setdefault("updated_at", "2026-06-10")
    return out


def load_sheet(sheet):
    df = pd.read_excel(INPUT, sheet_name=sheet)
    return [base(row) for row in df.to_dict(orient="records")]


def main():
    data = {key: load_sheet(sheet) for sheet, key in SHEET_TO_KEY.items()}

    tag_by_cn = {row["tag_name_cn"]: row["tag_id"] for row in data["flavorTags"]}
    tag_by_en = {row["tag_name_en"]: row["tag_id"] for row in data["flavorTags"]}

    for row in data["contacts"]:
        row["is_primary_contact"] = boolish(row.get("is_primary_contact"))

    for row in data["flavorTags"]:
        row["is_core_tag"] = boolish(row.get("is_core_tag"))

    for row in data["products"]:
        pct = number(row.get("cacao_percentage"), "")
        row["cacao_percentage"] = f"{pct:g}%" if isinstance(pct, (int, float)) else clean(row.get("cacao_percentage"))
        row.setdefault("generated_type", "")

    for row in data["productFlavorScores"]:
        row["score"] = number(row.get("score"), 0)
        row["is_primary_tag"] = boolish(row.get("is_primary_tag"))
        row["is_secondary_tag"] = boolish(row.get("is_secondary_tag"))

    for row in data["samples"]:
        row["sample_quantity"] = number(row.get("sample_quantity"), "")

    for row in data["opportunities"]:
        row["expected_value"] = number(row.get("expected_value"), 0)
        row["probability"] = number(row.get("probability"), 0)

    for row in data["quotes"]:
        row["quantity"] = number(row.get("quantity"), 0)
        row["unit_price"] = number(row.get("unit_price"), 0)

    for row in data["orders"]:
        row["quantity"] = number(row.get("quantity"), 0)
        row["total_value"] = number(row.get("total_value"), 0)
        margin = number(row.get("gross_margin"), 0)
        row["gross_margin"] = round(margin * 100, 1) if isinstance(margin, (int, float)) and margin <= 1 else margin
        row["repeat_order_flag"] = boolish(row.get("repeat_order_flag"))

    for row in data["customerFeedback"]:
        row.pop("customer_name", None)
        row.pop("product_name", None)
        row["overall_liking"] = number(row.get("overall_liking"), 0)
        row["purchase_intent"] = number(row.get("purchase_intent"), 0)
        row["liked_tags"] = [
            tag_by_cn.get(item) or tag_by_en.get(item) or item
            for item in list_from_text(row.get("liked_tags"))
        ]
        row["disliked_tags"] = [
            tag_by_cn.get(item) or tag_by_en.get(item) or item
            for item in list_from_text(row.get("disliked_tags"))
        ]

    for row in data["customerTasteProfiles"]:
        for key in [
            "preferred_texture_tags",
            "preferred_aroma_tags",
            "preferred_taste_tags",
            "disliked_tags",
            "recommended_products",
            "not_recommended_products",
        ]:
            values = list_from_text(row.get(key))
            if "tags" in key:
                values = [tag_by_cn.get(item) or tag_by_en.get(item) or item for item in values]
            row[key] = values
        row["confidence_score"] = number(row.get("confidence_score"), 0)

    payload = {
        "dataset_id": "moke-realistic-import-demo-2026-06-10",
        "source_file": INPUT.name,
        "data": data,
        "counts": {key: len(value) for key, value in data.items()},
    }
    OUTPUT.write_text(
        "window.MOKE_CRM_IMPORTED_DATA = "
        + json.dumps(payload, ensure_ascii=False, separators=(",", ":"))
        + ";\n",
        encoding="utf-8",
    )
    print(json.dumps(payload["counts"], ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
