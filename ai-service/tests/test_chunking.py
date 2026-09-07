from app.embeddings.chunking import chunk_text


def test_chunk_text_preserves_overlap_at_word_boundaries():
    chunks = chunk_text("one two three four five six", chunk_size=3, overlap=1)

    assert chunks == ["one two three", "three four five", "five six"]


def test_chunk_text_rejects_invalid_overlap():
    try:
        chunk_text("text", chunk_size=2, overlap=2)
    except ValueError:
        return
    raise AssertionError("invalid overlap should fail")
