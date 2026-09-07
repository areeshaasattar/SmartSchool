from collections.abc import Iterator


def chunk_text(text: str, chunk_size: int = 1_000, overlap: int = 150) -> list[str]:
    """Split text on word boundaries while preserving a small retrieval overlap."""
    if chunk_size <= 0 or overlap < 0 or overlap >= chunk_size:
        raise ValueError("chunk_size must be positive and overlap must be smaller than chunk_size")

    words = text.split()
    chunks: list[str] = []
    start = 0
    while start < len(words):
        chunk = " ".join(words[start:start + chunk_size]).strip()
        if chunk:
            chunks.append(chunk)
        if start + chunk_size >= len(words):
            break
        start += chunk_size - overlap
    return chunks
