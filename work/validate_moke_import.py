import json
import re
from pathlib import Path


DATA_JS = Path(r"C:\Users\zhaij\Documents\Codex\2026-06-09\codex-codex\outputs\moke-crm-imported-data.js")


def load_payload():
    text = DATA_JS.read_text(encoding="utf-8")
    match = re.search(r"window\.MOKE_CRM_IMPORTED_DATA\s*=\s*(\{.*\});\s*$", text, re.S)
    if not match:
        raise RuntimeError("Cannot find import payload")
    return json.loads(match.group(1))


def ids(rows, key):
    return {row.get(key) for row in rows if row.get(key)}


def invalid(rows, key, valid):
    return [row for row in rows if row.get(key) and row.get(key) not in valid]


def as_list(value):
    if isinstance(value, list):
        return value
    if value in (None, ""):
        return []
    return [part.strip() for part in str(value).split(",") if part.strip()]


def main():
    payload = load_payload()
    data = payload["data"]

    customer_ids = ids(data["customers"], "customer_id")
    contact_ids = ids(data["contacts"], "contact_id")
    product_ids = ids(data["products"], "product_id")
    tag_ids = ids(data["flavorTags"], "tag_id")
    sample_ids = ids(data["samples"], "sample_id")
    opportunity_ids = ids(data["opportunities"], "opportunity_id")
    quote_ids = ids(data["quotes"], "quote_id")

    checks = {
        "contacts_customer": len(invalid(data["contacts"], "customer_id", customer_ids)),
        "scores_product": len(invalid(data["productFlavorScores"], "product_id", product_ids)),
        "scores_tag": len(invalid(data["productFlavorScores"], "tag_id", tag_ids)),
        "samples_customer": len(invalid(data["samples"], "customer_id", customer_ids)),
        "samples_contact": len(invalid(data["samples"], "contact_id", contact_ids)),
        "samples_product": len(invalid(data["samples"], "product_id", product_ids)),
        "opportunities_customer": len(invalid(data["opportunities"], "customer_id", customer_ids)),
        "quotes_customer": len(invalid(data["quotes"], "customer_id", customer_ids)),
        "quotes_product": len(invalid(data["quotes"], "product_id", product_ids)),
        "quotes_opportunity": len(invalid(data["quotes"], "opportunity_id", opportunity_ids)),
        "orders_customer": len(invalid(data["orders"], "customer_id", customer_ids)),
        "orders_product": len(invalid(data["orders"], "product_id", product_ids)),
        "orders_opportunity": len(invalid(data["orders"], "opportunity_id", opportunity_ids)),
        "orders_quote": len(invalid(data["orders"], "quote_id", quote_ids)),
        "interactions_customer": len(invalid(data["interactions"], "customer_id", customer_ids)),
        "interactions_contact": len(invalid(data["interactions"], "contact_id", contact_ids)),
        "interactions_opportunity": len(invalid(data["interactions"], "opportunity_id", opportunity_ids)),
        "feedback_customer": len(invalid(data["customerFeedback"], "customer_id", customer_ids)),
        "feedback_contact": len(invalid(data["customerFeedback"], "contact_id", contact_ids)),
        "feedback_product": len(invalid(data["customerFeedback"], "product_id", product_ids)),
        "feedback_sample": len(invalid(data["customerFeedback"], "sample_id", sample_ids)),
        "profile_customer": len(invalid(data["customerTasteProfiles"], "customer_id", customer_ids)),
    }

    product_score_counts = {
        product["product_id"]: sum(1 for score in data["productFlavorScores"] if score["product_id"] == product["product_id"])
        for product in data["products"]
    }
    products_without_scores = [pid for pid, count in product_score_counts.items() if count == 0]

    feedback_with_full_links = [
        row for row in data["customerFeedback"]
        if row.get("customer_id") in customer_ids
        and row.get("contact_id") in contact_ids
        and row.get("product_id") in product_ids
        and row.get("sample_id") in sample_ids
    ]
    positive_feedback = [
        row for row in data["customerFeedback"]
        if int(row.get("overall_liking") or 0) >= 4 and int(row.get("purchase_intent") or 0) >= 4
    ]
    feedback_customers = {row["customer_id"] for row in data["customerFeedback"]}
    positive_customers = {row["customer_id"] for row in positive_feedback}
    profiles_with_recommendations = [
        row for row in data["customerTasteProfiles"] if as_list(row.get("recommended_products"))
    ]

    dashboard = {
        "customers": len(data["customers"]),
        "active_or_converted_customers": sum(1 for row in data["customers"] if row.get("status") in {"Active", "Converted"}),
        "open_opportunities": sum(1 for row in data["opportunities"] if row.get("stage") != "Lost"),
        "pipeline_value": sum(float(row.get("expected_value") or 0) for row in data["opportunities"] if row.get("stage") != "Lost"),
        "feedback_records": len(data["customerFeedback"]),
        "profiles": len(data["customerTasteProfiles"]),
        "orders": len(data["orders"]),
        "order_value": sum(float(row.get("total_value") or 0) for row in data["orders"]),
    }

    result = {
        "counts": payload["counts"],
        "relation_errors": checks,
        "products_without_scores": products_without_scores,
        "feedback_with_full_links": len(feedback_with_full_links),
        "feedback_customers": len(feedback_customers),
        "positive_feedback": len(positive_feedback),
        "positive_feedback_customers": len(positive_customers),
        "profiles_with_recommendations": len(profiles_with_recommendations),
        "dashboard_expected": dashboard,
        "all_relations_valid": all(value == 0 for value in checks.values()) and not products_without_scores,
    }
    print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
