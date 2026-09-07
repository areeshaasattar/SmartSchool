from app.retrieval.qdrant import build_authorization_filter


def test_cross_school_leakage_is_prevented_by_the_qdrant_filter():
    query_filter = build_authorization_filter({
        "schoolId": "school-a", "sourceTypes": ["parent_academic"], "ownerIds": ["child-a"],
    })
    conditions = {condition.key: condition.match for condition in query_filter.must}

    assert conditions["schoolId"].value == "school-a"
    assert conditions["sourceType"].any == ["parent_academic"]
    assert conditions["ownerId"].any == ["child-a"]


def test_qdrant_filter_never_allows_missing_school_scope():
    try:
        build_authorization_filter({"sourceTypes": ["faq"]})
    except ValueError:
        return
    raise AssertionError("school scope must be required")
